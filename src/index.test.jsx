import React from 'react'
import { render } from '@testing-library/react'
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

  it('adds services to dep map', () => {
    const expectedMap = new Map()
    class A {}
    class B {}
    locator.add('staticValue', 123)
    expectedMap.set('staticValue', 123)
    locator.add('A', A)
    expectedMap.set('A', A)
    locator.add('B', B)
    expectedMap.set('B', B)

    expect(locator.dependencies).toEqual(expectedMap)
  })

  it('returns a list of deps when given a list of keys', () => {
    class A {}
    class B {}
    locator.add('A.super-complex-key', A)
    locator.add('B', B)

    expect(locator.locate(['A.super-complex-key', 'B'])).toEqual([A, B])
  })

  it('returns an object of deps keyed by name when given a key->name object', () => {
    class A {}
    class B {}
    locator.add('A', A)
    locator.add('B.super-complex-key', B)

    expect(
      locator.locate({ 'B.super-complex-key': 'SimpleB', A: 'ComplexA' })
    ).toEqual({ SimpleB: B, ComplexA: A })
  })

  it('throws when adding duplicate key', () => {
    locator.add('val', 123)
    expect(() => {
      locator.add('val', 456)
    }).toThrow()
  })

  it('throws when locating a missing key', () => {
    locator.add('val', 123)
    expect(() => {
      locator.locate(['unknown'])
    }).toThrow()
  })

  it('throws when locating with not an array or object', () => {
    expect(() => {
      locator.locate(123)
    }).toThrow()

    expect(() => {
      locator.locate('unsupported string')
    }).toThrow()

    expect(() => {
      locator.locate(null)
    }).toThrow()

    expect(() => {
      locator.locate(true)
    }).toThrow()

    expect(() => {
      locator.locate([])
    }).not.toThrow()

    expect(() => {
      locator.locate({})
    }).not.toThrow()
  })
})

describe('withServices() HOC', () => {
  it('passes declared dependencies as props', () => {
    const App = props => {
      expect(props.services).toEqual([
        mockServices.func,
        mockServices.ServiceClass,
        mockServices.val,
      ])
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
          {([func, ServiceClass, val]) => {
            expect(func).toBe(mockServices.func)
            expect(ServiceClass).toBe(mockServices.ServiceClass)
            expect(val).toBe(mockServices.val)
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
      const requestedServices = ['func', 'ServiceClass', 'val']
      const [func, ServiceClass, val] = useServices(
        requestedServices,
        'missing'
      )
      expect(func).toBe(mockServices.func)
      expect(ServiceClass).toBe(mockServices.ServiceClass)
      expect(val).toBe(mockServices.val)
      return 'default'
    }

    render(
      <LocateServicesProvider services={mockServices}>
        <App />
      </LocateServicesProvider>
    )
  })
})
