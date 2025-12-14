import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { routeService, locationService } from '../services/db';
import type { Route, BusLocation } from '../types';
import { MapPin, Bus } from 'lucide-react';
import MapComponent from '../components/Map/MapComponent';

const StudentDashboard = () => {
    const { logout } = useAuth();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState('');
    const [buses, setBuses] = useState<BusLocation[]>([]);

    useEffect(() => {
        routeService.getAllRoutes().then(setRoutes);
    }, []);

    useEffect(() => {
        // Subscribe to ALL buses for now (or filter by route if needed)
        // Ideally we filter by route on the client or server query
        const unsubscribe = locationService.subscribeToAllBuses((allBuses) => {
            if (selectedRouteId) {
                setBuses(allBuses.filter(b => b.routeId === selectedRouteId && b.isOnline));
            } else {
                setBuses([]);
            }
        });

        return () => unsubscribe();
    }, [selectedRouteId]);

    const selectedRoute = routes.find(r => r.id === selectedRouteId);

    // Calculate nearest bus ETA (Mock)
    const getETA = () => {
        if (buses.length === 0) return 'No buses active';
        // Mock ETA based on nothing real for now (calculating distance needs complexity)
        return 'Arriving in 5 mins';
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
             <div className="bg-white shadow p-4 flex justify-between items-center z-10">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="text-blue-600" />
                    Student Tracker
                </h1>
                <button onClick={logout} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50">Logout</button>
            </div>

            <div className="flex-1 relative">
                <div className="absolute top-4 left-4 right-4 z-[500] md:w-96">
                    <div className="bg-white p-4 rounded-lg shadow-lg space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Your Route</label>
                            <select 
                                className="w-full border rounded p-2"
                                value={selectedRouteId}
                                onChange={(e) => setSelectedRouteId(e.target.value)}
                            >
                                <option value="">-- Choose Route --</option>
                                {routes.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                         {selectedRouteId && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-blue-600 font-bold uppercase">Estimated Arrival</p>
                                    <p className="text-lg font-bold text-gray-800">{getETA()}</p>
                                </div>
                                <Bus className="text-blue-400 w-8 h-8" />
                            </div>
                        )}
                         {selectedRouteId && buses.length === 0 && (
                             <p className="text-sm text-gray-500 italic">No active buses on this route.</p>
                         )}
                    </div>
                </div>

                <MapComponent 
                    center={[12.9716, 77.5946]}
                    zoom={13}
                    stops={selectedRoute?.stops}
                    buses={buses}
                />
            </div>
        </div>
    );
};

export default StudentDashboard;
