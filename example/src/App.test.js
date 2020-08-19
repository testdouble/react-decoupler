import React from 'react';
import { DecouplerProvider } from 'react-decoupler';
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
      <DecouplerProvider services={mockServices}>
        <VehicleDashboard vehicle={testVehicle} />
      </DecouplerProvider>
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
      <DecouplerProvider
        services={{
          APIClient,
          currentLocation: jest.fn().mockReturnValue([1, 2]),
          TripManager: {},
          'vehicle.calculateRange': jest.fn().mockReturnValue(1),
        }}
      >
        <App />
      </DecouplerProvider>
    );

    // TODO: make your assertions!

    await wait();
  });
});
