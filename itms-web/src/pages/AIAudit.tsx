import React, { useEffect, useState } from 'react';
import { Brain, Cpu, AlertTriangle, ShieldCheck, TrendingUp, Compass, Target } from 'lucide-react';
import api from '../services/api';

interface AIPredictionLog {
  id: string;
  model_name: string;
  entity_type: string;
  prediction_result: string;
  confidence_score: number;
  created_at: string;
}

export default function AIAudit() {
  const [logs, setLogs] = useState<AIPredictionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/ai/audit');
      setLogs(res.data.audit);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getModelIcon = (modelName: string) => {
    if (modelName.includes('XGBoost')) return <AlertTriangle size={16} className="text-amber-500" />;
    if (modelName.includes('OR-Tools')) return <Compass size={16} className="text-blue-500" />;
    if (modelName.includes('Prophet')) return <TrendingUp size={16} className="text-emerald-500" />;
    if (modelName.includes('Z-Score')) return <ShieldCheck size={16} className="text-purple-500" />;
    return <Cpu size={16} className="text-zinc-500" />;
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          <Brain className="text-primary" size={28} />
          AI Audit Trail
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Transparency log for all machine learning predictions, routing decisions, and heuristics.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        
        {/* Analytics Summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Target size={16} /> Model Confidence
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">OR-Tools (Routing)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">100%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full"><div className="h-full bg-emerald-500 rounded-full w-full" /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">XGBoost (Delays)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">88.5%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full"><div className="h-full bg-amber-500 rounded-full w-[88.5%]" /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Prophet (Demand)</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">92.1%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full"><div className="h-full bg-blue-500 rounded-full w-[92.1%]" /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Z-Score (Fuel)</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">95.0%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full"><div className="h-full bg-purple-500 rounded-full w-[95%]" /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Log Table */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Prediction History</h3>
            <span className="text-xs font-semibold text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {logs.length} Events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">Model / Engine</th>
                  <th className="px-6 py-4 font-semibold">Target Entity</th>
                  <th className="px-6 py-4 font-semibold">Result / Action</th>
                  <th className="px-6 py-4 font-semibold">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Loading AI logs...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No predictions recorded yet.</td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                        {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                          {getModelIcon(log.model_name)} {log.model_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs font-mono">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-800 dark:text-zinc-200 font-medium">
                        {log.prediction_result}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 w-8">
                            {Math.round(log.confidence_score * 100)}%
                          </span>
                          <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${log.confidence_score > 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                              style={{ width: `${log.confidence_score * 100}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
