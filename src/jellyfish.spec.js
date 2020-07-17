/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const test = require('ava')
const sinon = require('sinon')
const _ = require('lodash')
const {
	test: testAdapter
} = require('./jellyfish')

const sandbox = sinon.createSandbox()

const hubotUser = {
	id: 'u1',
	slug: 'user-hubot'
}

const thread = {
	id: 't1',
	slug: 'thread-1',
	type: 'thread'
}

const message = {
	id: 'm1',
	slug: 'message-1',
	type: 'message',
	data: {
		actor: 'u2',
		target: thread.id,
		payload: {
			message: 'test message'
		}
	}
}

test.beforeEach((t) => {
	t.context.env = {
		login: {
			username: 'hubot',
			password: 'hubot'
		},
		api: {
			apiUrl: 'http://localhost',
			apiPrefix: 'api/v2'
		}
	}
	t.context.robot = {
		logger: {
			info: sandbox.fake(),
			error: sandbox.fake()
		},
		brain: {
			userForId: sandbox.fake.returns({
				id: message.data.actor
			})
		},
		receive: sandbox.fake()
	}
	t.context.stream = {}
	t.context.stream.on = (eventName, callback) => {
		t.context.stream[eventName] = callback
	}
	t.context.sdk = {
		cancelAllStreams: sandbox.fake(),
		stream: sandbox.fake.resolves(t.context.stream),
		card: {
			get: sandbox.fake.resolves(thread)
		},
		event: {
			create: sandbox.fake.resolves(_.pick(message, 'id', 'type', 'slug'))
		},
		auth: {
			login: sandbox.fake.resolves(hubotUser),
			whoami: sandbox.fake.resolves(hubotUser)
		}
	}
})

test.afterEach(() => {
	sandbox.restore()
})

test('Starts streaming when run', async (t) => {
	const {
		robot, sdk, env
	} = t.context
	const adapter = testAdapter(robot, sdk, env)
	await adapter.run()
	t.true(sdk.auth.login.calledOnce)
	t.deepEqual(sdk.auth.login.firstArg, env.login)
	t.true(sdk.auth.whoami.calledOnce)
	t.true(sdk.stream.calledOnce)
	t.deepEqual(sdk.stream.firstArg, {
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
							const: hubotUser.id
						}
					}
				}
			}
		}
	})
})

test('Can receive a message', async (t) => {
	const {
		robot, sdk, env, stream
	} = t.context
	const adapter = testAdapter(robot, sdk, env)
	await adapter.run()
	stream.update({
		data: {
			type: 'insert',
			after: message
		}
	})
	t.true(robot.brain.userForId.calledOnce)
	t.is(robot.brain.userForId.firstArg, message.data.actor)
	t.true(robot.receive.calledOnce)
	const {
		text, user
	} = robot.receive.firstArg
	t.is(text, message.data.payload.message)
	t.is(user.id, message.data.actor)
})

test('Can send a message', async (t) => {
	const {
		robot, sdk, env
	} = t.context
	const envelope = {
		user: {
			eventType: 'message',
			target: thread.id
		}
	}
	const testMessage = 'hello!'
	const adapter = testAdapter(robot, sdk, env)
	await adapter.run()
	await adapter.send(envelope, testMessage)
	t.true(sdk.card.get.calledOnce)
	t.is(sdk.card.get.firstArg, thread.id)
	t.true(sdk.event.create.calledOnce)
	const {
		target, type, payload
	} = sdk.event.create.firstArg
	t.deepEqual(target, thread)
	t.is(type, 'message')
	t.is(payload.message, testMessage)
})

test('Closes all streams when closed down', async (t) => {
	const {
		robot, sdk, env
	} = t.context
	const adapter = testAdapter(robot, sdk, env)
	await adapter.run()
	adapter.close()
	t.true(sdk.cancelAllStreams.calledOnce)
})
