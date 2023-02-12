import { BaseReporterDecoratorFactory } from '../types/baseReporterDecorator';
import * as plugin from './../index';

describe('reporter factory', () => {
  const getFactory = () => {
    return module.default['reporter:angular'][1];
  };

  let baseReporterDecoratorFactoryMock: Partial<BaseReporterDecoratorFactory>;
  let configurationMock: any;
  let loggerMock: any;
  let module: any;

  beforeEach(() => {
    baseReporterDecoratorFactoryMock = () => {};
    configurationMock = {
      htmlReporter: {},
    };
    loggerMock = {
      create: () => {},
    };
    module = plugin as any;
  });

  it('should provide the factory function', () => {
    const factory = getFactory();
    const typeOfFactory = typeof factory;
    expect(typeOfFactory).toBe('function');
  });

  it('should return an instance of AngularReporter', () => {
    const factory = getFactory();
    const reporter = factory(
      baseReporterDecoratorFactoryMock as BaseReporterDecoratorFactory,
      configurationMock,
      loggerMock,
      undefined,
      undefined,
    );
    expect(reporter).toBeTruthy();
  });
});
