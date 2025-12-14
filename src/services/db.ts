import { collection, addDoc, getDocs } from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import type { Route, Stop, BusLocation } from '../types';

// Routes Service
export const routeService = {
  // Create a new route
  createRoute: async (name: string, stops: Stop[]) => {
    const routeRef = await addDoc(collection(db, 'routes'), {
      name,
      stops,
      createdAt: new Date()
    });
    return { id: routeRef.id, name, stops };
  },

  // Get all routes
  getAllRoutes: async (): Promise<Route[]> => {
    const querySnapshot = await getDocs(collection(db, 'routes'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Route));
  },
  
  // Create a stop (if stops are managed independently)
  // For simplicity, we embed stops in routes or manage them separately.
};

// Location Service (Realtime DB)
export const locationService = {
  // Update bus location
  updateLocation: (busId: string, location: Omit<BusLocation, 'updatedAt' | 'isOnline'>) => {
    const locationRef = ref(rtdb, `locations/${busId}`);
    return set(locationRef, {
      ...location,
      updatedAt: Date.now(),
      isOnline: true
    });
  },

  // Listen to specific bus location
  subscribeToBus: (busId: string, callback: (location: BusLocation | null) => void) => {
    const locationRef = ref(rtdb, `locations/${busId}`);
    const unsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      callback(data ? { busId, ...data } : null);
    });
    return () => off(locationRef, 'value', unsubscribe); // Return unsubscribe function fix
  },

  // Listen to ALL buses (for Admin)
  subscribeToAllBuses: (callback: (locations: BusLocation[]) => void) => {
    const locationsRef = ref(rtdb, 'locations');
    return onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      const buses = Object.keys(data).map(key => ({
        busId: key,
        ...data[key]
      }));
      callback(buses);
    });
  }
};
