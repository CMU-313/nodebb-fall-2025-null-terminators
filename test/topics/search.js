'use strict';

const assert = require('assert');

const db = require('../mocks/databasemock');
const categories = require('../../src/categories');
const topics = require('../../src/topics');
const posts = require('../../src/posts');
const User = require('../../src/user');
const groups = require('../../src/groups');
const helpers = require('../helpers');

describe('Topic Search', () => {
	let topic1;
	let topic2;
	let topic3;
	let categoryObj;
	let adminUid;
	let fooUid;

	before(async () => {
		adminUid = await User.create({ username: 'admin', password: '123456' });
		fooUid = await User.create({ username: 'foo', password: 'foofoofoo' });
		await groups.join('administrators', adminUid);
		await helpers.loginUser('admin', '123456');

		categoryObj = await categories.create({
			name: 'Test Category',
			description: 'Test category created by testing script',
		});
		topic1 = await topics.post({
			uid: adminUid,
			cid: categoryObj.cid,
			title: 'Welcome!',
			content: 'The content of the topic',
		});

		topic2 = await topics.post({
			uid: adminUid,
			cid: categoryObj.cid,
			title: 'Test Topic Title',
			content: 'Some more random words to fill the test post',
		});

		await helpers.loginUser('foo', 'foofoofoo');
		topic3 = await topics.post({
			uid: fooUid,
			cid: categoryObj.cid,
			title: 'One More',
			content: 'This is very fun!',
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

	it('should find topic by search term in post author', async function () {
		const topicsFound = await topics.searchInCategory('foo', categoryObj.cid, adminUid);
		const tids = topicsFound.map(t => parseInt(t.tid, 10));
		assert(topicsFound.length, 1);
		assert(tids.includes(topic3.topicData.tid));
	});

	it('should not include unrelated topics', async function () {
		const topicsFound = await topics.searchInCategory('welcome', categoryObj.cid, adminUid);
		const tids = topicsFound.map(t => parseInt(t.tid, 10));
		assert(!tids.includes(topic2.topicData.tid));
	});

	it('should return empty array if no match is found', async function () {
		const topicsFound = await topics.searchInCategory('nonexistentterm', categoryObj.cid, adminUid);
		assert.strictEqual(topicsFound.length, 0);
	});

	it('should return empty array if no match is found', async function () {
		const topicsFound = await topics.searchInCategory('nonexistentterm', categoryObj.cid, adminUid);
		assert.strictEqual(topicsFound.length, 0);
	});

	it('should not return duplicate topics if multiple search criteria are matched', async function () {
		// search term test is included in the title and content for topic2
		const topicsFound = await topics.searchInCategory('test', categoryObj.cid, adminUid);
		const count = topicsFound.filter(t => t.tid == topic2.topicData.tid).length;
		assert.strictEqual(count, 1);
	});

});