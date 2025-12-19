export type UserRole = 'student' | 'driver' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  // routeId is now derived from vanId for drivers, or assigned to van for students
  routeId?: string;
  vanId?: string;
  studentName?: string;
  studentId?: string;
}

export interface Van {
  id: string;
  vanNumber: string;
  capacity?: number;
  routeId?: string;
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
  vanId?: string;
  speed?: number; // m/s
  updatedAt: number; // timestamp
  isOnline: boolean;

  // Trip Status
  nextStopId?: string;
  nextStopName?: string;
  arrivalStatus?: 'en_route' | 'arriving' | 'arrived';
  lastUpdatedStopId?: string;
}

export interface StoppageAlert {
  id: string;
  busId: string;
  vanId: string;
  routeId: string;
  location: { lat: number, lng: number };
  startTime: number;
  detectedAt: number;
  message: string;
  isResolved: boolean;
}
