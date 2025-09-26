'use strict';

const _ = require('lodash');

const db = require('../database');
const utils = require('../utils');
const user = require('../user');
const privileges = require('../privileges');
const plugins = require('../plugins');

const Posts = module.exports;

require('./data')(Posts);
require('./create')(Posts);
require('./delete')(Posts);
require('./edit')(Posts);
require('./parse')(Posts);
require('./user')(Posts);
require('./topics')(Posts);
require('./category')(Posts);
require('./summary')(Posts);
require('./recent')(Posts);
require('./tools')(Posts);
require('./votes')(Posts);
require('./bookmarks')(Posts);
require('./queue')(Posts);
require('./diffs')(Posts);
require('./uploads')(Posts);

Posts.attachments = require('./attachments');

Posts.exists = async function (pids) {
	return await db.exists(
		Array.isArray(pids) ? pids.map(pid => `post:${pid}`) : `post:${pids}`
	);
};

Posts.getPidsFromSet = async function (set, start, stop, reverse) {
	if (isNaN(start) || isNaN(stop)) {
		return [];
	}
	return await db[reverse ? 'getSortedSetRevRange' : 'getSortedSetRange'](set, start, stop);
};

Posts.getPostsByPids = async function (pids, uid) {
	if (!Array.isArray(pids) || !pids.length) {
		return [];
	}

	let posts = await Posts.getPostsData(pids);
	posts = await Promise.all(posts.map(Posts.parsePost));

	console.log('[POST-FILTERING] 🔍 Filtering posts by visibility for uid:', uid, 'Posts before filtering:', posts.length);

	// Filter posts based on visibility
	posts = await Posts.filterPostsByVisibility(posts, uid);

	console.log('[POST-FILTERING] ✅ Posts after visibility filtering:', posts.length);

	const data = await plugins.hooks.fire('filter:post.getPosts', { posts: posts, uid: uid });
	if (!data || !Array.isArray(data.posts)) {
		return [];
	}
	return data.posts.filter(Boolean);
};

Posts.getPostSummariesFromSet = async function (set, uid, start, stop) {
	let pids = await db.getSortedSetRevRange(set, start, stop);
	pids = await privileges.posts.filter('topics:read', pids, uid);
	const posts = await Posts.getPostSummaryByPids(pids, uid, { stripTags: false });
	return { posts: posts, nextStart: stop + 1 };
};

Posts.getPidIndex = async function (pid, tid, topicPostSort) {
	const set = topicPostSort === 'most_votes' ? `tid:${tid}:posts:votes` : `tid:${tid}:posts`;
	const reverse = topicPostSort === 'newest_to_oldest' || topicPostSort === 'most_votes';
	const index = await db[reverse ? 'sortedSetRevRank' : 'sortedSetRank'](set, pid);
	if (!utils.isNumber(index)) {
		return 0;
	}
	return utils.isNumber(index) ? parseInt(index, 10) + 1 : 0;
};

Posts.filterPostsByVisibility = async function (posts, uid) {
	if (!Array.isArray(posts) || !posts.length) {
		return posts;
	}

	const groups = require('../groups');

	// Get user's groups if user is logged in
	let userGroups = [];
	if (uid > 0) {
		userGroups = await groups.getUserGroups([uid]);
		userGroups = userGroups[0] || [];

		// Extract group names from group objects (some groups return objects, others strings)
		userGroups = userGroups.map(group => {
			if (typeof group === 'object' && group.name) {
				return group.name;
			}
			return group;
		});

		userGroups.push('registered-users'); // All logged-in users are in this group
	}
	userGroups.push('all'); // Everyone can see 'all' posts

	console.log('[POST-VISIBILITY] 👥 User groups for uid', uid, ':', userGroups);

	const filteredPosts = posts.filter((post) => {
		if (!post || !post.visibleTo) {
			// No visibility restriction, show to everyone
			console.log('[POST-VISIBILITY] 🌍 Post', post?.pid, 'has no visibility restriction');
			return true;
		}

		let visibleTo;
		try {
			visibleTo = Array.isArray(post.visibleTo) ? post.visibleTo : JSON.parse(post.visibleTo);
		} catch (e) {
			// If parsing fails, assume it's public
			console.log('[POST-VISIBILITY] ❌ Failed to parse visibleTo for post', post.pid, ':', post.visibleTo);
			return true;
		}

		// Check if post is public
		if (visibleTo.includes('all')) {
			console.log('[POST-VISIBILITY] 🌍 Post', post.pid, 'is public');
			return true;
		}

		// Check if user has access to any of the required groups
		const hasAccess = visibleTo.some(group => userGroups.includes(group));

		console.log('[POST-VISIBILITY]', hasAccess ? '✅' : '❌',
			'Post', post.pid, 'visibility:', visibleTo, 'User access:', hasAccess);

		return hasAccess;
	});

	console.log('[POST-VISIBILITY] 📊 Filtered', posts.length, 'posts down to', filteredPosts.length, 'for uid', uid);

	return filteredPosts;
};

Posts.getPostIndices = async function (posts, uid) {
	if (!Array.isArray(posts) || !posts.length) {
		return [];
	}
	const settings = await user.getSettings(uid);

	const byVotes = settings.topicPostSort === 'most_votes';
	let sets = posts.map(p => (byVotes ? `tid:${p.tid}:posts:votes` : `tid:${p.tid}:posts`));
	const reverse = settings.topicPostSort === 'newest_to_oldest' || settings.topicPostSort === 'most_votes';

	const uniqueSets = _.uniq(sets);
	let method = reverse ? 'sortedSetsRevRanks' : 'sortedSetsRanks';
	if (uniqueSets.length === 1) {
		method = reverse ? 'sortedSetRevRanks' : 'sortedSetRanks';
		sets = uniqueSets[0];
	}

	const pids = posts.map(post => post.pid);
	const indices = await db[method](sets, pids);
	return indices.map(index => (utils.isNumber(index) ? parseInt(index, 10) + 1 : 0));
};

Posts.modifyPostByPrivilege = function (post, privileges) {
	if (post && post.deleted && !(post.selfPost || privileges['posts:view_deleted'])) {
		post.content = '[[topic:post-is-deleted]]';
		if (post.user) {
			post.user.signature = '';
		}
	}
};

require('../promisify')(Posts);
