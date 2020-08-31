# React Decoupler

## Overview

React Decoupler is a simple dependency injection / service locator utility
designed to help you decouple your React components from outside concerns and
make it easier to reuse, refactor, and test your code.

### Installation

- NPM: `npm install --save react-decoupler`
- Yarn: `yarn add react-decoupler`

### Explanation

How simple is it? RIDICULOUSLY SIMPLE! No Really. It's just a simple data
structure passed down via React Context that maps "service keys" to "services",
all wrapped in an ergonomic API with a bunch of helpful react-specific hooks and
components to make accessing it easier.

Why would you use this? Because you are busy, and this saves you the effort of writing the few hundred
lines of code, glue, and tests to provide the same behavior and helpful API.

### Examples

#### Simple Example

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import { DecouplerProvider, useServices } from 'react-decoupler';

const serviceMap = {
  helloworld: name => `Hello, ${name ? name : 'World'}!`,
};

function App() {
  const [getGreeting] = useServices(['helloWorld']);
  return (
    <div>
      <span>{getGreeting()}</span>
      <span>{getGreeting('Foo')}</span>
    </div>
  );
}

ReactDOM.render(
  <DecouplerProvider services={serviceMap}>
    <App />
  </DecouplerProvider>,
  document.getElementById('app')
);
```

#### Alternate Example

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import { DecouplerProvider, ServiceLocator, useServices } from 'react-decoupler';
import apiClient from './myApiClient';

const locator = new ServiceLocator();
locator.register('apiClient', apiClient);

function App() {
  const [apiClient] = useServices(['apiClient']);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState([])

  React.useEffect(() => {
    apiClient.loadData().then(setData).finally(() => setLoading(false))
  }, [apiClient]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* do stuff with data*/}
    </div>
  );
}

ReactDOM.render(
  <DecouplerProvider locator={locator}>
    <App />
  </DecouplerProvider>,
  document.getElementById('app')
);
```

#### Big Example

See example/ directory.

## API Reference

### ServiceLocator

A JavaScript Class that implements service registration and resolution.

#### Public Methods

```
class ServiceLocator
  static fromServices(services)
  register(key, service, options)
  resolve(dependencies)
  clearDependencyCache()
```

- `static fromServices(services: {})`: Factory function to create a ServiceLocator
  instance filled with the services from the provided vanilla JS object. Each
  key-value entry of the service object becomes a registered service in the
  locator.

- `register(key, service, options = {})`: Register a single service with a given
  key. Any value may be used as a key or a service. Supported options:

  - `allowOverwrite: Boolean`: When true, will replace any existing service
    registration using the same key. An error is thrown if a key is already
    registered and then a client attempts to re-register without this option.

  - `withParams: Array<any>`: Binds the given array of parameters as
    arguments to the service (value of the service must be a callable that
    supports `.bind()`). The binding happens at first-resolve-time and is
    consistent between calls. Use in conjunction with the `Lookup` function
    if you want to bind to services in the Injector. Defaults to undefined.

  - `asInstance: boolean`: When true, the locator will call `new` on the
    service value when resolving it. Will return a new instance _every call_.
    Defaults to false.

* `resolve(dependencies: {} | [])`: Accepts an array or object of service keys
  and returns a matching collection of resolved services.

  - When using an array of service keys, the order of the returned services will match with the keys.
  - When using an object of service keys, the name mapping is `{'name': 'ServiceKey'}`.

* `clearDependencyCache()`: Clears the resolution cache of all parameter bound
  services. When is this useful? If you are dynamically registering services
  (e.g. calling `locator.register()` inside a component or function) and want
  to force all future resolutions to forget the previous value of that
  registered service key, call this method to delete the previously cached
  services. The drawback to calling this function is that it forces certain
  service functions/classes to resolve as new object references (i.e.
  `useEffect` and `useMemo` that were relying on consistent reference in some
  consumers will misbehave) so you need to be careful when you call it.

#### Usage

