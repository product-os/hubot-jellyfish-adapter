import { Env } from '@humanwhocodes/env';

const env = new Env();
export const token = env.require('HUBOT_JELLYFISH_TOKEN');
export const api = {
	apiUrl: env.require('HUBOT_JELLYFISH_API_URL'),
	apiPrefix: env.get('HUBOT_JELLYFISH_API_PREFIX', 'api/v2'),
};
