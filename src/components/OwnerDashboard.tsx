import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Trash2, Edit, CheckCircle, XCircle, BarChart3, Filter, Search, Mail, MessageSquare, RotateCcw, Trash, RotateCw, Ban, Shield, Settings, RefreshCw, MoreVertical, DollarSign, Plus, Smile } from 'lucide-react';
import { useSupabaseCustomTimeRanges } from '../hooks/useSupabaseCustomTimeRanges';
import { useNotifications } from '../hooks/useNotifications';
import { useDayAvailability } from '../hooks/useDayAvailability';
import { getAvailableDays, generateTimeSlots, CustomTimeRanges, getNextFriday, getNextSaturday, formatDate, isSlotAvailable, parseAppointmentDateTime } from '../utils/timeSlots';
import { useServices } from '../hooks/useServices';
import { Appointment, Service } from '../types';
import { buildWhatsAppLink } from '../utils/phone';
import { Analytics } from './Analytics';
import { ConfirmBanModal } from './ConfirmBanModal';
import { useBans } from '../hooks/useBans';
import { SettingsSection } from './SettingsSection';

interface OwnerDashboardProps {
  appointments: Appointment[];
  onDeleteAppointment: (id: string) => void;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => void;
  onNewAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRestoreAppointment: (id: string) => Promise<void>;
  onPermanentlyDeleteAppointment: (id: string) => Promise<void>;
  loadDeletedAppointments: () => Promise<Appointment[]>;
  onRefreshAppointments: () => Promise<void>;
  addNotification?: (notification: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; duration?: number }) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  appointments,
  onDeleteAppointment,
  onUpdateAppointment,
  onNewAppointment,
  onRestoreAppointment,
  onPermanentlyDeleteAppointment,
  loadDeletedAppointments,
  onRefreshAppointments,
  addNotification: addNotificationProp
}) => {
  const SHOW_STATUS = false;
  const [activeTab, setActiveTab] = useState<'appointments' | 'analytics' | 'settings' | 'trash' | 'bans'>('appointments');
  const [deletedAppointments, setDeletedAppointments] = useState<Appointment[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const { ranges } = useSupabaseCustomTimeRanges();
  const { availability } = useDayAvailability();
  const { banIP, banPhone, banEmail, unbanIP, bannedIPs, isIPBanned, isPhoneBanned, isEmailBanned, refresh: refreshBans } = useBans();
  const { addNotification: addNotificationLocal } = useNotifications();
  const addNotification = addNotificationProp || addNotificationLocal;
  const [dayFilter, setDayFilter] = useState<'all' | 'friday' | 'saturday' | 'sobreturno'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    customerName: '', 
    customerPhone: '', 
    customerEmail: '', 
    notes: '',
    additionalNames: '', // coma-separado para edición rápida
    time: '', // horario del turno
    day: 'friday' as 'friday' | 'saturday' // día de la semana
  });
  const [lastAction, setLastAction] = useState<null | { type: 'delete' | 'update'; snapshot: Appointment }>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [appointmentToBan, setAppointmentToBan] = useState<Appointment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Force scroll to top when component mounts
  React.useEffect(() => {
    // Immediate scroll
    window.scrollTo(0, 0);
    // Backup with timeout
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Cerrar menú al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  // Actualizar el tiempo cada 30 segundos para que los turnos pasados se muevan al historial automáticamente
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Actualizar cada 30 segundos para mayor responsividad

    return () => clearInterval(interval);
  }, []);

  // Cargar turnos eliminados cuando se cambia a la pestaña de papelera
  React.useEffect(() => {
    if (activeTab === 'trash') {
      const loadTrash = async () => {
        setLoadingTrash(true);
        try {
          const deleted = await loadDeletedAppointments();
          setDeletedAppointments(deleted);
        } catch (error) {
          console.error('Error loading deleted appointments:', error);
        } finally {
          setLoadingTrash(false);
        }
      };
      loadTrash();
    }
  }, [activeTab, loadDeletedAppointments]);
  const filteredAppointments = appointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time, apt.createdAt);
    const isFri = !!d && d.getDay() === 5;
    const isSat = !!d && d.getDay() === 6;
    const isSobreturno = apt.time.endsWith(':30');
    const matchesDay =
      dayFilter === 'all' ||
      (dayFilter === 'friday' && isFri) ||
      (dayFilter === 'saturday' && isSat) ||
      (dayFilter === 'sobreturno' && isSobreturno);
    const companions = (apt.additionalCustomerNames || []).join(' ').toLowerCase();
    const matchesSearch = searchTerm === '' ||
      apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companions.includes(searchTerm.toLowerCase()) ||
      apt.customerPhone.includes(searchTerm);
    return matchesDay && matchesSearch;
  });

  const confirmedAppointments = filteredAppointments.filter(apt => apt.status === 'confirmed');
  // Helper para comparar fecha y hora en formato de turno
  // Función para parsear la fecha ("viernes 14 de junio") + time --> Date
 
  function appointmentCompare(a: Appointment, b: Appointment, dir: 'asc' | 'desc') {
    const da = parseAppointmentDateTime(a.date, a.time, a.createdAt);
    const db = parseAppointmentDateTime(b.date, b.time, b.createdAt);
    if (!da || !db) return 0;
    const now = currentTime;
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const aIsToday = isSameDay(da, now);
    const bIsToday = isSameDay(db, now);
    if (aIsToday !== bIsToday) return aIsToday ? -1 : 1; // Hoy primero
    // Si ambos son hoy, ordenar: futuros primero, luego pasados; dentro aplicar dir
    if (aIsToday && bIsToday) {
      const aPast = da.getTime() < now.getTime();
      const bPast = db.getTime() < now.getTime();
      if (aPast !== bPast) return aPast ? 1 : -1; // futuros primero
      const diffToday = da.getTime() - db.getTime();
      return dir === 'asc' ? diffToday : -diffToday;
    }
    // Ninguno es hoy: mantener prioridad de futuros sobre pasados
    const aPast = da.getTime() < now.getTime();
    const bPast = db.getTime() < now.getTime();
    if (aPast !== bPast) return aPast ? 1 : -1;
    // Ambos no son hoy y están en el mismo grupo; ordenar por fecha completa según dir
    const diff = da.getTime() - db.getTime();
    return dir === 'asc' ? diff : -diff;
  }

  // Turnos de hoy separados en pasados y futuros
  const todayAppointments = confirmedAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time, apt.createdAt);
    if (!d) return false;
    const now = currentTime;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  // Turnos de hoy que ya pasaron
  const todayPastAppointments = todayAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time, apt.createdAt);
    return !!d && d.getTime() < currentTime.getTime();
  }).sort((a, b) => {
    const da = parseAppointmentDateTime(a.date, a.time, a.createdAt);
    const db = parseAppointmentDateTime(b.date, b.time, b.createdAt);
    if (!da || !db) return 0;
    // Orden descendente: más recientes primero (mayor fecha primero)
    return db.getTime() - da.getTime();
  });

  const todayFutureAppointments = todayAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time, apt.createdAt);
    return !!d && d.getTime() >= currentTime.getTime();
  }).sort((a, b) => appointmentCompare(a, b, sortDir));

  // Todos los turnos pasados (incluyendo los de hoy que ya pasaron)
  // Ordenados: más recientes arriba, más antiguos abajo
  const pastAppointments = confirmedAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time, apt.createdAt);
    if (!d) return false;
    // Incluir todos los turnos pasados (incluyendo los de hoy)
    return d.getTime() < currentTime.getTime();
  }).sort((a, b) => {
    const da = parseAppointmentDateTime(a.date, a.time, a.createdAt);
    const db = parseAppointmentDateTime(b.date, b.time, b.createdAt);
    if (!da || !db) return 0;
    // Orden descendente: más recientes primero (mayor fecha primero)
    return db.getTime() - da.getTime();
  });

  // Turnos futuros (no de hoy, y que no sean pasados)
  const upcomingAppointments = confirmedAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time, apt.createdAt);
    if (!d) return false;
    const now = currentTime;
    const isToday = d.getFullYear() === now.getFullYear() && 
                    d.getMonth() === now.getMonth() && 
                    d.getDate() === now.getDate();
    // Solo incluir turnos que sean futuros (después de ahora) y que NO sean de hoy
    return d.getTime() > currentTime.getTime() && !isToday;
  });

  // Turnos realmente futuros (desde ahora): incluye los que faltan hoy y los de días siguientes
  const futureAppointments = confirmedAppointments.filter(apt => {
    const d = parseAppointmentDateTime(apt.date, apt.time, apt.createdAt);
    return !!d && d.getTime() > currentTime.getTime();
  });

  const handleEditStart = (appointment: Appointment) => {
    setEditingId(appointment.id);
    // Determinar si es viernes o sábado basándome en la fecha
    const d = parseAppointmentDateTime(appointment.date, appointment.time, appointment.createdAt);
    const dayType = d?.getDay() === 5 ? 'friday' : d?.getDay() === 6 ? 'saturday' : 'friday';
    setEditForm({
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      customerEmail: appointment.customerEmail || '',
      notes: appointment.notes || '',
      additionalNames: (appointment.additionalCustomerNames || []).join(', '),
      time: appointment.time,
      day: dayType
    });
  };

  const handleEditSave = (id: string) => {
    const appointment = appointments.find(apt => apt.id === id);
    if (!appointment) return;
    
    const parsedAdditional = editForm.additionalNames
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .slice(0, 2);
    
    // Generar la nueva fecha basada en el día seleccionado
    const newDate = editForm.day === 'friday' 
      ? formatDate(getNextFriday())
      : formatDate(getNextSaturday());
    
    onUpdateAppointment(id, { 
      customerName: editForm.customerName,
      customerPhone: editForm.customerPhone,
      customerEmail: editForm.customerEmail || undefined,
      notes: editForm.notes || undefined,
      additionalCustomerNames: parsedAdditional.length > 0 ? parsedAdditional : undefined,
      time: editForm.time, // Actualizar el horario
      date: newDate, // Actualizar la fecha
      updatedAt: new Date()
    });
    setEditingId(null);
    setEditForm({ customerName: '', customerPhone: '', customerEmail: '', notes: '', additionalNames: '', time: '', day: 'friday' });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ customerName: '', customerPhone: '', customerEmail: '', notes: '', additionalNames: '', time: '', day: 'friday' });
  };

  const handleStatusChange = (id: string, status: Appointment['status']) => {
    const old = appointments.find(a => a.id === id);
    if (old) setLastAction({ type: 'update', snapshot: old });
    onUpdateAppointment(id, { status, updatedAt: new Date() });
  };

  const handleDelete = (appointment: Appointment) => {
    setLastAction({ type: 'delete', snapshot: appointment });
    onDeleteAppointment(appointment.id);
  };

  const handleBanFromAppointment = (appointment: Appointment) => {
    console.log('handleBanFromAppointment llamado', appointment);
    setAppointmentToBan(appointment);
    setBanModalOpen(true);
  };

  const handleConfirmBan = async () => {
    if (!appointmentToBan) return;

    console.log('Iniciando proceso de baneo...');
    setBanModalOpen(false);
    
    try {
      const reason = `Turno troll: ${appointmentToBan.customerName} - ${appointmentToBan.date} ${appointmentToBan.time}`;
      let banned = false;
      const results: string[] = [];

      // Banear IP si existe
      console.log('[handleConfirmBan] Turno a banear:', {
        id: appointmentToBan.id,
        ipAddress: appointmentToBan.ipAddress,
        customerPhone: appointmentToBan.customerPhone,
        customerEmail: appointmentToBan.customerEmail
      });
      
      if (appointmentToBan.ipAddress && appointmentToBan.ipAddress.trim() !== '') {
        const ipToBan = appointmentToBan.ipAddress.trim();
        console.log('[handleConfirmBan] ✅ IP encontrada, baneando:', ipToBan);
        try {
          const ipResult = await banIP(ipToBan, reason);
          console.log('[handleConfirmBan] Resultado de banIP:', ipResult);
          if (ipResult) {
            banned = true;
            results.push('IP baneada');
            console.log('[handleConfirmBan] IP baneada exitosamente');
          } else {
            console.warn('[handleConfirmBan] banIP retornó false');
            // Fallback: guardar directamente en localStorage
            const localBans = JSON.parse(localStorage.getItem('banned_ips') || '[]');
            if (!localBans.some((b: any) => (b.ip_address || '').trim() === ipToBan)) {
              localBans.push({
                id: Math.random().toString(36).substr(2, 9),
                ip_address: ipToBan,
                reason: reason,
                banned_at: new Date().toISOString()
              });
              localStorage.setItem('banned_ips', JSON.stringify(localBans));
              banned = true;
              results.push('IP baneada (localStorage)');
              console.log('[handleConfirmBan] IP guardada en localStorage como fallback');
            }
          }
        } catch (ipError) {
          console.error('[handleConfirmBan] Error al banear IP:', ipError);
          // Fallback: guardar directamente en localStorage
          const localBans = JSON.parse(localStorage.getItem('banned_ips') || '[]');
          if (!localBans.some((b: any) => (b.ip_address || '').trim() === ipToBan)) {
            localBans.push({
              id: Math.random().toString(36).substr(2, 9),
              ip_address: ipToBan,
              reason: reason,
              banned_at: new Date().toISOString()
            });
            localStorage.setItem('banned_ips', JSON.stringify(localBans));
            banned = true;
            results.push('IP baneada (localStorage fallback)');
            console.log('[handleConfirmBan] IP guardada en localStorage después de error');
          }
        }
      } else {
        console.log('[handleConfirmBan] No hay IP disponible para banear - el turno no tiene IP guardada');
      }

      // Banear teléfono
      console.log('Baneando teléfono:', appointmentToBan.customerPhone);
      const phoneResult = await banPhone(appointmentToBan.customerPhone, reason);
      if (phoneResult) {
        banned = true;
        results.push('Teléfono baneado');
        console.log('Teléfono baneado exitosamente');
      } else {
        console.warn('No se pudo banear el teléfono');
      }

      // Banear email si existe
      if (appointmentToBan.customerEmail) {
        console.log('Baneando email:', appointmentToBan.customerEmail);
        const emailResult = await banEmail(appointmentToBan.customerEmail, reason);
        if (emailResult) {
          banned = true;
          results.push('Email baneado');
          console.log('Email baneado exitosamente');
        } else {
          console.warn('No se pudo banear el email');
        }
      } else {
        console.log('No hay email disponible para banear');
      }

      console.log('[handleConfirmBan] Resultados del baneo:', results, 'banned:', banned);

      if (banned) {
        addNotification({
          type: 'success',
          title: 'Baneo Exitoso',
          message: `${results.join(', ')}. No podrán crear nuevos turnos.`
        });
        
        // Recargar la lista de baneos
        await refreshBans();
        
        // Sincronizar localStorage con Supabase para que la validación funcione inmediatamente
        try {
          const { supabase } = await import('../lib/supabase');
          const { data: freshBans } = await supabase.from('banned_ips').select('*');
          if (freshBans) {
            localStorage.setItem('banned_ips', JSON.stringify(freshBans));
            console.log('[handleConfirmBan] ✅ localStorage sincronizado con', freshBans.length, 'IPs baneadas');
          }
        } catch (syncError) {
          console.warn('[handleConfirmBan] Error sincronizando localStorage:', syncError);
        }
        
        console.log('[handleConfirmBan] ✅ Baneo completado y lista actualizada');
      } else {
        addNotification({
          type: 'warning',
          title: 'Advertencia',
          message: 'No se pudo completar el baneo. Verifica la consola para más detalles.'
        });
      }
    } catch (error) {
      console.error('Error baneando:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: `No se pudo completar el baneo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    } finally {
      setAppointmentToBan(null);
    }
  };

  const handleCancelBan = () => {
    setBanModalOpen(false);
    setAppointmentToBan(null);
  };

  const handleUndo = () => {
    if (!lastAction) return;
    const snap = lastAction.snapshot;
    if (lastAction.type === 'delete') {
      onNewAppointment({
        date: snap.date,
        time: snap.time,
        customerName: snap.customerName,
        additionalCustomerNames: snap.additionalCustomerNames,
        customerPhone: snap.customerPhone,
        customerEmail: snap.customerEmail,
        status: snap.status,
        service: snap.service,
        notes: snap.notes
      });
    } else if (lastAction.type === 'update') {
      onUpdateAppointment(snap.id, {
        customerName: snap.customerName,
        customerPhone: snap.customerPhone,
        customerEmail: snap.customerEmail,
        notes: snap.notes,
        status: snap.status,
        service: snap.service,
        additionalCustomerNames: snap.additionalCustomerNames,
        date: snap.date,
        time: snap.time,
        updatedAt: new Date()
      });
    }
    setLastAction(null);
  };

  const renderAppointmentCard = (appointment: Appointment, isToday: boolean) => (
    (() => {
      const isSobreturno = appointment.time.endsWith(':30');
      const d = parseAppointmentDateTime(appointment.date, appointment.time, appointment.createdAt);
      const dayIdx = d ? d.getDay() : 6; // 5=viernes, 6=sábado
      // Mapeo de colores por día: viernes -> azul, sábado -> violeta
      const theme = isSobreturno ? 'orange' : 'amber';
      const now = currentTime;
      const isPast = !!d && d.getTime() < now.getTime();
      
      // Verificar si el turno está baneado usando las funciones del hook
      // bannedIPs.length se usa aquí para que React detecte cambios y re-renderice
      const appointmentIPBanned = appointment.ipAddress ? isIPBanned(appointment.ipAddress) : false;
      const appointmentPhoneBanned = isPhoneBanned(appointment.customerPhone);
      const appointmentEmailBanned = appointment.customerEmail ? isEmailBanned(appointment.customerEmail) : false;
      const isBanned = appointmentIPBanned || appointmentPhoneBanned || appointmentEmailBanned;
      const isEditing = editingId === appointment.id;
      const borderClass = theme === 'orange'
        ? 'border-l-orange-500'
        : (isPast ? 'border-l-amber-600' : 'border-l-amber-500');
      const iconAccentClass = (() => {
        const serviceName = appointment.service.name.toLowerCase();
        if (theme === 'orange') return 'bg-orange-500/20 border border-orange-500/30';
        if (serviceName.includes('barba')) return 'bg-blue-500/20 border border-blue-500/30';
        if (serviceName.includes('diseño') || serviceName.includes('diseno')) return 'bg-pink-500/20 border border-pink-500/30';
        return isPast
          ? 'bg-amber-600/20 border border-amber-600/30'
          : 'bg-amber-500/20 border border-amber-500/30';
      })();
      const dateTextColor = theme === 'orange'
        ? 'text-orange-300'
        : (isPast ? 'text-amber-500' : 'text-amber-400');
      const themeChipClass = theme === 'orange' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      return (
    <div key={appointment.id} className={`bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg border-l-4 ${borderClass} hover:shadow-xl transition-all duration-300 relative`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`rounded-full p-2 ${iconAccentClass} ${isPast ? 'opacity-60' : ''}`}>
            <span className="text-lg">{appointment.service.icon}</span>
          </div>
          <div>
            <p className={`font-semibold ${dateTextColor}`}>
              {appointment.date}
            </p>
            <div className="flex items-center space-x-2 text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{appointment.time}</span>
              <span className="text-xs">({appointment.service.duration}min)</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={isSobreturno ? "flex flex-col items-end gap-1" : "flex items-center gap-2"}>
            {SHOW_STATUS && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                appointment.status === 'confirmed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                appointment.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                appointment.status === 'cancelled' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }`}>
                {appointment.status === 'confirmed' ? 'Confirmado' :
                 appointment.status === 'completed' ? 'Completado' :
                 appointment.status === 'cancelled' ? 'Cancelado' : 'No mostrar'}
              </div>
            )}
            {isSobreturno && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">SOBRETURNO</span>
            )}
          </div>
          {/* Botón de menú de 3 puntos */}
          <div className="relative menu-container">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenMenuId(openMenuId === appointment.id ? null : appointment.id);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
              title="Más opciones"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {/* Menú desplegable */}
            {openMenuId === appointment.id && (
              <div className="absolute right-0 top-10 z-50 bg-gray-700 border border-gray-600 rounded-lg shadow-xl min-w-[160px] overflow-hidden">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isBanned) return;
                    setOpenMenuId(null);
                    handleBanFromAppointment(appointment);
                  }}
                  disabled={isBanned}
                  className={`w-full flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors duration-200 ${
                    isBanned
                      ? 'text-gray-500 cursor-not-allowed'
                      : 'text-orange-400 hover:bg-orange-500/20'
                  }`}
                >
                  <Ban className="h-4 w-4" />
                  <span>{isBanned ? 'Ya baneado' : 'Banear'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`space-y-4 overflow-hidden transition-all duration-300 ease-out ${
          isEditing ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={editForm.customerName}
              onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={editForm.customerPhone}
              onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              onInput={(e) => {
                const target = e.currentTarget;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
              placeholder="Escribir nota..."
              rows={1}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Acompañantes (separados por coma, máx. 2)
            </label>
            <input
              type="text"
              value={editForm.additionalNames}
              onChange={(e) => setEditForm({ ...editForm, additionalNames: e.target.value })}
              placeholder="Ej: Juan, Pedro"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Campo para editar día (viernes o sábado) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Día
            </label>
            <select
              value={editForm.day}
              onChange={(e) => {
                const newDay = e.target.value as 'friday' | 'saturday';
                setEditForm({ ...editForm, day: newDay });
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="friday">Viernes</option>
              <option value="saturday">Sábado</option>
            </select>
          </div>

          {/* Campo para editar horario */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Horario
            </label>
            {(() => {
              // Calcular horarios disponibles para el día seleccionado en el formulario
              const availableDays = getAvailableDays(ranges as CustomTimeRanges, availability);
              
              // Usar el día seleccionado en el formulario de edición
              const dayData = availableDays.find(day => day.day === editForm.day);
              
              // Generar la fecha correspondiente al día seleccionado
              const selectedDate = editForm.day === 'friday' 
                ? formatDate(getNextFriday())
                : formatDate(getNextSaturday());
              
              // Obtener todos los slots posibles para este día (incluyendo sobreturnos :30)
              const allSlots = dayData?.slots.map(s => s.time) || [];
              
              // Agregar sobreturnos (:30) si el día está activo
              const sobreturnos: string[] = [];
              if (dayData && !dayData.isClosed) {
                // Generar sobreturnos desde las 8:30 hasta las 23:30
                for (let h = 8; h < 24; h++) {
                  sobreturnos.push(`${String(h).padStart(2, '0')}:30`);
                }
              }
              const allPossibleSlots = Array.from(new Set([...allSlots, ...sobreturnos]));
              
              // Filtrar slots ocupados (excluyendo el turno actual que se está editando)
              const otherAppointments = appointments.filter(apt => apt.id !== appointment.id);
              const availableSlots = allPossibleSlots.filter(slotTime => {
                return isSlotAvailable(selectedDate, slotTime, otherAppointments);
              });
              
              // Incluir siempre el horario actual aunque esté "ocupado" (porque es el mismo turno)
              const slotsToShow = Array.from(new Set([...availableSlots, appointment.time])).sort((a, b) => {
                const [h1, m1] = a.split(':').map(Number);
                const [h2, m2] = b.split(':').map(Number);
                return (h1 * 60 + m1) - (h2 * 60 + m2);
              });
              
              if (slotsToShow.length === 0) {
                return (
                  <div className="text-sm text-yellow-400">
                    No hay horarios disponibles para este día
                  </div>
                );
              }
              
              return (
                <select
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {slotsToShow.map(time => (
                    <option key={time} value={time}>
                      {time} {time === appointment.time ? '(actual)' : ''}
                    </option>
                  ))}
                </select>
              );
            })()}
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => handleEditSave(appointment.id)}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Guardar</span>
            </button>
            <button
              onClick={handleEditCancel}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      <div
        className={`space-y-3 overflow-hidden transition-all duration-300 ease-out ${
          isEditing ? 'max-h-0 opacity-0 translate-y-1 pointer-events-none' : 'max-h-[1200px] opacity-100 translate-y-0'
        }`}
      >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{appointment.service.icon}</span>
              <div>
                <p className="font-semibold text-white">{appointment.service.name}</p>
                <p className="text-sm text-gray-400">${appointment.service.price.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-semibold text-white">{appointment.customerName}</p>
              {appointment.additionalCustomerNames && appointment.additionalCustomerNames.length > 0 && (
                <p className="text-sm text-gray-400">Acompañantes: {appointment.additionalCustomerNames.filter(n => n && n.trim().length > 0).join(', ')}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <a
                href={buildWhatsAppLink(appointment.customerPhone, 'AR')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-green-400 hover:text-green-300 hover:underline transition-colors duration-200 cursor-pointer group"
                title="Enviar mensaje por WhatsApp"
              >
                <span>{appointment.customerPhone}</span>
                <span className="text-lg group-hover:scale-110 transition-transform duration-200">💬</span>
              </a>
            </div>
          </div>
          
          {appointment.customerEmail && (
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-gray-300">{appointment.customerEmail}</p>
              </div>
            </div>
          )}
          
          {appointment.notes && (
            <div className="flex items-start space-x-3">
              <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-300 text-sm">{appointment.notes}</p>
              </div>
            </div>
          )}
          
          {/* Status and Action Controls */}
          <div className="pt-3 border-t border-gray-700 transition-all duration-300 ease-out">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                {SHOW_STATUS && (
                  <>
                    <label className="text-sm font-medium text-gray-300">Estado:</label>
                    <select
                      value={appointment.status}
                      onChange={(e) => handleStatusChange(appointment.id, e.target.value as Appointment['status'])}
                      className="text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer hover:bg-gray-700 transition-colors duration-200"
                    >
                      <option value="confirmed">Confirmado</option>
                      <option value="completed">Completado</option>
                      <option value="cancelled">Cancelado</option>
                      <option value="no-show">No mostrar</option>
                    </select>
                  </>
                )}
              </div>
              
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditStart(appointment)}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg transition-all duration-200 hover:text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/10 hover:shadow-sm hover:shadow-amber-500/20"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="text-sm">Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(appointment)}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg transition-all duration-200 hover:text-red-300 hover:border-red-500/60 hover:bg-red-500/10 hover:shadow-sm hover:shadow-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-2 flex items-center justify-between">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${isPast ? 'bg-gray-600/30 text-gray-300 border border-gray-600' : themeChipClass}`}>
              {isPast ? 'Pasado' : (isToday ? 'Hoy' : 'Próximo')}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(appointment.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
    </div>
      );
    })()
  );

  return (
    <div className="pb-safe">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        
        {/* Dashboard Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200 bg-clip-text text-transparent mb-3 sm:mb-4 drop-shadow-lg animate-gradient-x">
            Dashboard del Barbero
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 px-2 animate-fade-in-up">
            Salón Legendario
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-1 flex">
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'appointments'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">Turnos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">Métricas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/20'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trash')}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'trash'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bans')}
              className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 ${
                activeTab === 'bans'
                  ? 'bg-orange-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-[50vh]">
          <div key={activeTab} className="animate-fade-in-up">
          {activeTab === 'analytics' ? (
            <Analytics appointments={appointments} />
          ) : activeTab === 'bans' ? (
            <BansSection 
              bannedIPs={bannedIPs}
              onUnbanIP={unbanIP}
              onRefresh={async () => {
                await refreshBans();
                // También refrescar turnos para actualizar el estado de baneado
                await onRefreshAppointments();
              }}
            />
          ) : activeTab === 'trash' ? (
            <TrashSection 
              deletedAppointments={deletedAppointments}
              loading={loadingTrash}
              onRestore={async (id: string) => {
                try {
                  await onRestoreAppointment(id);
                  const deleted = await loadDeletedAppointments();
                  setDeletedAppointments(deleted);
                } catch (error) {
                  console.error('Error restoring appointment:', error);
                }
              }}
              onPermanentlyDelete={async (id: string) => {
                try {
                  await onPermanentlyDeleteAppointment(id);
                  const deleted = await loadDeletedAppointments();
                  setDeletedAppointments(deleted);
                } catch (error) {
                  console.error('Error permanently deleting appointment:', error);
                }
              }}
            />
          ) : activeTab === 'appointments' ? (
            <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12">
          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Total Reservas</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-400">{confirmedAppointments.length}</p>
              </div>
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-full p-2 sm:p-3">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Turnos Hoy</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-400">{todayAppointments.length}</p>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-full p-2 sm:p-3">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Próximos</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-400">{futureAppointments.length}</p>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-full p-2 sm:p-3">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-900 border border-gray-700 text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value as any)}
                  className="bg-gray-900 border border-gray-700 text-white rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
                >
                  <option value="all">Todos</option>
                  <option value="friday">Viernes</option>
                  <option value="saturday">Sábado</option>
                  <option value="sobreturno">Sobreturnos</option>
                </select>
                <button
                  onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg sm:rounded-xl hover:bg-gray-600 transition-colors text-sm sm:text-base"
                  title="Alternar orden"
                >
                  {sortDir === 'asc' ? 'Próximo → Lejano' : 'Lejano → Próximo'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Future Appointments */}
        {todayFutureAppointments.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Turnos Restantes de Hoy ({todayFutureAppointments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {todayFutureAppointments.map((appointment) => (
                renderAppointmentCard(appointment, true)
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Próximos Turnos ({upcomingAppointments.length})
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUndo}
                  disabled={!lastAction}
                  className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${lastAction ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'}`}
                  title={lastAction ? 'Deshacer última acción (Ctrl+Z)' : 'Nada que deshacer'}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Deshacer</span>
                </button>
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      await Promise.all([
                        onRefreshAppointments(),
                        refreshBans()
                      ]);
                      addNotification({
                        type: 'success',
                        title: 'Actualizado',
                        message: 'Turnos y baneos actualizados correctamente.'
                      });
                    } catch (error) {
                      console.error('Error refrescando:', error);
                      addNotification({
                        type: 'error',
                        title: 'Error',
                        message: 'No se pudo actualizar. Intenta nuevamente.'
                      });
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing}
                  className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors bg-gray-700 text-white hover:bg-gray-600 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Actualizar turnos y baneos"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {upcomingAppointments
                .slice() // copio array para no mutar upcomingAppointments original
                .sort((a, b) => appointmentCompare(a, b, sortDir))
                .map((appointment) => (
                  renderAppointmentCard(appointment, false)
                ))}
            </div>
          </div>
        )}

        {/* All Past Appointments */}
        {pastAppointments.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-400 mb-4 sm:mb-6 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Turnos Pasados ({pastAppointments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {pastAppointments.map((appointment) => (
                <div key={appointment.id} className="opacity-75">
                  {renderAppointmentCard(appointment, todayAppointments.some(t => t.id === appointment.id))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {pastAppointments.length === 0 && todayFutureAppointments.length === 0 && upcomingAppointments.length === 0 && (
          <div className="text-center py-8 sm:py-12 md:py-16">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 shadow-lg max-w-md mx-auto">
              <div className="bg-gray-700 border border-gray-600 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                {searchTerm || dayFilter !== 'all' ? 'No se encontraron resultados' : 'No hay reservas aún'}
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                {searchTerm || dayFilter !== 'all' ? 'Intenta cambiar los filtros de búsqueda' : 'Las nuevas reservas aparecerán aquí automáticamente'}
              </p>
            </div>
          </div>
        )}
        </>
        ) : (
          <SettingsSection appointments={appointments} onNewAppointment={onNewAppointment} addNotification={addNotification} />
        )}
          </div>

        {/* Modal de Confirmación de Baneo */}
        <ConfirmBanModal
          isOpen={banModalOpen}
          appointment={appointmentToBan}
          onConfirm={handleConfirmBan}
          onCancel={handleCancelBan}
        />
      </div>
    </div>
  </div>
  );
};


// Componente de Papelera de Reciclaje
interface TrashSectionProps {
  deletedAppointments: Appointment[];
  loading: boolean;
  onRestore: (id: string) => Promise<void>;
  onPermanentlyDelete: (id: string) => Promise<void>;
}

const TrashSection: React.FC<TrashSectionProps> = ({
  deletedAppointments,
  loading,
  onRestore,
  onPermanentlyDelete
}) => {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await onRestore(id);
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentlyDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar permanentemente este turno? Esta acción no se puede deshacer.')) {
      return;
    }
    setDeletingId(id);
    try {
      await onPermanentlyDelete(id);
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div className="mb-6 sm:mb-8 md:mb-12">
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
        <Trash className="h-5 w-5 mr-2 text-red-400" />
        Papelera de Reciclaje ({deletedAppointments.length})
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Los turnos eliminados se mantienen aquí. Puedes restaurarlos o eliminarlos permanentemente.
      </p>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Cargando turnos eliminados...</div>
        </div>
      ) : deletedAppointments.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md mx-auto">
            <Trash className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-white mb-2">Papelera vacía</h4>
            <p className="text-gray-400 text-sm">No hay turnos eliminados.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {deletedAppointments.map((appointment) => {
            const d = parseAppointmentDateTime(appointment.date, appointment.time, appointment.createdAt);
            const isSobreturno = appointment.time.endsWith(':30');
            const dayIdx = d ? d.getDay() : 6;
            const theme = isSobreturno ? 'orange' : (dayIdx === 5 ? 'blue' : 'purple');
            
            return (
              <div
                key={appointment.id}
                className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg border-l-4 border-l-red-500 opacity-75"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full p-2 bg-red-500/20 border border-red-500/30">
                      <span className="text-lg">{appointment.service.icon}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-red-300">{appointment.date}</p>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{appointment.time}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                    Eliminado
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{appointment.service.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{appointment.service.name}</p>
                      <p className="text-sm text-gray-400">${appointment.service.price.toLocaleString('es-AR')}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-white">{appointment.customerName}</p>
                      {appointment.additionalCustomerNames && appointment.additionalCustomerNames.length > 0 && (
                        <p className="text-sm text-gray-400">
                          Acompañantes: {appointment.additionalCustomerNames.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300">{appointment.customerPhone}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700 flex space-x-2">
                  <button
                    onClick={() => handleRestore(appointment.id)}
                    disabled={restoringId === appointment.id}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-green-400 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span className="text-sm">
                      {restoringId === appointment.id ? 'Restaurando...' : 'Restaurar'}
                    </span>
                  </button>
                  <button
                    onClick={() => handlePermanentlyDelete(appointment.id)}
                    disabled={deletingId === appointment.id}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">
                      {deletingId === appointment.id ? 'Eliminando...' : 'Eliminar'}
                    </span>
                  </button>
                </div>

                <div className="pt-2 mt-2 text-xs text-gray-500 text-center">
                  Eliminado el {new Date(appointment.updatedAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Componente de Gestión de Baneos
interface BansSectionProps {
  bannedIPs: any[];
  onUnbanIP: (ip: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

const BansSection: React.FC<BansSectionProps> = ({
  bannedIPs,
  onUnbanIP,
  onRefresh
}) => {
  const { addNotification } = useNotifications();
  const [unbanning, setUnbanning] = useState<string | null>(null);

  const handleUnban = async (ip: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas desbanear la IP ${ip}?`)) {
      return;
    }

    setUnbanning(`ip-${ip}`);
    try {
      const success = await onUnbanIP(ip);

      if (success) {
        addNotification({
          type: 'success',
          title: 'Desbaneo Exitoso',
          message: `La IP ${ip} ha sido desbaneada correctamente.`
        });
        await onRefresh();
      }
    } catch (error) {
      console.error('Error desbaneando:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo desbanear. Intenta nuevamente.'
      });
    } finally {
      setUnbanning(null);
    }
  };

  return (
    <div className="mb-6 sm:mb-8 md:mb-12">
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
        <Shield className="h-5 w-5 mr-2 text-orange-400" />
        Gestión de Baneos - IPs
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Gestiona las IPs baneadas. Los usuarios con IPs baneadas no podrán crear nuevos turnos.
      </p>

      <div className="max-w-4xl mx-auto">
        {/* IPs Baneadas */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Ban className="h-4 w-4 mr-2 text-orange-400" />
            IPs Baneadas ({bannedIPs.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bannedIPs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No hay IPs baneadas</p>
              </div>
            ) : (
              bannedIPs.map((ban) => (
                <div key={ban.ip_address} className="bg-gray-700/50 rounded-lg p-3 sm:p-4 flex items-center justify-between hover:bg-gray-700/70 transition-colors">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm sm:text-base">{ban.ip_address}</p>
                    {ban.reason && (
                      <p className="text-gray-400 text-xs sm:text-sm mt-1">{ban.reason}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Baneado el {new Date(ban.banned_at).toLocaleDateString('es-AR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnban(ban.ip_address)}
                    disabled={unbanning === `ip-${ban.ip_address}`}
                    className="ml-3 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {unbanning === `ip-${ban.ip_address}` ? 'Desbaneando...' : 'Desbanear'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};