import { ServiceLocator, Lookup as L } from '../ServiceLocator';

describe('ServiceLocator', () => {
  let locator;
  beforeEach(() => {
    locator = new ServiceLocator();
  });

  it('returns a list of deps when given a list of keys', () => {
    class A {}
    class B {}
    locator.register('A.super-complex-key', A);
    locator.register('B', B);

    expect(locator.resolve(['A.super-complex-key', 'B'])).toEqual([A, B]);
  });

  it('maintains static data when rebinding', () => {
    class A {
      static thing() {
        return true;
      }
    }

    locator.register('A', A, { withParams: [1] });
    const [AResolved] = locator.resolve(['A']);

    expect(AResolved.thing()).toBe(true);
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
    locator.register(FOO_KEY, Foo);
    locator.register(BAR_KEY, Bar);
    locator.register(BAZ_KEY, Baz);
    locator.register(QUX_KEY, Qux);

    const resolvedVals = locator.resolve([FOO_KEY, BAR_KEY, BAZ_KEY, QUX_KEY]);

    expect(resolvedVals).toEqual([Foo, Bar, Baz, Qux]);
  });

  it('returns an object of deps keyed by name when given a key->name object', () => {
    class A {}
    class B {}
    locator.register('A', A);
    locator.register('B.super-complex-key', B);

    expect(
      locator.resolve({ 'B.super-complex-key': 'SimpleB', A: 'ComplexA' })
    ).toEqual({ SimpleB: B, ComplexA: A });
  });

  it('throws when adding duplicate key without allowOverwrite option', () => {
    locator.register('val', 123);

    expect(() => {
      locator.register('val', 456);
    }).toThrow();

    expect(() => {
      locator.register('val', 456, { allowOverwrite: true });
    }).not.toThrow();
  });

  it('throws when locating a missing key', () => {
    locator.register('val', 123);
    expect(() => {
      locator.resolve(['unknown']);
    }).toThrow();
  });

  it('throws when locating with not an array or object', () => {
    expect(() => {
      locator.resolve(123);
    }).toThrow();

    expect(() => {
      locator.resolve('unsupported string');
    }).toThrow();

    expect(() => {
      locator.resolve(null);
    }).toThrow();

    expect(() => {
      locator.resolve(true);
    }).toThrow();

    expect(() => {
      locator.resolve([]);
    }).not.toThrow();

    expect(() => {
      locator.resolve({});
    }).not.toThrow();
  });

  it('registers service with setting to instantiate it when resolved', () => {
    class A {}
    class B {}
    locator.register('A', A);
    locator.register('B', B, { asInstance: true });

    const arrResult = locator.resolve(['A', 'B']);
    const objResult = locator.resolve({ A: 'A', B: 'b' });

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
    locator.register('A', A);
    locator.register('B', B, {
      asInstance: true,
      withParams: [L('A'), L('C')],
    });
    locator.register('C', C, { asInstance: true, withParams: [L('A')] });

    const [bInstance] = locator.resolve(['B']);

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

    locator.register('A', A);
    locator.register('bFunc', bFunc, {
      asInstance: false,
      withParams: [L('A')],
    });
    locator.register('CStaticBound', C, {
      asInstance: false,
      withParams: [L('A')],
    });

    const [resolvedBFunc, resolvedCStaticBound] = locator.resolve([
      'bFunc',
      'CStaticBound',
    ]);
    const [resolvedBFunc2nd, resolvedCStaticBound2nd] = locator.resolve([
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
      locator.register('MyNotFunc', 1234321, { withParams: ['A'] });
    }).toThrow();

    expect(() => {
      locator.register('MyFunc', () => {}, { withParams: ['A'] });
    }).not.toThrow();

    expect(() => {
      locator.register('MyClass', class Bob {}, { withParams: ['A'] });
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
    locator.register('Foo', Foo, {
      asInstance: true,
      withParams: [L('Bar'), 'Bar', immutableValObj, true],
    });
    locator.register('Bar', Bar);

    const [fooInstance] = locator.resolve(['Foo']);

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

    locator.register('A', A);
    locator.register('bFunc', bFunc, {
      asInstance: false,
      withParams: [L('A')],
    });
    locator.register('CStaticBound', C, {
      asInstance: false,
      withParams: [L('A')],
    });

    const [resolvedBFunc, resolvedCStaticBound] = locator.resolve([
      'bFunc',
      'CStaticBound',
    ]);

    locator.clearDependencyCache();
    locator.register('A', OtherA, { allowOverwrite: true });

    const [resolvedBFunc2nd, resolvedCStaticBound2nd] = locator.resolve([
      'bFunc',
      'CStaticBound',
    ]);

    expect(resolvedBFunc()).toBe(A);
    expect(resolvedBFunc2nd()).toBe(OtherA);
    expect(resolvedBFunc2nd).not.toBe(resolvedBFunc);
    expect(resolvedCStaticBound2nd).not.toBe(resolvedCStaticBound);
  });
});
