# React Decoupler

## Overview

React Decoupler is a simple dependency injection utility designed to help
you decouple your React components from outside concerns and make it easier to
reuse, refactor, and test your code.

### Installation

- NPM: `npm install --save react-decoupler`
- Yarn: `yarn add react-decoupler`

### Explanation

How simple is it? RIDICULOUSLY SIMPLE! No Really. It's essentially
just a [JavaScript
Map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
data structure passed down via React Context that maps "service keys" to "services",
all wrapped in an ergonomic API with a bunch of helpful react-specific hooks and
components to make accessing it easier.

Why would you use this? Because you are too lazy (in a good way), to write the
few hundred lines of glue code and tests to provide the same, simple API.

### Example

```javascript
// index.js

import React from 'react';
import ReactDOM from 'react-dom';
import { InjectorProvider } from 'react-decoupler';
import { injector } from './services';
import { App } from './App';

ReactDOM.render(
  <InjectorProvider injector={injector}>
    <App />
  </InjectorProvider>,
  document.getElementById('app')
);
```

```javascript
// services.js

import { ServiceInjector, Lookup } from 'react-decoupler';
import axios from 'axios';

// The injector will register your services and get passed down through
// React context to be used by our components
export const injector = new ServiceInjector();

// NOTE: Order of registration doesn't matter as long all of a service's
//       dependencies have been registered by the time it is resolved.

injector.register('currentLocation', currentLocation);
injector.register('vehicle.calculateRange', calculateVehicleRange);
injector.register('TripManager', TripManager, {
  // When resolved, injector will call `new TripManager()`
  asInstance: true,
});
injector.register('APIClient', APIClient, {
  // injector will bind the following params to the constructor
  withParams: [
    // When resolved, injector will pass whatever was registered with the
    // key "axios" as the first arg it's constructor
    Lookup('axios'),
    100, // Example of passing a static value
  ],
});

// By registering external dependencies in the Injector, components and other
// services don't need to import them directly. This makes it very easy to (a)
// test modules in isolation by filling an injector with mocked dependencies (b)
// swap out dependencies in different parts of the app without updating imports

injector.register('axios', axios.create({ /* custom params */ }));

/* START --- Contrived Example Code */
export class APIClient {
  constructor(axiosClient, defaultPageLength) {
    this.axios = axiosClient;
    this.defaultPageLength = defaultPageLength;
  }

  async listVehicles() {
    const resp = await this.axios.get(
      `/vehicles?per_page=${this.defaultPageLength}`
    );
    return resp.data;
  }

  async getVehicle(id) {
    const resp = await this.axios.get(`/vehicles/${id}`);
    return resp.data;
  }
}

export function calculateVehicleRange(vehicle) {
  return vehicle.remainingFuel * vehicle.gasMileage;
}

export async function currentLocation() {
  return [0, 0]; // Perform GPS location lookup
}

export class TripManager {
  calculateArrival(start, end) {
    // perform magic calculation
  }
}
/* END --- Contrived Example Code */
```

```javascript
// App.js

import React from 'react';
import { useServices } from 'react-decoupler';

export function App() {
  const [APIClient] = useServices(['APIClient']);
  const [vehicles, setVehicles] = React.useState([]);

  React.useEffect(() => {
    const apiClient = new APIClient(); // constructor args already bound;
    apiClient.listVehicles().then(apiVehicles => {
      setVehicles(apiVehicles);
    });
  }, [APIClient]); // APIClient will be consistent each render

  return (
    <div>
      {vehicles.map(vehicle => (
        <VehicleDashboard vehicle={vehicle} />
      ))}
    </div>
  );
}

export function VehicleDashboard({ vehicle }) {
  const [arrivalTime, setArrivalTime] = React.useState();
  const [calculateRange, currentLocation, tripManager] = useServices([
    'vehicle.calculateRange',
    'currentLocation',
    'TripManager', // will be a new instance each render
  ]);

  return (
    <div>
      <div>
        {vehicle.year} {vehicle.make} {vehicle.model}
      </div>
      <div>Range: {calculateRange(vehicle)}</div>
      <div>Arrival Time: {arrivalTime}</div>

      <button
        onClick={() => {
          currentLocation().then(myCoordinates => {
            const estimatedArrival = tripManager.calculateArrival(
              vehicle.lastLocation,
              myCoordinates
            );
            setArrivalTime(estimatedArrival);
          });
        }}
      >
        Calculate Arrival
      </button>
    </div>
  );
}
```

```javascript
// App.test.js

import { InjectorProvider } from 'react-decoupler';
import { render } from '@testing-library/react';
import { App, VehicleDashboard } from './App';

// WAT?! No Jest import mocks for our services?!

describe('VehicleDashboard', () => {
  it('makes test rendering super easy', () => {
    const mockServices = {
      'vehicle.calculateRange': jest.fn(),
      currentLocation: jest.fn(),
      TripManager: {
        calculateArrival: jest.fn(),
      },
    };

    const mockVehicle = {
      make: 'Toyota',
      model: 'Corolla',
      year: '2020' /* .etc */,
    };

    render(
      <InjectorProvider services={mockServices}>
        <VehicleDashboard vehicle={testVehicle} />
      </InjectorProvider>
    );

    // MAKE ASSERTIONS ON CALLS AND STUFF!
  });
});

describe('App', () => {
  it('makes even API requesting components trivial to test', () => {
  const fakeApiData = {data: [/* fill with test vehicles */]}
  const mockServices = {
    APIClient: {
      listVehicles: jest.fn().mockResolvedValue(fakeApiData)
    }
  }
    render(
      <InjectorProvider services={mockServices}>
        <App />
      </InjectorProvider>
    );
  })
```

```javascript
// services.test.js

import { APIClient, calculateVehicleRange, TripManager } from './services';

// WAT?! No jest import mocking of axios or any react things?!

describe('APIClient', () => {
  it('has never been so easy to test a service wrapping axios', async () => {
    const mockAxios = {get: jest.fn().mockResolvedValue()};
    const mockPageSize = 25;
    const client = new APIClient(mockAxios, mockPageSize);

    const vehicleListResult = await client.listVehicles();
    expect(mockAxios.get).toBeCalledWith(`/vehicles?per_page${mockPageSize}`)

    const vehicleResult = await client.getVehicle(1);
    expect(mockAxios.get).toBeCalledWith(`/vehicles/1`)
  });
});

describe('TripManager', () => {
  it('is trivial', () => {
    /* write your test */
  });
});

describe('calculateVehicleRange', () => {
  it('is trivial', () => {
    /* write your test */
  });
});

```

## API Reference

### ServiceInjector

A JavaScript Class that implements service registration and resolution.

#### Public Methods

```
class ServiceInjector

  register(key, service, options)
  resolve(dependencies)

  static fromServices(services)
```

- `register(key, service, options = {})`: Register a single service with a given
  key. Any value may be used as a key or a service. Supported options:

  - `withParams: Array<any>`: Binds the given array of parameters as
    arguments to the service (value of the service must be a callable that
    supports `.bind()`). The binding happens at first-resolve-time and is
    consistent between calls. Use in conjunction with the `Lookup` function
    if you want to bind to services in the Injector. Defaults to undefined.

  - `asInstance: boolean`: When true, the injector will call `new` on the
    service value when resolving it. Will return a new instance _every call_.
    Defaults to false.

- `resolve(dependencies: {} | [])`: Accepts an array or object of service keys
  and returns a matching collection of resolved services.

  - When using an array of service keys, the order of the returned services will match with the keys.
  - When using an object of service keys, the name mapping is `{'name': 'ServiceKey'}`.

- `static fromServices(services: {})`: Factory function to create a ServiceInjector
  instance filled with the services from the provided vanilla JS object. Each
  key-value entry of the service object becomes a registered service in the
  injector.

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

const injector = new ServiceInjector();

injector.register('A', A);
injector.register('B', B, { asInstance: true });
injector.register('C', cHelper, { withParams: [123, 'Hi: '] });
injector.register('D', D, {
  asInstance: true,
  withParams: [Lookup('A'), Lookup('B'), 123],
});

// Option 1: Array resolve

const [KlassA, b, instanceC, d] = injector.resolve(['A', 'B', 'C', 'D']);

// Option 2: Object resolve (equivalent)

const { KlassA, b, instanceC, d } = injector.resolve({
  KlassA: 'A',
  b: 'B',
  instanceC: 'C',
  d: 'D',
});
```

### Lookup()

Utility used in conjunction with the `ServiceInjector.register` option
`{withParams: []}` to indicate to the ServiceInjector it should look for a
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

injector.register('Foo', foo, { withParams: ['Bar', Lookup('Bar')] });

injector.register('Bar', Bar, { isInstance: true });

const [resolvedFoo] = injector.resolve(['Foo']);
resolvedFoo();
```

### InjectorProvider

React Context Provider. Wrap your components with this provider to enable the
rest of the helper functions and components.

#### Supported Props

Supply one of the following props, but not both:

- `injector`: an instance of ServiceInjector (or API compatible object)
- `services`: Vanilla JS object mapping service key names to services. e.g.
  `{ServiceKey: class MyService {}}`

#### Usage

```javascript
class MyService {};

const injector = new ServiceInjector();

injector.register('ServiceKey', MyService);

function App() {
  return (
    <InjectorProvider injector={injectorInstance}>
      <YourApp />
    </InjectorProvider
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
    <InjectorProvider services={servicesMap}>
      <YourApp />
    </InjectorProvider
  )
}
```

### useInjector()

Hook to return the internal ServiceInjector instance from context.

#### Usage

```javascript
function App() {
  const injector = useInjector();
  const [A] = injector.resolve(['A']);
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

### InjectServices

Render Prop component for injecting services.

#### Usage

```javascript
function App() {
  return (
    <InjectServices deps={['funcKey', 'ServiceClass', 'val']}>
      {([ func, ServiceClas, val ]) => {
        return <div />;
      }}
    </InjectServices>
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

AppServiceObj.dependencies = { serviceA: 'AServiceKey', serviceB: 'BServiceKey' };

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
