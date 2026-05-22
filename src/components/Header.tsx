import React, { useState, useEffect } from 'react';
import { Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  view: 'customer' | 'owner';
  onViewChange: (view: 'customer' | 'owner') => void;
}

export const Header: React.FC<HeaderProps> = ({ view, onViewChange }) => {
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-black/40 backdrop-blur-sm border-b border-amber-500/15 shadow-sm'
          : 'bg-transparent border-b border-transparent shadow-none'
      }`}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo + Nombre */}
          <div className="flex items-center space-x-2">
            <img
              src="/logo.PNG"
              alt="Salón Legendario"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover flex-shrink-0"
            />
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight drop-shadow-lg animate-shimmer leading-tight">
                Salón Legendario
              </h1>
              <p className="text-amber-400/80 text-[10px] sm:text-xs font-medium animate-fade-in leading-tight">
                Barbería Premium
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onViewChange('customer')}
              className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                view === 'customer'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-lg shadow-amber-500/30'
                  : 'bg-gray-900/80 backdrop-blur-sm text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-700 hover:border-amber-500/40'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Reservar</span>
            </button>

            {showAdminButton && (
              <div className="group relative">
                <button
                  onClick={() => onViewChange('owner')}
                  className={`w-7 h-7 rounded-full transition-all duration-300 flex items-center justify-center ${
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