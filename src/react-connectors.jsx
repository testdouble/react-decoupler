import React from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { ServiceLocator } from './ServiceLocator';

const DecouplerContext = React.createContext();

/**
 * @name: DecouplerProvider
 * @description: React Context Provider for library.
 * @usage:
 *
 *     // With locator instance
 *     <DecouplerProvider locator={locatorInstance}>
 *       <YourApp />
 *     </DecouplerProvider
 *
 *     // OR With Services map
 *     const servicesMap = {
 *       'ServiceKey': Service
 *     }
 *     <DecouplerProvider services={servicesMap}>
 *       <YourApp />
 *     </DecouplerProvider
 */
export function DecouplerProvider({
  services,
  locator,
  injector, // TODO: For backwards compat. Remove this before 1.0.
  value,
  children,
}) {
  if (injector) {
    console.warn(
      'DecouplerProvider "injector" prop is deprecated. Use "locator".'
    );
    locator = injector;
  }
  if (!services && !locator) {
    throw new Error(
      'Must provide services or locator prop to DecouplerProvider.'
    );
  }

  const providerLocator = locator
    ? locator
    : ServiceLocator.fromServices(services);
  return (
    <DecouplerContext.Provider value={providerLocator}>
      {children}
    </DecouplerContext.Provider>
  );
}
// TODO: For backwards compat. Remove this before 1.0.
export const InjectorProvider = DecouplerProvider;

/**
 * @name: withServices
 * @description: Higher-order Component for locating services as props.
 * @usage:
 *
 *     const MyComponent = ({ServiceA, ServiceB}) => {
 *       return <div />
 *     }
 *
 *     MyComponent.dependencies = ['ServiceA', 'ServiceB']
 *
 *     export default withServices(MyComponent)
 */
export const withServices = Component => {
  const componentDisplayName =
    Component.displayName ||
    Component.name ||
    (Component.constructor && Component.constructor.name) ||
    'Component';

  class C extends React.Component {
    static displayName = `withServices(${componentDisplayName})`;
    static contextType = DecouplerContext;
    render() {
      const staticDeps = Component.dependencies || [];

      let injectedProps = {};
      if (Array.isArray(staticDeps)) {
        injectedProps.services = this.context.resolve(staticDeps);
      } else {
        injectedProps = this.context.resolve(staticDeps);
      }
      return <Component {...this.props} {...injectedProps} />;
    }
  }

  return hoistNonReactStatics(C, Component);
};

/**
 * @name: LocateServices
 * @description: Render Prop component for locating services.
 * @usage:
 *
 *     const App = () => {
 *       return (
 *         <LocateServices deps={['func', 'ServiceClass', 'val']}>
 *           {({func, ServiceClas, val}) => {
 *             return <div />
 *           }}
 *         </LocateServices>
 *       )
 *     }
 */
export class LocateServices extends React.Component {
  static contextType = DecouplerContext;

  static propTypes = {
    children: PropTypes.func.isRequired,
    deps: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.String),
      PropTypes.objectOf(PropTypes.String),
    ]),
  };

  render() {
    const locator = this.context;
    if (!locator) {
      throw new Error('Must be used inside a DecouplerProvider');
    }
    const { children, deps } = this.props;
    return children(locator.resolve(deps));
  }
}

/**
 * @name: useLocator
 * @description: Hook to return the locator from context.
 * @usage:
 *
 *     const App = () => {
 *       const locator = useLocator()
 *       const [A] = locator.resolve(['A'])
 *       return <div />
 *     }
 */
export function useLocator() {
  if (!React.useContext) {
    throw new Error(
      'Hooks not found on React. Are you using React v16.8 or greater?'
    );
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const locator = React.useContext(DecouplerContext);
  if (!locator) {
    throw new Error('Must be used inside a DecouplerProvider');
  }
  return locator;
}

/**
 * @name: useServices
 * @description: Hook to resolve and return the given dependencies
 * @usage:
 *
 *     const SERVICES = ['A', 'B']
 *
 *     const App = () => {
 *       const [A, B] = useServices(SERVICES)
 *       return <div />
 *     }
 */
export function useServices(deps) {
  const locator = useLocator();
  return locator.resolve(deps);
}
