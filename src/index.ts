import * as path from 'path';
import * as fs from 'fs';
import { XMLElement, create as createXml } from 'xmlbuilder';
import { BaseReporterDecorator, BaseReporterDecoratorFactory } from './types/baseReporterDecorator';
import { AutResult, AutState } from '@mh-code/angular-unit-test-state';

class AngularReporter implements BaseReporterDecorator {
  constructor(
    baseReporterDecorator: BaseReporterDecoratorFactory,
    private readonly config,
    private readonly logger,
    private readonly helper,
    private readonly formatError,
  ) {
    baseReporterDecorator(this);
    fixePrototypeFunctions(this);
  }

  private readonly outputDirectory = this.config.htmlReporter.outputDirectory;
  private readonly pageTitle = this.config.htmlReporter.pageTitle || 'Unit Test Results';
  private readonly subPageTitle = this.config.htmlReporter.subPageTitle || false;
  private readonly groupSuites = this.config.htmlReporter.groupSuites || false;
  private readonly useLegacyStyle = this.config.htmlReporter.useLegacyStyle || false;
  private readonly useCompactStyle = this.config.htmlReporter.useCompactStyle || false;
  private readonly showOnlyFailed = this.config.htmlReporter.showOnlyFailed || false;
  private readonly log = this.logger.create('reporter.html');

  private html: XMLElement | undefined;
  private body: XMLElement | undefined;
  private suites: { [key: number]: XMLElement } = {};
  private htmlCreated = false;
  private lastSuiteName: string = '';
  private pendingFileWritings = 0;
  private fileWritingFinished = function () {};
  private allMessages: string[] = [];
  private allErrors: string[] = [];

  private basePathResolve(relativePath: string): string {
    if (this.helper.isUrlAbsolute(relativePath)) {
      return relativePath;
    }

    if (!this.helper.isDefined(this.config.basePath) || !this.helper.isDefined(relativePath)) {
      return '';
    }

    return path.resolve(this.config.basePath, relativePath);
  }

  private createHead(): void {
    if (!this.html) {
      return;
    }
    const head = this.html.ele('head');
    head.ele('meta', { charset: 'utf-8' });
    head.ele('title', {}, this.pageTitle + (this.subPageTitle ? ' - ' + this.subPageTitle : ''));
    head.ele(
      'style',
      { type: 'text/css' },
      'html,body{font-family:Arial,sans-serif;font-size:1rem;margin:0;padding:0;}body{padding:10px 40px;}h1{margin-bottom:0;}h2{margin-top:0;margin-bottom:0;color:#999;}table{width:100%;margin-top:20px;margin-bottom:20px;table-layout:fixed;}tr.header{background:#ddd;font-weight:bold;border-bottom:none;}td{padding:7px;border-top:none;border-left:1px black solid;border-bottom:1px black solid;border-right:none;word-break:break-all;word-wrap:break-word;}tr.pass td{color:#003b07;background:#86e191;}tr.skip td{color:#7d3a00;background:#ffd24a;}tr.fail td{color:#5e0e00;background:#ff9c8a;}tr:first-child td{border-top:1px black solid;}td:last-child{border-right:1px black solid;}tr.overview{font-weight:bold;color:#777;}tr.overview td{padding-bottom:0px;border-bottom:none;}tr.system-out td{color:#777;}tr.system-errors td{color:#f00;}hr{height:2px;margin:30px 0;background:#000;border:none;}section{margin-top:40px;}h3{margin:6px 0;}.overview{color:#333;font-weight:bold;}.system-out{margin:0.4rem 0;}.system-errors{color:#a94442}.spec{padding:0.8rem;margin:0.3rem 0;}.spec--pass{color:#3c763d;background-color:#dff0d8;border:1px solid #d6e9c6;}.spec--skip{color:#8a6d3b;background-color:#fcf8e3;border:1px solid #faebcc;}.spec--fail{color:#a94442;background-color:#f2dede;border:1px solid #ebccd1;}.spec--group{color:#636363;background-color:#f0f0f0;border:1px solid #e6e6e6;margin:0;}.spec--group:not(:first-of-type){margin:20px 0 0 0;}.spec__title{display:inline;}.spec__suite{display:inline;}.spec__descrip{font-weight:normal;}.spec__status{float:right;}.spec__log{padding-left: 2.3rem;}.hidden{display:none;}body.compact .spec p{margin-top:0;margin-bottom:0.5rem;}body.compact .spec,body.compact tr,body.compact .overview,body.compact .system-out,body.compact .system-errors{font-size:0.85rem;}body.compact .spec{padding:0.3rem 0.5rem;}body.compact section{margin-top:30px;}',
    );
  }

