'use strict';

const db = require('../../database');

module.exports = {
	name: 'Add anonymous=false to all posts that lack it',
	timestamp: Date.now(),
	method: async function () {
		const batch = 500;

		async function processChunk(start) {
			const stop = start + batch - 1;
			const pids = await db.getSortedSetRange('posts:pid', start, stop);
			if (!pids || !pids.length) return;

			await Promise.all(pids.map(async (pid) => {
				const hasField = await db.isObjectField(`post:${pid}`, 'anonymous');
				if (!hasField) {
					await db.setObjectField(`post:${pid}`, 'anonymous', false);
				}
			}));

			return processChunk(start + batch);
		}

		await processChunk(0);
	},
};
