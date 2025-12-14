import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { routeService } from '../services/db';
import type { Route, Stop } from '../types';
import MapComponent from '../components/Map/MapComponent';

const AdminDashboard = () => {
    const { logout } = useAuth();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create'>('list');

    // Form state
    const [routeName, setRouteName] = useState('');
    const [stops, setStops] = useState<Stop[]>([]);
    
    // Stop form
    const [stopName, setStopName] = useState('');
    const [stopLat, setStopLat] = useState('12.9716');
    const [stopLng, setStopLng] = useState('77.5946');

    useEffect(() => {
        loadRoutes();
    }, []);

    const loadRoutes = async () => {
        setLoading(true);
        const data = await routeService.getAllRoutes();
        setRoutes(data);
        setLoading(false);
    }

    const handleAddStop = () => {
        if (!stopName || !stopLat || !stopLng) return;
        const newStop: Stop = {
            id: Date.now().toString(), // Helper ID for client-side
            name: stopName,
            lat: parseFloat(stopLat),
            lng: parseFloat(stopLng),
        };
        setStops([...stops, newStop]);
        setStopName('');
        // Keep lat/lng for potentially adding nearby stop
    };

    const handleCreateRoute = async () => {
        if (!routeName || stops.length === 0) return;
        try {
            await routeService.createRoute(routeName, stops);
            setRouteName('');
            setStops([]);
            setView('list');
            loadRoutes();
        } catch (e) {
            console.error("Error creating route", e);
            alert("Failed to create route");
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-white shadow-md p-4 flex flex-col justify-between">
                <div>
                    <h1 className="text-xl font-bold mb-6 text-blue-600">Admin Panel</h1>
                    <nav className="space-y-2">
                        <button 
                            onClick={() => setView('list')}
                            className={`w-full text-left px-4 py-2 rounded ${view === 'list' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                        >
                            Route Management
                        </button>
                        <button 
                            onClick={() => setView('create')}
                            className={`w-full text-left px-4 py-2 rounded ${view === 'create' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                        >
                            Create New Route
                        </button>
                    </nav>
                </div>
                <button onClick={logout} className="mt-4 px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50">Logout</button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-auto">
                {view === 'list' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading ? <p>Loading routes...</p> : routes.map(route => (
                            <div key={route.id} className="bg-white p-4 rounded-lg shadow">
                                <h3 className="font-bold text-lg mb-2">{route.name}</h3>
                                <p className="text-gray-500 text-sm">{route.stops.length} Stops</p>
                                <div className="mt-2 text-xs text-gray-400">
                                    {route.stops.map(s => s.name).join(' → ')}
                                </div>
                            </div>
                        ))}
                        {routes.length === 0 && !loading && <p>No routes found. Create one!</p>}
                    </div>
                )}

                {view === 'create' && (
                    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <h2 className="text-lg font-semibold">Create Route</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Route Name</label>
                                <input 
                                    className="w-full border p-2 rounded" 
                                    value={routeName} 
                                    onChange={e => setRouteName(e.target.value)} 
                                    placeholder="e.g. Route 5 - Downtown"
                                />
                            </div>
                            
                            <hr className="my-4"/>
                            
                            <h3 className="text-md font-medium">Add Stops</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <input 
                                    className="border p-2 rounded" 
                                    value={stopName} 
                                    onChange={e => setStopName(e.target.value)} 
                                    placeholder="Stop Name"
                                />
                                <div className="flex gap-2">
                                    <input 
                                        className="border p-2 rounded w-1/2" 
                                        value={stopLat} 
                                        onChange={e => setStopLat(e.target.value)} 
                                        placeholder="Lat"
                                    />
                                    <input 
                                        className="border p-2 rounded w-1/2" 
                                        value={stopLng} 
                                        onChange={e => setStopLng(e.target.value)} 
                                        placeholder="Lng"
                                    />
                                </div>
                            </div>
                            <button onClick={handleAddStop} className="bg-gray-200 px-4 py-2 rounded text-sm w-full hover:bg-gray-300">
                                Add Stop
                            </button>

                            <div className="mt-4">
                                <h4 className="font-sm text-gray-600 mb-2">Stops Sequence:</h4>
                                <ul className="list-decimal pl-5 space-y-1 text-sm">
                                    {stops.map((s, i) => (
                                        <li key={i}>{s.name} ({s.lat}, {s.lng})</li>
                                    ))}
                                </ul>
                            </div>
                            
                            <button 
                                onClick={handleCreateRoute} 
                                disabled={!routeName || stops.length === 0}
                                className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50 mt-4"
                            >
                                Save Route
                            </button>
                        </div>
                        
                        <div className="flex-1 h-96 bg-gray-50 rounded border">
                            {/* Map Preview could go here */}
                             <MapComponent 
                                stops={stops} 
                                center={[parseFloat(stopLat || '12.9716'), parseFloat(stopLng || '77.5946')]} 
                             />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
