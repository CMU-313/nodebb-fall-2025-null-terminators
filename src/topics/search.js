'use strict';

const db = require('../database');
const posts = require('../posts');

module.exports = function (Topics) {
	Topics.searchInCategory = async function (searchTerm, cid, uid) {
		searchTerm = searchTerm.toLowerCase();

		const tids = await db.getSortedSetRange(`cid:${cid}:tids`, 0, -1);

		const resultTids = new Set();

		const topicsData = await Topics.getTopicsFields(tids, ['tid', 'title', 'uid']);

		// Check topic data for search term
		topicsData.forEach((topic) => {
			if (topic && topic.title && topic.title.toLowerCase().includes(searchTerm)) {
				resultTids.add(topic.tid);
			}
		});

		// Check associated posts for search term
		const pids = await db.getSortedSetRange(`cid:${cid}:pids`, 0, -1);
		const postData = await posts.getPostsFields(pids, ['pid', 'tid', 'content']);

		postData.forEach((post) => {
			if (post && post.content && post.content.toLowerCase().includes(searchTerm)) {
				resultTids.add(post.tid);
			}
		});

		const topics = await Topics.getTopicsByTids([...resultTids], uid);
		return topics;

	};

};