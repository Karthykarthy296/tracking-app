import { collection, addDoc, getDocs, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, set, onValue, off, push, update } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import type { Route, Stop, BusLocation, UserProfile, Van, StoppageAlert } from '../types';

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

  updateRoute: async (id: string, data: Partial<Route>) => {
    const routeRef = doc(db, 'routes', id);
    await setDoc(routeRef, data, { merge: true });
  },

  // Get all routes
  getAllRoutes: async (): Promise<Route[]> => {
    const querySnapshot = await getDocs(collection(db, 'routes'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Route));
  },

  deleteRoute: async (id: string) => {
    await deleteDoc(doc(db, 'routes', id));
  },

  // Create a stop (if stops are managed independently)
  // For simplicity, we embed stops in routes or manage them separately.
};

// User Service
export const userService = {
  // Get users by role
  getUsersByRole: async (role: 'student' | 'driver') => {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as UserProfile));
  },

  // Create/Update user profile (admin side)
  // Note: This only creates the Firestore profile. Auth creation is separate.
  updateUserProfile: async (uid: string, data: Partial<UserProfile>) => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });
  },

  // Create new user profile
  createUserProfile: async (data: UserProfile) => {
    // Use provided uid or auto-generate if simulating
    const uid = data.uid || doc(collection(db, 'users')).id;
    await setDoc(doc(db, 'users', uid), { ...data, uid });
  },

  deleteUser: async (uid: string) => {
    await deleteDoc(doc(db, 'users', uid));
  }
};

// Van Service
export const vanService = {
  getAllVans: async (): Promise<Van[]> => {
    const querySnapshot = await getDocs(collection(db, 'vans'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Van));
  },

  createVan: async (vanNumber: string, capacity?: number, routeId?: string) => {
    const vanRef = await addDoc(collection(db, 'vans'), {
      vanNumber,
      capacity: capacity || 20,
      routeId: routeId || '',
      createdAt: new Date()
    });
    return { id: vanRef.id, vanNumber, capacity, routeId };
  },

  updateVan: async (id: string, data: Partial<Van>) => {
    const vanRef = doc(db, 'vans', id);
    await setDoc(vanRef, data, { merge: true });
  },

  deleteVan: async (id: string) => {
    await deleteDoc(doc(db, 'vans', id));
  }
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

export const alertService = {
  createAlert: async (alert: Omit<StoppageAlert, 'id'>) => {
    const alertsRef = ref(rtdb, 'alerts');
    const newAlertRef = push(alertsRef);
    await set(newAlertRef, { ...alert, id: newAlertRef.key, isResolved: false });
    return newAlertRef.key;
  },

  subscribeToAlerts: (callback: (alerts: StoppageAlert[]) => void) => {
    const alertsRef = ref(rtdb, 'alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      const alerts = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).sort((a, b) => b.detectedAt - a.detectedAt);
      callback(alerts as StoppageAlert[]);
    });
    return () => off(alertsRef, 'value', unsubscribe);
  },

  resolveAlert: async (id: string) => {
    const alertRef = ref(rtdb, `alerts/${id}`);
    await update(alertRef, { isResolved: true });
  }
};
