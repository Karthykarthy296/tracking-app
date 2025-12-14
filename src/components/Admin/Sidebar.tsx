import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { logout } = useAuth();
    
    const menuItems = [
        { path: 'routes', label: 'Manage Routes' },
        { path: 'students', label: 'Manage Students' },
        { path: 'drivers', label: 'Manage Drivers' },
        { path: 'vans', label: 'Manage Vans' },
        { path: 'tracking', label: 'Live Tracking' },
    ];

    return (
        <div className="w-full md:w-64 bg-white shadow-md p-4 flex flex-col justify-between h-full">
            <div>
                <h1 className="text-xl font-bold mb-6 text-blue-600">Admin Panel</h1>
                <nav className="space-y-2">
                    {menuItems.map((item) => (
                        <NavLink 
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => 
                                `block w-full text-left px-4 py-2 rounded ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
            <button onClick={logout} className="mt-4 px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50 w-full text-left">
                Logout
            </button>
        </div>
    );
};

export default Sidebar;
