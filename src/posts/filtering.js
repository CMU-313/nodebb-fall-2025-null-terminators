'use strict';

const db = require('../database');

// Create a module containing a function that filters posts bu a specified date
module.exports = function (Posts) {
	// Method queries db to get posts created on a specific date
	Posts.filterByDate = async function ({date, uid}) {
		// Regex to validate if date is in YYYY-MM-DD format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			throw new Error('Invalid date format. Use YYYY-MM-DD.');
		}

		// Calculate start and end timestamps for the given date
		const startTimestamp = new Date(`${date}T00:00:00Z`).getTime();
		const endTimestamp = new Date(`${date}T23:59:59Z`).getTime();
        
		// Fetch post IDs created within the specified date range
		const pids = await db.getSortedSetRangeByScore('posts:pid', 0, -1, startTimestamp, endTimestamp);
		return Posts.getPostsByPids(pids, uid);
	};
};
