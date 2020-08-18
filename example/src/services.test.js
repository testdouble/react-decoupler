import { APIClient, calculateVehicleRange, TripManager } from './services';

// WAT?! No jest import mocking of axios or any react things?!

describe('APIClient', () => {
  it('has never been so easy to test a service wrapping axios', async () => {
    const mockAxios = { get: jest.fn().mockResolvedValue({ data: {} }) };
    const mockPageSize = 25;
    const client = new APIClient(mockAxios, mockPageSize);

    const vehicleListResult = await client.listVehicles();
    expect(mockAxios.get).toBeCalledWith(`/vehicles?per_page=${mockPageSize}`);

    const vehicleResult = await client.getVehicle(1);
    expect(mockAxios.get).toBeCalledWith(`/vehicles/1`);
  });
});

describe('TripManager', () => {
  it('is trivial', () => {
    /* TODO: write your test */
  });
});

describe('calculateVehicleRange', () => {
  it('is trivial', () => {
    /* TODO: write your test */
  });
});
