import React from 'react';
import { render } from '@testing-library/react';
import { ServiceLocator } from '../ServiceLocator.js';
import {
  DecouplerProvider,
  withServices,
  LocateServices,
  useLocator,
  useServices,
} from '../react-connectors.jsx';

let mockServices;
beforeEach(() => {
  mockServices = {
    func: () => 123,
    ignoredFunc: () => 321,
    ServiceClass: class ServiceClass {},
    IgnoredClass: class IgnoredClass {},
    val: 456,
    ignoredVal: 654,
  };
});

describe('withServices() HOC', () => {
  it('passes dependency list result as an array prop named "services"', () => {
    const App = props => {
      expect(props.services).toEqual([
        mockServices.func,
        mockServices.ServiceClass,
        mockServices.val,
      ]);
      return 'done';
    };
    App.dependencies = ['func', 'ServiceClass', 'val'];

    const WrappedApp = withServices(App);
    const { queryByText } = render(
      <DecouplerProvider services={mockServices}>
        <WrappedApp />
      </DecouplerProvider>
    );
    expect(queryByText('done')).toBeInTheDocument();
  });

  it('supports named dependencies as direct props', () => {
    const App = props => {
      expect(props).toEqual({
        MappedFunc: mockServices.func,
        MappedClass: mockServices.ServiceClass,
        MappedVal: mockServices.val,
      });
      return 'done';
    };
    App.dependencies = {
      func: 'MappedFunc',
      ServiceClass: 'MappedClass',
      val: 'MappedVal',
    };

    const WrappedApp = withServices(App);
    const { queryByText } = render(
      <DecouplerProvider services={mockServices}>
        <WrappedApp />
      </DecouplerProvider>
    );
    expect(queryByText('done')).toBeInTheDocument();
  });

  it('handles missing static dependencies property', () => {
    const App = props => 'done';

    const WrappedApp = withServices(App);
    const { queryByText } = render(
      <DecouplerProvider services={mockServices}>
        <WrappedApp />
      </DecouplerProvider>
    );
    expect(queryByText('done')).toBeInTheDocument();
  });
});

describe('<LocateServices /> render prop component', () => {
  it('throws if not wrapped in provider', () => {
    const App = props => {
      return (
        <LocateServices deps={['func', 'ServiceClass', 'val']}>
          {services => {
            return 'done';
          }}
        </LocateServices>
      );
    };
    const oldError = console.error;
    console.error = () => {};
    try {
      expect(() => {
        render(<App />);
      }).toThrow();
    } finally {
      console.error = oldError;
    }
  });

  it('passes declared dependencies as args to child render prop', () => {
    const App = props => {
      return (
        <LocateServices deps={['func', 'ServiceClass', 'val']}>
          {([func, ServiceClass, val]) => {
            expect(func).toBe(mockServices.func);
            expect(ServiceClass).toBe(mockServices.ServiceClass);
            expect(val).toBe(mockServices.val);
            return 'done';
          }}
        </LocateServices>
      );
    };
    render(
      <DecouplerProvider services={mockServices}>
        <App />
      </DecouplerProvider>
    );
  });

  it('passes declared dependencies as args to child render prop', () => {
    const App = props => {
      return (
        <LocateServices deps={{ func: 'NewNameFunc', val: 'NewVal' }}>
          {({ NewNameFunc, NewVal }) => {
            expect(NewNameFunc).toBe(mockServices.func);
            expect(NewVal).toBe(mockServices.val);
            return 'done';
          }}
        </LocateServices>
      );
    };
    render(
      <DecouplerProvider services={mockServices}>
        <App />
      </DecouplerProvider>
    );
  });
});

describe('useLocator()', () => {
  it('returns default locator', () => {
    const App = () => {
      const loc = useLocator();
      expect(loc).toBeInstanceOf(ServiceLocator);
      return 'default';
    };

    render(
      <DecouplerProvider services={{}}>
        <App />
      </DecouplerProvider>
    );
  });

  it('returns created locator', () => {
    const locator = new ServiceLocator();
    const App = () => {
      const loc = useLocator();
      expect(loc).toBe(locator);
      return 'default';
    };

    render(
      <DecouplerProvider locator={locator}>
        <App />
      </DecouplerProvider>
    );
  });

  it('throws if not wrapped in provider', () => {
    const App = () => {
      useLocator();
      return 'default';
    };

    const oldError = console.error;
    console.error = () => {};
    try {
      expect(() => {
        render(<App />);
      }).toThrow();
    } finally {
      console.error = oldError;
    }
  });
});

describe('useServices()', () => {
  it('returns requested services array', () => {
    const deps = ['func', 'ServiceClass', 'val'];

    const App = () => {
      const [func, ServiceClass, val] = useServices(deps);

      expect(func).toBe(mockServices.func);
      expect(ServiceClass).toBe(mockServices.ServiceClass);
      expect(val).toBe(mockServices.val);

      return 'default';
    };

    render(
      <DecouplerProvider services={mockServices}>
        <App />
      </DecouplerProvider>
    );
  });

  it('returns requested services object', () => {
    const deps = { func: 'NewNameFunc', ServiceClass: 'NewNameClass' };

    const App = () => {
      const { NewNameFunc, NewNameClass } = useServices(deps);

      expect(NewNameFunc).toBe(mockServices.func);
      expect(NewNameClass).toBe(mockServices.ServiceClass);

      return 'default';
    };

    render(
      <DecouplerProvider services={mockServices}>
        <App />
      </DecouplerProvider>
    );
  });
});
