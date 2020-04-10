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
    : ServiceLocator.fromServices(services)
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
      return (
        <Component {...this.props} services={this.context.locate(staticDeps)} />
      )
    }
  }

  return hoistNonReactStatics(C, Component)
}

export const useServiceLocator = () => {
  const locator = React.useContext(LocatorContext)
  if (!locator) {
    throw new Error('Must be used inside a LocateServicesProvider')
  }
  return locator
}

export const InjectServices = ({ deps, children }) => {
  const locator = useServiceLocator()
  return children(locator.locate(deps))
}
InjectServices.propTypes = {
  children: PropTypes.func.isRequired,
}

export class ServiceLocator {
  constructor() {
    this._deps = new Map()
  }

  add(key, value) {
    if (this._deps.has(key)) {
      // TODO: only do this in DEV
      throw new Error(`Service key already used: ${key}`)
    }
    this._deps.set(key, value)
  }

  locate(depList) {
    return depList.map(depKey => {
      if (!this._deps.has(depKey)) {
        // TODO: only do this in DEV
        throw new Error(`No service matching key: ${depKey}`)
      }
      return this._deps.get(depKey)
    })
  }

  static fromServices(services) {
    const loc = new ServiceLocator()
    Object.keys(services).forEach(serviceKey => {
      loc.add(serviceKey, services[serviceKey])
    })
    return loc
  }
}

export const useServices = deps => {
  const locator = useServiceLocator()
  return locator.locate(deps)
}
