import React from 'react'
import PropTypes from 'prop-types'
import hoistNonReactStatics from 'hoist-non-react-statics'

const InjectorContext = React.createContext()

export const InjectorProvider = ({ services, injector, value, children }) => {
  if (!services && !injector) {
    throw new Error(
      'Must provide services or injector prop to InjectorProvider.'
    )
  }

  const providerLocator = injector
    ? injector
    : ServiceInjector.fromServices(services)
  return (
    <InjectorContext.Provider value={providerLocator}>
      {children}
    </InjectorContext.Provider>
  )
}

export const withServices = Component => {
  const componentDisplayName =
    Component.displayName ||
    Component.name ||
    (Component.constructor && Component.constructor.name) ||
    'Component'

  class C extends React.Component {
    static displayName = `withServices(${componentDisplayName})`
    static contextType = InjectorContext
    render() {
      const staticDeps = Component.dependencies || []

      let injectedProps = {}
      if (Array.isArray(staticDeps)) {
        injectedProps.services = this.context.resolve(staticDeps)
      } else {
        injectedProps = this.context.resolve(staticDeps)
      }
      return <Component {...this.props} {...injectedProps} />
    }
  }

  return hoistNonReactStatics(C, Component)
}

export class InjectServices extends React.Component {
  static contextType = InjectorContext

  static propTypes = {
    children: PropTypes.func.isRequired,
    deps: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.String),
      PropTypes.objectOf(PropTypes.String),
    ]),
  }

  render() {
    const injector = this.context
    if (!injector) {
      throw new Error('Must be used inside a InjectorProvider')
    }
    const { children, deps } = this.props
    return children(injector.resolve(deps))
  }
}

export class ServiceInjector {
  constructor() {
    this._deps = new Map()
  }

  get dependencies() {
    return new Map(this._deps)
  }

  register(key, service, options = {}) {
    if (this._deps.has(key)) {
      // TODO: only do this in DEV
      throw new Error(`Service key already used: ${key}`)
    }
    this._deps.set(key, { service, options })
  }

  _lookup = key => {
    if (!this._deps.has(key)) {
      // TODO: only do this in DEV
      throw new Error(`No service matching key: ${key}`)
    }
    const { service, options } = this._deps.get(key)
    if (options.asInstance) {
      return new service()
    }

    return service
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

  static fromServices(services) {
    const loc = new ServiceInjector()
    Object.keys(services).forEach(serviceKey => {
      loc.register(serviceKey, services[serviceKey])
    })
    return loc
  }
}

/**
 * The Hooks API:
 *  - useServiceInjector(): returns the Injector from context.
 *  - useServices(deps): resolves the given dependencies and returns them
 */

export const useServiceInjector = () => {
  if (!React.useContext) {
    throw new Error(
      'Hooks not found on React. Are you using React v16.8 or greater?'
    )
  }
  const injector = React.useContext(InjectorContext)
  if (!injector) {
    throw new Error('Must be used inside a InjectorProvider')
  }
  return injector
}

export const useServices = deps => {
  const injector = useServiceInjector()
  return injector.resolve(deps)
}
