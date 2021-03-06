import angular from 'angular';
import uiRouter from '@uirouter/angularjs';
import 'ui-select/dist/select.min.css';
import mtUtcDatepicker from '../../shared/ng-models/utc-datepicker';
import mtFormGroup from '../../shared/misc/form-group';

const module = angular.module(__moduleName, [uiRouter, mtUtcDatepicker, mtFormGroup]);

module.config($stateProvider => {
    $stateProvider.state('project.config.basics', {
        url: '/basics',
        component: __componentName,
    });
});

module.component(__componentName, {
    bindings: {
        // injected from parent component.
        project: '<',
        onProjectUpdate: '&',
    },

    template: require(__templatePath),

    controller: class {
        $onChanges(changes) {
            if (changes.project) {
                this.editableProject = angular.copy(this.project);
            }
        }

        /**
         * Called from ng-change on all inputs.
         */
        onFieldChange() {
            this.onProjectUpdate({
                newProject: this.editableProject,
                isValid: this.basicsForm.$valid,
            });
        }
    },
});

export default module.name;
