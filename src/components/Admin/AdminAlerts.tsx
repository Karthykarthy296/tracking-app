import { useEffect, useState } from 'react';
import { alertService } from '../../services/db';
import type { StoppageAlert } from '../../types';
import { AlertTriangle, MapPin, Clock, CheckCircle } from 'lucide-react';

const AdminAlerts = () => {
    const [alerts, setAlerts] = useState<StoppageAlert[]>([]);

    useEffect(() => {
        const unsubscribe = alertService.subscribeToAlerts((data) => {
            // Only show unresolved alerts
            setAlerts(data.filter(a => !a.isResolved));
        });
        return () => unsubscribe();
    }, []);

    const handleAcknowledge = async (id: string) => {
        try {
            await alertService.resolveAlert(id);
        } catch (error) {
            console.error("Error acknowledging alert:", error);
        }
    };

    if (alerts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 w-96 max-h-[60vh] overflow-y-auto space-y-3 z-[1000] pointer-events-none">
            {alerts
                .slice(0, 3)
                .map(alert => (
                    <div key={alert.id} className="bg-red-900/90 backdrop-blur-md border border-red-500/50 p-4 rounded-xl shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-300">
                        <div className="flex items-start gap-3">
                            <div className="bg-red-500/20 p-2 rounded-lg shrink-0 animate-pulse">
                                <AlertTriangle className="text-red-400 w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-white text-sm">Stoppage Detected!</h3>
                                    <button
                                        onClick={() => handleAcknowledge(alert.id)}
                                        className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 p-1.5 rounded-lg transition-all group/btn flex items-center gap-1.5"
                                        title="Acknowledge Alert"
                                    >
                                        <CheckCircle size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Acknowledge</span>
                                    </button>
                                </div>
                                <p className="text-red-200 text-xs mb-2 leading-relaxed">{alert.message}</p>

                                <div className="flex items-center gap-3 text-[10px] text-red-300/70">
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(alert.detectedAt).toLocaleTimeString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin size={10} />
                                        <a
                                            href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="hover:text-white hover:underline underline-offset-2 transition-colors"
                                        >
                                            View Location
                                        </a>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
        </div>
    );
};

export default AdminAlerts;
