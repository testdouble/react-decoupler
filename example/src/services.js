import { ServiceInjector, Lookup } from 'react-decoupler';
import axios from 'axios';

// The injector will register your services and get passed down through
// React context to be used by our components
export const injector = new ServiceInjector();

// NOTE: Order of registration doesn't matter as long all of a service's
//       dependencies have been registered by the time it is resolved.

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

injector.register(
  'axios',
  axios.create({
    /* custom params */
  })
);
