import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="glass w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white max-w-[90%] truncate tracking-tight">{title}</h2>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all transform hover:rotate-90"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
