import React, { useState } from "react";
import { Filter, Clock, MapPin, MoreVertical, Check, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function MessagesTab({ messages = [], loading }: any) {
  const [filterView, setFilterView] = useState("all");

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'new': return 'bg-emerald-500 shadow-emerald-500/30';
      case 'approved': return 'bg-indigo-500 shadow-indigo-500/30';
      case 'archived': return 'bg-slate-300 shadow-none';
      default: return 'bg-amber-500 shadow-amber-500/30';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading messages from server...</div>;

  const displayList = messages.filter((m: any) => {
    if (filterView === "all") return true;
    if (filterView === "needs_review") return !m.isArchived && !m.isValidatedForCarousel;
    if (filterView === "published") return m.isValidatedForCarousel === true;
    return true;
  });

  return (
    <div className="h-full flex flex-col space-y-6 pb-12">
      {/* View Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => setFilterView("all")} className={`px-5 py-2 text-sm font-bold rounded-lg shadow-sm transition-colors ${filterView === "all" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>All ({messages.length})</button>
          <button onClick={() => setFilterView("needs_review")} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${filterView === "needs_review" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>Needs Review</button>
          <button onClick={() => setFilterView("published")} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${filterView === "published" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>Published</button>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 font-semibold text-sm bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={16} className="text-slate-400" /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 font-semibold text-sm bg-indigo-600 border border-transparent text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20">
            Export Selected (0)
          </button>
        </div>
      </div>

      {/* Modern Data Grid */}
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        {/* Helper Header */}
        <div className="grid grid-cols-12 gap-6 p-5 border-b border-slate-100 text-[10px] font-black tracking-widest text-slate-400 uppercase bg-slate-50/50">
          <div className="col-span-1 flex justify-center"><div className="w-4 h-4 border-2 border-slate-300 rounded"></div></div>
          <div className="col-span-6 md:col-span-5">Message Payload</div>
          <div className="col-span-3 hidden md:block">Metadata</div>
          <div className="col-span-4 md:col-span-2">Fingerprint ID</div>
          <div className="col-span-1 md:col-span-1 text-right">Actions</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {displayList.map((msg: any, idx: number) => {
            const dateStr = msg.createdAt ? format(msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt), "dd MMM HH:mm", { locale: it }) : "Unknown";
            const status = msg.isArchived ? "archived" : msg.isValidatedForCarousel ? "approved" : "new";
            const profileDisplay = msg.profileId ? msg.profileId.slice(0, 8).toUpperCase() : "ANONYMOUS";
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                key={msg.id} 
                className={`grid grid-cols-12 gap-6 p-5 border-b border-slate-50 hover:bg-slate-50/80 transition-colors group items-center ${msg.isArchived ? "opacity-60" : ""}`}
              >
                {/* Checkbox */}
                <div className="col-span-1 flex justify-center">
                  <div className="w-5 h-5 border-2 border-slate-200 rounded-md group-hover:border-indigo-400 cursor-pointer overflow-hidden flex items-center justify-center transition-colors">
                  </div>
                </div>

                {/* Content */}
                <div className="col-span-6 md:col-span-5 flex flex-col gap-2 pr-6 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${msg.isAppunti ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                      {msg.isAppunti ? "Appunti" : "Spotted"}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1"><Clock size={12}/>{dateStr}</span>
                  </div>
                  <p className="text-[15px] text-slate-900 font-medium leading-relaxed">{msg.text}</p>
                </div>

                {/* Meta */}
                <div className="col-span-3 hidden md:flex flex-col gap-2.5 border-r border-slate-100">
                  <div className="flex items-center gap-2 text-[13px] text-slate-600 font-medium">
                    <MapPin size={14} className="text-slate-400" /> {msg.locationArea || "Unknown"}
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-slate-600 font-medium uppercase text-[10px] tracking-wider font-bold">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${getStatusStyle(status)}`} />
                    {status}
                  </div>
                </div>

                {/* Profile */}
                <div className="col-span-4 md:col-span-2 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl text-white flex items-center justify-center text-xs font-bold shadow-sm bg-slate-800">
                    {profileDisplay.slice(0,2)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate font-mono">{profileDisplay}</span>
                    <span className="text-[10px] font-bold text-slate-400 truncate tracking-wide mt-0.5">{msg.profileId ? "TRACKED" : "UNTRACKED"}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-2">
                   <div className="hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><Check size={16} /></button>
                      <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                   </div>
                   <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all shadow-sm">
                    <MoreVertical size={16} />
                   </button>
                </div>
              </motion.div>
            );
          })}
          {displayList.length === 0 && (
             <div className="flex-1 flex items-center justify-center text-slate-400 mt-20 font-medium">
               No messages found in this view.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
