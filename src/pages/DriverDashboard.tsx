import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { routeService, locationService } from '../services/db';
import type { Route, BusLocation } from '../types';
import { Bus, Navigation, StopCircle } from 'lucide-react';
import MapComponent from '../components/Map/MapComponent';

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [isDriving, setIsDriving] = useState(false);
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    routeService.getAllRoutes().then(setRoutes);
  }, []);

  useEffect(() => {
     if (isDriving && selectedRouteId && user) {
        // Start watching position
        const id = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, speed } = pos.coords;
                setLocation([latitude, longitude]);
                
                // Update Firebase
                locationService.updateLocation(user.uid, {
                    busId: user.uid, // Using User UID as Bus ID for simplicity
                    lat: latitude,
                    lng: longitude,
                    speed: speed || 0,
                    routeId: selectedRouteId
                });
            },
            (err) => console.error("Location error:", err),
            { enableHighAccuracy: true, maximumAge: 0 }
        );
        setWatchId(id);
     } else {
         if (watchId !== null) {
             navigator.geolocation.clearWatch(watchId);
             setWatchId(null);
         }
     }
     
     return () => {
         if (watchId !== null) navigator.geolocation.clearWatch(watchId);
     };
  }, [isDriving, selectedRouteId, user]);

  const toggleDriving = () => {
      if (!selectedRouteId) return alert("Select a route first");
      setIsDriving(!isDriving);
  };

  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white shadow p-4 flex justify-between items-center z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
            <Bus className="text-blue-600" />
            Driver Dashboard
        </h1>
        <button onClick={logout} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50">Logout</button>
      </div>

      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 right-4 z-[500] flex flex-col gap-2 md:w-96">
            <div className="bg-white p-4 rounded-lg shadow-lg space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Route</label>
                    <select 
                        className="w-full border rounded p-2"
                        value={selectedRouteId}
                        onChange={(e) => {
                            if (isDriving) toggleDriving(); // Stop driving if route changes
                            setSelectedRouteId(e.target.value);
                        }}
                    >
                        <option value="">-- Choose Route --</option>
                        {routes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                    <span className="font-semibold text-gray-700">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${isDriving ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {isDriving ? 'ON DUTY' : 'OFF DUTY'}
                    </span>
                </div>

                <button
                    onClick={toggleDriving}
                    disabled={!selectedRouteId}
                    className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                        isDriving 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-green-600 hover:bg-green-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isDriving ? 'Stop Driving' : 'Start Driving'}
                </button>
            </div>
        </div>

        {/* Map */}
        <MapComponent 
            center={location || [12.9716, 77.5946]}
            zoom={15}
            stops={selectedRoute?.stops}
            userLocation={location || undefined}
        />
      </div>
    </div>
  );
};

export default DriverDashboard;
