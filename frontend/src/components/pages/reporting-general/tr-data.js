import angular from 'angular';
import axios from 'axios';
import mtReportingField from '../../shared/reporting/td-reporting-field';
import mtIndicatorUnit from '../../../filters/indicator';
require(__cssPath);

const module = angular.module(__moduleName, [mtReportingField, mtIndicatorUnit]);

module.directive(__componentName, () => {
	return {
		controllerAs: '$ctrl',
		restrict: 'A',
		scope: {}, // Isolate

		bindToController: {
			project: '<',
			columns: '<',

			label: '<',
			query: '<',
			indent: '<',
			baseline: '<',
			target: '<',
			colorize: '<',

			disagregated: '<', // boolean to indicate the state of disagregation
			plotted: '<', // boolean to indicate if graph is toggled

			onDisagregateClicked: '&',
			onPlotClicked: '&'
		},

		template: require(__templatePath),

		controller: class TrDataController {

			constructor($scope) {
				this.$scope = $scope;
			}

			$onChanges(changes) {
				if (changes.query) {
					if (this.query) {
						this.aggregations = this._getDisagregations(this.query);
						this._fetchData(this.query);
					}
					else {
						this.aggregations = [];
						this.errorMessage = 'project.indicator_computation_missing';
					}
				}
			}

			/** Compute list of disagregations in drop-down list from dimensions */
			_getDisagregations(query) {
				const numParameters = Object.values(query.parameters).length;
				const computationDisagregations = numParameters > 1 ? [{ id: 'computation', label: 'project.computation' }] : [];

				const partitionDisagregations = this.project
					.getQueryDimensions(query)
					.reduce((aggregations, dimension) => {
						// Split up time by attribute, leave the rest unchanged.
						let newAggregations;
						if (dimension.id === 'time') {
							newAggregations = dimension.attributes.map(attr => {
								return { id: 'time', attribute: attr, label: `project.dimensions.${attr}` };
							});
						}
						else {
							newAggregations = [{ id: dimension.id, label: dimension.label }];
						}

						// Keep only rows which have multiple children
						newAggregations = newAggregations.filter(aggregation => {
							if (dimension.numItems < 2)
								return false;

							if (aggregation.attribute)
								return dimension.getItems(aggregation.attribute).length > 1;
							else
								return dimension.attributes.reduce((m, attr) => m + dimension.getItems(attr).length, 0) > 1;
						});

						return [...aggregations, ...newAggregations]
					}, []);

				return [...computationDisagregations, ...partitionDisagregations];
			}

			/** Fetch data from query */
			async _fetchData(query) {
				try {
					// Set loading message
					delete this.tableCells;
					this.errorMessage = 'shared.loading';

					// Load data
					const response = await axios.post(
						'/rpc/build-report',
						{ output: 'report', projectId: this.project._id, ...query }
					);

					this.plotValues = this.columns.map(col => response.data[col.id]);
					this.tableCells = [
						...this.columns.map(col => {
							const data = response.data[col.id] || {};
							return { value: data.v, interpolated: !data.r, incomplete: !data.c }
						}),
						{
							value: response.data['all'].v,
							interpolated: !response.data['all'].r,
							incomplete: !response.data['all'].c
						}
					];
				}
				catch (e) {
					this.errorMessage = e.message;
				}

				this.$scope.$apply();
			}
		}
	};
});

export default module.name;
