import angular from 'angular';
require(__cssPath);

const module = angular.module(__moduleName, []);

module.component(__componentName, {
    bindings: {},
    transclude: {
        'menus': 'menus',
        'content': 'content',
    },
    template: require(__templatePath)
});

export default module.name;