import React from "react";
import { Monitor, Globe } from "lucide-react";
import { format } from "date-fns";

export function ProfilesTab({ profiles = [], loading }: any) {
  if (loading) return <div className="p-8 text-center text-slate-500">Loading identities...</div>;

  return (
    <div className="h-full flex flex-col space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">Identity Nexus</h2>
           <p className="text-slate-500 font-medium mt-1">Fingerprint analysis and behavioral tracking.</p>
        </div>
        <button className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all text-sm">
          Export Audit Log
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 pb-8 hide-scrollbar">
         {profiles.map((profile: any) => {
            const shortId = profile.id.slice(0, 8).toUpperCase();
            const initial = shortId.charAt(0);
            const isSuspect = (profile.suspectNames && profile.suspectNames.length > 0) || (profile.customInstagrams && profile.customInstagrams.length > 0);
            
            return (
              <div key={profile.id} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6 flex-1">
                  <div className="flex gap-4 items-center">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-bold text-xl border-2 ${isSuspect ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-indigo-100 text-indigo-600 border-indigo-200'}`}>
                        {initial}
                     </div>
                     <div className="min-w-0">
                        <div className="font-mono font-black text-lg text-slate-900 truncate" title={profile.id}>{shortId}</div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                          {isSuspect ? (
                             <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded">Suspect match</span>
                          ) : (
                             <span className="px-2 py-0.5 bg-slate-100 rounded">Clean profile</span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-100 rounded">Messaggi: {profile.messageIds?.length || 0}</span>
                        </div>
                     </div>
                  </div>
                </div>
                
                <div className="space-y-4 shrink-0">
                   <div className="flex items-center justify-between text-sm py-2 group cursor-pointer">
                      <div className="flex items-center gap-3 text-slate-600 font-medium whitespace-nowrap">
                         <Monitor size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" /> <span className="truncate max-w-[120px]">UA & Canvas</span>
                      </div>
                      <div className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate max-w-[120px]" title={profile.userAgent}>
                        {profile.userAgent ? profile.userAgent.slice(0,16) + '...' : 'Unknown'}
                      </div>
                   </div>
                   
                   <div className="flex items-center justify-between text-sm py-2 group cursor-pointer border-t border-slate-50">
                      <div className="flex items-center gap-3 text-slate-600 font-medium">
                         <Globe size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> Network Context
                      </div>
                      <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        Active Tracker
                      </div>
                   </div>
                   
                   {isSuspect && (
                     <div className="pt-4 border-t border-slate-100">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Identified Handles</p>
                       <div className="flex flex-wrap gap-1.5">
                          {(profile.customInstagrams || []).map((ig: string) => (
                             <span key={ig} className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-1 rounded-md">@{ig}</span>
                          ))}
                          {(profile.suspectNames || []).map((name: string) => (
                             <span key={name} className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-md">{name}</span>
                          ))}
                       </div>
                     </div>
                   )}
                </div>
              </div>
            );
         })}
      </div>
    </div>
  );
}
