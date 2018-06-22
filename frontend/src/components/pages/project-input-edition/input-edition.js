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
import Input from '../../../models/input';

import uiRouter from '@uirouter/angularjs';
import mtFilterTimeSlot from '../../../filters/time-slot';
import mtNumberTable from './number-table';


const module = angular.module(
	'monitool.components.pages.project.input.edit',
	[
		uiRouter, // for $stateProvider
		mtFilterTimeSlot.name,
		mtNumberTable.name
	]
);


module.config($stateProvider => {

	$stateProvider.state('main.project.input.edit', {
		url: '/input/:dataSourceId/edit/:period/:entityId',
		component: 'projectInputEdition',
		resolve: {
			inputs: ($stateParams, project) =>
				Input.fetchLasts(project, $stateParams.entityId, $stateParams.dataSourceId, $stateParams.period),

			input: inputs => inputs.current,
			previousInput: inputs => inputs.previous,
			isNew: inputs => inputs.isNew,
		}
	});
});


module.component('projectInputEdition', {
	bindings: {
		project: '<', // for breadcrumb
		isNew: '<',
		input: '<',
		previousInput: '<',
	},

	template: require('./input-edition.html'),

	controller: class ProjectInputEditionController {

		get isUnchanged() {
			return angular.equals(this.master, this.input);
		}

		constructor($state, $transitions, $filter) {
			this.$state = $state;
			this.$transitions = $transitions;
			this.translate = $filter('translate');
		}

		$onInit() {
			this._pageChangeWatch = this.$transitions.onStart({}, transition => {
				// if changes were made.
				const hasChanged = !angular.equals(this.master, this.input);
				if (hasChanged) {
					// then ask the user if he meant to abandon changes
					const hasConfirmed = window.confirm(this.translate('shared.sure_to_leave'))
					if (!hasConfirmed) {
						transition.abort();
						return;
					}
				}

				this._pageChangeWatch();
			});
		}

		$onChanges(changes) {
			this.form = this.project.forms.find(f => f.id === this.input.form);
			this.entity = this.project.entities.find(f => f.id === this.input.entity);

			this.master = angular.copy(this.input);
		}

		copy() {
			angular.copy(this.previousInput.values, this.input.values);
		}

		async save() {
			if ((!this.isNew && this.isUnchanged) || this.inputForm.$invalid)
				return;

			this._pageChangeWatch()
			await this.input.save();
			this.$state.go('main.project.input.list', {dataSourceId: this.input.form});
		}

		reset() {
			angular.copy(this.master, this.input);
		}

		async delete() {
			const question = this.translate('project.delete_input');

			if (window.confirm(question)) {
				this._pageChangeWatch(); // remove the change page watch, because it will trigger otherwise.
				await this.input.delete();
				this.$state.go('main.project.input.list', {dataSourceId: this.input.form});
			}
		}
	}
});


export default module;

