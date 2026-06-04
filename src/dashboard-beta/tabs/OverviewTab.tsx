import React from "react";
import { MessageSquare, Users, Activity, TrendingUp } from "lucide-react";

export function OverviewTab({ messages = [], profiles = [], loading }: any) {
  if (loading) return <div className="p-8 text-center text-slate-500">Loading intelligence...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Messages" value={messages.length} trend="+12.5%" icon={<MessageSquare size={22} />} />
        <StatCard title="Tracked Identities" value={profiles.length} trend="+5.2%" icon={<Users size={22} />} />
        <StatCard title="Active Engagements" value="3,450" trend="-1.4%" trendDown icon={<Activity size={22} />} />
        <StatCard title="Conversion Rate" value="68.2%" trend="+4.1%" icon={<TrendingUp size={22} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Traffic Intelligence</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Aggregated platform engagement over time.</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-sm px-4 py-2 rounded-xl font-semibold text-slate-700 outline-none hover:bg-slate-100 cursor-pointer transition-colors">
              <option>Last 14 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="h-72 w-full flex items-end gap-3 justify-between mt-12 relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              {[1,2,3,4,5].map(i => <div key={i} className="w-full h-px bg-slate-300"></div>)}
            </div>
            {/* Bars */}
            {[40, 70, 45, 90, 65, 85, 100, 50, 60, 40, 80, 75, 40, 55].map((h, i) => (
              <div key={i} className="w-full bg-indigo-50 rounded-t-md relative group cursor-pointer" style={{ height: `${h}%` }}>
                <div className="absolute bottom-0 w-full bg-indigo-500 rounded-t-md transition-all duration-300 group-hover:bg-indigo-400 group-hover:-translate-y-1" style={{ height: `${h * 0.6}%` }}></div>
                {/* Tooltip hover */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                   {h * 10} Views
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Feed */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Live Feed</h3>
            <span className="flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 hide-scrollbar">
            {messages.slice(0, 6).map((msg: any) => (
              <div key={msg.id} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                  <MessageSquare size={16} />
                </div>
                <div className="pt-1">
                  <p className="text-sm text-slate-700 leading-snug"><span className="font-bold text-slate-900 line-clamp-1">{msg.text || "Message payload"}</span></p>
                  <span className="text-[11px] font-medium text-slate-400">Captured live</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendDown, icon }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-slate-300 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] group">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
          {icon}
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border ${trendDown ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
          {trendDown ? <TrendingUp size={12} className="rotate-180" /> : <TrendingUp size={12} />}
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-500 mb-2">{title}</h4>
        <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
      </div>
    </div>
  );
}
