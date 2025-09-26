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
	if (!cat || !cat.teaser || !cat.teaser.pid || !cat.teaser.user) return false;
	const row = await Posts.getPostFields(cat.teaser.pid, ['anonymous', 'uid', 'pid']);
	const isAnon = row && (row.anonymous === true || row.anonymous === 'true');
	if (!isAnon) return false;

	const isOwner = req.uid && req.uid === parseInt(row.uid, 10);
	const canModerate = await privileges.posts.can('posts:moderate', row.pid, req.uid);
	if (isOwner || canModerate) return false;

	const u = cat.teaser.user;
	u.uid = 0;
	u.username = 'Anonymous';
	u.displayname = 'Anonymous';
	u.userslug = null;
	u.picture = null;
	// BOTH camelCase and colon-keyed icon keys
	u.iconText = 'A';
	u.iconBgColor = '#888';
	u['icon:text'] = 'A';
	u['icon:bgColor'] = '#888';
	// escaped variants some templates render
	u['username:escaped'] = 'Anonymous';
	u['displayname:escaped'] = 'Anonymous';
	u['userslug:escaped'] = '';
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
