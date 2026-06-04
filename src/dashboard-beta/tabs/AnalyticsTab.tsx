import React, { useMemo } from "react";
import { Analytics } from "../../components/Analytics";

export function AnalyticsTab({ messages = [], profiles = [], loading = false }: any) {
  const profileMap = useMemo(() => {
    const map: Record<string, any> = {};
    profiles.forEach((p: any) => {
      map[p.id] = p;
    });
    return map;
  }, [profiles]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading analytics data...</div>;
  }

  return (
    <div className="h-full flex flex-col space-y-8 pb-12 overflow-y-auto pr-2 hide-scrollbar">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Advanced Analytics Hub</h2>
        <p className="text-slate-500 font-medium mt-1">Platform engagement and metrics.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
         <Analytics 
           messages={messages} 
           profiles={profileMap} 
           macroProfiles={[]} 
           visits={[]} 
         />
      </div>
    </div>
  );
}
