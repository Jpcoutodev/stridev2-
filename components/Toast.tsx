import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const getIcon = (type: ToastType) => {
    switch (type) {
        case 'success':
            return <CheckCircle size={20} className="text-lime-500" />;
        case 'error':
            return <XCircle size={20} className="text-red-500" />;
        case 'warning':
            return <AlertCircle size={20} className="text-amber-500" />;
        case 'info':
            return <Info size={20} className="text-cyan-500" />;
    }
};

const getStyles = (type: ToastType) => {
    switch (type) {
        case 'success':
            return 'bg-lime-50 border-lime-200 text-lime-800';
        case 'error':
            return 'bg-red-50 border-red-200 text-red-800';
        case 'warning':
            return 'bg-amber-50 border-amber-200 text-amber-800';
        case 'info':
            return 'bg-cyan-50 border-cyan-200 text-cyan-800';
    }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300 ${getStyles(toast.type)}`}
                    >
                        {getIcon(toast.type)}
                        <span className="flex-1 font-medium text-sm">{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 rounded-full hover:bg-black/5 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
