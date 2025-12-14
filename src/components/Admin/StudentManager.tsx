import { useEffect, useState } from 'react';
import { userService, vanService } from '../../services/db';
import type { UserProfile, Van } from '../../types';

const StudentManager = () => {
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [vans, setVans] = useState<Van[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        email: '',
        name: '',
        role: 'student',
        vanId: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [studentsData, vansData] = await Promise.all([
            userService.getUsersByRole('student'),
            vanService.getAllVans()
        ]);
        setStudents(studentsData);
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
            
            // Reset and reload
            setIsEditing(false);
            setEditId(null);
            setFormData({ email: '', name: '', role: 'student', vanId: '' });
            loadData();
        } catch (error) {
            console.error("Error saving student:", error);
            alert("Failed to save student");
        }
    };

    const startEdit = (student: UserProfile) => {
        setIsEditing(true);
        setEditId(student.uid);
        setFormData({
            email: student.email,
            name: student.name,
            vanId: student.vanId || '',
            role: 'student'
        });
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Student Management</h2>

            <div className="flex gap-6 h-full">
                {/* List Section */}
                <div className="flex-1 bg-white rounded-lg shadow p-4 overflow-auto">
                    <h3 className="font-semibold mb-4">All Students</h3>
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
                                {students.map(student => (
                                    <tr key={student.uid} className="border-b hover:bg-gray-50">
                                        <td className="p-2">{student.name}</td>
                                        <td className="p-2">{student.email}</td>
                                        <td className="p-2">
                                            {vans.find(v => v.id === student.vanId)?.vanNumber || 'Unassigned'}
                                        </td>
                                        <td className="p-2">
                                            <button 
                                                onClick={() => startEdit(student)}
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
                    <h3 className="font-semibold mb-4">{isEditing ? 'Edit Student' : 'Add New Student'}</h3>
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
                                disabled={isEditing} // Assume email is unique ID/key for now or just restrict editing
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Assigned Van</label>
                            <select 
                                className="w-full border p-2 rounded"
                                value={formData.vanId || ''}
                                onChange={e => setFormData({...formData, vanId: e.target.value})}
                            >
                                <option value="">Select Van</option>
                                {vans.map(v => (
                                    <option key={v.id} value={v.id}>{v.vanNumber}</option>
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
                                        setFormData({ email: '', name: '', role: 'student', vanId: '' });
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

export default StudentManager;