  private createBody(): void {
    if (!this.html) {
      return;
    }
    this.body = this.html.ele('body', { class: this.useCompactStyle ? 'compact' : '' });
    this.body.ele('h1', {}, this.pageTitle);

    if (this.subPageTitle) {
      this.body.ele('h2', {}, this.subPageTitle);
    }
  }

  private createHtmlResults(browser): void {
    let suite: XMLElement;
    let header: XMLElement;
    let overview: XMLElement;
    const timestamp = new Date().toLocaleString();

    if (!this.suites) {
      this.onRunStart();
    }

    if (!this.body) {
      return;
    }

    if (this.useLegacyStyle) {
      suite = this.suites[browser.id] = this.body.ele('table', { cellspacing: '0', cellpadding: '0', border: '0' });
      suite
        .ele('tr', { class: 'overview' })
        .ele('td', { colspan: '3', title: browser.fullName }, 'Browser: ' + browser.name);
      suite.ele('tr', { class: 'overview' }).ele('td', { colspan: '3' }, 'Timestamp: ' + timestamp);
      this.suites[browser.id]['results'] = suite.ele('tr').ele('td', { colspan: '3' });

      header = suite.ele('tr', { class: 'header' });
      header.ele('td', {}, 'Status');
      header.ele('td', {}, 'Spec');
      header.ele('td', {}, 'Suite / Results');

      this.body.ele('hr');
    } else {
      suite = this.suites[browser.id] = this.body.ele('section', {});
      overview = suite.ele('header', { class: 'overview' });

      // Assemble the Overview
      overview.ele('div', { class: 'browser' }, 'Browser: ' + browser.name);
      overview.ele('div', { class: 'timestamp' }, 'Timestamp: ' + timestamp);

      // Create paragraph tag for test results to be placed in later
      this.suites[browser.id]['results'] = overview.ele('p', { class: 'results' });
    }
  }

  private initializeHtmlForBrowser(): void {
    if (!this.htmlCreated) {
      this.html = createXml('html', { headless: true });

      this.html.dtd();

      this.createHead();
      this.createBody();

      this.htmlCreated = true;
    }
  }

  public adapters = [
    (msg: string) => {
      this.allMessages.push(msg);
    },
  ];

  public onRunStart(): void {
    this.suites = {};
  }

  public onBrowserStart(browser): void {
    this.initializeHtmlForBrowser();
    this.createHtmlResults(browser);
  }

  public onBrowserError(browser, error): void {
    this.initializeHtmlForBrowser();
    this.createHtmlResults(browser);
    this.allErrors.push(this.formatError(error));
  }

  public onBrowserComplete(browser): void {
    const suite = this.suites[browser.id];
    const result = browser.lastResult;

    const state: AutResult = {
      total: result.total,
      success: result.success,
      skipped: result.skipped,
      failed: result.failed,
      netTime: result.netTime,
    };

    AutState.addResults(AutState.currentProject, state);

    if (suite && suite['results']) {
      suite['results'].txt(result.total + ' tests / ');
      suite['results'].txt((result.disconnected || result.error ? 1 : 0) + ' errors / ');
      suite['results'].txt(result.failed + ' failures / ');
      suite['results'].txt(result.skipped + ' skipped / ');
      suite['results'].txt('runtime: ' + (result.netTime || 0) / 1000 + 's');

      if (this.allMessages.length > 0) {
        if (this.useLegacyStyle) {
          suite
            .ele('tr', { class: 'system-out' })
            .ele('td', { colspan: '3' })
            .raw('<strong>System output:</strong><br />' + this.allMessages.join('<br />'));
        } else {
          suite
            .ele('div', { class: 'system-out' })
            .raw('<strong>System output:</strong><br />' + this.allMessages.join('<br />'));
        }

        this.allMessages = [];
      }

      if (this.allErrors.length > 0) {
        if (this.useLegacyStyle) {
          suite
            .ele('tr', { class: 'system-errors' })
            .ele('td', { colspan: '3' })
            .raw('<strong>Errors:</strong><br />' + this.allErrors.join('<br />'));
        } else {
          suite
            .ele('div', { class: 'system-errors' })
            .raw('<strong>Errors:</strong><br />' + this.allErrors.join('<br />'));
        }

        this.allErrors = [];
      }
    }

    delete this.suites[browser.id];
  }

