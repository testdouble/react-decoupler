import React from 'react';
import { useServices } from 'react-decoupler';
import './App.css';

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
        <VehicleDashboard key={vehicle.id} vehicle={vehicle} />
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

export default App;
