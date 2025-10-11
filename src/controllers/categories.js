'use strict';

const nconf = require('nconf');
const _ = require('lodash');

const categories = require('../categories');
const meta = require('../meta');
const pagination = require('../pagination');
const helpers = require('./helpers');
const privileges = require('../privileges');
const Posts = require('../posts');

const categoriesController = module.exports;

async function maskTeaserIfAnonymous(req, cat) {
	if (!cat || !cat.teaser || !cat.teaser.pid) return false;
	const row = await Posts.getPostFields(cat.teaser.pid, ['anonymous', 'uid', 'pid']);
	const isAnon = row && (row.anonymous === true || row.anonymous === 'true');
	if (!isAnon) return false;

	// owners/mods still see identity (match topics.js behavior)
	const isOwner = req.uid && parseInt(req.uid, 10) === parseInt(row.uid, 10);
	const canModerate = await privileges.posts.can('posts:moderate', row.pid, req.uid);
	if (isOwner || canModerate) return false;

	// mark teaser object as anonymous so downstream logic/templates can rely on it
	cat.teaser.anonymous = true;
	// assign a FRESH masked user object so we don't mutate any shared blobs
	cat.teaser.user = {
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
	return true;
}

categoriesController.list = async function (req, res) {
	res.locals.metaTags = [{
		name: 'title',
		content: String(meta.config.title || 'NodeBB'),
	}, {
		property: 'og:type',
		content: 'website',
	}];

	const allRootCids = await categories.getAllCidsFromSet('cid:0:children');
	const rootCids = await privileges.categories.filterCids('find', allRootCids, req.uid);
	const pageCount = Math.max(1, Math.ceil(rootCids.length / meta.config.categoriesPerPage));
	const page = Math.min(parseInt(req.query.page, 10) || 1, pageCount);
	const start = Math.max(0, (page - 1) * meta.config.categoriesPerPage);
	const stop = start + meta.config.categoriesPerPage - 1;
	const pageCids = rootCids.slice(start, stop + 1);

	const allChildCids = _.flatten(await Promise.all(pageCids.map(categories.getChildrenCids)));
	const childCids = await privileges.categories.filterCids('find', allChildCids, req.uid);
	const categoryData = await categories.getCategories(pageCids.concat(childCids));
	const tree = categories.getTree(categoryData, 0);
	await Promise.all([
		categories.getRecentTopicReplies(categoryData, req.uid, req.query),
		categories.setUnread(tree, pageCids.concat(childCids), req.uid),
		categories.calculateVisibleCounts(tree, req.uid),
	]);

	const data = {
		title: meta.config.homePageTitle || '[[pages:home]]',
		selectCategoryLabel: '[[pages:categories]]',
		categories: tree,
		pagination: pagination.create(page, pageCount, req.query),
	};

	
	await Promise.all(data.categories.map(async (category) => {
		helpers.trimChildren(category);
		helpers.setCategoryTeaser(category);
		await maskTeaserIfAnonymous(req, category);

		if (Array.isArray(category.children) && category.children.length) {
			await Promise.all(category.children.map(async (child) => {
				helpers.setCategoryTeaser(child);
				await maskTeaserIfAnonymous(req, child);
			}));
		}
	}));

	if (req.originalUrl.startsWith(`${nconf.get('relative_path')}/api/categories`) || req.originalUrl.startsWith(`${nconf.get('relative_path')}/categories`)) {
		data.title = '[[pages:categories]]';
		data.breadcrumbs = helpers.buildBreadcrumbs([{ text: data.title }]);
		res.locals.metaTags.push({
			property: 'og:title',
			content: '[[pages:categories]]',
		});
	}

	res.render('categories', data);
};
