import uiRouter from '@uirouter/angularjs';
import angular from 'angular';
import axios from 'axios';
import mtDisableIf from '../../../directives/helpers/disableif';
import Project from '../../../models/project';

const module = angular.module(__moduleName, [uiRouter, mtDisableIf]);

module.config($stateProvider => {
    $stateProvider.state('project', {
        abstract: true,
        url: '/projects/:projectId',
        component: __componentName,
        resolve: {
            project: ($rootScope, $stateParams, $q) => {
                const projectId = $stateParams.projectId;

                return projectId === 'new'
                    ? $q.when(new Project({ owner: $rootScope.profile.email }))
                    : Project.get(projectId);
            },
            invitations: $stateParams => {
                const projectId = $stateParams.projectId;
                return projectId === 'new'
                    ? []
                    : axios.get(`/project/${projectId}/invitation`).then(r => r.data);
            },
        },
    });
});

module.component(__componentName, {
    bindings: {
        project: '<',
        invitations: '<',
    },
    transclude: true,
    template: require(__templatePath),

    controller: class {
        onProjectSaveSuccess(newProject) {
            this.project = newProject;
        }
    },
});

export default module.name;
