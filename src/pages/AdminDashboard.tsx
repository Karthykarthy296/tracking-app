import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Admin/Sidebar';
import AdminAlerts from '../components/Admin/AdminAlerts';

const AdminDashboard = () => {
    return (
        <div className="flex h-screen bg-gray-100 flex-col md:flex-row relative">
            <Sidebar />
            <div className="flex-1 p-6 overflow-hidden relative z-0">
                <Outlet />
            </div>
            <AdminAlerts />
        </div>
    );
};

export default AdminDashboard;
