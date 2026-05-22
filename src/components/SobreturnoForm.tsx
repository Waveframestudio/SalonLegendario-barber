import React, { useState, useEffect } from 'react';
import { useServices } from '../hooks/useServices';
import { Appointment, Service } from '../types';
import { getAvailableDays, getNextFriday, getNextSaturday, formatDate, isSlotAvailable, CustomTimeRanges } from '../utils/timeSlots';

interface SobreturnoFormProps {
  appointments: Appointment[];
  onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  ranges: CustomTimeRanges;
  availability: { friday: boolean; saturday: boolean };
}

export const SobreturnoForm: React.FC<SobreturnoFormProps> = ({ appointments, onNewAppointment, ranges, availability }) => {
  const [day, setDay] = useState<'friday' | 'saturday'>('friday');
  const { services } = useServices();
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [time, setTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [additionalNames, setAdditionalNames] = useState<string[]>([]);
  const selectedService: Service | undefined = services.find(s => s.id === serviceId);

  useEffect(() => {
    if (services.length > 0 && (!serviceId || !services.find(s => s.id === serviceId))) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  const buildHalfHours = () => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      times.push(`${hh}:30`);
    }
    return times;
  };

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const availableDays = getAvailableDays(ranges, availability);
  const selectedDate = day === 'friday' ? formatDate(getNextFriday()) : formatDate(getNextSaturday());
  const existingSet = new Set(
    availableDays.find(d => d.day === day)?.slots.map(s => s.time) || []
  );
  const options = buildHalfHours()
    .filter(t => {
      const mins = toMinutes(t);
      return mins >= (8 * 60 + 30) && mins <= (23 * 60 + 30);
    })
    .filter(t => !existingSet.has(t));
  const slotAvailable = time ? isSlotAvailable(selectedDate, time, appointments) : false;

  const handleCreate = async () => {
    if (!selectedService || !time || !customerName || !customerPhone) return;
    if (!slotAvailable) return;
    await onNewAppointment({
      date: selectedDate,
      time,
      customerName,
      additionalCustomerNames: additionalNames,
      customerPhone,
      status: 'confirmed',
      service: selectedService
    });
    setTime('');
    setCustomerName('');
    setCustomerPhone('');
    setAdditionalNames([]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={day}
          onChange={(e) => setDay(e.target.value as any)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        >
          <option value="friday">Viernes</option>
          <option value="saturday">Sábado</option>
        </select>

        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        >
          <option value="">Hora (:30)</option>
          {options.map(t => (
            <option key={`half-${t}`} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        >
          {services.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
        <input
          type="tel"
          placeholder="Ej: 11 1234-5678"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>

      <div className="mt-3 space-y-2">
        {additionalNames.map((n, idx) => (
          <div key={idx} className="relative">
            <input
              type="text"
              value={n}
              onChange={(e) => {
                const copy = [...additionalNames];
                copy[idx] = e.target.value;
                setAdditionalNames(copy);
              }}
              placeholder={`Acompañante ${idx + 1}`}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 pr-9"
            />
            <button
              type="button"
              onClick={() => {
                const copy = [...additionalNames];
                copy.splice(idx, 1);
                setAdditionalNames(copy);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => { if (additionalNames.length < 2) setAdditionalNames([...additionalNames, '']); }}
            disabled={additionalNames.length >= 2}
            className={`px-3 py-2 rounded-lg text-sm ${additionalNames.length < 2 ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black hover:from-amber-500 hover:to-yellow-400' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
          >
            + Agregar acompañante
          </button>
          <button
            onClick={handleCreate}
            disabled={!time || !selectedService || !customerName || !customerPhone || !slotAvailable}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black rounded-lg transition-colors font-semibold disabled:opacity-50"
          >
            Crear Sobreturno
          </button>
        </div>
      </div>

      {!slotAvailable && time && (
        <p className="text-xs text-yellow-400">Ese horario ya está ocupado.</p>
      )}
    </div>
  );
};
