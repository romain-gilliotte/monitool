import angular from 'angular';
require(__scssPath);

const module = angular.module(__moduleName, []);

module.component(__componentName, {
    bindings: {
        isValid: '<',
        isChanged: '<',
        isPersisted: '<',
        isSaving: '<',
        saveLabel: '@',

        onSaveClicked: '&',
        onResetClicked: '&',
    },
    template: require(__templatePath),
});

export default module.name;