```javascript
class A {}
class B {}

function cHelper(num, str) {
  return str + num;
}

class D {
  constructor(KlassA, instanceB, num) {
    this.instanceA = new KlassA();
    this.instanceB = instanceB;
    this.num = num;
  }
}

const locator = new ServiceLocator();

locator.register('A', A);
locator.register('B', B, { asInstance: true });
locator.register('C', cHelper, { withParams: [123, 'Hi: '] });
locator.register('D', D, {
  asInstance: true,
  withParams: [Lookup('A'), Lookup('B'), 123],
});

// Option 1: Array resolve

const [KlassA, b, instanceC, d] = locator.resolve(['A', 'B', 'C', 'D']);

// Option 2: Object resolve (equivalent)

const { KlassA, b, instanceC, d } = locator.resolve({
  KlassA: 'A',
  b: 'B',
  instanceC: 'C',
  d: 'D',
});
```

### Lookup()

Utility used in conjunction with the `ServiceLocator.register` option
`{withParams: []}` to indicate to the ServiceLocator it should look for a
service with that key during resolution.

#### Usage

```javascript
function foo(bar, iBar) {
  console.assert(bar === 'Bar');
  console.assert(iBar instanceof Bar);
}

class Bar {}

// In "withParams", 'Bar' will be a string bound to first argument of foo and
// Lookup('Bar') will be an instance of Bar class bound to the second argument

locator.register('Foo', foo, { withParams: ['Bar', Lookup('Bar')] });

locator.register('Bar', Bar, { isInstance: true });

const [resolvedFoo] = locator.resolve(['Foo']);
resolvedFoo();
```

### DecouplerProvider

React Context Provider. Wrap your components with this provider to enable the
rest of the helper functions and components.

#### Supported Props

Supply one of the following props, but not both:

- `locator`: an instance of ServiceLocator (or API compatible object)
- `services`: Vanilla JS object mapping service key names to services. e.g.
  `{ServiceKey: class MyService {}}`

#### Usage

```javascript
class MyService {};

const locatorInstance = new ServiceLocator();

locatorInstance.register('ServiceKey', MyService);

function App() {
  return (
    <DecouplerProvider locator={locatorInstance}>
      <YourApp />
    </DecouplerProvider
  )
}
```

Or with a "Services" mapping object.

```javascript
class MyService {};

const servicesMap = {
  'ServiceKey': MyService
};

function App() {
  return (
    <DecouplerProvider services={servicesMap}>
      <YourApp />
    </DecouplerProvider
  )
}
```

### useLocator()

Hook to return the internal ServiceLocator instance from context.

#### Usage

```javascript
function App() {
  const locator = useLocator();
  const [A] = locator.resolve(['A']);
  return <div />;
}
```

### useServices()

Hook to resolve and return the given dependencies.

#### Usage

```javascript
const SERVICES = ['A', 'B'];

const ALT_SERVICES = { a: 'A', b: 'B' };

function App() {
  const [A, B] = useServices(SERVICES);
  const { a, b } = useServices(ALT_SERVICES);

  return <div />;
}
```

### LocateServices

React Component for locating services and passing to a children render prop.

#### Usage

```javascript
function App() {
  return (
    <LocateServices deps={['funcKey', 'ServiceClass', 'val']}>
      {([func, ServiceClas, val]) => {
        return <div />;
      }}
    </LocateServices>
  );
}
```

### withServices()

Higher-order Component for injecting services as props.

#### Usage

```javascript
// Array service resolution keys:
function AppServiceArray({ services }) {
  const [serviceA, serviceB] = services;
  return <div />;
}

AppServiceArray.dependencies = ['AServiceKey', 'BServiceKey'];
export const WrappedAppServiceArray = withServices(AppServiceArray);

// Object service resolution keys:
function AppServiceObj({ serviceA, serviceB }) {
  return <div />;
}

AppServiceObj.dependencies = {
  serviceA: 'AServiceKey',
  serviceB: 'BServiceKey',
};

export const WrappedAppServiceObj = withServices(AppServiceObj);
```

## Contributing

Development of React Decoupler happens in the open on GitHub, and we are
grateful to the community for contributing bugfixes and improvements. Read below
to learn how you can take part in improving React Decoupler.

_TODO: contributing help_

### [Code of Conduct](https://testdouble.com/code-of-conduct)

This project follows Test Double's [code of
conduct](https://testdouble.com/code-of-conduct) for all community interactions,
including (but not limited to) one-on-one communications, public posts/comments,
code reviews, pull requests, and GitHub issues. If violations occur, Test Double
will take any action they deem appropriate for the infraction, up to and
including blocking a user from the organization's repositories.

### License

React Decoupler is [MIT licensed](./LICENSE).
