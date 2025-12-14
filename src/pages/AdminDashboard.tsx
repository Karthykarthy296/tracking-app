import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Admin/Sidebar';

const AdminDashboard = () => {
    return (
        <div className="flex h-screen bg-gray-100 flex-col md:flex-row">
            <Sidebar />
            <div className="flex-1 p-6 overflow-hidden">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminDashboard;
