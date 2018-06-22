/*!
 * This file is part of Monitool.
 *
 * Monitool is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Monitool is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Monitool. If not, see <http://www.gnu.org/licenses/>.
 */

import angular from 'angular';
import uiRouter from '@uirouter/angularjs';
import uuid from 'uuid/v4';

import Project from '../../../models/project';
import Theme from '../../../models/theme';

import mtDirectiveAclProjectCreation from '../../../directives/acl/project-creation';

const module = angular.module(
	'monitool.components.pages.project.list',
	[
		uiRouter, // for $stateProvider

		mtDirectiveAclProjectCreation.name,
	]
);


module.config($stateProvider => {
	if (window.user.type == 'user') {
		$stateProvider.state('main.projects', {
			url: '/projects',
			component: 'projectList',
			resolve: {
				projects: () => Project.fetchShort(),
				themes: () => Theme.fetchAll()
			}
		});
	}
});


module.component('projectList', {
	bindings: {
		'projects': '<',
		'themes': '<',
	},

	template: require('./list.html'),

	controller: class ProjectListController {

		constructor($rootScope, $state) {
			this.userCtx = $rootScope.userCtx;
			this.$state = $state;
		}

		$onChanges(changes) {
			this.changeTab('my');
		}

		$onInit() {
			this.pred = 'country'; // default sorting predicate
		}

		changeTab(tab) {
			this.tab = tab;

			const now = new Date().toISOString().substring(0, 10);

			switch (tab) {
				case 'my':
					this.displayedProjects = this.projects.filter(p => {
						return p.users.find(u => u.id == this.userCtx._id)
					});
					break;
				case 'running':
					this.displayedProjects = this.projects.filter(p => p.end >= now);
					break;
				case 'finished':
					this.displayedProjects = this.projects.filter(p => p.end < now);
					break;
			}
		}

		createProject() {
			this.$state.go('main.project.structure.home', {projectId: 'project:' + uuid()});
		}

		open(project) {
			var projectUser = project.users.find(u => {
				return (this.userCtx.type == 'user' && u.id == this.userCtx._id) ||
					   (this.userCtx.type == 'partner' && u.username == this.userCtx.username);
			});

			if (projectUser && projectUser.role == 'owner')
				this.$state.go("main.project.structure.home", {projectId: project._id});
			else
				this.$state.go("main.project.reporting.home", {projectId: project._id});
		}
	}
});

export default module;
