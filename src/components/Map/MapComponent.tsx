import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Stop, BusLocation } from '../../types';

// Fix Leaflet's default icon path issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const busIcon = new L.DivIcon({
  html: `<div style="background-color: #2563eb; color: white; padding: 5px; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="18" cy="18" r="2"/></svg></div>`,
  className: 'custom-bus-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const stopIcon = new L.DivIcon({
  html: `<div style="background-color: #ef4444; color: white; padding: 4px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: 'custom-stop-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  stops?: Stop[];
  buses?: BusLocation[];
  onStopClick?: (stop: Stop) => void;
  onBusClick?: (bus: BusLocation) => void;
  userLocation?: [number, number];
}

const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({ 
  center = [12.9716, 77.5946], // Default to Bangalore (as per user timezone inference)
  zoom = 13, 
  stops = [], 
  buses = [],
  onStopClick,
  onBusClick,
  userLocation
}) => {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      <RecenterMap center={center} />

      {/* Bus Stops */}
      {stops.map((stop) => (
        <Marker 
            key={stop.id} 
            position={[stop.lat, stop.lng]} 
            icon={stopIcon}
            eventHandlers={{ click: () => onStopClick && onStopClick(stop) }}
        >
          <Popup>{stop.name}</Popup>
        </Marker>
      ))}

      {/* Buses */}
      {buses.map((bus) => (
        <Marker 
            key={bus.busId} 
            position={[bus.lat, bus.lng]} 
            icon={busIcon}
            eventHandlers={{ click: () => onBusClick && onBusClick(bus) }}
        >
          <Popup>Bus ID: {bus.busId}</Popup>
        </Marker>
      ))}
      
      {/* User Location */}
      {userLocation && (
          <Marker position={userLocation}>
              <Popup>You are here</Popup>
          </Marker>
      )}

    </MapContainer>
  );
};

export default MapComponent;
