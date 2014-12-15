"use strict";

var reportingServices = angular.module('monitool.services.reporting', ['monitool.services.database']);

reportingServices.factory('mtForms', function() {

	var annotateFormElement = function(formElement, currentKeyPath, currentIndicatorPath, indicatorsById) {
		var indicator = indicatorsById[formElement.id];
		formElement.name = indicator.name;
		formElement.keyPath = currentKeyPath;
		formElement.indicatorPath = currentIndicatorPath;
		formElement.availableTypes = [{value: 'input', label: 'Input', group: null}]; // input is always allowed
		formElement.model = formElement.type.substring(0, 5) === 'link:' ? formElement.type.substring(5) : formElement.keyPath;
		formElement.timeAggregation = indicator.timeAggregation;
		formElement.geoAggregation = indicator.geoAggregation;

		formulaLoop:for (var formulaId in indicator.formulas) {
			var formula = indicator.formulas[formulaId];

			// Skip a formula if one of it's parameters is a parent.
			// Note: I'am not sure this is always relevant.
			var parentIndicators = formElement.indicatorPath.split('.');
			for (var key in formula.parameters)
				if (parentIndicators.indexOf(formula.parameters[key]) !== -1)
					continue formulaLoop;

			// Add each formula to the element
			formElement.availableTypes.push({value: 'compute:' + formulaId, label: formula.name, group: "compute"});

			// if the element is computed using the current formula
			// => recurse and annotate children
			if (formElement.type === 'compute:' + formulaId) {
				formElement.expression = formula.expression;
				for (var key in formula.parameters) {
					formElement.parameters[key].id = formula.parameters[key];
					annotateFormElement(
						formElement.parameters[key],
						currentKeyPath + '.' + key,
						currentIndicatorPath + '.' + formula.parameters[key],
						indicatorsById
					);
				}
			}
		}
	};

	var annotateAllFormElements = function(formElements, indicatorsById) {
		formElements.forEach(function(formElement) {
			annotateFormElement(formElement, formElement.id, formElement.id, indicatorsById);
		});
	};

	// Makes an array with all formElements by traversing the tree.
	var flatten = function(formElements) {
		var flattenRec = function(formElement) {
			var result = [formElement];
			for (var key in formElement.parameters)
				result = result.concat(flattenRec(formElement.parameters[key]))
			return result;
		};

		var flatFormElements = [];
		formElements.forEach(function(formElement) {
			flatFormElements = flatFormElements.concat(flattenRec(formElement));
		});
		return flatFormElements;
	};


	// FIXME: creating infinite loops is possible when using 2 indicators that links to each other
	// compute parameters.
	var buildLinks = function(formElements, indicatorsById) {
		// flatten all form elements in an array to iterate it with native methods
		var flatFormElements = flatten(formElements);

		// we need to add all valid links now.
		flatFormElements.forEach(function(changingFormElement) {
			// Remove previously build links.
			changingFormElement.availableTypes = changingFormElement.availableTypes.filter(function(type) {
				return type.value.substring(0, "link".length) !== 'link';
			});

			// Search for all possible links, in O(n), because we're lazy.
			flatFormElements.forEach(function(linkFormElement) {
				if (changingFormElement.id === linkFormElement.id
					&& linkFormElement.keyPath !== changingFormElement.keyPath.substring(0, linkFormElement.keyPath.length) // can't link to a parent or yourself.
					// && changingFormElement.keyPath !== linkFormElement.keyPath  // can't link to youself
					&& linkFormElement.type.substring(0, "link".length) !== 'link') {

					var name = indicatorsById[linkFormElement.keyPath.split('.')[0]].name;
					if (linkFormElement.keyPath.indexOf('.') !== -1)
						name += ' > ' + linkFormElement.keyPath.split('.').slice(1).join(' > ');

					changingFormElement.availableTypes.push({
						value: 'link:' + linkFormElement.keyPath,
						label: name,
						group: 'Lien'
					});
				}
			});
		});
	};

	// Removing an indicator from the tree means we need to
	// - delete the entry in the tree.
	// - change all broken links to that subtree to inputs.
	var deleteFormElement = function(formElements, formElement) {
		// Delete element from tree.
		var path = formElement.keyPath.split('.');
		if (path.length === 1)
			formElements.splice(formElements.indexOf(formElement), 1);
		else {
			// Start from root and look for the parent of formElement.
			var parent = formElements.find(function(fe) { return fe.id == path[0]; });
			for (var i = 1; i < path.length - 1; ++i)
				parent = parent.parameters[path[i]];
			delete parent.parameters[path[path.length - 1]];
		}

		// Replace all broken links by inputs.
		// That's not ideal but choosing a way to fix the tree that makes sense when there are deeplinks is far from easy.
		// On the GUI this behaviour seems more natural than reparenting/cloning subtrees.
		var brokenLinkPrefix = 'link:' + formElement.keyPath;
		flatten(formElements).forEach(function(brokenFormElement) {
			if (brokenFormElement.type.substring(0, brokenLinkPrefix.length) === brokenLinkPrefix)
				brokenFormElement.type = 'input';
		});
	};

	var deAnnotateFormElements = function(formElement, deleteId) {
		for (var key in formElement.parameters)
			deAnnotateFormElements(formElement.parameters[key], true);

		if (deleteId)
			delete formElement.id;
		
		if (formElement.type !== 'input')
			delete formElement.source;

		delete formElement.name;
		delete formElement.expression;
		delete formElement.availableTypes;
		delete formElement.keyPath;
		delete formElement.indicatorPath;
		delete formElement.model;
	};

	var deAnnotateAllFormElements = function(formElements) {
		formElements.forEach(function(formElement) {
			deAnnotateFormElements(formElement, false);
		});
	};

	var evaluate = function(formElement, formElements, scope) {
		var parts = formElement.type.split(':'),
			type  = parts[0],
			id    = parts.length > 1 ? parts[1] : null;

		if (type === 'compute') {
			var localScope = {};
			for (var key in formElement.parameters) {
				evaluate(formElement.parameters[key], formElements, scope);
				localScope[key] = scope[formElement.parameters[key].model];
			}

			try { scope[formElement.model] = math.eval(formElement.expression, localScope); }
			catch (e) { scope[formElement.model] = undefined; }
		}
		else if (type === 'link') {
			var path = id.split('.');
			var linkedElement = formElements.find(function(fe) { return fe.id == path[0]; });
			for (var i = 1; i < path.length; ++i)
				linkedElement = linkedElement.parameters[path[i]];

			evaluate(linkedElement, formElements, scope);
		}
	};

	var evaluateAll = function(formElements, scope) {
		formElements.forEach(function(formElement) {
			evaluate(formElement, formElements, scope);
		});
	};

	return {
		evaluate: evaluate,
		evaluateAll: evaluateAll,
		annotateFormElement: annotateFormElement,
		annotateAllFormElements: annotateAllFormElements,
		flatten: flatten,
		buildLinks: buildLinks,
		deleteFormElement: deleteFormElement,
		deAnnotateFormElements: deAnnotateFormElements,
		deAnnotateAllFormElements: deAnnotateAllFormElements,
	};
});


