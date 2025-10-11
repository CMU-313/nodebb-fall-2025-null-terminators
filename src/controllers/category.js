'use strict';

const nconf = require('nconf');
const validator = require('validator');
const qs = require('querystring');

const db = require('../database');
const privileges = require('../privileges');
const user = require('../user');
const categories = require('../categories');
const meta = require('../meta');
const activitypub = require('../activitypub');
const pagination = require('../pagination');
const helpers = require('./helpers');
const utils = require('../utils');
const translator = require('../translator');
const analytics = require('../analytics');
const topics = require('../topics');
const Posts = require('../posts');

const categoryController = module.exports;

const url = nconf.get('url');
const relative_path = nconf.get('relative_path');
const validSorts = [
	'recently_replied', 'recently_created', 'most_posts', 'most_votes', 'most_views',
];

categoryController.get = async function (req, res, next) {
	let cid = req.params.category_id;
	const searchTerm = req.query.search_term;

	if (cid === '-1') {
		return helpers.redirect(res, `${res.locals.isAPI ? '/api' : ''}/world?${qs.stringify(req.query)}`);
	}

	if (!utils.isNumber(cid)) {
		const assertion = await activitypub.actors.assertGroup([cid]);
		if (!activitypub.helpers.isUri(cid)) {
			cid = await db.getObjectField('handle:cid', cid);
		}

		if (!assertion || !cid) {
			return next();
		}
	}

	let currentPage = parseInt(req.query.page, 10) || 1;
	let topicIndex = utils.isNumber(req.params.topic_index) ? parseInt(req.params.topic_index, 10) - 1 : 0;
	if ((req.params.topic_index && !utils.isNumber(req.params.topic_index))) {
		return next();
	}

	const [categoryFields, userPrivileges, tagData, userSettings, rssToken] = await Promise.all([
		categories.getCategoryFields(cid, ['slug', 'disabled', 'link']),
		privileges.categories.get(cid, req.uid),
		helpers.getSelectedTag(req.query.tag),
		user.getSettings(req.uid),
		user.auth.getFeedToken(req.uid),
	]);

	if (!categoryFields.slug ||
		(categoryFields && categoryFields.disabled) ||
		(userSettings.usePagination && currentPage < 1)) {
		return next();
	}
	if (topicIndex < 0) {
		return helpers.redirect(res, `/category/${categoryFields.slug}?${qs.stringify(req.query)}`);
	}

	if (!userPrivileges.read) {
		return helpers.notAllowed(req, res);
	}

	if (utils.isNumber(cid) && !res.locals.isAPI && !req.params.slug && (categoryFields.slug && categoryFields.slug !== `${cid}/`)) {
		return helpers.redirect(res, `/category/${categoryFields.slug}?${qs.stringify(req.query)}`, true);
	}

	if (categoryFields.link) {
		await db.incrObjectField(`category:${cid}`, 'timesClicked');
		return helpers.redirect(res, validator.unescape(categoryFields.link));
	}

	if (!userSettings.usePagination) {
		topicIndex = Math.max(0, topicIndex - (Math.ceil(userSettings.topicsPerPage / 2) - 1));
	} else if (!req.query.page) {
		const index = Math.max(parseInt((topicIndex || 0), 10), 0);
		currentPage = Math.ceil((index + 1) / userSettings.topicsPerPage);
		topicIndex = 0;
	}

	const targetUid = await user.getUidByUserslug(req.query.author);
	const start = ((currentPage - 1) * userSettings.topicsPerPage) + topicIndex;
	const stop = start + userSettings.topicsPerPage - 1;

	const sort = validSorts.includes(req.query.sort) ? req.query.sort : userSettings.categoryTopicSort;

	const categoryData = await categories.getCategoryById({
		uid: req.uid,
		cid: cid,
		start: start,
		stop: stop,
		sort: sort,
		settings: userSettings,
		query: req.query,
		tag: req.query.tag,
		targetUid: targetUid,
	});
	if (!categoryData) {
		return next();
	}

	// Return search term to template if exists, otherwise null
	categoryData.search_term = searchTerm || null;

	// Run search to return only matched topics when search term is present
	if (searchTerm) {
		const searchResults = await topics.searchInCategory(searchTerm, cid, req.uid);
		// Slicing array of results for pagination - get first page (from Copilot)
		categoryData.topics = searchResults.slice(start, stop + 1);
		categoryData.topic_count = searchResults.length;
	}

	if (topicIndex > Math.max(categoryData.topic_count - 1, 0)) {
		return helpers.redirect(res, `/category/${categoryData.slug}/${categoryData.topic_count}?${qs.stringify(req.query)}`);
	}
	const pageCount = Math.max(1, Math.ceil(categoryData.topic_count / userSettings.topicsPerPage));
	if (userSettings.usePagination && currentPage > pageCount) {
		return next();
	}

	categories.modifyTopicsByPrivilege(categoryData.topics, userPrivileges);

	// Ensure each topic has mainPid so we can check main-post anonymity if needed
	const tids = (categoryData.topics || []).map(t => t && t.tid).filter(Boolean);
	if (tids.length) {
		const mains = await topics.getTopicsFields(tids, ['mainPid']);
		categoryData.topics.forEach((t, i) => {
			if (t && !t.mainPid) t.mainPid = mains[i] && mains[i].mainPid;
		});
	}

	// MASK: apply anonymous masking to teasers and header authors (non-owners/mods)
	try {
		await Promise.all((categoryData.topics || []).map(async (t) => {
			if (!t) return;
			// Mask teaser user if teaser post is anonymous
			try {
				if (t.teaser && t.teaser.pid) {
					const row = await Posts.getPostFields(t.teaser.pid, ['anonymous', 'uid', 'pid']);
					const isAnon = row && (row.anonymous === true || row.anonymous === 'true');
					if (isAnon) {
						const isOwner = req.uid && parseInt(req.uid, 10) === parseInt(row.uid, 10);
						const canModerate = await privileges.posts.can('posts:moderate', row.pid, req.uid);
						if (!isOwner && !canModerate) {
							// Assign a fresh masked user object to avoid mutating shared user blobs
							t.teaser.user = {
								uid: 0,
								username: 'Anonymous',
								'username:escaped': 'Anonymous',
								displayname: 'Anonymous',
								'displayname:escaped': 'Anonymous',
								userslug: null,
								'userslug:escaped': '',
								picture: null,
								'icon:text': 'A',
								'icon:bgColor': '#888',
							};
							// mark teaser anonymous for templates
							t.teaser.anonymous = true;
						}
					}
				}
			} catch (e) { /* console.warn('[anon][category] teaser mask failed', e); */ }

			// Mask header/topic owner when main post is anonymous
			try {
				if (t.mainPid && t.user) {
					const mainAnon = await Posts.getPostField(t.mainPid, 'anonymous');
					const isMainAnon = (mainAnon === true || mainAnon === 'true');
					if (isMainAnon) {
						const mainOwnerUid = await Posts.getPostField(t.mainPid, 'uid');
						const isOwner = req.uid && parseInt(req.uid, 10) === parseInt(mainOwnerUid, 10);
						const canModerate = await privileges.posts.can('posts:moderate', t.mainPid, req.uid);
						if (!isOwner && !canModerate) {
							// Assign fresh masked user object for the topic header
							t.user = {
								uid: 0,
								username: 'Anonymous',
								'username:escaped': 'Anonymous',
								displayname: 'Anonymous',
								'displayname:escaped': 'Anonymous',
								userslug: null,
								'userslug:escaped': '',
								picture: null,
								'icon:text': 'A',
								'icon:bgColor': '#888',
							};
						}
					}
				}
			} catch (e) { /* console.warn('[anon][category] header mask failed', e); */ }
		}));
	} catch (e) { /* console.warn('[anon][category] masking failed', e); */ }


	categoryData.tagWhitelist = categories.filterTagWhitelist(categoryData.tagWhitelist, userPrivileges.isAdminOrMod);

	const allCategories = [];
	categories.flattenCategories(allCategories, categoryData.children);

	await Promise.all([
		buildBreadcrumbs(req, categoryData),
		categories.setUnread([categoryData], allCategories.map(c => c.cid).concat(cid), req.uid),
	]);

	// Calculate visible counts for this category and children
	await categories.calculateVisibleCounts(categoryData, req.uid);

	if (categoryData.children.length) {
		await categories.getRecentTopicReplies(allCategories, req.uid, req.query);
		categoryData.subCategoriesLeft = Math.max(0, categoryData.children.length - categoryData.subCategoriesPerPage);
		categoryData.hasMoreSubCategories = categoryData.children.length > categoryData.subCategoriesPerPage;
		categoryData.nextSubCategoryStart = categoryData.subCategoriesPerPage;
		categoryData.children = categoryData.children.slice(0, categoryData.subCategoriesPerPage);
		categoryData.children.forEach((child) => {
			if (child) {
				helpers.trimChildren(child);
				helpers.setCategoryTeaser(child);
			}
		});
	}

	categoryData.title = translator.escape(categoryData.name);
	categoryData.selectCategoryLabel = '[[category:subcategories]]';
	categoryData.description = translator.escape(categoryData.description);
	categoryData.privileges = userPrivileges;
	categoryData.showSelect = userPrivileges.editable;
	categoryData.showTopicTools = userPrivileges.editable;
	categoryData.topicIndex = topicIndex;
	categoryData.selectedTag = tagData.selectedTag;
	categoryData.selectedTags = tagData.selectedTags;
	categoryData.sortOptionLabel = `[[topic:${validator.escape(String(sort)).replace(/_/g, '-')}]]`;

	if (!meta.config['feeds:disableRSS']) {
		categoryData.rssFeedUrl = `${url}/category/${categoryData.cid}.rss`;
		if (req.loggedIn) {
			categoryData.rssFeedUrl += `?uid=${req.uid}&token=${rssToken}`;
		}
	}

	addTags(categoryData, res, currentPage);

	categoryData['feeds:disableRSS'] = meta.config['feeds:disableRSS'] || 0;
	categoryData['reputation:disabled'] = meta.config['reputation:disabled'];
	categoryData.pagination = pagination.create(currentPage, pageCount, req.query);
	categoryData.pagination.rel.forEach((rel) => {
		rel.href = `${url}/category/${categoryData.slug}${rel.href}`;
		res.locals.linkTags.push(rel);
	});

	analytics.increment([`pageviews:byCid:${categoryData.cid}`]);

	if (meta.config.activitypubEnabled) {
		// Include link header for richer parsing
		res.set('Link', `<${nconf.get('url')}/category/${cid}>; rel="alternate"; type="application/activity+json"`);

		// Category accessible
		const remoteOk = await privileges.categories.can('read', cid, activitypub._constants.uid);
		if (remoteOk) {
			categoryData.handleFull = `${categoryData.handle}@${nconf.get('url_parsed').host}`;
		}
	}

	res.render('category', categoryData);
};

