import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MessageSquare, Settings, Plus, DollarSign, CheckCircle } from 'lucide-react';
import { useSupabaseCustomTimeRanges } from '../hooks/useSupabaseCustomTimeRanges';
import { useNotifications } from '../hooks/useNotifications';
import { useDayAvailability } from '../hooks/useDayAvailability';
import { getAvailableDays, generateTimeSlots, CustomTimeRanges, getNextFriday, getNextSaturday, formatDate } from '../utils/timeSlots';
import { useServices } from '../hooks/useServices';
import { Appointment } from '../types';
import { SobreturnoForm } from './SobreturnoForm';

export const SettingsSection: React.FC<{ 
  appointments: Appointment[]; 
  onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addNotification?: (notification: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; duration?: number }) => void;
}> = ({ appointments, onNewAppointment, addNotification: addNotificationProp }) => {
  const WEEK_DAYS = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ] as const;
  const isSupportedDay = (day: string): day is 'friday' | 'saturday' =>
    day === 'friday' || day === 'saturday';

  const [fridayStart, setFridayStart] = useState('');
  const [fridayEnd, setFridayEnd] = useState('');
  const [saturdayStart, setSaturdayStart] = useState('');
  const [saturdayEnd, setSaturdayEnd] = useState('');
  const { ranges, addRange, deleteRange, loading } = useSupabaseCustomTimeRanges();
  const { addNotification: addNotificationLocal } = useNotifications();
  const addNotification = addNotificationProp || addNotificationLocal;
  const { availability, updateDayAvailability, loading: availabilityLoading } = useDayAvailability();
  const { services, updateService, createService, loading: servicesLoading } = useServices();
  const [editingServices, setEditingServices] = useState<Record<string, { name: string; description: string; price: number; duration: number; icon: string; isActive: boolean }>>({});
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({ name: '', description: '', price: '', icon: '✂️', duration: '30' });
  const [openRangeDay, setOpenRangeDay] = useState<'friday' | 'saturday' | null>('friday');

  // Inicializar datos de edición con los valores actuales
  useEffect(() => {
    const initialData: Record<string, { name: string; description: string; price: number; duration: number; icon: string; isActive: boolean }> = {};
    services.forEach(service => {
      initialData[service.id] = {
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        icon: service.icon,
        isActive: service.isActive !== false
      };
    });
    setEditingServices(initialData);
  }, [services]);

  const handleServiceChange = (serviceId: string, field: 'name' | 'description' | 'price' | 'isActive' | 'duration' | 'icon', value: string | boolean) => {
    setEditingServices(prev => {
      const current = prev[serviceId] || { name: '', description: '', price: 0, duration: 30, icon: '✂️', isActive: true };
      if (field === 'price') {
        const price = parseInt((value as string).replace(/\D/g, ''), 10) || 0;
        return { ...prev, [serviceId]: { ...current, price } };
      }
      if (field === 'duration') {
        const duration = parseInt((value as string).replace(/\D/g, ''), 10) || 0;
        return { ...prev, [serviceId]: { ...current, duration } };
      }
      if (field === 'isActive') {
        const isActive = value === true || value === 'true';
        return { ...prev, [serviceId]: { ...current, isActive } };
      }
      return { ...prev, [serviceId]: { ...current, [field]: value } };
    });
  };

  const handleSaveService = async (serviceId: string) => {
    const updates = editingServices[serviceId];
    if (updates && updates.price > 0 && updates.name.trim()) {
      try {
        await updateService(serviceId, updates);
        addNotification({
          type: 'success',
          title: '¡Servicio actualizado!',
          message: `El servicio "${updates.name}" se ha actualizado correctamente.`
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'No se pudo actualizar el servicio. Intenta nuevamente.'
        });
      }
    } else {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'El nombre no puede estar vacío y el precio debe ser mayor a 0.'
      });
    }
  };

  const handleCreateService = async () => {
    if (!newServiceForm.name.trim() || !newServiceForm.price) {
      addNotification({ type: 'error', title: 'Error', message: 'Nombre y precio son obligatorios' });
      return;
    }
    try {
      await createService({
        name: newServiceForm.name,
        description: newServiceForm.description,
        price: parseInt(newServiceForm.price.replace(/\D/g, ''), 10) || 0,
        icon: newServiceForm.icon,
        duration: parseInt(newServiceForm.duration, 10) || 30,
        isActive: true
      });
      addNotification({ type: 'success', title: '¡Éxito!', message: 'Servicio creado correctamente' });
      setIsAddingService(false);
      setNewServiceForm({ name: '', description: '', price: '', icon: '✂️', duration: '30' });
    } catch (e) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo crear el servicio' });
    }
  };

  const stripWeekday = (s: string) => s.replace(/^[a-záéíóúñ]+\s+/i, '').trim();
  const fridayDateLabel = stripWeekday(formatDate(getNextFriday()));
  const saturdayDateLabel = stripWeekday(formatDate(getNextSaturday()));

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const buildAllHourTimes = () => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, '0');
      times.push(`${hh}:00`);
    }
    return times;
  };

  const getExistingSet = (day: 'friday' | 'saturday') => {
    const available = getAvailableDays(ranges as CustomTimeRanges, availability);
    const current = available.find(d => d.day === day);
    return new Set((current?.slots || []).map(s => s.time));
  };

  const getStartOptions = (day: 'friday' | 'saturday') => {
    const existing = getExistingSet(day);
    const withinWindow = (t: string) => {
      const mins = toMinutes(t);
      const eight = 8 * 60;
      const friMax = 17 * 60; // 17:00 inclusive
      const satMax = 13 * 60; // 13:00 inclusive
      const inMorningWindow = day === 'friday'
        ? mins >= eight && mins <= friMax
        : mins >= eight && mins <= satMax;
      const inLateWindow = mins >= 22 * 60 || mins === 0; // 22:00, 23:00 y 00:00
      return inMorningWindow || inLateWindow;
    };
    return buildAllHourTimes().filter(t => withinWindow(t) && !existing.has(t));
  };

  const getEndOptions = (day: 'friday' | 'saturday', start?: string) => {
    if (!start) return [] as string[];
    const existing = getExistingSet(day);
    return buildAllHourTimes()
      .filter(t => toMinutes(t) >= toMinutes(start) && !existing.has(t))
      .filter(t => {
        const generated = generateTimeSlots(start, t);
        return generated.every(slot => !existing.has(slot));
      });
  };

  const onSaveRange = async (day: 'friday' | 'saturday', start: string, end: string) => {
    try {
      await addRange(day, start, end);
      addNotification({ type: 'success', title: 'Guardado', message: 'Rango agregado correctamente' });
      if (day === 'friday') { setFridayStart(''); setFridayEnd(''); }
      if (day === 'saturday') { setSaturdayStart(''); setSaturdayEnd(''); }
    } catch (e) {
      addNotification({ type: 'error', title: 'Error', message: e instanceof Error ? e.message : 'No se pudo guardar' });
    }
  };

  const handleToggleDay = async (day: 'friday' | 'saturday', enabled: boolean) => {
    try {
      await updateDayAvailability(day, enabled);
      addNotification({
        type: 'success',
        title: 'Actualizado',
        message: `${day === 'friday' ? 'Viernes' : 'Sábado'} ${enabled ? 'activado' : 'desactivado'} correctamente`
      });
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: e instanceof Error ? e.message : 'No se pudo actualizar la disponibilidad'
      });
    }
  };

  return (
    <div className="mb-6 sm:mb-8 md:mb-12 space-y-6">
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 text-center">Configuraciones</h3>
      <p className="text-gray-400 text-sm text-center">Los rangos se guardan en el servidor y se sincronizan en tiempo real. Ya están disponibles para todos los clientes.</p>

      {/* Switches para activar/desactivar días */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-center">
          <Calendar className="h-4 w-4 text-amber-400 mr-2" />
          Disponibilidad de días
        </h4>
        <p className="text-gray-400 text-sm text-center mb-4">
          Viernes y Sábado están activos en el sistema actual. Los demás días figuran para planificación visual.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {WEEK_DAYS.map((day) => {
            const supported = isSupportedDay(day.key);
            const enabled = supported ? availability[day.key] : false;

            return (
              <div key={day.key} className={`bg-gray-700/50 border rounded-xl px-2 py-2 ${supported ? 'border-gray-600' : 'border-gray-700 opacity-70'}`}>
                <p className="font-medium text-white text-xs text-center">{day.label}</p>
                <div className="mt-2 flex justify-center">
                  <label className={`relative inline-flex items-center ${supported ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => supported && handleToggleDay(day.key, e.target.checked)}
                      disabled={!supported || availabilityLoading}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Añadir horarios adicionales + Rangos actuales en layout lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda (desplegables por día) */}
        <div className="md:col-span-2 space-y-3">
          {WEEK_DAYS.map((day) => {
            const supported = isSupportedDay(day.key);
            const supportedDay: 'friday' | 'saturday' | null = supported ? day.key : null;
            const isOpen = supported && openRangeDay === day.key;
            const currentStart = day.key === 'friday' ? fridayStart : saturdayStart;
            const currentEnd = day.key === 'friday' ? fridayEnd : saturdayEnd;

            return (
              <div key={`range-${day.key}`} className="bg-gray-800 border border-gray-700 rounded-2xl p-3 sm:p-4">
                <button
                  type="button"
                  onClick={() => supported && setOpenRangeDay(isOpen ? null : day.key)}
                  className={`w-full flex items-center justify-between text-left ${supported ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                >
                  <span className="text-white font-semibold flex items-center">
                    <Clock className="h-4 w-4 text-amber-400 mr-2" />
                    Añadir horarios para {day.label}
                  </span>
                  <span className="text-gray-400 text-xs">{supported ? (isOpen ? 'Ocultar' : 'Mostrar') : 'Próximamente'}</span>
                </button>

                {isOpen && (
                  <div className="mt-3">
                    <div className="flex items-center gap-3 mb-3">
                      <select
                        value={currentStart}
                        onChange={(e) => {
                          if (day.key === 'friday') {
                            setFridayStart(e.target.value);
                            setFridayEnd('');
                          } else {
                            setSaturdayStart(e.target.value);
                            setSaturdayEnd('');
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="">Inicio</option>
                        {supportedDay && getStartOptions(supportedDay).map(t => (
                          <option key={`${day.key}-s-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-gray-300">a</span>
                      <select
                        value={currentEnd}
                        onChange={(e) => {
                          if (day.key === 'friday') setFridayEnd(e.target.value);
                          else setSaturdayEnd(e.target.value);
                        }}
                        disabled={!currentStart}
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                      >
                        <option value="">Fin</option>
                        {supportedDay && getEndOptions(supportedDay, currentStart).map(t => (
                          <option key={`${day.key}-e-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => supportedDay && onSaveRange(supportedDay, currentStart, currentEnd)}
                      disabled={!currentStart || !currentEnd}
                      className="w-full px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black rounded-lg transition-colors font-semibold disabled:opacity-60"
                    >
                      Guardar rango para {day.label}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
 
        {/* Columna derecha (Rangos actuales) */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6 md:col-span-1">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-center"><Calendar className="h-4 w-4 text-amber-400 mr-2" />Rangos actuales</h4>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h5 className="text-white font-medium mb-2">Viernes <span className="text-gray-400 text-xs">{fridayDateLabel}</span></h5>
                <div className="flex flex-wrap gap-2">
                  {ranges.friday.length === 0 && <p className="text-gray-500 text-sm">Sin rangos</p>}
                  {ranges.friday.map((r) => (
                    <div key={`f-${r.start}-${r.end}`} className="inline-flex items-center gap-2 bg-gray-700/60 border border-gray-600 rounded-full px-3 py-1 text-sm">
                      <span className="text-gray-200">{r.start} a {r.end}</span>
                      <button
                        onClick={() => deleteRange('friday', r.start, r.end)}
                        className="text-red-400 hover:text-red-300"
                      >Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-white font-medium mb-2">Sábado <span className="text-gray-400 text-xs">{saturdayDateLabel}</span></h5>
                <div className="flex flex-wrap gap-2">
                  {ranges.saturday.length === 0 && <p className="text-gray-500 text-sm">Sin rangos</p>}
                  {ranges.saturday.map((r) => (
                    <div key={`s-${r.start}-${r.end}`} className="inline-flex items-center gap-2 bg-gray-700/60 border border-gray-600 rounded-full px-3 py-1 text-sm">
                      <span className="text-gray-200">{r.start} a {r.end}</span>
                      <button
                        onClick={() => deleteRange('saturday', r.start, r.end)}
                        className="text-red-400 hover:text-red-300"
                      >Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
 
      {/* Sobreturnos */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-center"><Clock className="h-4 w-4 text-orange-300 mr-2" />Crear Sobreturno (:30)</h4>
        <SobreturnoForm
          appointments={appointments}
          onNewAppointment={onNewAppointment}
          ranges={ranges as CustomTimeRanges}
          availability={availability}
        />
        <p className="text-xs text-gray-400 mt-2 text-center">Crea un turno manual en horario y media (10:30, 11:30, etc.). Se refleja en la grilla y en la vista de clientes.</p>
      </div>

      {/* Edición de precios de servicios - Al final */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" />
          <h4 className="text-lg font-bold text-white flex items-center justify-center">
            <Settings className="h-5 w-5 text-amber-400 mr-2" />
            Modificar Servicios
          </h4>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setIsAddingService(!isAddingService)}
              className="p-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black rounded-lg transition-all shadow-lg shadow-amber-500/30 active:scale-95"
              title="Añadir nuevo servicio"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
        <p className="text-gray-400 text-sm text-center mb-6">
          Configura los detalles de los servicios. Los servicios desactivados no serán visibles para los clientes.
        </p>

        {/* Formulario para añadir servicio */}
        {isAddingService && (
          <div className="mb-8 bg-gray-900/60 border-2 border-amber-500/30 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <h5 className="text-white font-bold mb-4 flex items-center">
              <Plus className="h-4 w-4 text-amber-400 mr-2" />
              Nuevo Servicio
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Nombre del servicio (ej: Corte + Barba)"
                value={newServiceForm.name}
                onChange={(e) => setNewServiceForm({...newServiceForm, name: e.target.value})}
                className="px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <input
                type="text"
                placeholder="Precio (ej: 12000)"
                value={newServiceForm.price}
                onChange={(e) => setNewServiceForm({...newServiceForm, price: e.target.value})}
                className="px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <input
                type="text"
                placeholder="Icono (ej: 💇‍♂️)"
                value={newServiceForm.icon}
                onChange={(e) => setNewServiceForm({...newServiceForm, icon: e.target.value})}
                className="px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <input
                type="text"
                placeholder="Duración en minutos (ej: 30)"
                value={newServiceForm.duration}
                onChange={(e) => setNewServiceForm({...newServiceForm, duration: e.target.value})}
                className="px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <div className="md:col-span-2">
                <textarea
                  placeholder="Descripción del servicio..."
                  value={newServiceForm.description}
                  onChange={(e) => setNewServiceForm({...newServiceForm, description: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAddingService(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateService}
                className="px-6 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20"
              >
                Crear Servicio
              </button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.id} className="bg-gray-700/30 border border-gray-600/50 rounded-2xl p-5 sm:p-7 hover:bg-gray-700/40 transition-all group">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Icono Principal y Edición de Emoji */}
                <div className="lg:col-span-2 flex flex-col items-center justify-start gap-4 pt-1">
                  <div className="relative group/icon">
                    <div className="text-4xl bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-2xl border border-gray-600/50 shadow-xl transition-transform duration-300">
                      {editingServices[service.id]?.icon || service.icon}
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 block text-center">Emoji</label>
                    <input
                      type="text"
                      value={editingServices[service.id]?.icon || ''}
                      onChange={(e) => handleServiceChange(service.id, 'icon', e.target.value)}
                      className="w-full h-10 text-center bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-xl"
                    />
                  </div>
                </div>

                {/* Nombre y Descripción */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="relative group/input">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1 flex items-center">
                      <User className="h-3 w-3 mr-1.5 text-amber-500/70" />
                      Nombre del Servicio
                    </label>
                    <input
                      type="text"
                      value={editingServices[service.id]?.name || ''}
                      onChange={(e) => handleServiceChange(service.id, 'name', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                      placeholder="Ej: Corte de Pelo"
                    />
                  </div>
                  <div className="relative group/input">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1 flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1.5 text-amber-500/70" />
                      Descripción Detallada
                    </label>
                    <textarea
                      value={editingServices[service.id]?.description || ''}
                      onChange={(e) => handleServiceChange(service.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-gray-600 text-sm resize-none leading-relaxed"
                      placeholder="Describe qué incluye el servicio..."
                    />
                  </div>
                </div>

                {/* Precio, Duración y Acción */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="w-full">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1 flex items-center">
                        <DollarSign className="h-3 w-3 mr-1.5 text-green-500/70" />
                        Precio ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input
                          type="text"
                          value={editingServices[service.id]?.price?.toLocaleString() || ''}
                          onChange={(e) => handleServiceChange(service.id, 'price', e.target.value)}
                          className="w-full pl-7 pr-3 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all text-right font-black text-base"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="w-full">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1.5 text-amber-500/70" />
                        Minutos
                      </label>
                      <input
                        type="text"
                        value={editingServices[service.id]?.duration || ''}
                        onChange={(e) => handleServiceChange(service.id, 'duration', e.target.value)}
                        className="w-full px-3 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-center font-black text-base"
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleSaveService(service.id)}
                      className="w-full h-[52px] bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black rounded-xl transition-all font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-500/30 hover:shadow-amber-400/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Guardar
                    </button>

                    {/* Switch de Activo/Inactivo debajo del botón */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-900/40 border border-gray-600/30 rounded-xl">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${editingServices[service.id]?.isActive !== false ? 'text-green-500' : 'text-red-400'}`}>
                        {editingServices[service.id]?.isActive !== false ? 'Servicio Activo' : 'Servicio Inactivo'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer scale-90">
                        <input
                          type="checkbox"
                          checked={editingServices[service.id]?.isActive !== false}
                          onChange={(e) => handleServiceChange(service.id, 'isActive', e.target.checked ? 'true' : 'false')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
