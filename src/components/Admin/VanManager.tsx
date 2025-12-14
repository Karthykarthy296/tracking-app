import { useEffect, useState } from 'react';
import { vanService, routeService } from '../../services/db';
import type { Van, Route } from '../../types';

const VanManager = () => {
    const [vans, setVans] = useState<Van[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [editId, setEditId] = useState<string | null>(null);
    const [vanNumber, setVanNumber] = useState('');
    const [capacity, setCapacity] = useState('20');
    const [routeId, setRouteId] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [vansData, routesData] = await Promise.all([
            vanService.getAllVans(),
            routeService.getAllRoutes()
        ]);
        setVans(vansData);
        setRoutes(routesData);
        setLoading(false);
    };

    const handleSaveVan = async () => {
        if (!vanNumber) return;

        try {
            if (editId) {
                await vanService.updateVan(editId, { 
                    vanNumber, 
                    capacity: parseInt(capacity), 
                    routeId 
                });
            } else {
                await vanService.createVan(vanNumber, parseInt(capacity), routeId);
            }
            
            setVanNumber('');
            setCapacity('20');
            setRouteId('');
            setEditId(null);
            loadData();
        } catch (error) {
            console.error("Error saving van:", error);
            alert("Failed to save van");
        }
    };

    const handleEdit = (van: Van) => {
        setEditId(van.id);
        setVanNumber(van.vanNumber);
        setCapacity(van.capacity?.toString() || '20');
        setRouteId(van.routeId || '');
    };

    const handleCancel = () => {
        setEditId(null);
        setVanNumber('');
        setCapacity('20');
        setRouteId('');
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Van Management</h2>

            <div className="flex gap-6 h-full">
                {/* List Section */}
                <div className="flex-1 bg-white rounded-lg shadow p-4 overflow-auto">
                    <h3 className="font-semibold mb-4">All Vans</h3>
                    {loading ? <p>Loading...</p> : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2">Van Number</th>
                                    <th className="p-2">Capacity</th>
                                    <th className="p-2">Assigned Route</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vans.map(van => (
                                    <tr key={van.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2">{van.vanNumber}</td>
                                        <td className="p-2">{van.capacity}</td>
                                        <td className="p-2">
                                            {routes.find(r => r.id === van.routeId)?.name || 'Unassigned'}
                                        </td>
                                        <td className="p-2">
                                            <button 
                                                onClick={() => handleEdit(van)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Form Section */}
                <div className="w-1/3 bg-white rounded-lg shadow p-4 h-fit">
                    <h3 className="font-semibold mb-4">{editId ? 'Edit Van' : 'Add New Van'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Van Number / Plate</label>
                            <input 
                                className="w-full border p-2 rounded"
                                value={vanNumber}
                                onChange={e => setVanNumber(e.target.value)}
                                placeholder="e.g. KA-01-AB-1234"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Capacity</label>
                            <input 
                                type="number"
                                className="w-full border p-2 rounded"
                                value={capacity}
                                onChange={e => setCapacity(e.target.value)}
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Assign Route</label>
                            <select 
                                className="w-full border p-2 rounded"
                                value={routeId}
                                onChange={e => setRouteId(e.target.value)}
                            >
                                <option value="">Select Route</option>
                                {routes.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveVan}
                                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                            >
                                {editId ? 'Update Van' : 'Add Van'}
                            </button>
                            {editId && (
                                <button 
                                    onClick={handleCancel}
                                    className="px-4 py-2 border rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VanManager;
