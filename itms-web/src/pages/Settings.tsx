import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Settings as SettingsIcon, Moon, Sun, User, Shield, Bell, Database, Info } from 'lucide-react';

export default function Settings() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">System configuration and preferences</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        {/* Profile */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
            <User size={18} className="text-primary" />
            User Profile
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</label>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-1 font-medium">{user?.full_name || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</label>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-1 font-medium capitalize">{user?.role || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</label>
              <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-1 font-medium">{user?.email || '—'}</p>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
            {theme === 'dark' ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
            Appearance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Theme Mode</p>
                <p className="text-xs text-zinc-500 mt-0.5">Currently: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
              </div>
              <button onClick={toggleTheme} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            Notification Preferences
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Critical alerts', desc: 'Engine warnings, failures', default: true },
              { label: 'Trip updates', desc: 'Start, complete, delay', default: true },
              { label: 'Maintenance reminders', desc: 'AI-recommended service', default: true },
              { label: 'Driver hours breach', desc: 'EU regulation compliance', default: false },
              { label: 'Fuel anomalies', desc: 'Consumption outliers', default: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                </div>
                <div className={`w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${item.default ? 'bg-primary justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'}`}>
                  <div className="w-5 h-5 bg-white rounded-full shadow" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
            <Info size={18} className="text-primary" />
            System Information
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Platform', value: 'ITMS v2.0' },
              { label: 'Backend', value: 'Flask + SQLite' },
              { label: 'Frontend', value: 'React + Vite + Tailwind' },
              { label: 'Mobile', value: 'Expo + React Native' },
              { label: 'AI Engine', value: 'Predictive Maintenance v1' },
              { label: 'API Version', value: 'REST v1.0' },
              { label: 'WebSocket', value: 'Socket.IO v4' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{item.label}</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
