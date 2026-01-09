# Project Documentation: Student Bus Tracking App

## 1. Project Overview
The **Student Bus Tracking App** is a real-time tracking solution designed to ensure student safety and transport efficiency. It connects three key stakeholders—**Admins**, **Drivers**, and **Students/Parents**—through a responsive web interface. The system leverages GPS data to provide live bus locations on an interactive map.

## 2. Technical Stack

### Frontend
- **Framework**: React 19 (via Vite)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS v3, `clsx` & `tailwind-merge` for dynamic classes.
- **Routing**: React Router DOM v7
- **Maps**: Leaflet & React-Leaflet
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Backend (Serverless)
- **Platform**: Firebase (v12)
- **Authentication**: Firebase Auth (Email/Password)
- **Database**:
    - **Firestore**: Stores static data (Users, Routes, Stops, Assignments).
    - **Realtime Database**: High-frequency updates for Bus Locations.
- **Hosting**: Firebase Hosting

## 3. Architecture

### Directory Structure
```
src/
├── components/       # Reusable UI components
│   ├── Admin/        # Admin-specific forms & lists
│   ├── Map/          # Map visualizations
│   └── ...
├── context/          # React Context (Auth state)
├── lib/              # Firebase configuration & helpers
├── pages/            # Main application views (Login, Dashboards)
├── services/         # API abstraction layer (DB operations)
└── types/            # TypeScript interfaces & definitions
```

### Data Flow
1.  **Authentication**: Users log in via `lib/firebase.ts` auth methods. Context provider tracks session.
2.  **Role Management**: Custom `role` field in Firestore `users` collection determines access (Admin vs. Driver vs. Student).
3.  **Live Tracking**:
    - **Driver**: Pushes GPS coordinates to Firebase Realtime Database every few seconds.
    - **Student**: Subscribes to Realtime Database changes to update the map marker instantly.

## 4. Modules

### 4.1. Admin Console
- **Purpose**: centralized management of the fleet and users.
- **Key Features**:
    - Manage Routes: Create, edit, and delete bus routes.
    - Manage Stops: Define ordered stops for each route.
    - Assign Drivers: Link drivers to specific buses/routes.

### 4.2. Driver Console
- **Purpose**: Mobile-first interface for bus operators.
- **Key Features**:
    - Route Selection: Choose active route.
    - Status Toggle: Start/Stop driving.
    - **Location Broadcast**: Automatically sends lat/lng to the server when "On Duty".

### 4.3. Student / Parent Console
- **Purpose**: Peace of mind for parents.
- **Key Features**:
    - View Assigned Route: See the relevant bus path.
    - **Live Map**: Watch the bus icon move in real-time.
    - ETA Estimates: (Future enhancement) Calculate arrival times based on current location.

## 5. Security & Permissions
- **Firestore Rules**:
    - `users` collection: Readable by auth users. Write restricted.
    - `routes` collection: Admin write only. Public read.
- **Realtime DB Rules**:
    - Drivers can write to their specific `busId` node.
    - Authenticated users can read location data.

## 6. Setup & Development
Refer to the `README.md` for step-by-step installation instructions.
Key Environment Variables (in `.env` or Firebase Console):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
