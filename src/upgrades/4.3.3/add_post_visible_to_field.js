'use strict';

const db = require('../../database');
const batch = require('../../batch');

module.exports = {
	name: 'Add visibleTo field to all existing posts',
	timestamp: Date.UTC(2025, 9, 24), // September 24, 2024
	method: async function () {
		const { progress } = this;

		await batch.processSortedSet('posts:pid', async (pids) => {
			// Create bulk operations to set visibleTo field for all posts
			const bulkOperations = [];

			for (const pid of pids) {
				bulkOperations.push([`post:${pid}`, { visibleTo: JSON.stringify(['all']) }]);
			}

			// Set the visibleTo field to ['all'] for all existing posts
			await db.setObjectBulk(bulkOperations);

			progress.incr(pids.length);
		}, {
			batch: 500,
			progress: progress,
		});
	},
};