"use strict";

angular

	.module(
		'monitool.controllers.indicator',
		[
			'monitool.services.translate',
		]
	)

	.controller('IndicatorListController', function($scope, hierarchy) {
		$scope.hierarchy = hierarchy;
		$scope.searchField = '';
	})
	
	.controller('IndicatorEditController', function($state, $scope, $stateParams, $filter, googleTranslation, indicator, types, themes) {
		$scope.translations = {fr: FRENCH_TRANSLATION, es: SPANISH_TRANSLATION, en: ENGLISH_TRANSLATION};
		$scope.numLanguages = 3;
		$scope.indicator = indicator;
		$scope.master = angular.copy(indicator);
		$scope.types = types;
		$scope.themes = themes;
		$scope.isNew = $stateParams.indicatorId === 'new';

		$scope.translate = function(key, destLanguage, sourceLanguage) {
			googleTranslation
				.translate(indicator[key][sourceLanguage], destLanguage, sourceLanguage)
				.then(function(result) {
					indicator[key][destLanguage] = result;
				});
		};

		// Form actions
		$scope.save = function() {
			// create random id if new indicator
			if ($stateParams.indicatorId === 'new')
				$scope.indicator._id = makeUUID();

			// persist
			$scope.indicator.$save(function() {
				$scope.master = angular.copy($scope.indicator);
				$state.go('main.indicators');
			});
		};

		$scope.isUnchanged = function() {
			return angular.equals($scope.master, $scope.indicator);
		};

		$scope.reset = function() {
			$scope.indicator = angular.copy($scope.master);
		};

		$scope.delete = function() {
			var question = $filter('translate')('indicator.delete_indicator');

			if (window.confirm(question)) {
				pageChangeWatch();

				indicator.$delete(function() {
					$state.go('main.indicators');
				});
			}
		};

		var pageChangeWatch = $scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
			// if unsaved changes were made
			if (!angular.equals($scope.master, $scope.indicator)) {
				// then ask the user if he meant it
				if (!window.confirm($filter('translate')('shared.sure_to_leave')))
					event.preventDefault();
			}
		});
	})
	
	.controller('IndicatorReportingController', function($scope, Olap, mtReporting, indicator, projects, inputs) {
		$scope.indicator = indicator;
		$scope.plots = {};

		// Create default filter so that all inputs are used.
		$scope.filters = {};
		$scope.filters.begin = new Date('9999-01-01T00:00:00Z')
		$scope.filters.end = new Date('0000-01-01T00:00:00Z');
		for (var i = 0; i < inputs.length; ++i) {
			if (inputs[i].period < $scope.filters.begin)
				$scope.filters.begin = inputs[i].period;
			if (inputs[i].period > $scope.filters.end)
				$scope.filters.end = inputs[i].period;
		}

		// default group by
		if (mtReporting.getColumns('month', $scope.filters.begin, $scope.filters.end).length < 15)
			$scope.groupBy = 'month';
		else if (mtReporting.getColumns('quarter', $scope.filters.begin, $scope.filters.end).length < 15)
			$scope.groupBy = 'quarter';
		else
			$scope.groupBy = 'year';

		var cubes = {};
		projects.forEach(function(project) {
			var projectInputs = inputs.filter(function(i) { return i.project == project._id; });
			cubes[project._id] = Olap.Cube.fromProject(project, projectInputs);
		});

		// when input list change, or regrouping is needed, compute table rows again.
		$scope.$watchGroup(['filters', 'groupBy'], function() {
			$scope.cols = mtReporting.getColumns($scope.groupBy, $scope.filters.begin, $scope.filters.end);
			$scope.rows = projects.map(function(project) {
				var planning = null;
				outerloop:
					for (var lfIndex = 0; lfIndex < project.logicalFrames.length; ++lfIndex) {
						planning = project.logicalFrames[lfIndex].indicators.find(function(i) { return i.indicatorId === indicator._id; });
						if (planning)
							break outerloop;

						for (var pIndex = 0; pIndex < project.logicalFrames[lfIndex].purposes.length; ++pIndex) {
							planning = project.logicalFrames[lfIndex].purposes[pIndex].indicators.find(function(i) { return i.indicatorId === indicator._id; });
							if (planning)
								break outerloop;

							for (var oIndex = 0; oIndex < project.logicalFrames[lfIndex].purposes[pIndex].outputs.length; ++oIndex) {
								planning = project.logicalFrames[lfIndex].purposes[pIndex].outputs[oIndex].indicators.find(function(i) { return i.indicatorId === indicator._id; });
								if (planning)
									break outerloop;
							}
						}
					}

				var row = mtReporting._makeIndicatorRow(
					project.groups,
					cubes[project._id],
					0,
					$scope.groupBy,
					{}, // $scope.filters,
					$scope.cols,
					planning
				);
				row.name = project.name;
				return row;
			});
		});
	});

