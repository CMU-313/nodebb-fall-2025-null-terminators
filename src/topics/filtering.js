'use strict';

const { privileges } = require('../controllers/admin');
const db = require('../database');

module.exports = function (Topics) {
	Topics.getTopicsByDate = async function ({date, uid, cid}) {
		// Check for valid date format

		// Convert date to timestamp range
		const startTimestamp = new Date(`${date}T00:00:00Z`).getTime();
		const endTimestamp = new Date(`${date}T23:59:59Z`).getTime();

		// Query DB for topics within the date range
		let tids = await db.getSortedSetRangeByScore('topics:tid', 0, -1, startTimestamp, endTimestamp);

		// If the category is provided, filter topics by category
		if (cid) {
			const categoryTids = db.getSortedSetMembers(`cid:${cid}:tids`);
			tids = tids.filter(tid => categoryTids.includes(tid));
		}

		// Filter by privileges if uid is provided
		if (uid) {
			tids = await privileges.topics.filterTids('topics:read', tids, uid);
		}

		return await Topics.getTopicsByTids(tids);

	};
};