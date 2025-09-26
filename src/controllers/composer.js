'use strict';

const nconf = require('nconf');

const user = require('../user');
const plugins = require('../plugins');
const topics = require('../topics');
const posts = require('../posts');
const helpers = require('./helpers');

exports.get = async function (req, res, callback) {
	res.locals.metaTags = {
		...res.locals.metaTags,
		name: 'robots',
		content: 'noindex',
	};

	const data = await plugins.hooks.fire('filter:composer.build', {
		req: req,
		res: res,
		next: callback,
		templateData: {},
	});

	if (res.headersSent) {
		return;
	}
	if (!data || !data.templateData) {
		return callback(new Error('[[error:invalid-data]]'));
	}

	if (data.templateData.disabled) {
		res.render('', {
			title: '[[modules:composer.compose]]',
		});
	} else {
		data.templateData.title = '[[modules:composer.compose]]';
		res.render('compose', data.templateData);
	}
};

exports.post = async function (req, res) {
	console.log('[API-CONTROLLER] 📥 Composer POST Request Received:', {
		uid: req.uid,
		bodyKeys: Object.keys(req.body),
		hasContent: !!req.body.content,
		hasCid: !!req.body.cid,
		hasTid: !!req.body.tid,
		hasVisibleTo: !!req.body.visibleTo,
		visibleToValue: req.body.visibleTo,
		url: req.url,
		method: req.method
	});

	const { body } = req;
	const data = {
		uid: req.uid,
		req: req,
		timestamp: Date.now(),
		content: body.content,
		handle: body.handle,
		fromQueue: false,
	};

	// Add visibleTo if provided
	if (body.visibleTo) {
		console.log('[API-CONTROLLER] 🔍 Processing visibleTo field:', body.visibleTo, 'Type:', typeof body.visibleTo);
		try {
			data.visibleTo = Array.isArray(body.visibleTo) ?
				body.visibleTo : JSON.parse(body.visibleTo);
			console.log('[API-CONTROLLER] ✅ Parsed visibleTo successfully:', data.visibleTo);
		} catch (e) {
			console.warn('[API-CONTROLLER] ❌ Failed to parse visibleTo, using default:', e.message);
			// If parsing fails, default to public
			data.visibleTo = ['all'];
		}
	} else {
		console.log('[API-CONTROLLER] 🔒 No visibleTo provided, will use default visibility');
	}
	req.body.noscript = 'true';

	if (!data.content) {
		return helpers.noScriptErrors(req, res, '[[error:invalid-data]]', 400);
	}
	async function queueOrPost(postFn, data) {
		const shouldQueue = await posts.shouldQueue(req.uid, data);
		if (shouldQueue) {
			delete data.req;
			return await posts.addToQueue(data);
		}
		return await postFn(data);
	}

	try {
		let result;
		if (body.tid) {
			data.tid = body.tid;
			console.log('[API-CONTROLLER] 💬 Processing REPLY:', {
				tid: data.tid,
				uid: data.uid,
				hasContent: !!data.content,
				visibleTo: data.visibleTo,
				contentPreview: data.content?.substring(0, 100) + '...'
			});
			result = await queueOrPost(topics.reply, data);
		} else if (body.cid) {
			data.cid = body.cid;
			data.title = body.title;
			data.tags = [];
			data.thumb = '';
			console.log('[API-CONTROLLER] 📝 Processing NEW TOPIC:', {
				cid: data.cid,
				title: data.title,
				uid: data.uid,
				hasContent: !!data.content,
				visibleTo: data.visibleTo,
				contentPreview: data.content?.substring(0, 100) + '...'
			});
			result = await queueOrPost(topics.post, data);
		} else {
			console.error('[API-CONTROLLER] ❌ Invalid data - missing both tid and cid');
			throw new Error('[[error:invalid-data]]');
		}
		if (!result) {
			console.error('[API-CONTROLLER] ❌ No result returned from backend');
			throw new Error('[[error:invalid-data]]');
		}

		if (result.queued) {
			console.log('[API-CONTROLLER] ⏱️ Post queued for moderation:', { queued: true });
			return res.redirect(`${nconf.get('relative_path') || '/'}?noScriptMessage=[[success:post-queued]]`);
		}

		console.log('[API-CONTROLLER] ✅ Post created successfully:', {
			pid: result.pid,
			tid: result.topicData?.tid,
			slug: result.topicData?.slug,
			queued: false
		});

		user.updateOnlineUsers(req.uid);
		let path = nconf.get('relative_path');
		if (result.pid) {
			path += `/post/${result.pid}`;
		} else if (result.topicData) {
			path += `/topic/${result.topicData.slug}`;
		}
		console.log('[API-CONTROLLER] 🔄 Redirecting to:', path);
		res.redirect(path);
	} catch (err) {
		console.error('[API-CONTROLLER] ❌ Error processing request:', {
			error: err.message,
			stack: err.stack?.substring(0, 500) + '...'
		});
		helpers.noScriptErrors(req, res, err.message, 400);
	}
};
