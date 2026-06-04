import React from "react";
import AppSettings from "../../components/AppSettings";

export function SettingsTab() {
  return (
    <div className="h-full flex flex-col space-y-6 pb-12 overflow-y-auto pr-2 hide-scrollbar">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration</h2>
        <p className="text-slate-500 font-medium mt-1">Manage global flags and widget rules.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] max-w-4xl">
         <AppSettings isSuperAdmin={true} mockMode={true} />
      </div>
    </div>
  );
}
