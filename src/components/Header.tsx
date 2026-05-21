import React, { useState, useEffect } from 'react';
import { Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  view: 'customer' | 'owner';
  onViewChange: (view: 'customer' | 'owner') => void;
}

export const Header: React.FC<HeaderProps> = ({ view, onViewChange }) => {
  const [showAdminButton, setShowAdminButton] = useState(false);

  useEffect(() => {
    const isUrlAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
    if (isUrlAdmin) {
      setShowAdminButton(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setShowAdminButton(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUrlAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
      setShowAdminButton(!!session || currentUrlAdmin);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  return (
    <header className="bg-gradient-to-r from-black via-gray-900 to-black shadow-2xl border-b border-amber-500/20 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          {/* Logo + Nombre */}
          <div className="flex items-center space-x-3">
            <a
              href="https://www.instagram.com/salonlegendario"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors duration-300"
              aria-label="Síguenos en Instagram"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7 sm:h-8 sm:w-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="igGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F58529" />
                    <stop offset="35%" stopColor="#DD2A7B" />
                    <stop offset="70%" stopColor="#8134AF" />
                    <stop offset="100%" stopColor="#515BD4" />
                    <animateTransform attributeName="gradientTransform" type="rotate" from="0 12 12" to="360 12 12" dur="6s" repeatCount="indefinite" />
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#igGradient)" strokeWidth="2" />
                <circle cx="12" cy="12" r="4" stroke="url(#igGradient)" strokeWidth="2" />
                <circle cx="17.5" cy="6.5" r="1.25" fill="url(#igGradient)" />
              </svg>
            </a>

            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight drop-shadow-lg animate-shimmer">
                Salon Legendario
              </h1>
              <p className="text-amber-400/80 text-xs sm:text-sm font-medium animate-fade-in">
                Barbería Premium
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onViewChange('customer')}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                view === 'customer'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/30'
                  : 'bg-gray-900/80 backdrop-blur-sm text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-700 hover:border-amber-500/40'
              }`}
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Reservar</span>
            </button>

            {showAdminButton && (
              <div className="group relative">
                <button
                  onClick={() => onViewChange('owner')}
                  className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${
                    view === 'owner'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                      : 'bg-gray-900/50 hover:bg-gray-800 text-gray-600 hover:text-amber-400 border border-gray-700'
                  }`}
                  title="Panel de Administración"
                >
                  <User className="h-3 w-3" />
                </button>
                <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Admin
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};