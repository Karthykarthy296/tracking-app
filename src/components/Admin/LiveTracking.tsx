import { useEffect, useState } from 'react';
import { locationService, vanService, routeService } from '../../services/db';
import type { BusLocation, Van, Route } from '../../types';
import MapComponent from '../Map/MapComponent';
import { Bus, MapPin, Navigation, Clock } from 'lucide-react';

const LiveTracking = () => {
    const [activeBuses, setActiveBuses] = useState<BusLocation[]>([]);
    const [vans, setVans] = useState<Van[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

    // Initial Data Load
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [vansData, routesData] = await Promise.all([
                    vanService.getAllVans(),
                    routeService.getAllRoutes()
                ]);
                setVans(vansData);
                setRoutes(routesData);
            } catch (error) {
                console.error("Error loading metadata:", error);
            } finally {
                setLoading(false);
            }
        };
        loadMetadata();
    }, []);

    // Realtable Subscription
    useEffect(() => {
        const unsubscribe = locationService.subscribeToAllBuses((locations) => {
            console.log("LiveTracking: All Buses", locations);
            // Only show buses that are online
            const onlineBuses = locations.filter(bus => bus.isOnline !== false); 
            // Note: Checking !== false because older data might not have the flag, defaulting to true or check strictly if we added it everywhere. 
            // Better: bus.isOnline === true. But let's check the type definition.
            setActiveBuses(onlineBuses);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        console.log("LiveTracking: Vans Loaded", vans);
    }, [vans]);

    const getVanDetails = (vanId?: string) => {
        if (!vanId) return { number: 'Unknown Van (No ID)', capacity: 0 };
        const van = vans.find(v => v.id === vanId);
        return van ? { number: van.vanNumber, capacity: van.capacity } : { number: `Unknown Van (${vanId})`, capacity: 0 };
    };

    const getRouteDetails = (routeId?: string) => {
        if (!routeId) return { name: 'Unknown Route' };
        const route = routes.find(r => r.id === routeId);
        return route ? { name: route.name, route } : { name: 'Unknown Route' };
    };

    if (loading) return <div className="p-8">Loading Fleet Data...</div>;

    const selectedBus = activeBuses.find(b => b.busId === selectedBusId);
    const selectedRoute = selectedBus ? getRouteDetails(selectedBus.routeId).route : undefined;

    return (
        <div className="flex h-full bg-gray-100 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-80 bg-white shadow-lg z-10 flex flex-col border-r">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <MapPin className="text-blue-600" />
                        Live Fleet
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        {activeBuses.length} Active Vehicles
                    </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {activeBuses.length === 0 && (
                        <div className="text-center text-gray-400 mt-10 p-4">
                            <Bus size={40} className="mx-auto mb-2 opacity-50" />
                            <p>No active vehicles found.</p>
                        </div>
                    )}
                    
                    {activeBuses.map(bus => {
                        const van = getVanDetails(bus.vanId);
                        const route = getRouteDetails(bus.routeId);
                        const isSelected = selectedBusId === bus.busId;

                        return (
                            <div 
                                key={bus.busId}
                                onClick={() => setSelectedBusId(bus.busId)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected 
                                    ? 'bg-blue-50 border-blue-500 shadow-md' 
                                    : 'hover:bg-gray-50 border-gray-200'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{van.number}</h3>
                                        <p className="text-xs text-gray-500">{route.name}</p>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        bus.arrivalStatus === 'arriving' ? 'bg-orange-100 text-orange-700' :
                                        bus.arrivalStatus === 'arrived' ? 'bg-red-100 text-red-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                        {bus.arrivalStatus?.replace('_', ' ') || 'EN ROUTE'}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                    <div className="flex items-center gap-1" title="Speed">
                                        <Navigation size={12} />
                                        {Math.round((bus.speed || 0) * 3.6)} km/h
                                    </div>
                                    {bus.nextStopName && (
                                        <div className="flex items-center gap-1 truncate max-w-[120px]" title="Next Stop">
                                            <MapPin size={12} />
                                            {bus.nextStopName}
                                        </div>
                                    )}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-2 text-right flex items-center justify-end gap-1">
                                    <Clock size={10} />
                                    Updated {Math.floor((Date.now() - bus.updatedAt)/1000)}s ago
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
                 <MapComponent 
                    // If selected bus exists, center on it. Else center on default.
                    center={selectedBus ? [selectedBus.lat, selectedBus.lng] : undefined}
                    zoom={selectedBus ? 15 : 12}
                    buses={activeBuses}
                    stops={selectedRoute?.stops} // Show stops only for selected route
                    onBusClick={(bus: BusLocation) => setSelectedBusId(bus.busId)}
                 />
                 
                 {selectedBus && (
                     <div className="absolute bottom-6 left-6 right-6 bg-white p-4 rounded-lg shadow-xl z-[1000] max-w-2xl mx-auto flex gap-6 items-center animate-slide-up">
                         <div className="bg-blue-100 p-3 rounded-full">
                             <Bus className="text-blue-600" size={24} />
                         </div>
                         <div className="flex-1 border-r pr-6">
                             <h3 className="font-bold text-lg">{getVanDetails(selectedBus.vanId).number}</h3>
                             <p className="text-gray-500 text-sm">{getRouteDetails(selectedBus.routeId).name}</p>
                         </div>
                         <div className="flex-1">
                              <p className="text-xs text-gray-500 uppercase font-bold">Next Stop</p>
                              <p className="font-semibold text-gray-800">{selectedBus.nextStopName || 'N/A'}</p>
                         </div>
                         <div className="flex-1">
                             <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                             <p className={`font-semibold ${
                                 selectedBus.arrivalStatus === 'arriving' ? 'text-orange-600' : 'text-green-600'
                             }`}>
                                 {selectedBus.arrivalStatus?.toUpperCase().replace('_', ' ') || 'On Track'}
                             </p>
                         </div>
                     </div>
                 )}
            </div>
        </div>
    );
};

export default LiveTracking;
