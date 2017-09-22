var magApp = angular.module('magApp', ['ui.router'])
                    .config(['$stateProvider', '$urlRouterProvider', '$locationProvider',
                            function($stateProvider, $urlRouterProvider, $locationProvider) {

    $urlRouterProvider.otherwise('/');
    $locationProvider.html5Mode(true);

    $stateProvider
        .state('processRuns', {
            url: '/{graph_id}/process_runs/',
            controller: 'processRunsCtrl',
            templateUrl: '/static/templates/graph/processRuns.html',
        })
        .state('graph', {
            url: '/{graph_id}/',
            controller: 'graphCtrl',
            templateUrl: '/static/templates/graph/graph.html',
        })
        .state('index', {
            url: '/',
            controller: 'indexCtrl',
            templateUrl: '/static/templates/graph/index.html',
        })
}]);
