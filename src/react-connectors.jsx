import React from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { ServiceInjector } from './ServiceInjector';

const InjectorContext = React.createContext();

/**
 * @name: InjectorProvider
 * @description: React Context Provider for library.
 * @usage:
 *
 *     // With Injector instance
 *     <InjectorProvider injector={injectorInstance}>
 *       <YourApp />
 *     </InjectorProvider
 *
 *     // OR With Services map
 *     const servicesMap = {
 *       'ServiceKey': Service
 *     }
 *     <InjectorProvider services={servicesMap}>
 *       <YourApp />
 *     </InjectorProvider
 */
export const InjectorProvider = ({ services, injector, value, children }) => {
  if (!services && !injector) {
    throw new Error(
      'Must provide services or injector prop to InjectorProvider.'
    );
  }

  const providerLocator = injector
    ? injector
    : ServiceInjector.fromServices(services);
  return (
    <InjectorContext.Provider value={providerLocator}>
      {children}
    </InjectorContext.Provider>
  );
};

/**
 * @name: withServices
 * @description: Higher-order Component for injecting services as props.
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
    static contextType = InjectorContext;
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
 * @name: InjectServices
 * @description: Render Prop component for injecting services.
 * @usage:
 *
 *     const App = () => {
 *       return (
 *         <InjectServices deps={['func', 'ServiceClass', 'val']}>
 *           {({func, ServiceClas, val}) => {
 *             return <div />
 *           }}
 *         </InjectServices>
 *       )
 *     }
 */
export class InjectServices extends React.Component {
  static contextType = InjectorContext;

  static propTypes = {
    children: PropTypes.func.isRequired,
    deps: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.String),
      PropTypes.objectOf(PropTypes.String),
    ]),
  };

  render() {
    const injector = this.context;
    if (!injector) {
      throw new Error('Must be used inside a InjectorProvider');
    }
    const { children, deps } = this.props;
    return children(injector.resolve(deps));
  }
}

/**
 * @name: useInjector
 * @description: Hook to return the Injector from context.
 * @usage:
 *
 *     const App = () => {
 *       const injector = useInjector()
 *       const [A] = injector.resolve(['A'])
 *       return <div />
 *     }
 */
export const useInjector = () => {
  if (!React.useContext) {
    throw new Error(
      'Hooks not found on React. Are you using React v16.8 or greater?'
    );
  }
  const injector = React.useContext(InjectorContext);
  if (!injector) {
    throw new Error('Must be used inside a InjectorProvider');
  }
  return injector;
};

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
export const useServices = deps => {
  const injector = useInjector();
  return injector.resolve(deps);
};
