export declare type BaseReporterDecorator = {
  adapters?: Function[];

  USE_COLORS?: boolean;
  EXCLUSIVELY_USE_COLORS?: boolean;
  LOG_SINGLE_BROWSER?: string;
  LOG_MULTI_BROWSER?: string;

  SPEC_FAILURE?: string;
  SPEC_SLOW?: string;
  ERROR?: string;

  FINISHED_ERROR?: string;
  FINISHED_SUCCESS?: string;
  FINISHED_DISCONNECTED?: string;

  X_FAILED?: string;

  TOTAL_SUCCESS?: string;
  TOTAL_FAILED?: string;

  onRunStart?: () => void;

  onBrowserStart?: (browser) => void;

  renderBrowser?: (browser) => string;

  write?: () => void;

  writeCommonMsg?: () => void;

  onBrowserError?: (browser, error: string) => void;

  onBrowserLog?: (browser, log: string, type: string) => void;

  onSpecComplete?: (browser, result) => void;

  specSuccess?: (browser, result) => void;

  specSkipped?: (browser, result) => void;

  specFailure?: (browser, result) => void;

  onRunComplete?: (browsers, results) => void;

  onBrowserComplete?: (browser) => void;
};

export type BaseReporterDecoratorFactory = (successor: BaseReporterDecorator) => BaseReporterDecorator;