reportingServices.factory('mtFormula', function($q, mtDatabase) {
	return {
		/**
		 * In: {expression: "a + b", parameters: {a: 42}}
		 * Out {expression: "a + b", parameters: {a: 42}, symbols: ['a', 'b'], isValid: false}
		 */
		annotate: function(formula) {
			// Helper function to recursively retrieve symbols from abstract syntax tree.
			var getSymbolsRec = function(root, symbols) {
				if (root.type === 'OperatorNode' || root.type === 'FunctionNode')
					root.params.forEach(function(p) { getSymbolsRec(p, symbols); });
				else if (root.type === 'SymbolNode')
					symbols[root.name] = true;

				return Object.keys(symbols);
			};
			
			formula.isValid = true;
			try {
				var expression = math.parse(formula.expression);
				// do not allow empty formula
				if (expression.type === 'ConstantNode' && expression.value === 'undefined')
					throw new Error();
				
				formula.symbols = getSymbolsRec(expression, {});
			}
			catch (e) { 
				formula.symbols = [];
				formula.isValid = false;
			}

			var numSymbols = formula.symbols.length;
			for (var i = 0; i < numSymbols; ++i)
				if (!formula.parameters[formula.symbols[i]])
					formula.isValid = false;

			if (!formula.name)
				formula.isValid = false;
		},

		/**
		 * Clean up
		 */
		clean: function(formula) {
			delete formula.isValid;
			delete formula.symbols;
		},
		
	}
});


