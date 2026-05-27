import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Star, Award, Shield } from 'lucide-react';
import { TimeSlotGrid } from './TimeSlotGrid';
import { ServiceSelector } from './ServiceSelector';
import { BookingForm } from './BookingForm';
import { BackButton } from './BackButton';
import { getAvailableDays, getNextFriday, getNextSaturday, formatDate, isSlotAvailable, CustomTimeRanges } from '../utils/timeSlots';
import { useSupabaseCustomTimeRanges } from '../hooks/useSupabaseCustomTimeRanges';
import { useDayAvailability } from '../hooks/useDayAvailability';
import { Appointment, Service } from '../types';
import { buildSobreturnoWhatsAppLink } from '../utils/phone';

interface CustomerViewProps {
  appointments: Appointment[];
  onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  selectedService: Service | null;
  onServiceSelect: (service: Service | null) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  appointments, onNewAppointment, selectedService, onServiceSelect
}) => {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const { ranges } = useSupabaseCustomTimeRanges();
  const { availability } = useDayAvailability();
  const [showNoSlotsModal, setShowNoSlotsModal] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(true);

  const transitionTo = (action: () => void) => {
    setIsContentVisible(false);
    setTimeout(() => {
      action();
      setIsContentVisible(true);
    }, 280);
  };

  const availableDays = getAvailableDays(ranges as CustomTimeRanges, availability);
  const currentDay = availableDays.find(day => day.day === selectedDay)!;
  const selectedDate = selectedDay === 'friday' ? formatDate(getNextFriday()) : formatDate(getNextSaturday());
  const availableSlots = currentDay.slots.map(slot => ({
    ...slot,
    available: selectedService ? isSlotAvailable(selectedDate, slot.time, appointments) : false
  }));

  useEffect(() => {
    if (selectedService) {
      setShowNoSlotsModal(availableSlots.length > 0 && availableSlots.every(s => !s.available));
    } else {
      setShowNoSlotsModal(false);
    }
  }, [selectedService, selectedDay, availableSlots]);

  const handleBookingComplete = (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
    onNewAppointment(appointment);
    onServiceSelect(null);
    setSelectedTime(null);
    setShowBookingForm(false);
  };

  const isBookingStep = !!selectedService && !showBookingForm;

  return (
    <div className={`pb-safe w-full flex-1 flex flex-col ${isBookingStep ? 'justify-start pt-4 sm:pt-6' : ''}`}>
      <div className={`max-w-4xl mx-auto w-full px-3 sm:px-4 transition-all duration-300 ease-in-out ${isBookingStep ? 'py-2 sm:py-3' : 'py-4 sm:py-6'} ${isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        {/* Hero */}
        <div className={`text-center ${isBookingStep ? 'mb-4 sm:mb-5' : 'mb-6 sm:mb-10'}`}>
          <div className="relative flex items-center justify-center mb-2 min-h-[2.25rem] sm:min-h-[2.75rem]">
            {selectedTime && selectedService && !showBookingForm && (
              <BackButton
                inline
                onClick={() => transitionTo(() => setSelectedTime(null))}
                label="Cambiar horario"
                className="absolute -left-1 sm:-left-2"
              />
            )}
            {selectedService && !selectedTime && (
              <BackButton
                inline
                onClick={() => transitionTo(() => { onServiceSelect(null); setSelectedTime(null); })}
                label="Volver"
                className="absolute -left-1 sm:-left-2"
              />
            )}
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-lg animate-pulse px-16 sm:px-20">
              Reserva tu Turno
            </h2>
          </div>
          <p className={`text-base sm:text-lg text-gray-400 px-2 animate-fade-in-up ${isBookingStep ? 'mb-3 sm:mb-4' : 'mb-6'}`}>
            Experimenta el mejor servicio de barbería en un ambiente exclusivo
          </p>

          {!selectedService && (
            <div className="bg-gray-900 border border-gray-700 rounded-3xl p-4 sm:p-6 shadow-xl max-w-4xl mx-auto animate-slide-up transition-all duration-300 hover:border-amber-500/60 hover:shadow-amber-500/10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
                {[
                  { icon: MapPin, color: 'red', label: 'Ubicación', sub: 'Arturo Jauretche 1061 - Hurlingham' },
                  { icon: Star, color: 'yellow', label: 'Calidad', sub: '5 estrellas' },
                  { icon: Award, color: 'amber', label: 'Experiencia', sub: '+7 años' },
                  { icon: Shield, color: 'green', label: 'Higiene', sub: 'Sanidad' },
                ].map(({ icon: Icon, color, label, sub }, i) => (
                  <div key={label} className="flex flex-col items-center space-y-2">
                    <div
                      className={`bg-${color}-500/20 rounded-full p-2 sm:p-3 opacity-0 animate-fade-in-up`}
                      style={{ animationDelay: `${0.2 + i * 0.1}s`, animationFillMode: 'forwards' }}
                    >
                      <Icon className={`h-5 w-5 text-${color}-400`} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm sm:text-base">{label}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Service Selection */}
        {!selectedService && (
          <div className="mb-6">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl p-4 sm:p-6 shadow-xl transition-all duration-300 hover:border-amber-500/60 hover:shadow-amber-500/10">
              <ServiceSelector
                selectedService={selectedService}
                onServiceSelect={(service) => transitionTo(() => { onServiceSelect(service); setSelectedTime(null); })}
              />
            </div>
          </div>
        )}

        {selectedService && (
          <>
            {/* Day Selection */}
            <div className="mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 text-center">Selecciona el día</h3>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                {availableDays.map((day) => (
                  <button
                    key={day.day}
                    onClick={() => { if (!day.isClosed) { setSelectedDay(day.day); setSelectedTime(null); } }}
                    disabled={day.isClosed}
                    className={`px-6 md:px-8 py-3 sm:py-4 rounded-2xl font-medium transition-all duration-300 transform w-full sm:w-auto
                      ${day.isClosed
                        ? 'bg-black border-2 border-red-600/50 text-red-400 cursor-not-allowed opacity-60'
                        : selectedDay === day.day
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/25 sm:hover:scale-105'
                          : 'bg-gray-900 border-2 border-gray-700 hover:border-amber-500/60 text-gray-200 hover:bg-gray-800 sm:hover:scale-105'
                      }`}
                  >
                    <div className="font-bold text-base sm:text-lg">{day.label}</div>
                    {day.isClosed && <div className="text-xs mt-1 text-red-400">Cerrado</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Date pill */}
            <div className="text-center mb-6">
              <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-gray-900 border border-amber-500/20 rounded-2xl px-4 sm:px-6 py-3 shadow-md">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                  <span className="font-medium text-white">{selectedDate}</span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-amber-500/20"></div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{selectedService.icon}</span>
                  <span className="font-medium text-white text-sm sm:text-base">{selectedService.name}</span>
                </div>
              </div>
            </div>

            {/* Time Slots */}
            <div className="mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 text-center">Horarios disponibles</h3>
              {currentDay.isClosed ? (
                <div className="bg-gray-900 border-2 border-red-600/50 rounded-3xl p-8 sm:p-12 text-center">
                  <div className="text-6xl mb-4">🚫</div>
                  <h4 className="text-2xl font-bold text-red-400 mb-2">Cerrado</h4>
                  <p className="text-gray-400">Este día no está disponible para reservas.</p>
                </div>
              ) : (
                <div className="bg-gray-900 border border-amber-500/20 rounded-3xl p-4 sm:p-6 shadow-xl">
                  <TimeSlotGrid slots={availableSlots} onSlotSelect={setSelectedTime} selectedTime={selectedTime || undefined} />
                </div>
              )}
            </div>

            {/* Book button */}
            {selectedTime && (
              <div className="text-center">
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="w-full sm:w-auto px-6 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 text-black font-bold text-base sm:text-lg rounded-2xl shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-95 sm:hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto"
                >
                  <span>Reservar {selectedService.name} - {selectedTime}</span>
                  <span className="bg-black/20 px-2 py-1 rounded-lg text-xs sm:text-sm">${selectedService.price.toLocaleString('es-AR')}</span>
                </button>
              </div>
            )}

            {/* No Slots */}
            {showNoSlotsModal && (
              <div className="mt-4 bg-gray-900 border border-amber-500/20 rounded-2xl p-4 text-center">
                <h4 className="text-base font-bold text-red-400 mb-1">No hay turnos disponibles</h4>
                <p className="text-gray-400 text-sm">
                  Contactate para agendar un <span className="text-amber-400 font-semibold">SOBRETURNO</span>.
                </p>
                <div className="mt-3 flex justify-center">
                  <a
                    href={buildSobreturnoWhatsAppLink('+54 9 11 3520-9748', 'AR')}
                    target="_blank" rel="noopener noreferrer"
                    className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                  >
                    Contactar por WhatsApp
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {/* Booking Form Modal */}
        {showBookingForm && selectedTime && selectedService && (
          <BookingForm
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedService={selectedService}
            onBookingComplete={handleBookingComplete}
            onCancel={() => setShowBookingForm(false)}
          />
        )}
      </div>
    </div>
  );
};