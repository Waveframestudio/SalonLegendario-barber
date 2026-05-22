import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  inline?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  onClick, 
  label = "Volver", 
  className = "",
  inline = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 text-gray-400 hover:text-amber-400 transition-colors duration-200
        ${inline
          ? ''
          : 'fixed top-14 left-3 sm:left-4 z-40'
        }
        ${className}
      `}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};