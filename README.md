# Student Bus Tracking App

A full-stack bus tracking application built with **React**, **Firebase**, and **Leaflet**.

## Features
- **Real-time Tracking**: Database-backed location updates using Firebase RDB.
- **Role-Based Access**:
  - **Admin**: Manage routes, stops, and fleet.
  - **Driver**: Broadcast live location via GPS.
  - **Student**: Track assigned bus and view ETA.
- **Maps**: Interactive map powered by OpenStreetMap & Leaflet.
- **Security**: Role-based Firestore and RDB security rules.

## Prerequisites
- Node.js (v18+)
- Firebase Project

## Setup Instructions

1.  **Clone the repository**
    ```bash
    git clone <repo-url>
    cd student-bus-tracker
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Firebase Configuration**
    - Create a project in the [Firebase Console](https://console.firebase.google.com/).
    - Enable **Authentication** (Email/Password).
    - Enable **Firestore Database** (Start in Test mode).
    - Enable **Realtime Database** (Start in Test mode).
    - Copy your web app config object from *Project Settings*.
    - Open `src/lib/firebase.ts` and replace the `firebaseConfig` keys with your own.

4.  **Run Locally**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173).

## Usage Guide
1.  **Admin**: Sign up/Login. Change your role to 'admin' in Firestore manually (or use the signup dropdown if enabled for dev). Go to Admin Dashboard -> Create Route -> Add Stops.
2.  **Driver**: Login as Driver. Select a route. Click "Start Driving" to broadcast location.
3.  **Student**: Login as Student. Select the same route. Watch the bus icon move on the map.

## Deployment
1.  Install Firebase CLI: `npm install -g firebase-tools`
2.  Login: `firebase login`
3.  Initialize Hosting: `firebase init hosting`
    - Public directory: `dist`
    - Single-page app: `Yes`
4.  Build: `npm run build`
5.  Deploy: `firebase deploy`

## License
MIT
