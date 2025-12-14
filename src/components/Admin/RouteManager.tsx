import { useEffect, useState } from 'react';
import { routeService } from '../../services/db';
import type { Route, Stop } from '../../types';
import MapComponent from '../Map/MapComponent';

const RouteManager = () => {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create'>('list');

    // Form state
    const [editId, setEditId] = useState<string | null>(null);
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

    const handleSaveRoute = async () => {
        if (!routeName || stops.length === 0) return;
        try {
            if (editId) {
                await routeService.updateRoute(editId, { name: routeName, stops });
            } else {
                await routeService.createRoute(routeName, stops);
            }
            
            setRouteName('');
            setStops([]);
            setEditId(null);
            setView('list');
            loadRoutes();
        } catch (e) {
            console.error("Error saving route", e);
            alert("Failed to save route");
        }
    };

    const handleEdit = (route: Route) => {
        setEditId(route.id);
        setRouteName(route.name);
        setStops(route.stops);
        setView('create');
    };

    const handleCancel = () => {
        setEditId(null);
        setRouteName('');
        setStops([]);
        setView('list');
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Route Management</h2>
                <div>
                     <button 
                        onClick={() => setView('list')}
                        className={`px-4 py-2 rounded mr-2 ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
                    >
                        List
                    </button>
                    <button 
                        onClick={() => {
                            setEditId(null);
                            setRouteName('');
                            setStops([]);
                            setView('create');
                        }}
                        className={`px-4 py-2 rounded ${view === 'create' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
                    >
                        Create New
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {view === 'list' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading ? <p>Loading routes...</p> : routes.map(route => (
                            <div key={route.id} className="bg-white p-4 rounded-lg shadow relative group">
                                <h3 className="font-bold text-lg mb-2">{route.name}</h3>
                                <p className="text-gray-500 text-sm">{route.stops.length} Stops</p>
                                <div className="mt-2 text-xs text-gray-400">
                                    {route.stops.map(s => s.name).join(' → ')}
                                </div>
                                <button 
                                    onClick={() => handleEdit(route)}
                                    className="absolute top-4 right-4 text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                        {routes.length === 0 && !loading && <p>No routes found. Create one!</p>}
                    </div>
                )}

                {view === 'create' && (
                    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <h2 className="text-lg font-semibold">{editId ? 'Edit Route' : 'Create Route'}</h2>
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
                                <ul className="list-decimal pl-5 space-y-1 text-sm max-h-40 overflow-auto">
                                    {stops.map((s, i) => (
                                        <li key={i} className="flex justify-between">
                                            <span>{s.name}</span>
                                            <button 
                                                onClick={() => setStops(stops.filter((_, idx) => idx !== i))}
                                                className="text-red-500 text-xs hover:underline"
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                                <button 
                                    onClick={handleSaveRoute} 
                                    disabled={!routeName || stops.length === 0}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded disabled:opacity-50"
                                >
                                    {editId ? 'Update Route' : 'Save Route'}
                                </button>
                                <button 
                                    onClick={handleCancel}
                                    className="px-4 py-2 border rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
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

export default RouteManager;
