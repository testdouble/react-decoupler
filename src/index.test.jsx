import React from 'react'
import { render } from '@testing-library/react'
import {
  InjectorProvider,
  withServices,
  InjectServices,
  ServiceInjector,
  useServiceInjector,
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

describe('ServiceInjector', () => {
  let injector
  beforeEach(() => {
    injector = new ServiceInjector()
  })

  it('returns a list of deps when given a list of keys', () => {
    class A {}
    class B {}
    injector.register('A.super-complex-key', A)
    injector.register('B', B)

    expect(injector.resolve(['A.super-complex-key', 'B'])).toEqual([A, B])
  })

  it('returns an object of deps keyed by name when given a key->name object', () => {
    class A {}
    class B {}
    injector.register('A', A)
    injector.register('B.super-complex-key', B)

    expect(
      injector.resolve({ 'B.super-complex-key': 'SimpleB', A: 'ComplexA' })
    ).toEqual({ SimpleB: B, ComplexA: A })
  })

  it('throws when adding duplicate key', () => {
    injector.register('val', 123)
    expect(() => {
      injector.register('val', 456)
    }).toThrow()
  })

  it('throws when locating a missing key', () => {
    injector.register('val', 123)
    expect(() => {
      injector.resolve(['unknown'])
    }).toThrow()
  })

  it('throws when locating with not an array or object', () => {
    expect(() => {
      injector.resolve(123)
    }).toThrow()

    expect(() => {
      injector.resolve('unsupported string')
    }).toThrow()

    expect(() => {
      injector.resolve(null)
    }).toThrow()

    expect(() => {
      injector.resolve(true)
    }).toThrow()

    expect(() => {
      injector.resolve([])
    }).not.toThrow()

    expect(() => {
      injector.resolve({})
    }).not.toThrow()
  })

  it('registers service with setting to instantiate it when resolved', () => {
    class A {}
    class B {}
    injector.register('A', A)
    injector.register('B', B, { asInstance: true })

    const arrResult = injector.resolve(['A', 'B'])
    const objResult = injector.resolve({ A: 'A', B: 'b' })

    expect(arrResult[0]).toBe(A)
    expect(arrResult[1]).toBeInstanceOf(B)

    expect(objResult.A).toBe(A)
    expect(objResult.b).toBeInstanceOf(B)
  })

  it('registers service as instance with other services as paramaters to constructor', () => {
    class A {}
    class B {
      constructor(...args) {
        this.constructorArgs = args
      }
    }
    class C {
      constructor(...args) {
        this.constructorArgs = args
      }
    }
    injector.register('A', A)
    injector.register('B', B, { asInstance: true, withParams: ['A', 'C'] })
    injector.register('C', C, { asInstance: true, withParams: ['A'] })

    const [bInstance] = injector.resolve(['B'])

    expect(bInstance.constructorArgs.length).toEqual(2)

    const [argA, argC] = bInstance.constructorArgs
    expect(argA).toEqual(A)
    expect(argC).toBeInstanceOf(C)
    expect(argC.constructorArgs).toEqual([A])
  })

  it('resolves a consistent, bound function when registered withParams but not asInstance', () => {
    class A {}
    function bFunc(AClass) {
      return AClass
    }
    class C {
      constructor(...args) {
        this.constructorArgs = args
      }
    }

    injector.register('A', A)
    injector.register('bFunc', bFunc, { asInstance: false, withParams: ['A'] })
    injector.register('CStaticBound', C, {
      asInstance: false,
      withParams: ['A'],
    })

    const [resolvedBFunc, resolvedCStaticBound] = injector.resolve([
      'bFunc',
      'CStaticBound',
    ])
    const [resolvedBFunc2nd, resolvedCStaticBound2nd] = injector.resolve([
      'bFunc',
      'CStaticBound',
    ])

    expect(resolvedBFunc2nd).toBe(resolvedBFunc)
    expect(resolvedCStaticBound2nd).toBe(resolvedCStaticBound)
    expect(resolvedBFunc()).toBe(A)

    const cInstance = new resolvedCStaticBound()
    expect(cInstance.constructorArgs).toEqual([A])
    expect(cInstance).toBeInstanceOf(C)
  })

  it('throws if register called withParams for a non-callable', () => {
    expect(() => {
      injector.register('MyNotFunc', 1234321, { withParams: ['A'] })
    }).toThrow()

    expect(() => {
      injector.register('MyFunc', () => {}, { withParams: ['A'] })
    }).not.toThrow()

    expect(() => {
      injector.register('MyClass', class Bob {}, { withParams: ['A'] })
    }).not.toThrow()
  })
})

describe('withServices() HOC', () => {
  it('passes dependency list result as an Arrapy prop named "services"', () => {
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
      <InjectorProvider services={mockServices}>
        <WrappedApp />
      </InjectorProvider>
    )
    expect(queryByText('done')).toBeInTheDocument()
  })

  it('supports named dependencies as direct props', () => {
    const App = props => {
      expect(props).toEqual({
        MappedFunc: mockServices.func,
        MappedClass: mockServices.ServiceClass,
        MappedVal: mockServices.val,
      })
      return 'done'
    }
    App.dependencies = {
      func: 'MappedFunc',
      ServiceClass: 'MappedClass',
      val: 'MappedVal',
    }

    const WrappedApp = withServices(App)
    const { queryByText } = render(
      <InjectorProvider services={mockServices}>
        <WrappedApp />
      </InjectorProvider>
    )
    expect(queryByText('done')).toBeInTheDocument()
  })

  it('handles missing static dependencies property', () => {
    const App = props => 'done'

    const WrappedApp = withServices(App)
    const { queryByText } = render(
      <InjectorProvider services={mockServices}>
        <WrappedApp />
      </InjectorProvider>
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
      <InjectorProvider services={mockServices}>
        <App />
      </InjectorProvider>
    )
  })

  it('passes declared dependencies as args to child render prop', () => {
    const App = props => {
      return (
        <InjectServices deps={{ func: 'NewNameFunc', val: 'NewVal' }}>
          {({ NewNameFunc, NewVal }) => {
            expect(NewNameFunc).toBe(mockServices.func)
            expect(NewVal).toBe(mockServices.val)
            return 'done'
          }}
        </InjectServices>
      )
    }
    render(
      <InjectorProvider services={mockServices}>
        <App />
      </InjectorProvider>
    )
  })
})

