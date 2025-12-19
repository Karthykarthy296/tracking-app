import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyDlUUs8_VVDI2DzyP-X8E7cUvvpHZ7JcD8",
  authDomain: "tracking-app-42959.firebaseapp.com",
  databaseURL: "https://tracking-app-42959-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tracking-app-42959",
  storageBucket: "tracking-app-42959.firebasestorage.app",
  messagingSenderId: "785935858798",
  appId: "1:785935858798:web:4ba15fae5a4a9c09e33a7f",
  measurementId: "G-WBLC9P2FE1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
