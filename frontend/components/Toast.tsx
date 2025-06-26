
import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './icons'; // Assuming these icons exist

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto close after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  let bgColor = 'bg-sky-500';
  let IconComponent = InformationCircleIcon;

  if (type === 'success') {
    bgColor = 'bg-green-500';
    IconComponent = CheckCircleIcon;
  } else if (type === 'error') {
    bgColor = 'bg-red-500';
    IconComponent = XCircleIcon;
  }

  return (
    <div 
      className={`fixed bottom-5 right-5 ${bgColor} text-white p-4 rounded-lg shadow-lg flex items-center z-[100] animate-fadeIn`}
      style={{ animation: 'fadeIn 0.5s, fadeOut 0.5s 2.5s' }}
    >
      <IconComponent className="h-6 w-6 mr-3" />
      <span>{message}</span>
    </div>
  );
};
