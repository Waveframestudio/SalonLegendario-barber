import React from 'react';
import { Clock } from 'lucide-react';
import { TimeSlot } from '../types';

interface TimeSlotGridProps {
  slots: TimeSlot[];
  onSlotSelect: (time: string) => void;
  selectedTime?: string;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  onSlotSelect,
  selectedTime
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
      {slots.map((slot) => (
        <button
          key={slot.time}
          onClick={() => slot.available && onSlotSelect(slot.time)}
          disabled={!slot.available}
          className={`
            group relative p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 transform active:scale-95 sm:hover:scale-105 min-h-[60px] sm:min-h-[70px]
            ${slot.available
              ? selectedTime === slot.time
                ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-gray-900 border-2 border-gray-700 hover:border-amber-500/60 hover:shadow-md hover:shadow-amber-500/10 text-gray-200 hover:bg-gray-800'
              : 'bg-black border-2 border-gray-800 text-gray-600 cursor-not-allowed'
            }
          `}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
            <Clock className={`h-4 w-4 ${
              selectedTime === slot.time ? 'text-black' :
              slot.available ? 'text-amber-500' : 'text-gray-600'
            }`} />
            <span className="font-medium text-sm sm:text-base">{slot.time}</span>
          </div>
          
          {!slot.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 bg-opacity-80 rounded-xl sm:rounded-2xl border border-red-500/20">
              <span className="text-xs font-medium text-red-400">Ocupado</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};