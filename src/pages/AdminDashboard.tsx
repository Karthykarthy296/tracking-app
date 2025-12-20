import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Admin/Sidebar';
import AdminAlerts from '../components/Admin/AdminAlerts';
import bgImage from '../assets/background.png';

const AdminDashboard = () => {
    return (
        <div className="flex h-screen flex-col md:flex-row relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${bgImage})` }}>
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-50/90 z-0 backdrop-blur-sm"></div>

            <div className="relative z-10 flex h-full w-full">
                <Sidebar />
                <div className="flex-1 p-6 overflow-hidden relative z-0">
                    <Outlet />
                </div>
            </div>
            <AdminAlerts />
        </div>
    );
};

export default AdminDashboard;
