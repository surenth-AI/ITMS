import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, Search, UserPlus, Mail, Shield, ShieldCheck } from 'lucide-react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <ShieldCheck size={16} className="text-purple-500" />;
    if (role === 'dispatcher') return <Shield size={16} className="text-blue-500" />;
    return <UsersIcon size={16} className="text-zinc-400" />;
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'dispatcher': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'driver': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'client': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <UsersIcon className="text-primary" size={28} />
            User Directory
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage system access, roles, and accounts</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm">
          <UserPlus size={16} /> New User
        </button>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col flex-1 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search users by name, email, or role..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>
          <div className="text-sm font-medium text-zinc-500">
            Total: {users.length} Users
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">Loading directory...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No users found matching your search.</td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{u.full_name}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><Mail size={12} /> {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getRoleStyle(u.role)}`}>
                        {getRoleIcon(u.role)}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
