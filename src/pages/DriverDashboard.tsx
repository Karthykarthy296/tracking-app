import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { routeService, locationService, vanService, alertService } from '../services/db';
import type { Route, Van } from '../types';
import { calculateDistance } from '../utils/geo';
import { Bus, MapPin, Navigation } from 'lucide-react';
import MapComponent from '../components/Map/MapComponent';
import bgImage from '../assets/background.png';

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

    // Stoppage Detection Refs
    const lastMovementTimeRef = useRef<number>(Date.now());
    const lastLocationRef = useRef<[number, number] | null>(null);
    const alertSentRef = useRef(false);
    const STOPPAGE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
    const MOVEMENT_THRESHOLD_M = 30; // 30 meters

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

            // 1. high-frequency local updates
            const id = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, speed } = pos.coords;
                    const currentTime = Date.now();

                    // Check distance from last known location to reset stoppage timer
                    // Note: lastLocationRef might be the *previous* update or the one we just set?
                    // We should check *before* updating or use a separate ref? 
                    // Actually, let's assume if we moved significant distance from *stored* location.
                    // But we update lastLocationRef every time. 
                    // To properly throttle stoppage check, we might want to check against 'lastMovementLocation'
                    // But adhering to previous logic:
                    if (lastLocationRef.current) {
                        const dist = calculateDistance(latitude, longitude, lastLocationRef.current[0], lastLocationRef.current[1]);
                        if (dist > MOVEMENT_THRESHOLD_M) {
                            lastMovementTimeRef.current = currentTime;
                            alertSentRef.current = false;
                        }
                    } else {
                        lastMovementTimeRef.current = currentTime;
                    }

                    setLocation([latitude, longitude]);
                    lastLocationRef.current = [latitude, longitude];
                },
                (err) => console.error("Location error:", err),
                { enableHighAccuracy: true, maximumAge: 0 }
            );
            setWatchId(id);

            // 2. Throttled Database Sync (Every 1 second for live tracking)
            const syncInterval = setInterval(() => {
                const loc = lastLocationRef.current;
                const route = routeRef.current;
                const van = vanRef.current;
                const index = stopIndexRef.current;

                if (loc && route && van) {
                    const [lat, lng] = loc;
                    let status: 'en_route' | 'arriving' | 'arrived' = 'en_route';
                    let nextStopId = '';
                    let nextStopName = '';

                    // Check proximity
                    if (route.stops[index]) {
                        const stop = route.stops[index];
                        nextStopId = stop.id;
                        nextStopName = stop.name;
                        const distToStop = calculateDistance(lat, lng, stop.lat, stop.lng);

                        if (distToStop < 100) {
                            status = 'arriving';
                            setArrivalStatus('arriving');
                        } else {
                            setArrivalStatus('en_route');
                        }
                    }

                    console.log("Syncing Location to Firebase:", { lat, lng });
                    locationService.updateLocation(user.uid, {
                        busId: user.uid,
                        lat: lat,
                        lng: lng,
                        speed: 0, // Could track speed from watchPosition if needed, for now 0
                        routeId: route.id,
                        vanId: van.id,
                        nextStopId,
                        nextStopName,
                        arrivalStatus: status
                    });
                }
            }, 1000); // 1 Second Interval for Real-time Tracking

            return () => {
                navigator.geolocation.clearWatch(id);
                clearInterval(syncInterval);
            };
        }
    }, [isDriving, user]);

    // Background Stoppage Check (Independent of Location Updates)
    useEffect(() => {
        if (!isDriving) return;

        const intervalId = setInterval(async () => {
            const timeStopped = Date.now() - lastMovementTimeRef.current;

            if (timeStopped > STOPPAGE_LIMIT_MS && !alertSentRef.current && isDriving) {
                console.warn("Stoppage Detected! Triggering Alert...");
                alertSentRef.current = true;

                if (user && vanRef.current) {
                    try {
                        const locationToReport = location ? { lat: location[0], lng: location[1] } : { lat: 0, lng: 0 };

                        await alertService.createAlert({
                            busId: user.uid,
                            vanId: vanRef.current.id,
                            routeId: routeRef.current?.id || '',
                            location: locationToReport,
                            startTime: lastMovementTimeRef.current,
                            detectedAt: Date.now(),
                            message: `STOPPAGE ALERT: Bus ${vanRef.current.vanNumber} stopped for > 5 min.`,
                            isResolved: false
                        });
                        alert("⚠️ Safety Alert: Automatic Stoppage Detected & Reported to Admin.");
                    } catch (e) {
                        console.error("Failed to send alert", e);
                    }
                }
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(intervalId);
    }, [isDriving, location]); // Dependencies




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

    if (loadingData) return (
        <div className="flex items-center justify-center h-screen bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0"></div>
            <div className="flex flex-col items-center gap-4 relative z-10">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium animate-pulse">Loading Driver Profile...</p>
            </div>
        </div>
    );

    if (!assignedVan || !assignedRoute) {
        return (
            <div className="flex items-center justify-center h-screen bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${bgImage})` }}>
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0"></div>
                <div className="relative z-10 bg-slate-800/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-red-500/30 max-w-md w-full text-center">
                    <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bus className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">No Assignment Found</h1>
                    <p className="text-slate-400 mb-6">Please contact your administrator to assign a Van and Route to your profile before starting.</p>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-left text-sm space-y-2 mb-6">
                        <p className="text-slate-500">Role: <span className="text-slate-300">{userProfile?.role}</span></p>
                        <p className="text-slate-500">Van ID: <span className="text-slate-300">{userProfile?.vanId || 'None'}</span></p>
                    </div>

                    <button onClick={logout} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors">
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    const stops = assignedRoute.stops || [];
    const currentStop = stops[currentStopIndex];

    return (
        <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
            {/* Full Screen Map */}
            <div className="absolute inset-0 z-0">
                <MapComponent
                    center={location || [12.9716, 77.5946]}
                    zoom={17}
                    stops={assignedRoute.stops || []}
                    userLocation={location || undefined}
                />
            </div>

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-900/90 to-transparent pointer-events-none z-10"></div>

            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl pointer-events-auto flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isDriving ? "bg-green-500/20 text-green-400 animate-pulse" : "bg-slate-800 text-slate-400"}`}>
                        <Bus className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-white leading-tight">Driver Dashboard</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-slate-300">{assignedVan.vanNumber}</span>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{assignedRoute.name}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="pointer-events-auto bg-slate-900/90 backdrop-blur-md hover:bg-red-500/90 hover:border-red-500 border border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg"
                >
                    Logout
                </button>
            </div>

            {/* Controls Panel */}
            <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-center pointer-events-none">
                <div className="w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl p-6 rounded-3xl border border-slate-700 shadow-2xl pointer-events-auto transition-all">

                    {/* Status Bar */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Current Status</p>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isDriving ? (arrivalStatus === 'en_route' ? 'bg-green-500' : 'bg-orange-500') : 'bg-slate-600'}`}></span>
                                <p className={`font-bold text-lg ${isDriving ? (arrivalStatus === 'en_route' ? 'text-green-400' : 'text-orange-400') : 'text-slate-400'}`}>
                                    {isDriving ? (arrivalStatus === 'arriving' || arrivalStatus === 'arrived' ? 'ARRIVING' : 'EN ROUTE') : 'OFF DUTY'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Next Stop</p>
                            <p className="font-bold text-lg text-blue-400 truncate">
                                {currentStop?.name || 'End of Route'}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isDriving && assignedRoute && (
                        <div className="mb-6">
                            <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                                <span>Start</span>
                                <span>{Math.round(((currentStopIndex) / (assignedRoute.stops?.length || 1)) * 100)}% Complete</span>
                                <span>End</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                                <div
                                    className="bg-gradient-to-r from-blue-600 to-violet-500 h-full rounded-full transition-all duration-700 ease-out relative"
                                    style={{ width: `${Math.max(5, ((currentStopIndex) / (assignedRoute.stops?.length || 1)) * 100)}%` }}
                                >
                                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50 blur-[2px]"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {/* Action Buttons */}
                    {!isDriving ? (
                        <button
                            onClick={() => {
                                setIsDriving(true);
                                if (user && routeRef.current && vanRef.current) {
                                    // Start at first stop 
                                    const firstStop = routeRef.current.stops[0];
                                    setLocation([firstStop.lat, firstStop.lng]);

                                    locationService.updateLocation(user.uid, {
                                        busId: user.uid,
                                        lat: firstStop.lat,
                                        lng: firstStop.lng,
                                        speed: 0,
                                        routeId: routeRef.current.id,
                                        vanId: vanRef.current.id,
                                        nextStopId: routeRef.current.stops[0]?.id || '',
                                        nextStopName: routeRef.current.stops[0]?.name || '',
                                        arrivalStatus: 'en_route'
                                    });
                                }
                            }}
                            className="w-full py-5 rounded-2xl font-bold text-white text-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-900/40 transition-all transform active:scale-[0.98]"
                        >
                            START TRIP
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleManualArrived}
                                className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-900/20 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                            >
                                <MapPin size={24} />
                                <span className="text-sm">MARK ARRIVED</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (!assignedRoute) return;
                                    const stops = assignedRoute.stops || [];
                                    if (currentStopIndex < stops.length - 1) {
                                        const nextIndex = currentStopIndex + 1;

                                        // Animate Movement to Next Stop
                                        const startStop = stops[currentStopIndex];
                                        const endStop = stops[nextIndex];
                                        let progress = 0;
                                        const animationDuration = 2000; // 2 seconds
                                        const fps = 30;
                                        const steps = (animationDuration / 1000) * fps;
                                        const increment = 1 / steps;

                                        const interval = setInterval(() => {
                                            progress += increment;
                                            if (progress >= 1) {
                                                clearInterval(interval);
                                                // Finalize
                                                setCurrentStopIndex(nextIndex);
                                                setArrivalStatus('en_route');
                                                if (user && vanRef.current) {
                                                    locationService.updateLocation(user.uid, {
                                                        busId: user.uid,
                                                        lat: endStop.lat,
                                                        lng: endStop.lng,
                                                        speed: 0,
                                                        routeId: assignedRoute.id,
                                                        vanId: vanRef.current?.id || '',
                                                        nextStopId: endStop.id,
                                                        nextStopName: endStop.name,
                                                        arrivalStatus: 'en_route'
                                                    });
                                                }
                                                return;
                                            }

                                            // Interpolate
                                            const lat = startStop.lat + (endStop.lat - startStop.lat) * progress;
                                            const lng = startStop.lng + (endStop.lng - startStop.lng) * progress;

                                            // Update Local State for smooth UI (Runs at 30fps)
                                            setLocation([lat, lng]);

                                            // Update Firebase Throttled (every ~330ms or 10 frames)
                                            if ((progress * steps) % 10 < 1 && user && vanRef.current) {
                                                locationService.updateLocation(user.uid, {
                                                    busId: user.uid,
                                                    lat,
                                                    lng,
                                                    speed: 40,
                                                    routeId: assignedRoute.id,
                                                    vanId: vanRef.current?.id || '',
                                                    nextStopId: endStop.id,
                                                    nextStopName: endStop.name,
                                                    arrivalStatus: 'en_route'
                                                });
                                            }
                                        }, 1000 / fps);
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
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                            >
                                <Navigation size={24} />
                                <span className="text-sm">{currentStopIndex < (assignedRoute.stops?.length || 0) - 1 ? 'NEXT STOP' : 'FINISH TRIP'}</span>
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
                                className="col-span-2 mt-2 py-3 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-colors"
                            >
                                Stop Trip & Go Offline
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
