import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Truck, ShieldAlert, KeyRound } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-blue-900 to-zinc-900 relative items-center justify-center overflow-hidden border-r border-white/10 shadow-2xl">
        {/* Abstract ambient light shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500 blur-[100px]"></div>
          <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-indigo-500 blur-[100px] transform translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="relative z-10 text-center px-12 animate-fade-in">
          <div className="inline-flex p-5 bg-white/10 rounded-3xl backdrop-blur-xl mb-8 ring-1 ring-white/20 shadow-2xl">
            <Truck size={56} className="text-blue-300 drop-shadow-md" />
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-tight mb-6 leading-tight">
            Intelligence Transport<br/>Management System
          </h1>
          <p className="text-lg text-blue-100/70 max-w-lg mx-auto font-medium leading-relaxed">
            The next-generation logistics platform for optimizing routes, tracking shipments, and managing your entire commercial fleet.
          </p>
        </div>

        {/* Powered by text */}
        <div className="absolute bottom-10 left-0 w-full text-center">
          <p className="text-xs font-semibold text-white/40 tracking-[0.2em] uppercase">
            Powered by <span className="text-white/90 font-bold ml-1">Axe Global AI</span>
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: '0.1s' }}>
          
          {/* Mobile Branding */}
          <div className="text-center mb-10 lg:hidden">
            <div className="inline-flex p-3 bg-blue-600 rounded-2xl mb-5 shadow-lg shadow-blue-600/30">
              <Truck size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">ITMS Platform</h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Welcome back</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">Enter your credentials to access the command center.</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-xl mb-6 text-sm font-semibold animate-fade-in">
              <ShieldAlert size={20} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-4 py-3.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-zinc-400 font-medium"
                  placeholder="dispatcher@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Password</label>
                <a href="#" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-3.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-zinc-400 font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <KeyRound size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-all font-bold mt-4 py-4 shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60 disabled:shadow-none flex justify-center items-center gap-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Secure Login'
              )}
            </button>
          </form>
          
          {/* Mobile Powered by text */}
          <div className="mt-12 text-center lg:hidden">
            <p className="text-xs font-semibold text-zinc-400 tracking-[0.15em] uppercase">
              Powered by <span className="text-zinc-600 dark:text-zinc-300 font-bold ml-1">Axe Global AI</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
