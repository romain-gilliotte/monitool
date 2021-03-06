import angular from 'angular';
import mtIndicatorUnit from '../../../filters/indicator';
import { executeQuery, getQueryDimensions } from '../../../helpers/query-builder';
import mtReportingField from '../../shared/reporting/td-reporting-field';
require(__scssPath);

const module = angular.module(__moduleName, [mtReportingField, mtIndicatorUnit]);

module.directive(__componentName, () => ({
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
        onPlotClicked: '&',
        onPlotData: '&',
    },

    template: require(__templatePath),

    controller: class {
        constructor($scope) {
            'ngInject';

            this.$scope = $scope;
        }

        $onChanges(changes) {
            if (changes.query) {
                if (this.query) {
                    this.aggregations = this._getDisagregations(this.query);
                    this._fetchData(this.query);
                } else {
                    this.aggregations = [];
                    this.errorMessage = 'project.indicator_computation_missing';
                }
            }
        }

        /** Compute list of disagregations in drop-down list from dimensions */
        _getDisagregations(query) {
            const numParameters = Object.values(query.parameters).length;
            const computationDisagregations =
                numParameters > 1 ? [{ id: 'computation', label: 'project.computation' }] : [];
            const dimensions = getQueryDimensions(this.project, query, true, false);

            const partitionDisagregations = dimensions.reduce((aggregations, dimension) => {
                // Split up time by attribute, leave the rest unchanged.
                let newAggregations;
                if (dimension.id === 'time') {
                    newAggregations = dimension.attributes.map(attr => {
                        return {
                            id: 'time',
                            attribute: attr,
                            label: `project.dimensions.${attr}`,
                        };
                    });
                } else {
                    newAggregations = [{ id: dimension.id, label: dimension.label }];
                }

                // Keep only rows which have multiple children
                newAggregations = newAggregations.filter(aggregation => {
                    if (dimension.numItems < 2) return false;

                    if (aggregation.attribute)
                        return dimension.getItems(aggregation.attribute).length > 1;
                    else
                        return (
                            dimension.attributes.reduce(
                                (m, attr) => m + dimension.getItems(attr).length,
                                0
                            ) > 1
                        );
                });

                return [...aggregations, ...newAggregations];
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
                const data = await executeQuery(this.project._id, query);
                this.tableCells = [...this.columns.map(col => data[col.id]), data['all']];

                // Send graph data to parent.
                this.onPlotData({
                    data: this.columns.map(col => data[col.id]),
                });
            } catch (e) {
                this.errorMessage = e.message;
            }

            this.$scope.$apply();
        }
    },
}));

export default module.name;
