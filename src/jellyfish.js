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
	getSdk
} = require('@balena/jellyfish-client-sdk')
const environment = require('./environment')

const {
	// eslint-disable-next-line no-unused-vars
	Adapter, Robot
} = hubot

class Sample extends Adapter {
	send (envelope, ...strings) {
		this.robot.logger.info('Send')
	}

	reply (envelope, ...strings) {
		this.robot.logger.info('Reply')
	}

	run () {
		this.robot.logger.info('Running Jellyfish-Hubot adapter')
		const sdk = getSdk(environment.api)
		sdk.auth
			.login(environment.login)
			.then((session) => {
				this.robot.logger.info('Logged in to Jellyfish')
				this.emit('connected')
			})
	}
}

exports.use = (robot) => {
	return new Sample(robot)
}
