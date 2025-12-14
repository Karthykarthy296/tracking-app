import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { routeService, locationService, vanService } from '../services/db';
import type { Route, Van } from '../types';
import { calculateDistance } from '../utils/geo';
import { Bus, MapPin, Navigation } from 'lucide-react';
import MapComponent from '../components/Map/MapComponent';

const DriverDashboard = () => {
    const { user, userProfile, logout } = useAuth();
    
    // Data State
    const [assignedVan, setAssignedVan] = useState<Van | null>(null);
    const [assignedRoute, setAssignedRoute] = useState<Route | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    // Trip State
    const [isDriving, setIsDriving] = useState(false);
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [arrivalStatus, setArrivalStatus] = useState<'en_route' | 'arriving' | 'arrived'>('en_route');
    
    // Location State
    const [location, setLocation] = useState<[number, number] | null>(null);
    const [watchId, setWatchId] = useState<number | null>(null);

    // Refs for accessing latest state in callbacks
    const routeRef = useRef<Route | null>(null);
    const vanRef = useRef<Van | null>(null);
    const stopIndexRef = useRef(0);
    const drivingRef = useRef(false);

    useEffect(() => {
        const loadAssignment = async () => {
            if (!userProfile?.vanId) {
                setLoadingData(false);
                return;
            }

            try {
                // 1. Get Van to find RouteId
                const vans = await vanService.getAllVans(); 
                // Optimization: In real app, fetch single van by ID. 
                // For now, finding in list is fine for small scale.
                const myVan = vans.find(v => v.id === userProfile.vanId);
                
                if (myVan) {
                    setAssignedVan(myVan);
                    vanRef.current = myVan; // Update Ref
                    if (myVan.routeId) {
                        const routes = await routeService.getAllRoutes();
                        const myRoute = routes.find(r => r.id === myVan.routeId);
                        if (myRoute) {
                            setAssignedRoute(myRoute);
                            routeRef.current = myRoute; // Update Ref
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading assignment", e);
            } finally {
                setLoadingData(false);
            }
        };

        loadAssignment();
    }, [userProfile]);

    // Update Refs
    useEffect(() => {
        stopIndexRef.current = currentStopIndex;
        drivingRef.current = isDriving;
        // Ensure refs are kept in sync if state changes elsewhere (unlikely for van/route but safe)
        if (assignedRoute) routeRef.current = assignedRoute;
        if (assignedVan) vanRef.current = assignedVan;
    }, [currentStopIndex, isDriving, assignedRoute, assignedVan]);

    // GPS Logic
    useEffect(() => {
        if (isDriving && user) {
            console.log("Starting Trip Tracking. Route:", routeRef.current?.name, "Van:", vanRef.current?.vanNumber);
            const id = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, speed } = pos.coords;
                    setLocation([latitude, longitude]);
                    
                    const route = routeRef.current;
                    const van = vanRef.current;
                    const index = stopIndexRef.current;
                    let status: 'en_route' | 'arriving' | 'arrived' = 'en_route';
                    let nextStopId = '';
                    let nextStopName = '';

                    // Check proximity to current target stop
                    if (route && route.stops[index]) {
                        const stop = route.stops[index];
                        nextStopId = stop.id;
                        nextStopName = stop.name;
                        
                        const distToStop = calculateDistance(latitude, longitude, stop.lat, stop.lng);
                        
                        // If within 100m, mark as arriving
                        if (distToStop < 100) {
                            status = 'arriving';
                            // Note: We don't auto-advance to "Arrived" or next stop to avoid skipping. 
                            // Using "Arriving" alerts parents. Driver manually confirms arrival usually.
                            // But request asked for auto updates - let's set arriving status.
                            setArrivalStatus('arriving'); 
                        } else {
                             setArrivalStatus('en_route');
                        }
                    }

                    // Update Firebase
                    console.log("Updating Location:", { lat: latitude, vanId: van?.id, routeId: route?.id });
                    locationService.updateLocation(user.uid, {
                        busId: user.uid,
                        lat: latitude,
                        lng: longitude,
                        speed: speed || 0,
                        routeId: route?.id || '',
                        vanId: van?.id || '',
                        nextStopId,
                        nextStopName,
                        arrivalStatus: status
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
        
        // Heartbeat to ensure status is live even if stationary
        let heartbeatInterval: any;
        if (isDriving && user) {
            heartbeatInterval = setInterval(() => {
                if (routeRef.current && vanRef.current) {
                    console.log("Heartbeat Location Update");
                    locationService.updateLocation(user.uid, {
                        busId: user.uid,
                        // Use latest known location
                        lat: location?.[0] || 0,
                        lng: location?.[1] || 0,
                        speed: 0, // Stationary update
                        routeId: routeRef.current.id,
                        vanId: vanRef.current.id,
                        nextStopId: routeRef.current.stops[stopIndexRef.current]?.id,
                        nextStopName: routeRef.current.stops[stopIndexRef.current]?.name,
                        arrivalStatus: 'en_route' // Or maintain current status if we tracked it in ref
                    });
                }
            }, 5000); // 5 seconds
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [isDriving, user]); // Removed assignedRoute/Van from deps as we use Refs now

    const handleManualNext = () => {
        if (!assignedRoute) return;
        if (currentStopIndex < assignedRoute.stops.length - 1) {
            const nextIndex = currentStopIndex + 1;
            setCurrentStopIndex(nextIndex);
            setArrivalStatus('en_route');

            // Force Update for Manual Next
            if (user && assignedVan) {
                 locationService.updateLocation(user.uid, {
                    busId: user.uid,
                    lat: location?.[0] || 0,
                    lng: location?.[1] || 0,
                    routeId: assignedRoute.id,
                    vanId: assignedVan.id,
                    nextStopId: assignedRoute.stops[nextIndex].id,
                    nextStopName: assignedRoute.stops[nextIndex].name,
                    arrivalStatus: 'en_route'
                });
            }
        } else {
            alert("End of Route Reached");
            setIsDriving(false);
            setCurrentStopIndex(0);
             locationService.updateLocation(user?.uid || '', { 
                busId: user?.uid || '',
                lat: 0, 
                lng: 0,
                routeId: '',
                updatedAt: Date.now(),
                isOnline: false
            } as any);
        }
    };

    const handleManualArrived = () => {
        setArrivalStatus('arriving'); // Or 'arrived' if we differentiate
        // Force update location with status
        if (location && user) {
             locationService.updateLocation(user.uid, {
                busId: user.uid,
                lat: location[0],
                lng: location[1],
                routeId: assignedRoute?.id || '',
                vanId: assignedVan?.id || '',
                nextStopId: assignedRoute?.stops[currentStopIndex].id,
                nextStopName: assignedRoute?.stops[currentStopIndex].name,
                arrivalStatus: 'arrived'
            });
        }
    };

    if (loadingData) return <div className="p-8">Loading Driver Profile...</div>;

    if (!assignedVan || !assignedRoute) {
        return (
            <div className="p-8">
                <h1 className="text-xl font-bold text-red-600">No Assignment Found</h1>
                <p>Please contact admin to assign a Van and Route to your profile.</p>
                <div className="mt-4">
                     <p>Role: {userProfile?.role}</p>
                     <p>Van ID: {userProfile?.vanId || 'None'}</p>
                </div>
                <button onClick={logout} className="mt-4 px-4 py-2 border rounded">Logout</button>
            </div>
        );
    }

    const currentStop = assignedRoute.stops[currentStopIndex];


    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow p-3 flex justify-between items-center z-10 px-4">
                <div className="flex items-center gap-3">
                    <Bus className={isDriving ? "text-green-600 animate-pulse" : "text-gray-500"} />
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Driver Dashboard</h1>
                        <p className="text-xs text-gray-500">
                            {assignedVan.vanNumber} • {assignedRoute.name}
                        </p>
                    </div>
                </div>
                <button onClick={logout} className="text-red-500 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">
                    Logout
                </button>
            </div>

            <div className="flex-1 relative">
                {/* Floating Controls */}
                <div className="absolute top-4 left-4 right-4 z-[500] flex flex-col gap-2 md:w-96">
                    <div className="bg-white p-4 rounded-lg shadow-lg space-y-4">
                        {/* Status Indicator */}
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Current Status</p>
                                <p className={`font-bold ${isDriving ? 'text-green-600' : 'text-gray-400'}`}>
                                    {isDriving ? (arrivalStatus === 'arriving' || arrivalStatus === 'arrived' ? 'ARRIVING / STOPPED' : 'EN ROUTE') : 'OFF DUTY'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Heading To</p>
                                <p className="font-bold text-blue-600 truncate max-w-[150px]">
                                    {currentStop?.name || 'End of Route'}
                                </p>
                            </div>
                        </div>

                        {/* Main Interaction Button */}
                        {!isDriving ? (
                            <button
                                onClick={() => {
                                    setIsDriving(true);
                                    // Initial Force Update
                                    if (user && routeRef.current && vanRef.current) {
                                         locationService.updateLocation(user.uid, {
                                            busId: user.uid,
                                            lat: location?.[0] || 0,
                                            lng: location?.[1] || 0,
                                            speed: 0,
                                            routeId: routeRef.current.id,
                                            vanId: vanRef.current.id,
                                            nextStopId: routeRef.current.stops[0]?.id || '',
                                            nextStopName: routeRef.current.stops[0]?.name || '',
                                            arrivalStatus: 'en_route'
                                        });
                                    }
                                }}
                                className="w-full py-4 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg text-lg"
                            >
                                START TRIP
                            </button>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleManualArrived}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg flex flex-col items-center justify-center gap-1"
                                >
                                    <MapPin size={20} />
                                    <span>ARRIVED</span>
                                </button>
                                
                                <button
                                    onClick={handleManualNext}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex flex-col items-center justify-center gap-1"
                                >
                                    <Navigation size={20} />
                                    <span>DEPART / NEXT</span>
                                </button>

                                <button
                                    onClick={() => {
                                        if (confirm("End trip and go offline?")) {
                                            setIsDriving(false);
                                            setCurrentStopIndex(0);
                                            locationService.updateLocation(user?.uid || '', { 
                                                busId: user?.uid || '',
                                                lat: 0,
                                                lng: 0,
                                                routeId: '',
                                                updatedAt: Date.now(),
                                                isOnline: false
                                            } as any);
                                        }
                                    }}
                                    className="col-span-2 mt-2 py-2 text-red-500 text-sm hover:bg-red-50 rounded border border-red-200"
                                >
                                    Stop Trip / Go Offline
                                </button>
                            </div>
                        )}
                        
                        {/* Progress Bar */}
                        {isDriving && assignedRoute && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div 
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${((currentStopIndex) / assignedRoute.stops.length) * 100}%` }}
                                ></div>
                                <p className="text-xs text-center mt-1 text-gray-400">
                                    Stop {currentStopIndex + 1} of {assignedRoute.stops.length}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Map */}
                <MapComponent 
                    center={location || [12.9716, 77.5946]}
                    zoom={16}
                    stops={assignedRoute.stops}
                    userLocation={location || undefined}
                />
            </div>
        </div>
    );
};

export default DriverDashboard;
