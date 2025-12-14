import { useEffect, useState } from 'react';
import { userService, vanService } from '../../services/db';
import type { UserProfile, Van } from '../../types';

const DriverManager = () => {
    const [drivers, setDrivers] = useState<UserProfile[]>([]);
    const [vans, setVans] = useState<Van[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        email: '',
        name: '',
        role: 'driver',
        vanId: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [driversData, vansData] = await Promise.all([
            userService.getUsersByRole('driver'),
            vanService.getAllVans()
        ]);
        setDrivers(driversData);
        setVans(vansData);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.email || !formData.name) return;

        try {
            if (isEditing && editId) {
                await userService.updateUserProfile(editId, formData);
            } else {
                await userService.createUserProfile(formData as UserProfile);
            }
            
            setIsEditing(false);
            setEditId(null);
            setFormData({ email: '', name: '', role: 'driver', vanId: '' });
            loadData();
        } catch (error) {
            console.error("Error saving driver:", error);
            alert("Failed to save driver");
        }
    };

    const startEdit = (driver: UserProfile) => {
        setIsEditing(true);
        setEditId(driver.uid);
        setFormData({
            email: driver.email,
            name: driver.name,
            role: 'driver',
            vanId: driver.vanId || ''
        });
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Driver Management</h2>

            <div className="flex gap-6 h-full">
                {/* List Section */}
                <div className="flex-1 bg-white rounded-lg shadow p-4 overflow-auto">
                    <h3 className="font-semibold mb-4">All Drivers</h3>
                    {loading ? <p>Loading...</p> : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Email</th>
                                    <th className="p-2">Assigned Van</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drivers.map(driver => (
                                    <tr key={driver.uid} className="border-b hover:bg-gray-50">
                                        <td className="p-2">{driver.name}</td>
                                        <td className="p-2">{driver.email}</td>
                                        <td className="p-2">
                                            {vans.find(v => v.id === driver.vanId)?.vanNumber || '-'}
                                        </td>
                                        <td className="p-2">
                                            <button 
                                                onClick={() => startEdit(driver)}
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
                    <h3 className="font-semibold mb-4">{isEditing ? 'Edit Driver' : 'Add New Driver'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input 
                                className="w-full border p-2 rounded"
                                value={formData.name || ''}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input 
                                className="w-full border p-2 rounded"
                                value={formData.email || ''}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                disabled={isEditing}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Assign Van</label>
                            <select 
                                className="w-full border p-2 rounded"
                                value={formData.vanId || ''}
                                onChange={e => setFormData({...formData, vanId: e.target.value})}
                            >
                                <option value="">Select Van</option>
                                {vans.map(v => (
                                    <option key={v.id} value={v.id}>{v.vanNumber} (Cap: {v.capacity})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <button 
                                onClick={handleSave}
                                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                            >
                                {isEditing ? 'Update' : 'Add'}
                            </button>
                            {isEditing && (
                                <button 
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditId(null);
                                        setFormData({ email: '', name: '', role: 'driver', vanId: '' });
                                    }}
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

export default DriverManager;
