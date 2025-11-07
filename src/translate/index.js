
/* eslint-disable strict */
//var request = require('request');

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	const TRANSLATOR_API = 'http://128.2.221.60:5000'
	const response = await fetch(TRANSLATOR_API+'/?content='+postData.content);
	const data = await response.json();
	return [data.is_english, data.translated_content];
};
