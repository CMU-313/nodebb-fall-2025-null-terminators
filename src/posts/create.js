'use strict';

const meta = require('../meta');
const db = require('../database');
const plugins = require('../plugins');
const user = require('../user');
const topics = require('../topics');
const categories = require('../categories');
const groups = require('../groups');
const privileges = require('../privileges');
const activitypub = require('../activitypub');
const utils = require('../utils');

module.exports = function (Posts) {
	Posts.create = async function (data) {
		console.log('[DATABASE-POSTS] 💾 Posts.create called with data:', {
			uid: data.uid,
			tid: data.tid,
			hasContent: !!data.content,
			contentLength: data.content?.toString().length,
			isMain: data.isMain || false,
			hasVisibleTo: !!data.visibleTo,
			visibleTo: data.visibleTo,
			toPid: data.toPid,
			timestamp: data.timestamp,
			contentPreview: data.content?.toString().substring(0, 100) + '...',
		});

		// This is an internal method, consider using Topics.reply instead
		const { uid, tid, _activitypub, sourceContent } = data;
		const content = data.content.toString();
		const timestamp = data.timestamp || Date.now();
		const isMain = data.isMain || false;

		if (!uid && parseInt(uid, 10) !== 0) {
			throw new Error('[[error:invalid-uid]]');
		}

		if (data.toPid) {
			await checkToPid(data.toPid, uid);
		}

		const pid = data.pid || await db.incrObjectField('global', 'nextPid');

		console.log('[DATABASE-POSTS] 🆔 Generated PID:', pid);

		// Validate and set visibility
		console.log('[DATABASE-POSTS] 🔍 Validating visibility for post:', data.visibleTo);
		const validatedVisibleTo = await validateVisibleTo(data.visibleTo, uid);
		console.log('[DATABASE-POSTS] ✅ Visibility validated:', validatedVisibleTo);

		let postData = {
			pid, uid, tid, content, sourceContent, timestamp,
			visibleTo: JSON.stringify(validatedVisibleTo),
		};

		console.log('[DATABASE-POSTS] 📝 Prepared post data for database:', {
			pid: postData.pid,
			uid: postData.uid,
			tid: postData.tid,
			contentLength: postData.content?.length,
			visibleTo: postData.visibleTo,
			hasSourceContent: !!postData.sourceContent,
		});

		if (data.toPid) {
			postData.toPid = data.toPid;
		}
		if (data.ip && meta.config.trackIpPerPost) {
			postData.ip = data.ip;
		}
		if (data.handle && !parseInt(uid, 10)) {
			postData.handle = data.handle;
		}
		if (_activitypub) {
			if (_activitypub.url) {
				postData.url = _activitypub.url;
			}
			if (_activitypub.audience) {
				postData.audience = _activitypub.audience;
			}
		}

		// Rewrite emoji references to inline image assets
		if (_activitypub && _activitypub.tag && Array.isArray(_activitypub.tag)) {
			_activitypub.tag
				.filter(tag => tag.type === 'Emoji' &&
					tag.icon && tag.icon.type === 'Image')
				.forEach((tag) => {
					if (!tag.name.startsWith(':')) {
						tag.name = `:${tag.name}`;
					}
					if (!tag.name.endsWith(':')) {
						tag.name = `${tag.name}:`;
					}

					postData.content = postData.content.replace(new RegExp(tag.name, 'g'), `<img class="not-responsive emoji" src="${tag.icon.url}" title="${tag.name}" />`);
				});
		}

		({ post: postData } = await plugins.hooks.fire('filter:post.create', { post: postData, data: data }));

		console.log('[DATABASE-POSTS] 💾 Writing post to database:', {
			key: `post:${postData.pid}`,
			pid: postData.pid,
			uid: postData.uid,
			tid: postData.tid,
			visibleTo: postData.visibleTo,
			contentLength: postData.content?.length,
		});

		await db.setObject(`post:${postData.pid}`, postData);

		console.log('[DATABASE-POSTS] ✅ Post written to database successfully');

		const topicData = await topics.getTopicFields(tid, ['cid', 'pinned']);
		postData.cid = topicData.cid;

		await Promise.all([
			db.sortedSetAdd('posts:pid', timestamp, postData.pid),
			utils.isNumber(pid) ? db.incrObjectField('global', 'postCount') : null,
			user.onNewPostMade(postData),
			topics.onNewPostMade(postData),
			categories.onNewPostMade(topicData.cid, topicData.pinned, postData),
			groups.onNewPostMade(postData),
			addReplyTo(postData, timestamp),
			Posts.uploads.sync(postData.pid),
		]);

		const result = await plugins.hooks.fire('filter:post.get', { post: postData, uid: data.uid });
		result.post.isMain = isMain;

		console.log('[DATABASE-POSTS] ✅ Post creation completed successfully:', {
			pid: result.post.pid,
			tid: result.post.tid,
			uid: result.post.uid,
			isMain: result.post.isMain,
			visibleTo: result.post.visibleTo,
			finalResult: 'SUCCESS',
		});

		plugins.hooks.fire('action:post.save', { post: { ...result.post, _activitypub } });
		return result.post;
	};

	async function addReplyTo(postData, timestamp) {
		if (!postData.toPid) {
			return;
		}
		await Promise.all([
			db.sortedSetAdd(`pid:${postData.toPid}:replies`, timestamp, postData.pid),
			db.incrObjectField(`post:${postData.toPid}`, 'replies'),
		]);
	}

	async function checkToPid(toPid, uid) {
		if (!utils.isNumber(toPid) && !activitypub.helpers.isUri(toPid)) {
			throw new Error('[[error:invalid-pid]]');
		}

		const [toPost, canViewToPid] = await Promise.all([
			Posts.getPostFields(toPid, ['pid', 'deleted']),
			privileges.posts.can('posts:view_deleted', toPid, uid),
		]);
		const toPidExists = !!toPost.pid;
		if (!toPidExists || (toPost.deleted && !canViewToPid)) {
			throw new Error('[[error:invalid-pid]]');
		}
	}

	async function validateVisibleTo(visibleTo, uid) {
		console.log('[DATABASE-VALIDATION] 🔍 Validating post visibility:', { visibleTo, uid, type: typeof visibleTo });

		// If post is public, no validation needed
		if (!visibleTo || !Array.isArray(visibleTo) || visibleTo.includes('all')) {
			console.log('[DATABASE-VALIDATION] 🌍 Public post detected, allowing all users');
			return ['all'];
		}

		// Guests can only create public posts
		if (parseInt(uid, 10) === 0) {
			console.error('[DATABASE-VALIDATION] ❌ Guest user trying to create restricted post');
			throw new Error('[[error:guests-cant-create-restricted-posts]]');
		}

		// Validate that all specified groups exist
		console.log('[DATABASE-VALIDATION] 🔍 Checking if groups exist:', visibleTo);
		const groupsExist = await groups.exists(visibleTo);
		console.log('[DATABASE-VALIDATION] 🔍 Groups existence check results:', groupsExist);

		const invalidGroups = visibleTo.filter((groupName, index) =>
			groupName !== 'all' && !groupsExist[index]);

		if (invalidGroups.length > 0) {
			console.error('[DATABASE-VALIDATION] ❌ Invalid groups found:', invalidGroups);
			throw new Error(`[[error:groups-do-not-exist, ${invalidGroups.join(', ')}]]`);
		}

		console.log('[DATABASE-VALIDATION] ✅ Post visibility validation passed for groups:', visibleTo);
		return visibleTo;
	}
};
