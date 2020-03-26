
import queryAggregate from './query-aggregate';
import queryDiceLocation from './query-dice-location';
import queryDiceTime from './query-dice-time';

const module = angular.module(
	'monitool.component.page.project-reporting-general.project-filter',
	[
		queryAggregate,
		queryDiceLocation,
		queryDiceTime
	]
);

module.component('projectQuery', {
	bindings: {
		project: '<',
		onUpdate: '&'
	},

	template: require('./project-query.html'),

	controller: class ProjectFilterController {

		$onInit() {
			this.panelOpen = false;
			this.dice = [];
			this.aggregate = null;
		}

		onPanelHeaderClick() {
			this.panelOpen = !this.panelOpen;
		}

		onChildUpdate(dice, aggregate) {
			if (dice) {
				this.dice = [
					...this.dice.filter(e => e.id !== dice.id),
					dice
				];
			}

			if (aggregate) {
				this.aggregate = aggregate;
			}

			if (this.aggregate && this.dice.length == 2) {
				this.onUpdate({
					query: {
						aggregate: [this.aggregate],
						dice: this.dice,
					}
				});
			}
		}
	}
});


export default module.name;