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

"use strict";

angular.module('monitool.directives.shared', [])

	.directive('faOpen', function() {
		return {
			restrict: 'AE',
			scope: { v: "=faOpen" },
			link: function($scope, element) {
				element.addClass('fa');

				$scope.$watch('v', function(newValue) {
					if (newValue) {
						element.removeClass('fa-plus-circle');
						element.addClass('fa-minus-circle');
					}
					else {
						element.removeClass('fa-minus-circle');
						element.addClass('fa-plus-circle');
					}
				});
			}
		}
	})

	.directive('disableIf', function() {

		var inhibitHandler = function(event) {
			event.stopImmediatePropagation();
			event.preventDefault();
			return false;
		};

		return {
			retrict: 'A',
			priority: 100,
			scope: {
				disableIf: "="
			},
			link: function($scope, element, attributes) {
				$scope.$watch('disableIf', function(disable) {
					if (disable) {
						element.addClass('disabled')
						element.on('click', inhibitHandler);
					}
					else {
						element.removeClass('disabled')
						element.off('click', inhibitHandler);
					}
				});
			}
		}
	})

	// .directive('eatClickIf', function($parse, $rootScope) {
	// 	return {
	// 	 	// this ensure eatClickIf be compiled before ngClick
	// 		priority: 100,
	// 		restrict: 'A',
	// 		compile: function($element, attr) {
	// 			var fn = $parse(attr.eatClickIf);
	// 			return {
	// 				pre: function link(scope, element) {
	// 					var eventName = 'click';

	// 					element.on(eventName, function(event) {
	// 						var callback = function() {
	// 							if (fn(scope, {$event: event})) {
	// 								// prevents ng-click to be executed
	// 								// prevents href 
	// 								event.stopImmediatePropagation();
	// 								event.preventDefault();
	// 								return false;
	// 							}
	// 						};

	// 						if ($rootScope.$$phase)
	// 							scope.$evalAsync(callback);
	// 						else
	// 							scope.$apply(callback);
	// 					});
	// 				},
	// 				post: function() {}
	// 			};
	// 		}
	// 	}
	// });