describe('useServicesInjector()', () => {
  it('returns default injector', () => {
    const App = () => {
      const loc = useServiceInjector()
      expect(loc).toBeInstanceOf(ServiceInjector)
      return 'default'
    }

    render(
      <InjectorProvider services={{}}>
        <App />
      </InjectorProvider>
    )
  })

  it('returns created injector', () => {
    const injector = new ServiceInjector()
    const App = () => {
      const loc = useServiceInjector()
      expect(loc).toBe(injector)
      return 'default'
    }

    render(
      <InjectorProvider injector={injector}>
        <App />
      </InjectorProvider>
    )
  })

  it('throws if not wrapped in provider', () => {
    const App = () => {
      useServiceInjector()
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
  it('returns requested services array', () => {
    const deps = ['func', 'ServiceClass', 'val']

    const App = () => {
      const [func, ServiceClass, val] = useServices(deps)

      expect(func).toBe(mockServices.func)
      expect(ServiceClass).toBe(mockServices.ServiceClass)
      expect(val).toBe(mockServices.val)

      return 'default'
    }

    render(
      <InjectorProvider services={mockServices}>
        <App />
      </InjectorProvider>
    )
  })

  it('returns requested services object', () => {
    const deps = { func: 'NewNameFunc', ServiceClass: 'NewNameClass' }

    const App = () => {
      const { NewNameFunc, NewNameClass } = useServices(deps)

      expect(NewNameFunc).toBe(mockServices.func)
      expect(NewNameClass).toBe(mockServices.ServiceClass)

      return 'default'
    }

    render(
      <InjectorProvider services={mockServices}>
        <App />
      </InjectorProvider>
    )
  })
})