  public onRunComplete(browsers): void {
    const htmlToOutput = this.html;

    if (htmlToOutput) {
      this.pendingFileWritings++;

      let outputDirectory = this.basePathResolve(this.outputDirectory);
      const fullPath  = `${outputDirectory}/${AutState.currentProject}.html`;

      this.helper.mkdirIfNotExists(outputDirectory, () => {
        if (!htmlToOutput) {
          this.log.warn('Cannot write HTML report\n\t No output!');
          if (!--this.pendingFileWritings) {
            this.fileWritingFinished();
          }
          return;
        }
        fs.writeFile(fullPath, htmlToOutput.end({ pretty: true }), (err) => {
          if (err) {
            this.log.warn('Cannot write HTML report\n\t' + err.message);
          } else {
            this.log.debug('HTML results written to "%s".', fullPath);
          }

          if (!--this.pendingFileWritings) {
            this.fileWritingFinished();
          }
        });
      });
    } else {
      this.log.error('HTML report was not created\n\t');
    }

    this.html = undefined;
    this.allMessages.length = 0;
    this.allErrors.length = 0;
    this.htmlCreated = false;
  }

  public onSpecComplete(browser, result): void {
    const currentSuite = result.suite;
    const suiteName = currentSuite.concat();
    const currentSuiteName = currentSuite[0];
    let isNewSuite = false;
    const specClass = result.skipped ? 'skip' : result.success ? 'pass' : 'fail';
    const specStatus = result.skipped
      ? 'Skipped'
      : result.success
      ? 'Passed in ' + (result.time || 0) / 1000 + 's'
      : 'Failed';
    let spec: XMLElement;
    let specGroup: XMLElement;
    let specHeader: XMLElement;
    let specTitle: XMLElement;
    let suiteColumn: XMLElement;

    if (this.lastSuiteName !== currentSuiteName) {
      isNewSuite = true;
      this.lastSuiteName = currentSuiteName;
    }

    if (currentSuite.length > 1) {
      suiteName.shift();
    }

    if (!this.showOnlyFailed || (this.showOnlyFailed && !result.success)) {
      if (this.useLegacyStyle) {
        spec = this.suites[browser.id].ele('tr', { class: specClass });
        spec.ele('td', {}, specStatus);
        spec.ele('td', {}, result.description);
        suiteColumn = spec.ele('td', {}).raw(currentSuite.join(' &raquo; '));
      } else {
        if (this.groupSuites && isNewSuite) {
          specGroup = this.suites[browser.id].ele('div', { class: 'spec spec--group' });
          specGroup.ele('h3', { class: 'spec__header' }).raw(currentSuiteName);
        }

        spec = this.suites[browser.id].ele('div', {
          class: 'spec spec--' + specClass,
          style: this.groupSuites ? 'margin-left:' + (currentSuite.length - 1) * 20 + 'px;' : '',
        });

        // Create spec header
        specHeader = spec.ele('h3', { class: 'spec__header' });

        // Assemble the spec title
        specTitle = specHeader.ele('div', { class: 'spec__title' });
        specTitle
          .ele('p', {
            class:
              'spec__suite' +
              (this.groupSuites ? (suiteName[0] !== currentSuiteName || suiteName.length > 1 ? '' : ' hidden') : ''),
          })
          .raw(suiteName.join(' &raquo; '));

        specTitle.ele('em', { class: 'spec__descrip' }, result.description);

        // Display spec result
        specHeader.ele('div', { class: 'spec__status' }, specStatus);
      }

      if (!result.success) {
        if (this.useLegacyStyle) {
          result.log.forEach((err) => {
            suiteColumn.raw('<br />' + this.formatError(err).replace(/</g, '&lt;').replace(/>/g, '&gt;'));
          });
        } else {
          // Error Messages
          suiteColumn = spec.ele('p', { class: 'spec__log' });

          result.log.forEach((err, index) => {
            let message = index === 0 ? '' : '<br />';
            message += this.formatError(err)
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/(?:\r\n|\r|\n)/g, '<br />');
            suiteColumn.raw(message);
          });
        }
      }
    }
  }

  // wait for writing all the html files, before exiting
  public onExit(done): void {
    if (this.pendingFileWritings) {
      this.fileWritingFinished = done;
    } else {
      done();
    }
  }
}

const fixePrototypeFunctions = (reporter: AngularReporter) => {
  const members = Object.getOwnPropertyNames(AngularReporter.prototype);
  for (const member of members) {
    if (member.startsWith('on') && typeof AngularReporter.prototype[member] === 'function') {
      reporter[member] = AngularReporter.prototype[member];
    }
  }
};

// regular function is required for karma runner
// tslint:disable-next-line: only-arrow-functions
const AngularReporterFactory = function (baseReporterDecorator: BaseReporterDecoratorFactory, config, logger, helper, formatError,): AngularReporter {
  const reporter = new AngularReporter(baseReporterDecorator, config, logger, helper, formatError);
  return reporter;
};

AngularReporterFactory.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:angular': ['type', AngularReporterFactory],
};
