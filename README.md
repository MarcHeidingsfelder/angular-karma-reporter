angular-karma-reporter
=======================

This karam plugin is based on the [npm package](https://www.npmjs.com/package/karma-htmlfile-reporter) by Matthias Schuetz ([GitHub](https://github.com/matthias-schuetz/karma-htmlfile-reporter)).

## Installation

Install the runner with this command.
```bash
npm install @mh-code/angular-karma-reporter --save-dev
```
## Configuration
You can use nearly the same configuration (see below).
The mandatory outputFile option was changed to outputDirectory.
It specifies the directory in which to save the test results.
The result files are named after the according project / sub-project.

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    reporters: ['progress', 'angular'],

    htmlReporter: {
      outputDirectory: './test-results',
			
      // Optional
      pageTitle: 'Unit Tests',
      subPageTitle: 'A sample project description',
      groupSuites: true,
      useCompactStyle: true,
      useLegacyStyle: true,
      showOnlyFailed: false
    }
  });
};
```

## Test result statistics
This plugin write information, like count of test and how many succeeded, to the [AutState](https://www.npmjs.com/package/@mh-code/angular-unit-test-state).
The [AutRunner](https://www.npmjs.com/package/@mh-code/angular-unit-test-runner) consumes these information to a test summary over all projects.


## What is this plugin good for?
There is a problem with the Karma htmlfile reporter.
It has a fixed name for the output file. The value from the outputFile configuration.
The test results are saved in a file with the configured name.
In an angular project with multiple sub projects and libraries, the reporter saves after each sub-project.
At the end there is only one file with the results of the last tested sub-project.

This plugin saves one file per sub project.
Furthermore, options for easy customization of branding, styling and behavior are planned.

---

## A karma plugin for exporting unit test results as styled HTML file

This is a plugin for the [Karma Test Runner]. By adding this reporter to your karma configuration, unit test results will be exported as a styled HTML file. For each test browser, a separate table is generated. The plugin is  based on the [karma-junit-reporter plugin].

<img src="http://matthias-schuetz.github.io/karma-htmlfile-reporter/karma-htmlfile-reporter.png?2" />

## HTML test result page
Version 0.3 comes with a fresh style from [David G Chung](https://github.com/davidc4747). You can see a preview of the exported unit test result page [here](http://matthias-schuetz.github.io/karma-htmlfile-reporter/units.html). A new option called *groupSuites* will group separate suites (*describe* blocks in test files) visually, see an example output [here](http://matthias-schuetz.github.io/karma-htmlfile-reporter/units_groups.html). You can also set the option *useCompactStyle* to *true* to export a more compact HTML output. The legacy page style is online [here](http://matthias-schuetz.github.io/karma-htmlfile-reporter/units_legacy.html). If you want to use the legacy style, you can set the option *useLegacyStyle* to *true*. There's also an additional option called *showOnlyFailed* which forces the report to display failed tests only.
