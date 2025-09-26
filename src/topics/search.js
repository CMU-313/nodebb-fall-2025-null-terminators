'use strict';

const db = require('../database');
const posts = require('../posts');
const user = require('../user');

module.exports = function (Topics) {
	Topics.searchInCategory = async function (searchTerm, cid, uid) {
		searchTerm = searchTerm.toLowerCase();

		const tids = await db.getSortedSetRange(`cid:${cid}:tids`, 0, -1);

		const resultTids = new Set();

		const topicsData = await Topics.getTopicsFields(tids, ['tid', 'title', 'uid']);

		// Find topics where topic data matches search term
		topicsData.forEach((topic) => {
			if (topic.title.toLowerCase().includes(searchTerm)) {
				resultTids.add(topic.tid);
			}
		});

		// Find topics where associated posts' content or author matches search term
		const pids = await db.getSortedSetRange(`cid:${cid}:pids`, 0, -1);
		const postData = await posts.getPostsFields(pids, ['pid', 'tid', 'content', 'uid']);

		// postData.forEach(async (post) => {
		for (const post of postData) {
			// Get post author username
			// eslint-disable-next-line no-await-in-loop
			const author = await user.getUserField(post.uid, 'username');

			// Check post's content & username
			if (post.content.toLowerCase().includes(searchTerm) || author.toLowerCase().includes(searchTerm)) {
				resultTids.add(post.tid);
			}
		};

		// Return topics for found TIDs
		const topics = await Topics.getTopicsByTids([...resultTids], uid);

		topics.sort((a, b) => b.timestamp - a.timestamp);

		return topics;

	};

};