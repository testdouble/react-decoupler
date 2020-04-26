import React from 'react'
import PropTypes from 'prop-types'
import hoistNonReactStatics from 'hoist-non-react-statics'
import ServiceInjector from './ServiceInjector'

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
