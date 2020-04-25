import React from 'react'
import PropTypes from 'prop-types'
import hoistNonReactStatics from 'hoist-non-react-statics'

const LocatorContext = React.createContext()

export const LocateServicesProvider = ({
  services,
  locator,
  value,
  children,
}) => {
  if (!services && !locator) {
    throw new Error(
      'Must provider services or locator prop to LocateServicesProvider.'
    )
  }

  const providerLocator = locator
    ? locator
    : ServiceInjector.fromServices(services)
  return (
    <LocatorContext.Provider value={providerLocator}>
      {children}
    </LocatorContext.Provider>
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
    static contextType = LocatorContext
    render() {
      const staticDeps = Component.dependencies || []

      let injectedProps = {}
      if (Array.isArray(staticDeps)) {
        injectedProps.services = this.context.locate(staticDeps)
      } else {
        injectedProps = this.context.locate(staticDeps)
      }
      return <Component {...this.props} {...injectedProps} />
    }
  }

  return hoistNonReactStatics(C, Component)
}

export const useServiceInjector = () => {
  const locator = React.useContext(LocatorContext)
  if (!locator) {
    throw new Error('Must be used inside a LocateServicesProvider')
  }
  return locator
}

export const InjectServices = ({ deps, children }) => {
  const locator = useServiceInjector()
  return children(locator.locate(deps))
}
InjectServices.propTypes = {
  children: PropTypes.func.isRequired,
}

export class ServiceInjector {
  constructor() {
    this._deps = new Map()
  }

  get dependencies() {
    return new Map(this._deps)
  }

  register(key, value) {
    if (this._deps.has(key)) {
      // TODO: only do this in DEV
      throw new Error(`Service key already used: ${key}`)
    }
    this._deps.set(key, value)
  }

  locate(dependencies) {
    if (Array.isArray(dependencies)) {
      return dependencies.map(key => {
        if (!this._deps.has(key)) {
          // TODO: only do this in DEV
          throw new Error(`No service matching key: ${key}`)
        }
        return this._deps.get(key)
      })
    } else if (!!dependencies && typeof dependencies === 'object') {
      return Object.entries(dependencies).reduce((result, [key, name]) => {
        if (!this._deps.has(key)) {
          // TODO: only do this in DEV
          throw new Error(`No service matching key: ${key}`)
        }
        result[name] = this._deps.get(key)
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

export const useServices = deps => {
  const locator = useServiceInjector()
  return locator.locate(deps)
}
