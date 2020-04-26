/**
 * Core class
 */
export default class ServiceInjector {
  static fromServices(services) {
    const loc = new ServiceInjector()
    Object.keys(services).forEach(serviceKey => {
      loc.register(serviceKey, services[serviceKey])
    })
    return loc
  }

  constructor() {
    this._deps = new Map()
    this._boundLookups = new Map()
  }

  get dependencies() {
    return new Map(this._deps)
  }

  register(key, service, options = {}) {
    if (this._deps.has(key)) {
      // TODO: only do this in DEV
      throw new Error(`Service key already used: ${key}`)
    }
    if (options.withParams && typeof service !== 'function') {
      throw new Error(
        `Cannot use "withParams" option with ${key} of type ${typeof service}; must be function or class.`
      )
    }
    this._deps.set(key, { service, options })
  }

  resolve(dependencies) {
    if (Array.isArray(dependencies)) {
      return dependencies.map(this._lookup)
    } else if (!!dependencies && typeof dependencies === 'object') {
      return Object.entries(dependencies).reduce((result, [key, name]) => {
        result[name] = this._lookup(key)
        return result
      }, {})
    } else {
      throw new Error(
        `Unsupported dependency list.  Only Arrays and Objects are supported. Got: ${JSON.stringify(
          dependencies
        )}`
      )
    }
  }

  _lookup = key => {
    if (!this._deps.has(key)) {
      // TODO: only do this in DEV
      throw new Error(`No service matching key: ${key}`)
    }

    const { service, options } = this._deps.get(key)

    if (options.withParams) {
      if (!this._boundLookups.has(key)) {
        const args = this._makeDepArgs(options)
        this._boundLookups.set(key, service.bind(null, ...args))
      }

      const boundService = this._boundLookups.get(key)
      if (options.asInstance) {
        return new boundService()
      }

      return boundService
    }

    if (options.asInstance) {
      return new service()
    }

    return service
  }

  _makeDepArgs = options => {
    if (Array.isArray(options.withParams)) {
      return options.withParams.map(this._lookup)
    }
    return []
  }
}
