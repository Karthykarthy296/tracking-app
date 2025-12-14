export type UserRole = 'student' | 'driver' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  routeId?: string; // For students (subscribed) and drivers (assigned)
}

export interface Route {
  id: string;
  name: string;
  stops: Stop[];
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface BusLocation {
  busId: string;
  lat: number;
  lng: number;
  routeId: string;
  speed?: number; // m/s
  updatedAt: number; // timestamp
  isOnline: boolean;
}