async function buildBreadcrumbs(req, categoryData) {
	const breadcrumbs = [
		{
			text: categoryData.name,
			url: `${url}/category/${categoryData.slug}`,
			cid: categoryData.cid,
		},
	];
	const crumbs = await helpers.buildCategoryBreadcrumbs(categoryData.parentCid);
	if (req.originalUrl.startsWith(`${relative_path}/api/category`) || req.originalUrl.startsWith(`${relative_path}/category`)) {
		categoryData.breadcrumbs = crumbs.concat(breadcrumbs);
	}
}

function addTags(categoryData, res, currentPage) {
	res.locals.metaTags = [
		{
			name: 'title',
			content: categoryData.name,
			noEscape: true,
		},
		{
			property: 'og:title',
			content: categoryData.name,
			noEscape: true,
		},
		{
			name: 'description',
			content: categoryData.description,
			noEscape: true,
		},
		{
			property: 'og:type',
			content: 'website',
		},
	];

	if (categoryData.backgroundImage) {
		if (!categoryData.backgroundImage.startsWith('http')) {
			categoryData.backgroundImage = url + categoryData.backgroundImage;
		}
		res.locals.metaTags.push({
			property: 'og:image',
			content: categoryData.backgroundImage,
			noEscape: true,
		});
	}

	const page = currentPage > 1 ? `?page=${currentPage}` : '';
	res.locals.linkTags = [
		{
			rel: 'up',
			href: url,
		},
		{
			rel: 'canonical',
			href: `${url}/category/${categoryData.slug}${page}`,
			noEscape: true,
		},
	];

	if (!categoryData['feeds:disableRSS']) {
		res.locals.linkTags.push({
			rel: 'alternate',
			type: 'application/rss+xml',
			href: categoryData.rssFeedUrl,
		});
	}

	if (meta.config.activitypubEnabled) {
		res.locals.linkTags.push({
			rel: 'alternate',
			type: 'application/activity+json',
			href: `${nconf.get('url')}/category/${categoryData.cid}`,
		});
	}
}

module.exports = categoryController;
