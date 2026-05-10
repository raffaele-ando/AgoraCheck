import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { X, Clock, Monitor, MapPin, Instagram, Cpu, User as UserIcon, ArrowRight, ChevronRight, Activity, Globe } from 'lucide-react';

interface AnalyticsProps {
  messages: any[];
  profiles: Record<string, any>;
  macroProfiles: any[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

const getPlatform = (m: any) => {
  const ua = m.deviceInfo?.userAgent || '';
  const platform = m.deviceInfo?.platform || 'Sconosciuto';
  const adv = (m as any).parsedAdvanced;
  
  const platformLower = platform.toLowerCase();
  const uaLower = ua.toLowerCase();
  
  const maxTouches = adv?.hardware?.maxTouchPoints || (adv?.h?.maxTouchPoints) || 0;
  const isTouch = adv?.hardware?.touchSupport || (adv?.h?.touchSupport) || maxTouches > 0;
  
  // Rilevamento iPad: esplicito o tramite Mac con touch support
  const isExplicitIpad = platformLower.includes('ipad') || uaLower.includes('ipad');
  const isIpadMaskedAsMac = platformLower.includes('mac') && isTouch;
  
  if (isExplicitIpad || isIpadMaskedAsMac) return 'iPadOS';
  if (platformLower.includes('iphone') || uaLower.includes('iphone')) return 'iOS';
  if (platformLower.includes('mac') || uaLower.includes('mac')) return 'macOS';
  if (platformLower.includes('win') || uaLower.includes('windows')) return 'Windows';
  if (platformLower.includes('android') || uaLower.includes('android')) return 'Android';
  
  return 'Altro';
};

const getBrowser = (m: any) => {
  const ua = m.deviceInfo?.userAgent || '';
  const isIg = ua.includes('Instagram');
  return isIg ? 'Instagram In-App' :
               ua.includes('Chrome') ? 'Chrome' :
               ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
               ua.includes('Firefox') ? 'Firefox' : 'Altro';
};

type DetailView = {
  title: string;
  type: 'messages' | 'profiles' | 'macro';
  data: any[];
} | null;

export const Analytics: React.FC<AnalyticsProps> = ({ messages, profiles, macroProfiles }) => {
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [isReady, setIsReady] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const totalViews = messages.length;
    const uniqueDevices = Object.keys(profiles).length;
    const identifiedUsers = macroProfiles.length;
    const spottedMessages = messages.filter(m => m.lookingFor).length;

    // Traffic by Date
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), 13 - i));
      return { _date: d, date: format(d, 'dd/MM'), views: 0, actions: 0 };
    });

    // Browser/Platform
    const platforms: Record<string, number> = {};
    const browsers: Record<string, number> = {};

    messages.forEach(m => {
      if (m.createdAt) {
        const d = startOfDay(m.createdAt.toDate()).getTime();
        const dayStat = last14Days.find(day => day._date.getTime() === d);
        if (dayStat) {
          dayStat.views += 1;
          if (m.lookingFor) dayStat.actions += 1;
        }
      }

      const pKey = getPlatform(m);
      platforms[pKey] = (platforms[pKey] || 0) + 1;

      const bKey = getBrowser(m);
      browsers[bKey] = (browsers[bKey] || 0) + 1;
    });

    const platformData = Object.entries(platforms).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const browserData = Object.entries(browsers).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    return {
      totalViews,
      uniqueDevices,
      identifiedUsers,
      spottedMessages,
      trafficData: last14Days,
      platformData,
      browserData
    };
  }, [messages, profiles, macroProfiles]);

  const kpis = [
    { label: "Totale Avvistamenti", value: stats.totalViews, bg: "bg-indigo-50", text: "text-indigo-600", border: 'group-hover:border-indigo-200', onClick: () => setDetailView({ title: 'Totale Avvistamenti', type: 'messages', data: messages }) },
    { label: "Spotted Effettuati", value: stats.spottedMessages, bg: "bg-emerald-50", text: "text-emerald-600", border: 'group-hover:border-emerald-200', onClick: () => setDetailView({ title: 'Spotted Effettuati', type: 'messages', data: messages.filter(m => m.lookingFor) }) },
    { label: "Dispositivi Unici", value: stats.uniqueDevices, bg: "bg-orange-50", text: "text-orange-600", border: 'group-hover:border-orange-200', onClick: () => setDetailView({ title: 'Dispositivi Unici', type: 'profiles', data: Object.entries(profiles).map(([id, doc]) => ({ id, ...doc })) }) },
    { label: "Identità Unificate", value: stats.identifiedUsers, bg: "bg-purple-50", text: "text-purple-600", border: 'group-hover:border-purple-200', onClick: () => setDetailView({ title: 'Identità Unificate', type: 'macro', data: macroProfiles }) },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={kpi.label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }} 
            onClick={kpi.onClick}
            className="group bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden relative"
          >
             <div className="relative z-10 flex flex-col items-start">
               <div className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${kpi.text} mb-3 inline-flex items-center justify-center px-3 py-1.5 rounded-xl ${kpi.bg}`}>
                 {kpi.label}
               </div>
               <div className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight group-hover:scale-[1.02] transition-transform transform origin-left">{kpi.value.toLocaleString()}</div>
             </div>
             
             <div className={`relative z-10 mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-gray-400 ${kpi.text} transition-colors`}>
               <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Vedi dettagli</span>
               <ArrowRight className={`w-4 h-4 transform group-hover:translate-x-1 border border-transparent ${kpi.border} rounded-full transition-all`} />
             </div>

             {/* Background Decoration */}
             <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${kpi.bg} opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none`}></div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
           <div className="flex items-center justify-between mb-8">
             <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-800 flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                 <Activity className="w-5 h-5 text-indigo-600" />
               </div>
               Andamento Traffico
             </h3>
             <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl">Ultimi 14 Giorni</span>
           </div>
           
           <div className="h-[250px] sm:h-[350px] w-full flex-1">
             {isReady && (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={stats.trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                       <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
                   <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dy={15} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dx={-10} />
                   <RechartsTooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                     cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                   />
                   <Area type="monotone" dataKey="views" name="Accessi Totali" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                   <Area type="monotone" dataKey="actions" name="Spotted Effettuati" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorActions)" />
                 </AreaChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>

        <div className="flex flex-col gap-6 md:gap-8">
           <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col flex-1 relative group overflow-hidden">
             <h3 className="text-sm font-black uppercase tracking-tight text-gray-800 mb-6 sticky z-10 flex items-center gap-2.5">
               Sistemi Operativi
             </h3>
             <div className="h-[180px] sm:h-[200px] w-full relative z-10">
               {isReady && (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie 
                       data={stats.platformData} 
                       cx="50%" cy="50%" 
                       innerRadius={60} 
                       outerRadius={80} 
                       paddingAngle={5} 
                       dataKey="value"
                       className="cursor-pointer focus:outline-none transition-transform hover:scale-105 duration-300"
                       onClick={(data) => setDetailView({ title: `Piattaforma: ${data.name}`, type: 'messages', data: messages.filter(m => getPlatform(m) === data.name) })}
                     >
                       {stats.platformData.map((entry, index) => (
                         <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                   </PieChart>
                 </ResponsiveContainer>
               )}
             </div>
             <div className="flex flex-wrap gap-2 justify-center mt-6 relative z-10 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {stats.platformData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-1.5 text-xs text-gray-700 font-bold tracking-wide bg-white px-2.5 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    {p.name} <span className="text-gray-400 font-medium">({p.value})</span>
                  </div>
                ))}
             </div>
           </div>

           <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col flex-1">
             <h3 className="text-sm font-black uppercase tracking-tight text-gray-800 mb-6 flex items-center gap-2.5">
               Sorgente Accessi (Browser)
             </h3>
             <div className="h-[200px] sm:h-[220px] w-full mt-2">
               {isReady && (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.browserData} layout="vertical" margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 'bold' }} width={100} />
                      <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                      <Bar 
                        dataKey="value" 
                        name="Visite" 
                        fill="#8b5cf6" 
                        radius={[0, 6, 6, 0]}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(data) => setDetailView({ title: `Sorgente: ${data.name}`, type: 'messages', data: messages.filter(m => getBrowser(m) === data.name) })}
                      >
                        {stats.browserData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={COLORS[stats.browserData.indexOf(entry) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               )}
             </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {detailView && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex justify-center items-end md:items-center p-0 md:p-6">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 1 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 50, scale: 1 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-gray-50 rounded-t-[2rem] md:rounded-[2rem] shadow-2xl w-full max-w-6xl h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 md:p-8 border-b border-gray-200/60 bg-white z-20 shrink-0">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                    {detailView.title} 
                    <span className="text-xs md:text-sm font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">{detailView.data.length}</span>
                  </h2>
                  <p className="text-[11px] md:text-xs text-gray-500 font-semibold tracking-wide uppercase">Dettaglio statistica per la voce selezionata</p>
                </div>
                <button 
                  onClick={() => setDetailView(null)} 
                  className="w-10 h-10 flex flex-col items-center justify-center bg-gray-100 hover:bg-gray-200 hover:text-red-500 rounded-full text-gray-500 transition-all active:scale-95 shrink-0 ml-4"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-0 flex-1 overflow-auto bg-gray-50 relative pb-10 md:pb-0">
                
                {/* MESSAGES VIEW */}
                {detailView.type === 'messages' && (
                  <div className="flex flex-col w-full">
                    {/* Desktop Table View */}
                    <div className="hidden md:block p-8">
                      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm text-gray-600 border-collapse">
                          <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs tracking-widest border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4">Data</th>
                              <th className="px-6 py-4 w-1/3">Spotted</th>
                              <th className="px-6 py-4">Informazioni Tecniche</th>
                              <th className="px-6 py-4 text-center">Sistema</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {detailView.data.map((m) => (
                              <tr key={m.id} className="hover:bg-indigo-50/40 transition-colors">
                                <td className="px-6 py-5 font-bold text-gray-800 whitespace-nowrap">
                                  {m.createdAt ? format(m.createdAt.toDate(), "dd/MM/yy HH:mm") : "-"}
                                </td>
                                <td className="px-6 py-5">
                                  {m.lookingFor ? (
                                    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                                      <div className="font-black text-gray-800 mb-1 leading-relaxed">"{m.lookingFor}"</div>
                                      <div className="text-xs font-semibold text-gray-500 flex gap-3">
                                        {m.where && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400"/> {m.where}</span>}
                                        {m.when && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400"/> {m.when}</span>}
                                      </div>
                                      {m.instagram && <div className="text-xs text-pink-600 font-bold mt-2 pt-2 border-t border-gray-50 flex items-center gap-1.5"><Instagram className="w-3 h-3"/> @{m.instagram}</div>}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic font-medium">✨ Solo visualizzazione (Nessun messaggio)</span>
                                  )}
                                </td>
                                <td className="px-6 py-5 min-w-[200px]">
                                  <div className="flex flex-col gap-2">
                                    {m.deviceInfo?.location && (
                                      <div className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 w-max font-bold">
                                        <MapPin className="w-3.5 h-3.5" /> {m.deviceInfo.location.city}, {m.deviceInfo.location.country}
                                      </div>
                                    )}
                                    {(() => {
                                      const adv = m.parsedAdvanced;
                                      const ip = adv?.network?.ip || adv?.n?.ip;
                                      if (!ip) return null;
                                      return <div className="text-[11px] font-mono bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1.5 rounded-lg w-max font-bold flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> IP: {ip}</div>;
                                    })()}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-xl font-black w-24 text-center">{getPlatform(m)}</span>
                                    <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-xl font-black w-24 text-center">{getBrowser(m)}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden flex flex-col p-4 gap-4">
                      {detailView.data.map((m) => (
                        <div key={m.id} className="flex flex-col p-5 bg-white rounded-[1.5rem] border border-gray-200 shadow-sm gap-4">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                            <span className="text-xs font-black text-gray-800 bg-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-500" /> {m.createdAt ? format(m.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "-"}
                            </span>
                            <div className="flex gap-1.5">
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">{getPlatform(m)}</span>
                              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">{getBrowser(m)}</span>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                            {m.lookingFor ? (
                              <div className="flex flex-col">
                                <div className="font-black text-gray-900 text-sm leading-relaxed mb-3">"{m.lookingFor}"</div>
                                <div className="text-[11px] font-bold text-gray-500 flex flex-wrap gap-x-4 gap-y-2">
                                  {m.where && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {m.where}</span>}
                                  {m.when && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {m.when}</span>}
                                </div>
                                {m.instagram && <div className="text-[11px] bg-pink-50 text-pink-700 border border-pink-100 px-2.5 py-1.5 rounded-xl font-black mt-4 self-start flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5"/> @{m.instagram}</div>}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic font-semibold text-center py-2">✨ Visita senza account o messaggio</div>
                            )}
                          </div>
                          
                          {(m.deviceInfo?.location || (() => { const adv = m.parsedAdvanced; return adv?.network?.ip || adv?.n?.ip; })()) && (
                            <div className="flex flex-wrap gap-2">
                              {m.deviceInfo?.location && (
                                <div className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold">
                                  <MapPin className="w-3 h-3" /> {m.deviceInfo.location.city}, {m.deviceInfo.location.country}
                                </div>
                              )}
                              {(() => {
                                const adv = m.parsedAdvanced;
                                const ip = adv?.network?.ip || adv?.n?.ip;
                                if (!ip) return null;
                                return <div className="text-[10px] font-mono bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold"><Monitor className="w-3 h-3" /> IP: {ip}</div>;
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* PROFILES VIEW */}
                {detailView.type === 'profiles' && (
                  <div className="flex flex-col w-full">
                    <div className="hidden md:block p-8">
                      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm text-gray-600 border-collapse">
                          <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs tracking-widest border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4">Identità Profilo</th>
                              <th className="px-6 py-4 text-center">Frequenza</th>
                              <th className="px-6 py-4 w-1/2">Cronologia Spotted Recenti</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {detailView.data.map(p => {
                              const userMessages = messages.filter(m => m.computedProfileId === p.id);
                              const searchMessages = userMessages.filter(m => m.lookingFor);
                              return (
                              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-white font-bold shadow-inner shrink-0" style={{ backgroundColor: p.color || '#9ca3af' }}>
                                      <UserIcon className="w-6 h-6"/>
                                    </div>
                                    <div>
                                      <div className="font-black text-gray-900 text-base">{p.name || 'Senza Nome'}</div>
                                      <div className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded mt-1.5 inline-block">{p.id}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className="text-sm font-black px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl">
                                    {userMessages.length} accessi registrati
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  {searchMessages.length > 0 ? (
                                    <div className="space-y-2.5 w-full">
                                      {searchMessages.slice(0, 3).map(sm => (
                                        <div key={sm.id} className="text-xs bg-white text-gray-800 p-3 rounded-xl border border-gray-200 font-bold shadow-sm">"{sm.lookingFor}"</div>
                                      ))}
                                      {searchMessages.length > 3 && <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 px-2 pt-2 text-center w-full block">+{searchMessages.length - 3} spotted nascosti</div>}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 block w-max">Nessuno spotted pubblicato</span>
                                  )}
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="md:hidden flex flex-col p-4 gap-4">
                      {detailView.data.map(p => {
                        const userMessages = messages.filter(m => m.computedProfileId === p.id);
                        const searchMessages = userMessages.filter(m => m.lookingFor);
                        return (
                          <div key={p.id} className="flex flex-col p-5 bg-white rounded-[1.5rem] border border-gray-200 shadow-sm gap-4">
                            <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
                              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-inner" style={{ backgroundColor: p.color || '#9ca3af' }}>
                                <UserIcon className="w-7 h-7"/>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-black text-gray-900 text-base truncate">{p.name || 'Senza Nome'}</div>
                                <div className="text-[10px] font-bold font-mono bg-gray-50 border border-gray-200 text-gray-500 rounded px-2.5 py-1 mt-1.5 truncate inline-block">{p.id}</div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col bg-gray-50 p-4 rounded-2xl border border-gray-100 gap-3 text-center">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Accessi Registrati</span>
                              <span className="text-2xl font-black text-indigo-600 block">{userMessages.length}</span>
                            </div>
                            
                            <div className="flex flex-col gap-3 pt-2">
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg w-max border border-indigo-100">Ultimi Spotted</span>
                              {searchMessages.length > 0 ? (
                                <div className="space-y-2 mt-1">
                                  {searchMessages.slice(0, 3).map(sm => (
                                    <div key={sm.id} className="text-[11px] bg-white text-gray-800 p-3.5 rounded-xl border border-gray-200 shadow-sm font-bold leading-relaxed">"{sm.lookingFor}"</div>
                                  ))}
                                  {searchMessages.length > 3 && <div className="text-[10px] text-indigo-600 font-bold text-center py-2 tracking-widest uppercase">+{searchMessages.length - 3} spotted nascosti</div>}
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center block">Nessun messaggio spot</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* MACRO PROFILES VIEW */}
                {detailView.type === 'macro' && (
                  <div className="flex flex-col w-full">
                    <div className="hidden md:block p-8">
                      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm text-gray-600 border-collapse">
                          <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs tracking-widest border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4">Macro Profilo Condiviso</th>
                              <th className="px-6 py-4 w-1/2">Sub-Identità e IP Tracciati</th>
                              <th className="px-6 py-4 text-right">Ultima Acquisizione</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {detailView.data.map(m => {
                              const relatedMsgs = messages.filter(msg => m.profileIds?.includes(msg.computedProfileId || msg.profileId) || msg.profileGroupId === m.id);
                              let mostRecentMsg: any = null;
                              const ips = new Set<string>();
                              relatedMsgs.forEach(msg => {
                                if (msg.createdAt && (!mostRecentMsg?.createdAt || msg.createdAt.toMillis() > mostRecentMsg.createdAt.toMillis())) {
                                  mostRecentMsg = msg;
                                }
                                const adv = msg.parsedAdvanced || null;
                                const ip = adv ? (adv.network?.ip || adv.n?.ip) : null;
                                if (ip) ips.add(ip);
                              });
                              const uniqueIPs = Array.from(ips);
                              return (
                              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-5">
                                   <div className="font-black text-gray-900 text-base mb-2 flex items-center gap-2">
                                     {m.name || 'Identità Nascosta'}
                                   </div>
                                   {m.profileIds.length > 1 && <div className="text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg inline-block uppercase tracking-wider border border-purple-100">Unione di {m.profileIds.length} Modelli Padrone</div>}
                                </td>
                                <td className="px-6 py-5">
                                   <div className="flex flex-col gap-3">
                                     <div className="flex flex-wrap gap-2">
                                        {m.profileIds.map((pid: string) => (
                                          <span key={pid} className="text-[11px] font-bold font-mono bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-sm text-gray-600 flex items-center gap-1.5">
                                            <Monitor className="w-3.5 h-3.5 text-gray-400" />
                                            {pid.substring(0,12)}...
                                          </span>
                                        ))}
                                     </div>
                                     {uniqueIPs.length > 0 && (
                                       <div className="flex flex-wrap gap-2 mt-1">
                                          {uniqueIPs.map(ip => (
                                            <span key={ip} className="text-[11px] font-bold font-mono bg-orange-50 text-orange-700 px-2.5 py-1 sm:py-1.5 rounded-xl border border-orange-100 shadow-sm flex items-center gap-1.5">
                                              <Globe className="w-3.5 h-3.5 text-orange-500" />
                                              {ip}
                                            </span>
                                          ))}
                                       </div>
                                     )}
                                   </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                   <span className="text-[11px] font-bold text-gray-800 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl whitespace-nowrap">{mostRecentMsg?.createdAt ? format(mostRecentMsg.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "Sconosciuto"}</span>
                                </td>
                              </tr>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="md:hidden flex flex-col p-4 gap-4">
                      {detailView.data.map(m => {
                        const relatedMsgs = messages.filter(msg => m.profileIds?.includes(msg.computedProfileId || msg.profileId) || msg.profileGroupId === m.id);
                        let mostRecentMsg: any = null;
                        const ips = new Set<string>();
                        relatedMsgs.forEach(msg => {
                          if (msg.createdAt && (!mostRecentMsg?.createdAt || msg.createdAt.toMillis() > mostRecentMsg.createdAt.toMillis())) {
                            mostRecentMsg = msg;
                          }
                          const adv = msg.parsedAdvanced || null;
                          const ip = adv ? (adv.network?.ip || adv.n?.ip) : null;
                          if (ip) ips.add(ip);
                        });
                        const uniqueIPs = Array.from(ips);
                        return (
                        <div key={m.id} className="flex flex-col p-5 bg-white rounded-[1.5rem] border border-gray-200 shadow-sm gap-4">
                          <div className="flex flex-col border-b border-gray-50 pb-4">
                             <div className="font-black text-gray-900 text-xl">{m.name || 'Identità Nascosta'}</div>
                             {m.profileIds.length > 1 && <div className="text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-lg inline-block w-max border border-purple-100 mt-2.5 uppercase tracking-widest">Condivide {m.profileIds.length} Identità</div>}
                          </div>
                          
                          <div className="bg-gray-50/80 p-4 flex flex-col gap-3 rounded-2xl border border-gray-100">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5"/> Dispositivi Collegati</span>
                            <div className="flex flex-wrap gap-2">
                              {m.profileIds.map((pid: string) => (
                                <span key={pid} className="text-[10px] font-bold font-mono bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 shadow-sm flex items-center gap-1">
                                  {pid.substring(0,10)}...
                                </span>
                              ))}
                            </div>
                            
                            {uniqueIPs.length > 0 && (
                              <>
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5 mt-2"><Globe className="w-3.5 h-3.5"/> IP Tracciati</span>
                                <div className="flex flex-wrap gap-2">
                                  {uniqueIPs.map(ip => (
                                    <span key={ip} className="text-[10px] font-bold font-mono bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl border border-orange-100 shadow-sm flex items-center gap-1">
                                      {ip}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ultima acquisizione</span>
                            <span className="text-xs font-black text-gray-800 bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {mostRecentMsg?.createdAt ? format(mostRecentMsg.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "-"}
                            </span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
