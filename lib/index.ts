import { getSdk, JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { strict as assert } from 'assert';
import type { Contract } from 'autumndb';
import { Adapter, Envelope, Robot, TextMessage } from 'hubot';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import * as env from './environment';

const getStreamSchema = (hubotUserId: string) => {
	return {
		type: 'object',
		required: ['type', 'data'],
		properties: {
			type: {
				enum: ['message@1.0.0', 'whisper@1.0.0'],
			},
			data: {
				type: 'object',
				required: ['actor'],
				properties: {
					actor: {
						not: {
							const: hubotUserId,
						},
					},
				},
			},
		},
	};
};

const getJellyfishEvent = (target: Contract, strings: string[]) => {
	return {
		type: 'whisper',
		target,
		slug: `whisper-${uuid()}`,
		payload: {
			message: strings.join('\n'),
		},
	};
};

class JellyfishAdapter extends Adapter {
	robot: Robot;
	sdk: JellyfishSDK;
	environment: any;
	hubotUser: any;
	stream: any;

	constructor(robot: Robot, sdk: JellyfishSDK, environment) {
		super(robot);
		this.robot = robot;
		this.sdk = sdk;
		this.environment = environment;
	}

	async send(envelope: Envelope, ...strings: string[]) {
		try {
			const target = await this.sdk.card.get(envelope.user.target as string);
			assert(
				target,
				new Error(`Unable to get target contract: ${envelope.user.target}`),
			);
			await this.sdk.event.create(getJellyfishEvent(target, strings));
		} catch (error) {
			this.robot.logger.error(`Jellyfish adapter send error: ${error}`);
		}
	}

	async receive(message: any) {
		const actor = await this.sdk.card.get(message.data.actor);
		assert(
			actor,
			new Error(`Unable to get actor contract: ${message.data.actor}`),
		);
		const author = this.robot.brain.userForId(actor.id);
		const sourceContract = await this.sdk.card.get(message.data.target);
		assert(
			sourceContract,
			`Unable to get source contract: ${message.data.target}`,
		);

		// Don't support messages posted to support threads or sales threads
		if (
			message.type === 'message@1.0.0' &&
			(sourceContract.type === 'support-thread@1.0.0' ||
				sourceContract.type === 'sales-thread@1.0.0')
		) {
			this.robot.logger.info(
				`Ignoring message ${message.id} because it came from an unsupported source: ${sourceContract.type}`,
			);
			return;
		}

		author.name = actor.slug.replace('user-', '');
		author.target = message.data.target;
		author.eventType = message.type;
		const msg = new TextMessage(
			author,
			(message.data.payload as any).message,
			message.id,
		);
		this.robot.receive(msg);
		setTimeout(() => {
			this.sdk.card.markAsRead(this.hubotUser.slug, message);
		}, 500);
	}

	emote(envelope: Envelope, ...strings: string[]) {
		this.send(
			envelope,
			...strings.map((str) => {
				return `*${str}*`;
			}),
		);
	}

	reply(envelope: Envelope, ...strings: string[]) {
		this.send(
			envelope,
			...strings.map((str) => {
				return `${envelope.user.name}: ${str}`;
			}),
		);
	}

	close() {
		this.robot.logger.info('Closing Jellyfish-Hubot adapter');
		if (this.sdk) {
			this.sdk.cancelAllStreams();
			this.stream = null;
		}
	}

	async run() {
		this.robot.logger.info('Running Jellyfish-Hubot adapter');
		try {
			await this.sdk.auth.loginWithToken(this.environment.token);

			this.hubotUser = await this.sdk.auth.whoami();
			this.robot.logger.info(
				`Logged in to Jellyfish (${
					this.environment.api.apiUrl
				}) as '${this.hubotUser.slug.replace(/^user-/, '')}'`,
			);
		} catch (error) {
			this.robot.logger.error(`Could not login: ${error}`);
			return;
		}
		try {
			await this.initStreaming(getStreamSchema(this.hubotUser.id));
		} catch (error) {
			this.robot.logger.error(`Could not set up streaming: ${error}`);
			return;
		}
		this.emit('connected');
	}

	async initStreaming(streamSchema) {
		if (this.stream) {
			this.stream.close();
		}
		this.stream = await this.sdk.stream(streamSchema);
		this.stream.on('update', async (update: any) => {
			if (update.error) {
				this.robot.logger.error(`Stream update error: ${update.error}`);
			} else if (_.get(update, ['data', 'type']) === 'insert') {
				this.receive(update.data.after);
			}
		});
		this.stream.on('error', (error: any) => {
			this.robot.logger.error(`Stream error: ${error}`);
		});
	}
}

export const use = (robot: Robot) => {
	return new JellyfishAdapter(robot, getSdk(env.api), env);
};

export const test = (robot: Robot, sdk: any, environment: any) => {
	return new JellyfishAdapter(robot, sdk, environment);
};
