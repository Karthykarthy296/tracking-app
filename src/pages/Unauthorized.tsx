import { useNavigate } from 'react-router-dom';
import bgImage from '../assets/background.png';

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="absolute inset-0 bg-slate-100/90 backdrop-blur-sm z-0"></div>
      <div className="relative z-10 text-center p-8 bg-white/50 backdrop-blur-md rounded-2xl shadow-xl">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
        <p className="text-gray-800 font-medium mb-6">You do not have permission to view this page.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
