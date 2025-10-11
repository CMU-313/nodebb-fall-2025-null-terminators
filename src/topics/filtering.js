'use strict';

const privileges = require('../privileges');
const db = require('../database');

module.exports = function (Topics) {
	Topics.getTopicsByDate = async function ({date, uid, cid}) {
		// Check for Valid inputs
		if (cid === undefined || cid === null) {
			throw new Error('[[error:invalid-cid]]');
		}

		if (uid === undefined || uid === null) {
			throw new Error('[[error:invalid-uid]]');
		}

		// Check for valid date format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			throw new Error('Invalid date format. Use YYYY-MM-DD.');
		}

		// Check if user is authorized to read from the category
		const canRead = await privileges.categories.can('categories:read', cid, uid);

		if (!canRead) {
			throw new Error('[[error:no-privileges]]');
		}

		// Convert date to timestamp range
		const startTimestamp = new Date(`${date}T00:00:00`).getTime();
		const endTimestamp = new Date(`${date}T23:59:59`).getTime();

		const categoryTids = await db.getSortedSetMembers(`cid:${cid}:tids`);
		const allTidsInRange = await db.getSortedSetRangeByScore(
			'topics:tid',
			0,
			-1,
			startTimestamp,
			endTimestamp,
		);

		// filter topics to only those in specified category & date range
		let tids = allTidsInRange.filter(tid => categoryTids.includes(tid));

		// Topic privelege check
		tids = await privileges.topics.filterTids('topics:read', tids, uid);

		return await Topics.getTopicsByTids(tids);

	};
};