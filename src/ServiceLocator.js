/** The module core of registering and resolving dependencies. */

const assertInDev = (predicate, failureMessage) => {
  if (process.env.NODE_ENV !== 'production' && !predicate) {
    throw new Error(failureMessage);
  }
};

const toString = val => (!!val.toString ? val.toString() : val);

const lookupSymbol = Symbol('Locator Lookup Symbol');
/**
 * Factory function to tag a paramater indicating you want it looked up during resolution
 *
 * Usage:
 *
 *     locator.register('OtherServiceKey', OtherService)
 *     locator.register('MyServiceKey', MyService, {withParams: [Lookup('OtherServiceKey')]})
 *
 */
export const Lookup = value => {
  if (value == null) {
    throw new Error('Lookup() does not support nullish values');
  }
  return { [lookupSymbol]: value };
};

/**
 * Core implementation for a ServiceLocator.
 */
export class ServiceLocator {
  static fromServices(services) {
    const loc = new ServiceLocator();
    Object.keys(services).forEach(serviceKey => {
      loc.register(serviceKey, services[serviceKey]);
    });
    return loc;
  }

  constructor() {
    this._deps = new Map();
    this._boundLookups = new Map();
  }

  clearDependencyCache() {
    this._boundLookups = new Map();
  }

  register(key, service, options = {}) {
    if (this._deps.has(key) && !options.allowOverwrite) {
      throw new Error(`Service key already used: ${toString(key)}`);
    }

    if (options.withParams && typeof service !== 'function') {
      throw new Error(
        `Cannot use "withParams" option with ${key} of type ${typeof service}; must be function or class.`
      );
    }
    this._deps.set(key, { service, options });
  }

  resolve(dependencies) {
    if (Array.isArray(dependencies)) {
      return dependencies.map(this._lookup);
    } else if (!!dependencies && typeof dependencies === 'object') {
      return Object.entries(dependencies).reduce((result, [key, name]) => {
        result[name] = this._lookup(key);
        return result;
      }, {});
    } else {
      throw new Error(
        `Unsupported dependency list.  Only Arrays and Objects are supported. Got: ${JSON.stringify(
          dependencies
        )}`
      );
    }
  }

  _lookup = key => {
    assertInDev(
      this._deps.has(key),
      `Expected a service matching key: ${toString(key)}`
    );

    const { service, options } = this._deps.get(key);

    if (options.withParams) {
      if (!this._boundLookups.has(key)) {
        const args = this._makeDepArgs(options);
        this._boundLookups.set(key, service.bind(null, ...args));
      }

      const boundService = this._boundLookups.get(key);
      if (options.asInstance) {
        return new boundService();
      }

      return boundService;
    }

    if (options.asInstance) {
      return new service();
    }

    return service;
  };

  _makeDepArgs = options => {
    if (Array.isArray(options.withParams)) {
      return options.withParams.map(param => {
        if (typeof param === 'object' && param[lookupSymbol] != null) {
          return this._lookup(param[lookupSymbol]);
        } else {
          return param;
        }
      });
    }
    return [];
  };
}

// TODO: For backwards compat. Remove this before 1.0.
export const ServiceInjector = ServiceLocator;
