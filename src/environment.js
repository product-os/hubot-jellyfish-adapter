/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-process-env */

exports.token = process.env.HUBOT_JELLYFISH_TOKEN;

exports.api = {
	apiUrl: process.env.HUBOT_JELLYFISH_API_URL,
	apiPrefix: process.env.HUBOT_JELLYFISH_API_PREFIX || 'api/v2',
};
