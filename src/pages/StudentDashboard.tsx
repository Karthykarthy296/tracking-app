import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { routeService, locationService, vanService, userService } from '../services/db';
import type { Route, BusLocation, Van } from '../types';
import { MapPin, Bus, Save } from 'lucide-react';
import MapComponent from '../components/Map/MapComponent';

const StudentDashboard = () => {
    const { user, userProfile, logout } = useAuth();
    const [routes, setRoutes] = useState<Route[]>([]); // Keep routes for map display if needed
    const [buses, setBuses] = useState<BusLocation[]>([]);
    
    // Setup Modal State
    const [vans, setVans] = useState<Van[]>([]);
    const [showSetup, setShowSetup] = useState(false);
    const [setupName, setSetupName] = useState('');
    const [setupStudentId, setSetupStudentId] = useState('');
    const [setupVanId, setSetupVanId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Initial Data Load
    useEffect(() => {
        const fetchMetadata = async () => {
            const [allVans, allRoutes] = await Promise.all([
                vanService.getAllVans(),
                routeService.getAllRoutes()
            ]);
            setVans(allVans);
            setRoutes(allRoutes);
        };
        fetchMetadata();
    }, []);

    // Check if setup is required
    useEffect(() => {
        if (userProfile && (!userProfile.studentName || !userProfile.vanId)) {
            setShowSetup(true);
        } else {
            setShowSetup(false);
        }
    }, [userProfile]);

    // Subscribe to buses
    useEffect(() => {
        const unsubscribe = locationService.subscribeToAllBuses((allBuses) => {
            // Filter only the assigned bus if setup is complete
            if (userProfile?.vanId) {
                setBuses(allBuses.filter(b => b.vanId === userProfile.vanId && b.isOnline));
            } else {
                setBuses([]);
            }
        });
        return () => unsubscribe();
    }, [userProfile?.vanId]);

    const handleSaveSetup = async () => {
        if (!user || !setupName || !setupStudentId || !setupVanId) {
            alert("Please fill all fields");
            return;
        }

        setIsSaving(true);
        try {
            await userService.updateUserProfile(user.uid, {
                studentName: setupName,
                studentId: setupStudentId,
                vanId: setupVanId
            });
            // AuthContext will auto-update userProfile via onSnapshot
        } catch (error) {
            console.error("Setup failed:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const assignedVan = vans.find(v => v.id === userProfile?.vanId);
    // Find route from van if possible, or from bus location
    const currentBus = buses[0];
    const assignedRoute = routes.find(r => r.id === currentBus?.routeId || r.id === assignedVan?.routeId);

    // Calculate nearest bus ETA (Mock)
    const getETA = () => {
        if (!currentBus) return 'Waiting for bus...';
        if (currentBus.arrivalStatus === 'arriving') return 'Arriving Now!';
        if (currentBus.arrivalStatus === 'arrived') return 'Arrived at Stop';
        return 'En Route';
    };

    if (showSetup) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[1000]">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                    <h2 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
                        <MapPin /> Setup Child Profile
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Before we start, please provide your child's details to track the correct bus.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                            <input 
                                className="w-full border rounded p-2"
                                placeholder="Enter Full Name"
                                value={setupName}
                                onChange={e => setSetupName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                            <input 
                                className="w-full border rounded p-2"
                                placeholder="Enter School ID"
                                value={setupStudentId}
                                onChange={e => setSetupStudentId(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Van / Bus</label>
                            <select 
                                className="w-full border rounded p-2"
                                value={setupVanId}
                                onChange={e => setSetupVanId(e.target.value)}
                            >
                                <option value="">-- Select Bus --</option>
                                {vans.map(v => (
                                    <option key={v.id} value={v.id}>{v.vanNumber} {v.routeId ? '(Allocated)' : ''}</option>
                                ))}
                            </select>
                        </div>
                        
                        <button 
                            onClick={handleSaveSetup}
                            disabled={isSaving}
                            className={`w-full py-3 rounded-lg font-bold text-white shadow ${isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSaving ? 'Saving...' : 'Start Tracking'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
             <div className="bg-white shadow p-4 flex justify-between items-center z-10">
                <div>
                     <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <MapPin className="text-blue-600" />
                        Student Tracker
                    </h1>
                    <p className="text-xs text-gray-500">
                        Tracking for <span className="font-bold text-blue-600">{userProfile?.studentName}</span> • Bus: {assignedVan?.vanNumber || '...'}
                    </p>
                </div>
                
                <button onClick={logout} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50">Logout</button>
            </div>

            <div className="flex-1 relative">
                <div className="absolute top-4 left-4 right-4 z-[500] md:w-96">
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                         {currentBus ? (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-blue-600 font-bold uppercase">Status</p>
                                    <p className="text-lg font-bold text-gray-800">{getETA()}</p>
                                    {currentBus.nextStopName && (
                                        <p className="text-sm text-gray-600">Next: {currentBus.nextStopName}</p>
                                    )}
                                </div>
                                <Bus className={`w-8 h-8 ${currentBus.arrivalStatus === 'arriving' ? 'text-green-500 animate-bounce' : 'text-blue-400'}`} />
                            </div>
                        ) : (
                             <p className="text-sm text-gray-500 italic text-center py-2">
                                Bus is currently offline or hasn't started the trip.
                             </p>
                        )}
                    </div>
                </div>

                <MapComponent 
                    center={[12.9716, 77.5946]}
                    zoom={13}
                    stops={assignedRoute?.stops || []}
                    buses={buses}
                />
            </div>
        </div>
    );
};

export default StudentDashboard;