reportingServices.factory('mtReporting', function($q, mtForms, mtDatabase) {

	var sumBy = function(inputs, groupBy) {
		var result = {};

		inputs.forEach(function(input) {
			input[groupBy].forEach(function(key) {
				if (!result[key])
					result[key] = angular.copy(input.values);
				else
					for (var indicatorId in input.values) {
						if (result[key][indicatorId])
							result[key][indicatorId] += input.values[indicatorId];
						else
							result[key][indicatorId] = input.values[indicatorId];
					}
			});
		});

		return result;
	};

	var getStatsColumns = function(query) {
		if (['year', 'month', 'week', 'day'].indexOf(query.groupBy) !== -1) {
			var begin   = moment(query.begin, 'YYYY-MM-DD').startOf(query.groupBy === 'week' ? 'isoWeek' : query.groupBy),
				end     = moment(query.end, 'YYYY-MM-DD').endOf(query.groupBy === 'week' ? 'isoWeek' : query.groupBy),
				format  = {'year': 'YYYY', 'month': 'YYYY-MM', 'week': 'YYYY-MM-[W]WW', 'day': 'YYYY-MM-DD'}[query.groupBy],
				current = begin.clone(),
				cols    = [];

			while (current.isBefore(end) || current.isSame(end)) {
				var date = current.format(format);
				cols.push({id: date, name: date});
				current.add(1, query.groupBy);
			}

			cols.push({id: 'total', name: 'Total'});

			return cols;
		}
		else if (query.groupBy === 'entity') {
			if (query.type === 'project')
				return query.project.inputEntities.concat([{id:'total',name:'Total'}]);
			else if (query.type === 'entity')
				return query.project.inputEntities.filter(function(e) { return e.id === query.id })
											.concat([{id:'total',name:'Total'}]);
			else  if (query.type === 'group') {
				var group = query.project.inputGroups.find(function(g) { return g.id === query.id });
				return query.project.inputEntities.filter(function(e) { return group.members.indexOf(e.id) !== -1 })
											.concat([{id:'total',name:'Total'}]);
			}
		}
		else if (query.groupBy === 'group') {
			if (query.type === 'project')
				return query.project.inputGroups;
			else if (query.type === 'entity')
				return query.project.inputGroups.filter(function(g) { return g.members.indexOf(query.id) !== -1 });
			else if (query.type === 'group')
				return query.project.inputGroups.filter(function(g) { return g.id === query.id });
		}
		else
			throw new Error('Invalid groupBy: ' + query.groupBy)
	};

	// @FIXME Should be a dichotomy, and targets should be sorted all the time (before saving).
	var getTargetValue = function(period, planning) {
		var targets = planning.targets, numTargets = targets.length;
		if (numTargets == 0)
			return 0;
		
		targets.sort(function(a, b) { return a.period.localeCompare(b.period); });
		var index = 0;
		while (index < numTargets) {
			if (targets[index].period > period)
				return targets[index].value;
			++index;
		}

		return targets[numTargets - 1].value;
	};

	var retrieveMetadata = function(project, regrouped, begin, groupBy) {
		// add metadata
		var regroupedWithMetadata = {};
		for (var key in regrouped) {
			regroupedWithMetadata[key] = {};

			for (var indicatorId in regrouped[key]) {
				var params   = project.indicators[indicatorId],
					metadata = {value: Math.round(regrouped[key][indicatorId])};

				// compute display value
				if (params) {
					var targetValue = getTargetValue(groupBy === 'month' ? key : begin.format('YYYY-MM-DD'), params);

					metadata.baselinePart = Math.round(100 * metadata.value / params.baseline);
					metadata.targetPart = Math.round(100 * metadata.value / targetValue);

					// compute color
					if (params.greenMinimum <= metadata.value && metadata.value <= params.greenMaximum)
						metadata.color = '#AFA';
					else if (params.orangeMinimum <= metadata.value && metadata.value <= params.orangeMaximum)
						metadata.color = '#FC6';
					else
						metadata.color = '#F88';
				}

				regroupedWithMetadata[key][indicatorId] = metadata;
			}
		}

		return regroupedWithMetadata;
	};

	var getInputs = function(query) {
		// Retrieve all relevant inputs.
		var view, opts;
		if (query.type === 'project' || query.type === 'group') {
			view = 'reporting/inputs_by_project_date';
			opts = {startkey: [query.project._id, query.begin], endkey: [query.project._id, query.end], include_docs: true};
		}
		else if (query.type === 'entity') {
			view = 'reporting/inputs_by_entity_date';
			opts = {startkey: [query.id, query.begin], endkey: [query.id, query.end], include_docs: true};
		}
		else
			throw new Error('query.type must be project, group or entity');

		return mtDatabase.current.query(view, opts).then(function(result) {
			var inputs = result.rows.map(function(row) { return row.doc; });
			
			// annotate each input with keys that will later tell the sumBy function how to aggregate the data.
			inputs.forEach(function(input) {
				var period = input.period.split('-');

				var groupIds = query.project.inputGroups.filter(function(group) {
					return group.members.indexOf(input.entity) !== -1;
				}).map(function(group) {
					return group.id;
				});

				input.yearAgg   = ['total', period.slice(0, 1).join('-')];
				input.weekAgg   = ['total', moment(input.period, 'YYYY-MM-DD').format('YYYY-MM-[W]WW')];
				input.monthAgg  = ['total', period.slice(0, 2).join('-')];
				input.dayAgg    = ['total', input.period];
				input.entityAgg = ['total', input.entity];
				input.groupAgg  = groupIds; // no total here, groups don't sum
			});

			// for a group, discard all inputs that are not relevant...
			if (query.type === 'group')
				inputs = inputs.filter(function(input) { return input.groupAgg.indexOf(query.id) !== -1 });

			return inputs;
		});
	};

	/**
	 * This function regroup inputs into a usable 2 level hash. ex: {2014-01: {indicatorId: 455}}
	 * it could be optimized a bit, and extra copy is done at the end
	 */
	var regroup = function(inputs, query) {
		var aggregationKey  = ['year', 'month', 'week', 'day'].indexOf(query.groupBy) !== -1 ? 'timeAggregation' : 'geoAggregation',
			globalRegrouped = {};

		// we want to compute all data
		query.project.dataCollection.forEach(function(form) {
			// to make our work easier later, we create a hash table (indicatorPath => formElement)
			var formElementsByModel = {};
			mtForms.flatten(form.fields).forEach(function(formElement) {
				if (formElement.type.substring(0, 5) !== 'link:')
					formElementsByModel[formElement.model] = formElement;
			});

			// Retrieve all forms that were made by current form and group them as asked.
			var formInputs         = inputs.filter(function(input) { return input.form === form.id; }),
				formRawRegrouped   = sumBy(inputs, query.groupBy + 'Agg'),
				formFinalRegrouped = {};

			// "for each month" "for each year" "for each inputEntity", etc...
			for (var groupkey in formRawRegrouped) {
				// First pass: compute everythink we can, only with averages and sums, and delete values that are wrong.
				for (var indicatorModel in formRawRegrouped[groupkey]) {
					if (indicatorModel === 'count')
						continue;

					var formElement = formElementsByModel[indicatorModel];

					// if no aggregation was done (count === 1), then "none" values are not to be deleted!
					if (formElement[aggregationKey] === 'none' && formRawRegrouped[groupkey].count !== 1)
						delete formRawRegrouped[groupkey][indicatorModel];

					// looping the input fields instead of formElements ensures that we won't divide twice the same element.
					else if (formElement[aggregationKey] === 'average')
						formRawRegrouped[groupkey][indicatorModel] /= formRawRegrouped[groupkey].count;
				}

				// Now that all values are either gone or right in the scope, compute missing values.
				// This may not succeed, but that's OK: the user was warned when the form was created.
				formFinalRegrouped[groupkey] = {};
				form.fields.forEach(function(formElement) {

					// if the value was computed by simple sum or average, take it.
					if (formRawRegrouped[groupkey][formElement.model] !== undefined)
						formFinalRegrouped[groupkey][formElement.id] = formRawRegrouped[groupkey][formElement.model];

					// otherwise, try to compute it.
					else {
						mtForms.evaluate(formElement, form.fields, formRawRegrouped[groupkey]);

						// try again to take it
						if (formRawRegrouped[groupkey][formElement.model] !== undefined)
							formFinalRegrouped[groupkey][formElement.id] = formRawRegrouped[groupkey][formElement.model];
					}
					
				});
			}

			// copy values in the final hash and replace conflicted values by a marker
			// the only way to have conflicted values is to aggregate over a time range where 2 different forms where used.
			for (var groupkey in formFinalRegrouped) {
				if (!globalRegrouped[groupkey])
					globalRegrouped[groupkey] = {};

				for (var indicatorId in formFinalRegrouped[groupkey]) {
					if (globalRegrouped[groupkey][indicatorId] !== undefined)
						globalRegrouped[groupkey][indicatorId] = 'CONFLICT';
					else
						globalRegrouped[groupkey][indicatorId] = formFinalRegrouped[groupkey][indicatorId]
				}
			}
		});
		
		return retrieveMetadata(query.project, globalRegrouped, moment(query.begin), query.groupBy);
	};


	// var getIndicatorStats = function(indicator, projects, begin, end, groupBy) {
	// 	begin = moment(begin, 'YYYY-MM-DD');
	// 	end   = moment(end, 'YYYY-MM-DD');

	// 	var queries = projects.map(function(project) {
	// 		return mtDatabase.current.query('reporting/inputs_by_project_year_month_entity', {
	// 			startkey: [project._id, begin.format('YYYY'), begin.format('MM')],
	// 			endkey: [project._id, end.format('YYYY'), end.format('MM'), {}],
	// 			group: true // we need centers...
	// 		});
	// 	});

	// 	return $q.all(queries).then(function(results) {
	// 		var regrouped = {};

	// 		results.map(function(result, index) {
	// 			// regroup, and add metadata for each project stats (they all use different settings)
	// 			// this use JSON compound keys to keep time and project/entity
	// 			var pRegrouped = regroup(result.rows, function(key) {
	// 				var period  = groupBy === 'month' ? key[1] + '-' + key[2] : key[1],
	// 					project = key[0],
	// 					center  = key[3],
	// 					keys    = [[period, center], [period, project], ['total', center], ['total', project]];

	// 				return keys.map(JSON.stringify);
	// 			});

	// 			evaluateAll(projects[index], pRegrouped);
	// 			return retrieveMetadata(projects[index], pRegrouped, begin, groupBy);
	// 		}).forEach(function(pRegrouped) {
	// 			// Nest the JSON.keys into a 2 level hash.
	// 			for (var compoundKey in pRegrouped) {
	// 				var key = JSON.parse(compoundKey);
	// 				if (!regrouped[key[0]])
	// 					regrouped[key[0]] = {};
	// 				regrouped[key[0]][key[1]] = pRegrouped[compoundKey];
	// 			}
	// 		});
	// 		return regrouped;
	// 	});
	// };

	var getDefaultStartDate = function(project) {
		var date = moment().subtract(1, 'year').format('YYYY-MM-DD');
		return date < project.begin ? project.begin : date;
	};

	var getDefaultEndDate = function(project) {
		var date = moment().format('YYYY-MM-DD');
		return date > moment().format('YYYY-MM-DD') ? moment().format('YYYY-MM-DD') : date;
	};

	var getAnnotatedProjectCopy = function(project, indicatorsById) {
		project = angular.copy(project);
		project.dataCollection.forEach(function(form) {
			mtForms.annotateAllFormElements(form.fields, indicatorsById);
		});
		return project;
	};

	var exportProjectStats = function(cols, project, indicatorsById, data) {
		var csvDump = 'os;res;indicator';
		cols.forEach(function(col) { csvDump += ';' + col.name; })
		csvDump += "\n";

		project.logicalFrame.indicators.forEach(function(indicatorId) {
			csvDump += 'None;None;' + indicatorsById[indicatorId].name;
			cols.forEach(function(col) {
				csvDump += ';';
				try { csvDump += data[col.id][indicatorId].value }
				catch (e) {}
			});
			csvDump += "\n";
		});

		project.logicalFrame.purposes.forEach(function(purpose) {
			purpose.indicators.forEach(function(indicatorId) {
				csvDump += purpose.description + ';None;' + indicatorsById[indicatorId].name;
				cols.forEach(function(col) {
					csvDump += ';';
					try { csvDump += data[col.id][indicatorId].value }
					catch (e) {}
				});
				csvDump += "\n";
			});

			purpose.outputs.forEach(function(output) {
				output.indicators.forEach(function(indicatorId) {
					csvDump += purpose.description + ';' + output.description + ';' + indicatorsById[indicatorId].name;
					cols.forEach(function(col) {
						csvDump += ';';
						try { csvDump += data[col.id][indicatorId].value }
						catch (e) {}
					});
					csvDump += "\n";
				});
			});
		});

		return csvDump;
	};

	var exportIndicatorStats = function(cols, projects, indicator, data) {
		var csvDump = 'type;nom';

		// header
		cols.forEach(function(col) { csvDump += ';' + col.name; })
		csvDump += "\n";

		projects.forEach(function(project) {
			csvDump += 'project;' + project.name;
			cols.forEach(function(col) {
				csvDump += ';';
				try { csvDump += data[col.id][project._id][indicator._id].value }
				catch (e) {}
			});
			csvDump += "\n";

			project.inputEntities.forEach(function(entity) {
				csvDump += 'entity;' + entity.name;
				cols.forEach(function(col) {
					csvDump += ';';
					try { csvDump += data[col.id][project._id][indicator._id].value; }
					catch (e) {}
				});
				csvDump += "\n";
			});
		});

		return csvDump;
	};


	return {
		exportProjectStats: exportProjectStats,
		exportIndicatorStats: exportIndicatorStats,
		getStatsColumns: getStatsColumns,
		getDefaultStartDate: getDefaultStartDate,
		getDefaultEndDate: getDefaultEndDate,
		getInputs : getInputs,
		getAnnotatedProjectCopy: getAnnotatedProjectCopy,
		regroup: regroup,
	};
});

