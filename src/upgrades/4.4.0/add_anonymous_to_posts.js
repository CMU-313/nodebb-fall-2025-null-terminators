'use strict';

const db = require('../../database');

module.exports = {
	name: 'Add anonymous=false to all posts that lack it',
	timestamp: Date.now(),
	method: async function () {
		// Iterate over all pids from the global sorted set
		const batch = 500;
		let start = 0, stop = batch - 1;
		// If your codebase has a posts helper to page pids, prefer that.
		// /* eslint no-constant-condition: "off" */
		while (true) {
			const pids = await db.getSortedSetRange('posts:pid', start, stop);
			if (!pids.length) break;
			await Promise.all(pids.map(async (pid) => {
				const hasField = await db.isObjectField(`post:${pid}`, 'anonymous');
				if (!hasField) {
					await db.setObjectField(`post:${pid}`, 'anonymous', false);
				}
			}));
			start += batch; stop += batch;
		}
	},
};
