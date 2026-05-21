import React, { useState } from 'react';
import { Lock, X, Shield, Mail, Key, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PinAuthModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  onSuccess,
  onCancel,
  title = 'Acceso al Dashboard',
  subtitle = 'Ingresá tu correo y contraseña de administrador'
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setErrorMsg('Por favor completa todos los campos.'); return; }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data?.user) onSuccess();
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_credentials')) {
        setErrorMsg('Correo o contraseña incorrectos.');
      } else {
        setErrorMsg(err.message || 'Ocurrió un error al intentar iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gray-900 border border-amber-500/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-amber-500/10 relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-glow">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-500 text-sm">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-600">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading}
                placeholder="admin@salonlegendario.com"
                className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-600">
                <Key className="h-4 w-4" />
              </span>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-center">
              <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Ingresando...</span></>
            ) : (
              <><Lock className="h-4 w-4" /><span>Iniciar Sesión</span></>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2 text-gray-600 text-xs">
          <Lock className="h-3.5 w-3.5" />
          <span>Acceso seguro administrado por Supabase</span>
        </div>

        <button onClick={onCancel} disabled={loading}
          className="absolute top-4 right-4 p-2 text-gray-600 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};