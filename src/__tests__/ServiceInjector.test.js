import { ServiceInjector, Lookup as L } from '../ServiceInjector';

describe('ServiceInjector', () => {
  let injector;
  beforeEach(() => {
    injector = new ServiceInjector();
  });

  it('returns a list of deps when given a list of keys', () => {
    class A {}
    class B {}
    injector.register('A.super-complex-key', A);
    injector.register('B', B);

    expect(injector.resolve(['A.super-complex-key', 'B'])).toEqual([A, B]);
  });

  it('register supports strings, funcs, numbers, and symbols as keys', () => {
    class Foo {}
    class Bar {}
    class Baz {}
    class Qux {}
    const FOO_KEY = 'FOO_KEY_STR';
    const BAR_KEY = Symbol('Bar symbol key');
    const BAZ_KEY = 1234;
    const QUX_KEY = () => {};
    injector.register(FOO_KEY, Foo);
    injector.register(BAR_KEY, Bar);
    injector.register(BAZ_KEY, Baz);
    injector.register(QUX_KEY, Qux);

    const resolvedVals = injector.resolve([FOO_KEY, BAR_KEY, BAZ_KEY, QUX_KEY]);

    expect(resolvedVals).toEqual([Foo, Bar, Baz, Qux]);
  });

  it('returns an object of deps keyed by name when given a key->name object', () => {
    class A {}
    class B {}
    injector.register('A', A);
    injector.register('B.super-complex-key', B);

    expect(
      injector.resolve({ 'B.super-complex-key': 'SimpleB', A: 'ComplexA' })
    ).toEqual({ SimpleB: B, ComplexA: A });
  });

  it('throws when adding duplicate key without allowOverwrite option', () => {
    injector.register('val', 123);

    expect(() => {
      injector.register('val', 456);
    }).toThrow();

    expect(() => {
      injector.register('val', 456, { allowOverwrite: true });
    }).not.toThrow();
  });

  it('throws when locating a missing key', () => {
    injector.register('val', 123);
    expect(() => {
      injector.resolve(['unknown']);
    }).toThrow();
  });

  it('throws when locating with not an array or object', () => {
    expect(() => {
      injector.resolve(123);
    }).toThrow();

    expect(() => {
      injector.resolve('unsupported string');
    }).toThrow();

    expect(() => {
      injector.resolve(null);
    }).toThrow();

    expect(() => {
      injector.resolve(true);
    }).toThrow();

    expect(() => {
      injector.resolve([]);
    }).not.toThrow();

    expect(() => {
      injector.resolve({});
    }).not.toThrow();
  });

  it('registers service with setting to instantiate it when resolved', () => {
    class A {}
    class B {}
    injector.register('A', A);
    injector.register('B', B, { asInstance: true });

    const arrResult = injector.resolve(['A', 'B']);
    const objResult = injector.resolve({ A: 'A', B: 'b' });

    expect(arrResult[0]).toBe(A);
    expect(arrResult[1]).toBeInstanceOf(B);

    expect(objResult.A).toBe(A);
    expect(objResult.b).toBeInstanceOf(B);
  });

  it('registers service as instance with other services as paramaters to constructor', () => {
    class A {}
    class B {
      constructor(...args) {
        this.constructorArgs = args;
      }
    }
    class C {
      constructor(...args) {
        this.constructorArgs = args;
      }
    }
    injector.register('A', A);
    injector.register('B', B, {
      asInstance: true,
      withParams: [L('A'), L('C')],
    });
    injector.register('C', C, { asInstance: true, withParams: [L('A')] });

    const [bInstance] = injector.resolve(['B']);

    expect(bInstance.constructorArgs.length).toEqual(2);

    const [argA, argC] = bInstance.constructorArgs;
    expect(argA).toEqual(A);
    expect(argC).toBeInstanceOf(C);
    expect(argC.constructorArgs).toEqual([A]);
  });

  it('resolves a consistent, bound function when registered withParams but not asInstance', () => {
    class A {}
    function bFunc(AClass) {
      return AClass;
    }
    class C {
      constructor(...args) {
        this.constructorArgs = args;
      }
    }

    injector.register('A', A);
    injector.register('bFunc', bFunc, {
      asInstance: false,
      withParams: [L('A')],
    });
    injector.register('CStaticBound', C, {
      asInstance: false,
      withParams: [L('A')],
    });

    const [resolvedBFunc, resolvedCStaticBound] = injector.resolve([
      'bFunc',
      'CStaticBound',
    ]);
    const [resolvedBFunc2nd, resolvedCStaticBound2nd] = injector.resolve([
      'bFunc',
      'CStaticBound',
    ]);

    expect(resolvedBFunc2nd).toBe(resolvedBFunc);
    expect(resolvedCStaticBound2nd).toBe(resolvedCStaticBound);
    expect(resolvedBFunc()).toBe(A);

    const cInstance = new resolvedCStaticBound();
    expect(cInstance.constructorArgs).toEqual([A]);
    expect(cInstance).toBeInstanceOf(C);
  });

  it('throws if register called withParams for a non-callable', () => {
    expect(() => {
      injector.register('MyNotFunc', 1234321, { withParams: ['A'] });
    }).toThrow();

    expect(() => {
      injector.register('MyFunc', () => {}, { withParams: ['A'] });
    }).not.toThrow();

    expect(() => {
      injector.register('MyClass', class Bob {}, { withParams: ['A'] });
    }).not.toThrow();
  });

  it('supports vanilla JS values in withParams', () => {
    class Foo {
      constructor(...args) {
        this.constructorArgs = args;
      }
    }
    class Bar {}

    const immutableValObj = Object.freeze({ thingy: 'myvalue' });
    injector.register('Foo', Foo, {
      asInstance: true,
      withParams: [L('Bar'), 'Bar', immutableValObj, true],
    });
    injector.register('Bar', Bar);

    const [fooInstance] = injector.resolve(['Foo']);

    expect(fooInstance).toBeInstanceOf(Foo);
    expect(fooInstance.constructorArgs.length).toEqual(4);
    const [BarRef, barStr, immValObjRef, boolArg] = fooInstance.constructorArgs;
    expect(BarRef).toBe(Bar);
    expect(barStr).toBe('Bar');
    expect(immValObjRef).toBe(immutableValObj);
    expect(boolArg).toBe(true);
  });

  it('clears dependency cache of bound lookups', () => {
    class A {}
    function bFunc(AClass) {
      return AClass;
    }
    class C {
      constructor(...args) {
        this.constructorArgs = args;
      }
    }
    class OtherA {}

    injector.register('A', A);
    injector.register('bFunc', bFunc, {
      asInstance: false,
      withParams: [L('A')],
    });
    injector.register('CStaticBound', C, {
      asInstance: false,
      withParams: [L('A')],
    });

    const [resolvedBFunc, resolvedCStaticBound] = injector.resolve([
      'bFunc',
      'CStaticBound',
    ]);

    injector.clearDependencyCache();
    injector.register('A', OtherA, { allowOverwrite: true });

    const [resolvedBFunc2nd, resolvedCStaticBound2nd] = injector.resolve([
      'bFunc',
      'CStaticBound',
    ]);

    expect(resolvedBFunc()).toBe(A);
    expect(resolvedBFunc2nd()).toBe(OtherA);
    expect(resolvedBFunc2nd).not.toBe(resolvedBFunc);
    expect(resolvedCStaticBound2nd).not.toBe(resolvedCStaticBound);
  });
});
