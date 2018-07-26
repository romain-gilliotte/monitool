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
import diacritics from 'diacritics';

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

		constructor($rootScope, $state, $window) {
			this.userCtx = $rootScope.userCtx;
			this.$state = $state;
			this.$window = $window;

			this.displayFinished = false;
			this.displayDeleted = false;
		}

		$onChanges(changes) {
			this.displayedProjects = this.projects.slice();

			this.displayedProjects.forEach(p => {
				const user = p.users.find(u => u.id == this.userCtx._id);

				p.running = p.end > new Date().toISOString().slice(0, 10);
				p.isUser = !!user;
				p.isOwner = this.userCtx.role === 'admin' || user.role === 'owner';
				p.favorite = !!localStorage['favorites::projects::' + p._id];
			});

			this.displayedProjects = this.displayedProjects.filter(p => {
				const search = diacritics.remove(p.country + '//' + p.name || '').toLowerCase();
				const needle = diacritics.remove(this.filterValue || '').toLowerCase();

				const matchSearch = search.includes(needle);
				const alwaysOn = p.running && p.active;
				const matchFinished = this.displayFinished && !p.running && p.active;
				const matchDeleted = this.displayDeleted && !p.active;

				return matchSearch && (alwaysOn || matchFinished || matchDeleted)
			});

			this.displayedProjects.sort((p1, p2) => {
				const p1f = [p1.isUser, p1.favorite, p1.country || 'zzz', p1.name, p1.end];
				const p2f = [p2.isUser, p2.favorite, p2.country || 'zzz', p2.name, p2.end];

				for (let i = 0; i < p1f.length; ++i) {
					if (typeof p1f[i] == 'boolean' && p1f[i] !== p2f[i])
						return p1f[i] ? -1 : 1;

					if (typeof p1f[i] == 'string' && p1f[i] !== p2f[i])
						return p1f[i].localeCompare(p2f[i])
				}

				return 0;
			});
		}

		filter() {
			this.$onChanges();
		}

		toggleFinished() {
			this.displayFinished = !this.displayFinished;
			this.$onChanges();
		}

		toggleDeleted() {
			this.displayDeleted = !this.displayDeleted;
			this.$onChanges();
		}

		toggleFavorite(p) {
			const lsKey = 'favorites::projects::' + p._id

			if (localStorage[lsKey])
				delete localStorage[lsKey];
			else
				localStorage[lsKey] = 'yes';

			this.$onChanges();
			this.$window.scrollTo(0, 0);
		}

		createProject() {
			this.$state.go('main.project.structure.home', {projectId: 'project:' + uuid()});
		}

		open(project) {
			if (project.isOwner)
				this.$state.go("main.project.structure.home", {projectId: project._id});
			else
				this.$state.go("main.project.reporting.home", {projectId: project._id});
		}
	}
});

export default module;
