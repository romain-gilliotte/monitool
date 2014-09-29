"use strict";

var app = angular.module('MonitoolApp', ['ngRoute', 'MonitoolControllers']);

app.config(function($routeProvider) {

	///////////////////////////
	// Project
	///////////////////////////

	$routeProvider.when('/projects', {
		templateUrl: 'partials/projects/list.html',
		controller: 'ProjectListController'
	});

	$routeProvider.when('/projects/:projectId/description', {
		templateUrl: 'partials/projects/description.html',
		controller: 'ProjectDescriptionController'
	});

	$routeProvider.when('/projects/:projectId/centers', {
		templateUrl: 'partials/projects/center-list.html',
		controller: 'ProjectCenterListController'
	});

	$routeProvider.when('/projects/:projectId/centers/:centerId', {
		templateUrl: 'partials/projects/center-edit.html',
		controller: 'ProjectCenterEditController'
	});

	$routeProvider.when('/projects/:projectId/users', {
		templateUrl: 'partials/projects/user-list.html',
		controller: 'ProjectUserListController'
	});

	$routeProvider.when('/projects/:projectId/users/:userId', {
		templateUrl: 'partials/projects/user-edit.html',
		controller: 'ProjectUserEditController'
	});

	$routeProvider.when('/projects/:projectId/indicators', {
		templateUrl: 'partials/projects/indicator-list.html',
		controller: 'ProjectIndicatorListController'
	});

	$routeProvider.when('/projects/:projectId/indicators/:indicatorId', {
		templateUrl: 'partials/projects/indicator-edit.html',
		controller: 'ProjectIndicatorEditController'
	});

	$routeProvider.when('/projects/:projectId', {
		redirectTo: '/projects/:projectId/description'
	});

	///////////////////////////
	// Indicators
	///////////////////////////

	$routeProvider.when('/indicators', {
		templateUrl: 'partials/indicators/list.html',
		controller: 'IndicatorListController'
	});

	$routeProvider.when('/indicators/:indicatorId', {
		templateUrl: 'partials/indicators/edit.html',
		controller: 'IndicatorEditController'
	});

	$routeProvider.when('/themes/:themeId', {
		templateUrl: 'partials/indicators/theme.html',
		controller: 'ThemeEditController'
	});

	$routeProvider.when('/types/:typeId', {
		templateUrl: 'partials/indicators/type.html',
		controller: 'TypeEditController'
	});


	///////////////////////////
	// Input
	///////////////////////////

	$routeProvider.when('/inputs/:inputId', {
		templateUrl: 'partials/input/edit.html',
		controller: 'InputEditController'
	});

	$routeProvider.when('/inputs', {
		templateUrl: 'partials/input/list.html',
		controller: 'InputListController'
	});

	///////////////////////////
	// Reporting
	///////////////////////////

	$routeProvider.when('/reporting/by-entities', {
		templateUrl: 'partials/reporting/by-entities.html',
		controller: 'ReportingByEntitiesController'
	});

	$routeProvider.when('/reporting/by-indicators', {
		templateUrl: 'partials/reporting/by-indicators.html',
		controller: 'ReportingByIndicatorsController'
	});

	$routeProvider.when('/reporting', {
		redirectTo: '/reporting/by-entities'
	});

	$routeProvider.otherwise({
		redirectTo: '/projects'
	});
});

