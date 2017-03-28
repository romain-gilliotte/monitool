"use strict";

var assert     = require('assert'),
	DataSource = require('../../../resource/model/data-source');


describe('DataSource', function() {
	var oldDataSource, newDataSource;

	before(function() {
		oldDataSource = new DataSource({
			id: "formId",
			elements: [
				{
					id: "element1",
					partitions: [
						{
							id: "gender",
							elements: [
								{id: 'male'},
								{id: 'female'}
							],
							groups: []
						},
						{
							id: "age",
							elements: [
								{id: 'under_10'},
								{id: 'between_10_and_15'},
								{id: 'over_15'}
							],
							groups: []
						},
						{
							id: "somth",
							elements: [
								{id: 'something'},
								{id: 'something_else'}
							],
							groups: []
						}
					]
				},
				{
					id: 'element2',
					partitions: [
						{
							id: "gender",
							elements: [
								{id: 'male'},
								{id: 'female'}
							],
							groups: []
						}
					]
				}
			]
		});
	});

	beforeEach(function() {
		newDataSource = new DataSource(JSON.parse(JSON.stringify(oldDataSource)));
	});

	describe("signature", function() {

		it('renaming the form should not change anything', function() {
			newDataSource.name = "newName"

			assert.equal(oldDataSource.signature, newDataSource.signature);
		});

		it('Inverting two elements should not change anything', function() {
			var tmp = newDataSource.elements[0];
			newDataSource.elements[0] = newDataSource.elements[1];
			newDataSource.elements[1] = tmp;

			assert.equal(oldDataSource.signature, newDataSource.signature);
		});

		it('Adding an element should change the result', function() {
			newDataSource.elements.push({id: 'element3', partitions: []});

			assert.notEqual(oldDataSource.signature, newDataSource.signature);
		});

		it('Removing an element should change the result', function() {
			newDataSource.elements.splice(0, 1);

			assert.notEqual(oldDataSource.signature, newDataSource.signature);
		});

		it('Adding a partition should change the result', function() {
			newDataSource.elements[0].partitions.push({id: "location", elements: [{id: 'madrid'}, {id: 'paris'}]});

			assert.notEqual(oldDataSource.signature, newDataSource.signature);
		});

	});
});

