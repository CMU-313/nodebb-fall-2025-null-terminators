
'use strict';

const topics = require('../topics');
const user = require('../user');
const utils = require('../utils');

module.exports = function (Posts) {
	Posts.getPostsFromSet = async function (set, start, stop, uid, reverse) {
		const pids = await Posts.getPidsFromSet(set, start, stop, reverse);
		let posts = await Posts.getPostsByPids(pids, uid);

		// --- Diagnostics: ensure `anonymous` is present on read ---
		const missing = [];
		posts.forEach((p) => {
			if (p && typeof p.anonymous === 'undefined') {
				missing.push(p.pid);
			}
		});

		if (missing.length) {
			console.warn('[anon] posts.getPostsFromSet: `anonymous` missing on pids =', missing);
			try {
				const anonVals = await Posts.getPostsFields(missing, ['anonymous']);
				// Map pid -> anonymous
				const map = {};
				anonVals.forEach((row, i) => {
					map[missing[i]] = row ? row.anonymous : undefined;
				});
				posts = posts.map(p => (
					p && typeof p.anonymous === 'undefined' ? { ...p, anonymous: map[p.pid] === 'true' || map[p.pid] === true } : p
				));
			} catch (e) {
				console.error('[anon] failed to backfill `anonymous` on read:', e);
			}
		}

		posts = await user.blocks.filter(uid, posts);
		return posts;
	};

	Posts.isMain = async function (pids) {
		const isArray = Array.isArray(pids);
		pids = isArray ? pids : [pids];
		const postData = await Posts.getPostsFields(pids, ['tid']);
		const topicData = await topics.getTopicsFields(postData.map(t => t.tid), ['mainPid']);
		const result = pids.map((pid, i) => String(pid) === String(topicData[i].mainPid));
		return isArray ? result : result[0];
	};

	Posts.getTopicFields = async function (pid, fields) {
		const tid = await Posts.getPostField(pid, 'tid');
		return await topics.getTopicFields(tid, fields);
	};

	Posts.generatePostPath = async function (pid, uid) {
		const paths = await Posts.generatePostPaths([pid], uid);
		return Array.isArray(paths) && paths.length ? paths[0] : null;
	};

	Posts.generatePostPaths = async function (pids, uid) {
		const postData = await Posts.getPostsFields(pids, ['pid', 'tid']);
		const tids = postData.map(post => post && post.tid);
		const [indices, topicData] = await Promise.all([
			Posts.getPostIndices(postData, uid),
			topics.getTopicsFields(tids, ['slug']),
		]);

		const paths = pids.map((pid, index) => {
			const slug = topicData[index] ? topicData[index].slug : null;
			const postIndex = utils.isNumber(indices[index]) ? parseInt(indices[index], 10) + 1 : null;

			if (slug && postIndex) {
				const suffix = postIndex === 1 ? '' : `/${postIndex}`;
				return `/topic/${slug}${suffix}`;
			}
			return null;
		});

		return paths;
	};
};
