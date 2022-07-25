/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

require('localenv')
let hubot = null
try {
	hubot = require('hubot/es2015')
} catch (error) {
	const prequire = require('parent-require')
	hubot = prequire('hubot/es2015')
}
const {
	v4: uuid
} = require('uuid')
const _ = require('lodash')
const {
	getSdk
} = require('@balena/jellyfish-client-sdk')
const env = require('./environment')

const {
	Adapter,
	// eslint-disable-next-line no-unused-vars
	Robot,
	TextMessage
} = hubot

const getStreamSchema = (hubotUserId) => {
	return {
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				enum: [ 'message@1.0.0', 'whisper@1.0.0' ]
			},
			data: {
				type: 'object',
				required: [ 'actor' ],
				properties: {
					actor: {
						not: {
							const: hubotUserId
						}
					}
				}
			}
		}
	}
}

const getJellyfishEvent = (eventType, target, strings) => {
	return {
		type: eventType.split('@')[0],
		target,
		slug: `message-${uuid()}`,
		payload: {
			message: strings.join('\n')
		}
	}
}

class JellyfishAdapter extends Adapter {
	constructor (robot, sdk, environment) {
		super(robot)
		this.sdk = sdk
		this.environment = environment
	}

	async send (envelope, ...strings) {
		try {
			const target = await this.sdk.card.get(envelope.user.target)
			await this.sdk.event.create(
				getJellyfishEvent(envelope.user.eventType, target, strings)
			)
		} catch (error) {
			this.robot.logger.error(`Jellyfish adapter send error: ${error}`)
		}
	}

	async receive (message) {
		const actor = await this.sdk.card.get(message.data.actor)
		const author = this.robot.brain.userForId(actor.id)
		const sourceContract = await this.sdk.card.get(message.data.target)

		// Don't support messages posted to support threads or sales threads
		if (
			message.type === 'message@1.0.0' &&
      (sourceContract.type === 'support-thread@1.0.0' ||
        sourceContract.type === 'sales-thread@1.0.0')
		) {
			this.robot.logger.info(
				`Ignoring message ${message.id} because it came from an unsupported source: ${sourceContract.type}`
			)
			return
		}

		author.name = actor.slug.replace('user-', '')
		author.target = message.data.target
		author.eventType = message.type
		const msg = new TextMessage(
			author,
			message.data.payload.message,
			message.id
		)
		this.robot.receive(msg)
		setTimeout(() => {
			this.sdk.card.markAsRead(this.hubotUser.slug, message)
		}, 500)
	}

	emote (envelope, ...strings) {
		this.send(
			envelope,
			...strings.map((str) => {
				return `*${str}*`
			})
		)
	}

	reply (envelope, ...strings) {
		this.send(
			envelope,
			...strings.map((str) => {
				return `${envelope.user.name}: ${str}`
			})
		)
	}

	close () {
		this.robot.logger.info('Closing Jellyfish-Hubot adapter')
		if (this.sdk) {
			this.sdk.cancelAllStreams()
			this.stream = null
		}
	}

	async run () {
		this.robot.logger.info('Running Jellyfish-Hubot adapter')
		try {
			await this.sdk.auth.loginWithToken(this.environment.token)

			this.hubotUser = await this.sdk.auth.whoami()
			this.robot.logger.info(
				`Logged in to Jellyfish (${
					this.environment.api.apiUrl
				}) as '${this.hubotUser.slug.replace(/^user-/, '')}'`
			)
		} catch (error) {
			this.robot.logger.error(`Could not login: ${error}`)
			return
		}
		try {
			await this.initStreaming(getStreamSchema(this.hubotUser.id))
		} catch (error) {
			this.robot.logger.error(`Could not set up streaming: ${error}`)
			return
		}
		this.emit('connected')
	}

	async initStreaming (streamSchema) {
		if (this.stream) {
			this.stream.close()
		}
		this.stream = await this.sdk.stream(streamSchema)
		this.stream.on('update', async (update) => {
			if (update.error) {
				this.robot.logger.error(`Stream update error: ${update.error}`)
			} else if (_.get(update, [ 'data', 'type' ]) === 'insert') {
				this.receive(update.data.after)
			}
		})
		this.stream.on('error', (error) => {
			this.robot.logger.error(`Stream error: ${error}`)
		})
	}
}

exports.use = (robot) => {
	return new JellyfishAdapter(robot, getSdk(env.api), env)
}

exports.test = (robot, sdk, environment) => {
	return new JellyfishAdapter(robot, sdk, environment)
}
