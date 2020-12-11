module.exports = config => {
  config.set({
    autoWatch: true,
    basePath: '',
    browsers: [],
    client: {
      clearContext: false,
    },
    colors: true,
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    junitReporter: {
      outputFile: './unit-test-results.xml',
      useBrowserName: false,
    },
    logLevel: config.LOG_INFO,
    plugins: [
      require('karma-jasmine'),
      require('karma-firefox-launcher'),
      require('karma-junit-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    port: 9876,
    reporters: ['progress', 'junit'],
    restartOnFileChange: true,
    singleRun: false,
  });
};
