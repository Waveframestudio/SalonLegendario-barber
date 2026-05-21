import React, { useState } from 'react';
import { Phone, User, Calendar, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Appointment, Service } from '../types';

interface BookingFormProps {
  selectedDate: string;
  selectedTime: string;
  selectedService: Service;
  onBookingComplete: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  selectedDate, selectedTime, selectedService, onBookingComplete, onCancel
}) => {
  const [customerName, setCustomerName] = useState('');
  const [additionalNames, setAdditionalNames] = useState<string[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const appointment: Omit<Appointment, 'id' | 'createdAt'> = {
      date: selectedDate, time: selectedTime, customerName,
      additionalCustomerNames: additionalNames, customerPhone,
      service: selectedService, status: 'confirmed',
      updatedAt: new Date(), reminderSent: false
    };
    onBookingComplete(appointment);
    setShowConfirmation(true);
    setIsSubmitting(false);
    setTimeout(() => { setShowConfirmation(false); onCancel(); }, 3000);
  };

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 border border-amber-500/30 rounded-3xl p-8 max-w-md w-full animate-pulse shadow-2xl shadow-amber-500/10">
          <div className="text-center">
            <div className="bg-green-500/20 border border-green-500/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">¡Turno Confirmado!</h3>
            <p className="text-gray-400 mb-4">Tu reserva ha sido confirmada exitosamente</p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2 text-sm text-gray-300">
              <p><strong className="text-amber-400">Fecha:</strong> {selectedDate}</p>
              <p><strong className="text-amber-400">Hora:</strong> {selectedTime}</p>
              <p><strong className="text-amber-400">Servicio:</strong> {selectedService.name}</p>
              <p><strong className="text-amber-400">Duración:</strong> {selectedService.duration} min</p>
              <p><strong className="text-amber-400">Precio:</strong> ${selectedService.price.toLocaleString()}</p>
              <p><strong className="text-amber-400">Cliente:</strong> {customerName}</p>
              {additionalNames.length > 0 && (
                <p><strong className="text-amber-400">Acompañantes:</strong> {additionalNames.filter(n => n.trim().length > 0).join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-gray-900 border border-amber-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-md w-full shadow-2xl shadow-amber-500/5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
          Confirmar Reserva
        </h3>

        {/* Summary card */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
              <div className="flex items-center space-x-2 justify-center sm:justify-start">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-gray-300">{selectedDate}</span>
              </div>
              <div className="flex items-center space-x-2 justify-center sm:justify-end">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="font-medium text-gray-300">{selectedTime}</span>
              </div>
            </div>
            <div className="border-t border-amber-500/10 pt-2 sm:pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-white text-center sm:text-left">{selectedService.name}</p>
                  <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">{selectedService.description}</p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="font-bold text-white text-lg sm:text-base">${selectedService.price.toLocaleString()}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{selectedService.duration} min</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 sm:mb-2">Nombre completo *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                <input
                  type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-10 py-2.5 sm:py-3 bg-black border border-gray-700 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 placeholder-gray-600 text-sm sm:text-base"
                  placeholder="Ingresa tu nombre" required
                />
                <button type="button"
                  onClick={() => { if (additionalNames.length < 2) setAdditionalNames([...additionalNames, '']); }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-xs font-medium transition-colors ${additionalNames.length < 2 ? 'bg-amber-600 text-black hover:bg-amber-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                  disabled={additionalNames.length >= 2}
                >+</button>
              </div>
              {additionalNames.map((name, idx) => (
                <div key={idx} className="relative mt-2">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                  <input
                    type="text" value={name}
                    onChange={e => { const c = [...additionalNames]; c[idx] = e.target.value; setAdditionalNames(c); }}
                    className="w-full pl-9 pr-9 py-2.5 bg-black border border-gray-700 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 placeholder-gray-600 text-sm"
                    placeholder={`Nombre adicional ${idx + 1}`}
                  />
                  <button type="button"
                    onClick={() => { const c = [...additionalNames]; c.splice(idx, 1); setAdditionalNames(c); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700"
                  >×</button>
                </div>
              ))}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 sm:mb-2">WhatsApp *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                <input
                  type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 bg-black border border-gray-700 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 placeholder-gray-600 text-sm sm:text-base"
                  placeholder="Ej: 11 1234-5678" required
                />
              </div>
            </div>
          </div>

          {/* Policies */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <button type="button" onClick={() => setShowPolicies(!showPolicies)} className="flex items-center justify-between w-full text-left">
              <h4 className="font-semibold text-white text-sm sm:text-base">Políticas de Cancelación</h4>
              {showPolicies ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {showPolicies && (
              <ul className="text-xs sm:text-sm text-gray-500 space-y-1 mt-3">
                <li>• Cancelaciones hasta 2 horas antes sin cargo</li>
                <li>• Llegadas tardías pueden resultar en reducción del servicio</li>
                <li>• Recibirás confirmación por WhatsApp</li>
              </ul>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button type="button" onClick={onCancel}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-700 text-gray-400 bg-black rounded-lg sm:rounded-xl hover:bg-gray-900 hover:border-gray-600 hover:text-white transition-all duration-200 font-medium text-sm sm:text-base">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-yellow-500 text-black rounded-lg sm:rounded-xl hover:from-amber-500 hover:to-yellow-400 transition-all duration-200 font-bold disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 text-sm sm:text-base">
              {isSubmitting ? 'Confirmando...' : `Confirmar $${selectedService.price.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};