import React from 'react';
import { InjectorProvider } from 'react-decoupler';
import { render, wait } from '@testing-library/react';
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

    const testVehicle = {
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
  it('makes even API requesting components trivial to test', async () => {
    const fakeApiData = [
      /* fill with test vehicles */
      {
        id: 1,
        make: 'Toyota',
        model: 'Corolla',
        year: '2020' /* .etc */,
      },
    ];

    class APIClient {
      listVehicles = jest.fn().mockResolvedValue(fakeApiData);
    }

    render(
      <InjectorProvider
        services={{
          APIClient,
          currentLocation: jest.fn().mockReturnValue([1, 2]),
          TripManager: {},
          'vehicle.calculateRange': jest.fn().mockReturnValue(1),
        }}
      >
        <App />
      </InjectorProvider>
    );

    // TODO: make your assertions!

    await wait();
  });
});
