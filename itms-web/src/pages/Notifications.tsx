import React, { useEffect, useState } from 'react';
import { Mail, MessageSquare, Bell, CheckCircle2, XCircle } from 'lucide-react';
import api from '../services/api';

interface NotificationLog {
  id: string;
  type: string;
  recipient: string;
  message: string;
  status: string;
  created_at: string;
}

export default function Notifications() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/notifications');
      setLogs(res.data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'email') return <Mail size={16} className="text-blue-500" />;
    if (type === 'sms') return <MessageSquare size={16} className="text-emerald-500" />;
    return <Bell size={16} className="text-amber-500" />;
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          <Bell className="text-primary" size={28} />
          Communication Logs
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Audit trail of automated SMS, Email, and Push notifications sent to clients and drivers</p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col flex-1 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Dispatch History</h3>
          <span className="text-xs font-semibold text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {logs.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold">Channel</th>
                <th className="px-6 py-4 font-semibold">Recipient</th>
                <th className="px-6 py-4 font-semibold">Message</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No communications found.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 uppercase text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        {getTypeIcon(log.type)} {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {log.recipient}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 min-w-[300px]">
                      {log.message}
                    </td>
                    <td className="px-6 py-4">
                      {log.status === 'sent' || log.status === 'delivered' ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded w-fit border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={12} /> Delivered
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wider bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded w-fit border border-red-200 dark:border-red-800">
                          <XCircle size={12} /> Failed
                        </span>
                      )}
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
