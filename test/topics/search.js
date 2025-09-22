'use strict';

const assert = require('assert');

const categories = require('../../src/categories');
const topics = require('../../src/topics');
const posts = require('../../src/posts');
const User = require('../../src/user');
const groups = require('../../src/groups');
const helpers = require('../helpers');

describe('Topic Search', () => {
	let topic1;
	let topic2;
	let categoryObj;
	let adminUid;
	let fooUid;

	before(async () => {
		adminUid = await User.create({ username: 'admin', password: '123456' });
		fooUid = await User.create({ username: 'foo' });
		await groups.join('administrators', adminUid);
		const adminLogin = await helpers.loginUser('admin', '123456');

		categoryObj = await categories.create({
			name: 'Test Category',
			description: 'Test category created by testing script',
		});
		topic1 = await topics.post({
			userId: adminUid,
			categoryId: categoryObj.cid,
			title: 'Welcome!',
			content: 'The content of test topic',
		});

		topic2 = await topics.post({
			userId: adminUid,
			categoryId: categoryObj.cid,
			title: 'Test Topic Title',
			content: 'Some more random words to fill the post',
		});
	});

	it('should find topic by search term in title', async function () {
		const topicsFound = await topics.searchInCategory('Welcome', categoryObj.cid, adminUid);
		const tids = topicsFound.map(t => parseInt(t.tid, 10));
		assert(tids.includes(topic1.topicData.tid));
	});

	it('should find topic by search term in title (case in sensitive)', async function () {
		const topicsFound = await topics.searchInCategory('welcome', categoryObj.cid, adminUid);
		const tids = topicsFound.map(t => parseInt(t.tid, 10));
		assert(tids.includes(topic1.topicData.tid));
	});

	it('should find topic by search term in post content', async function () {
		const topicsFound = await topics.searchInCategory('content', categoryObj.cid, adminUid);
		const tids = topicsFound.map(t => parseInt(t.tid, 10));
		assert(tids.includes(topic1.topicData.tid));
	});

	it('should not include unrelated topics', async function () {
		const topicsFound = await topics.searchInCategory('welcome', categoryObj.cid, adminUid);
		const tids = topicsFound.map(t => parseInt(t.tid, 10));
		assert(!tids.includes(topic2.topicData.tid));
	});

	it('should return empty array if no match is found', async function () {
		const topicsFound = await topics.searchInCategory('nonexistentkeyword', categoryObj.cid, adminUid);
		assert.strictEqual(topicsFound.length, 0);
	});

});