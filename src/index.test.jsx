import React from 'react'
import { render } from '@testing-library/react'
import pick from 'lodash.pick'
import {
  LocateServicesProvider,
  withServices,
  InjectServices,
  ServiceLocator,
  useServiceLocator,
  useServices,
} from './index'

let mockServices
beforeEach(() => {
  mockServices = {
    func: () => 123,
    ignoredFunc: () => 321,
    ServiceClass: class ServiceClass {},
    IgnoredClass: class IgnoredClass {},
    val: 456,
    ignoredVal: 654,
  }
})

describe('ServiceLocator', () => {
  let locator
  beforeEach(() => {
    locator = new ServiceLocator()
  })

  it('adds and looks up multiple', () => {
    class A {}
    class B {}
    locator.add('staticValue', 123)
    locator.add('A', A)
    locator.add('B', B)
    expect(locator.locate(['A', 'B', 'staticValue', 'missing'])).toEqual({
      A,
      B,
      staticValue: 123,
    })
  })

  it('throws when adding duplicate key', () => {
    locator.add('val', 123)
    expect(() => {
      locator.add('val', 456)
    }).toThrow()
  })
})

describe('withServices() HOC', () => {
  it('passes declared dependencies as props', () => {
    const App = props => {
      expect(props.ServiceClass).toBe(mockServices.ServiceClass)
      return 'done'
    }
    App.dependencies = ['func', 'ServiceClass', 'val']

    const WrappedApp = withServices(App)
    const { queryByText } = render(
      <LocateServicesProvider services={mockServices}>
        <WrappedApp />
      </LocateServicesProvider>
    )
    expect(queryByText('done')).toBeInTheDocument()
  })

  it('handles missing static dependencies property', () => {
    const App = props => 'done'

    const WrappedApp = withServices(App)
    const { queryByText } = render(
      <LocateServicesProvider services={mockServices}>
        <WrappedApp />
      </LocateServicesProvider>
    )
    expect(queryByText('done')).toBeInTheDocument()
  })
})

describe('<InjectServices /> render prop component', () => {
  it('throws if not wrapped in provider', () => {
    const App = props => {
      return (
        <InjectServices deps={['func', 'ServiceClass', 'val']}>
          {services => {
            return 'done'
          }}
        </InjectServices>
      )
    }
    const oldError = console.error
    console.error = () => {}
    try {
      expect(() => {
        render(<App />)
      }).toThrow()
    } finally {
      console.error = oldError
    }
  })

  it('passes declared dependencies as args to child render prop', () => {
    const App = props => {
      return (
        <InjectServices deps={['func', 'ServiceClass', 'val']}>
          {services => {
            expect(services.ServiceClass).toBe(mockServices.ServiceClass)
            return 'done'
          }}
        </InjectServices>
      )
    }
    render(
      <LocateServicesProvider services={mockServices}>
        <App />
      </LocateServicesProvider>
    )
  })
})

describe('useServicesLocator()', () => {
  it('returns default locator', () => {
    const App = () => {
      const loc = useServiceLocator()
      expect(loc).toBeInstanceOf(ServiceLocator)
      return 'default'
    }

    render(
      <LocateServicesProvider services={{}}>
        <App />
      </LocateServicesProvider>
    )
  })

  it('returns created locator', () => {
    const locator = new ServiceLocator()
    const App = () => {
      const loc = useServiceLocator()
      expect(loc).toBe(locator)
      return 'default'
    }

    render(
      <LocateServicesProvider locator={locator}>
        <App />
      </LocateServicesProvider>
    )
  })

  it('throws if not wrapped in provider', () => {
    const App = () => {
      useServiceLocator()
      return 'default'
    }

    const oldError = console.error
    console.error = () => {}
    try {
      expect(() => {
        render(<App />)
      }).toThrow()
    } finally {
      console.error = oldError
    }
  })
})

describe('useServices()', () => {
  it('returns requested services', () => {
    const App = () => {
      const results = useServices(['func', 'ServiceClass', 'val'], 'missing')
      expect(results).toEqual(
        pick(mockServices, ['func', 'ServiceClass', 'val'])
      )
      return 'default'
    }

    render(
      <LocateServicesProvider services={mockServices}>
        <App />
      </LocateServicesProvider>
    )
  })
})
