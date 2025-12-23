import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
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

// Modern Bus Icon - Glowing Gradient
const busIcon = new L.DivIcon({
  html: `
    <div class="relative flex items-center justify-center w-10 h-10">
      <div class="absolute inset-0 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
      <div class="relative w-8 h-8 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="18" cy="18" r="2"/></svg>
      </div>
    </div>
  `,
  className: 'custom-bus-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Modern Stop Icon - Clean & Minimal
const stopIcon = new L.DivIcon({
  html: `
    <div class="relative w-6 h-6 bg-slate-800 rounded-full border-2 border-slate-400 flex items-center justify-center shadow-md">
      <div class="w-2 h-2 bg-white rounded-full"></div>
    </div>
  `,
  className: 'custom-stop-marker',
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
  onMapClick?: (lat: number, lng: number) => void;
  tempMarker?: [number, number] | null;
  userLocation?: [number, number];
}

const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({
  center = [12.9716, 77.5946],
  zoom = 13,
  stops = [],
  buses = [],
  onStopClick,
  onBusClick,
  onMapClick,
  tempMarker,
  userLocation
}) => {
  const routeCoordinates = stops.map(stop => [stop.lat, stop.lng] as [number, number]);

  return (
    <div className="w-full h-full relative bg-[#0f172a] rounded-3xl overflow-hidden shadow-inner border border-white/5 group">

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        className="z-0"
      >
        {/* Layer 1: Base Map (No Labels) - Tinted to #0f172a */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          className="map-tiles-base"
          opacity={0.8}
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Layer 2: Labels Only - Pure White, Untinted */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          className="map-tiles-labels"
          zIndex={500}
        />

        {/* Styles to Tint Base but Keep Labels Bright + Smooth Marker Transitions */}
        <style>{`
            .map-tiles-base {
                filter: contrast(1.1) brightness(0.8) hue-rotate(10deg); 
                mix-blend-mode: hard-light; 
            }
            .map-tiles-labels {
                filter: brightness(2) contrast(1.5) drop-shadow(0 1px 2px rgba(0,0,0,0.8)); 
                mix-blend-mode: normal; 
            }
            .leaflet-container {
                background: #0f172a !important;
            }
            /* Smooth Marker Animation */
            .leaflet-marker-icon {
                transition: all 0.5s linear;
            }
        `}</style>

        <RecenterMap center={center} />

        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* Route Line */}
        {routeCoordinates.length > 1 && (
          <>
            {/* Glow Effect */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: '#ef4444', weight: 8, opacity: 0.4 }}
            />
            {/* Main Line */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: '#ef4444', weight: 3, opacity: 1, dashArray: '10, 10' }}
            />
          </>
        )}

        {/* Bus Stops */}
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={stopIcon}
            eventHandlers={{ click: () => onStopClick && onStopClick(stop) }}
          >
            <Popup className="custom-popup">
              <div className="font-bold text-slate-800">{stop.name}</div>
            </Popup>
          </Marker>
        ))}

        {/* Temp Marker */}
        {tempMarker && (
          <Marker
            position={tempMarker}
            icon={stopIcon}
            opacity={0.7}
          >
            <Popup>New Stop Location</Popup>
          </Marker>
        )}

        {/* Buses */}
        {buses.map((bus) => (
          <Marker
            key={bus.busId}
            position={[bus.lat, bus.lng]}
            icon={busIcon}
            eventHandlers={{ click: () => onBusClick && onBusClick(bus) }}
          >
            <Popup className="custom-popup">
              <div className="font-bold text-blue-600">Bus ID: {bus.busId}</div>
              <div className="text-xs text-slate-500">Speed: {Math.round(bus.speed || 0)} km/h</div>
            </Popup>
          </Marker>
        ))}

        {/* User Location */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>You are here</Popup>
          </Marker>
        )}

      </MapContainer>
    </div>
  );
};

export default MapComponent;
