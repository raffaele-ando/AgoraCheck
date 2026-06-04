import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Settings, 
  BarChart3, 
  LayoutTemplate,
  Search,
  Bell,
  MoreVertical,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  TrendingUp,
  Activity,
  Smartphone,
  Check,
  X,
  Trash2,
  Globe,
  Monitor,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";

import { OverviewTab } from "./tabs/OverviewTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { ProfilesTab } from "./tabs/ProfilesTab";
import { TemplatesTab } from "./tabs/TemplatesTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { SettingsTab } from "./tabs/SettingsTab";

export default function DashboardBeta() {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Mock data state to bypass Firebase login requirements for UI review
  const [messages, setMessages] = useState<any[]>([
    { id: "M1", isAppunti: false, text: "Ragazzo con la felpa nera oggi in mensa Leonardo, hai un sorriso stupendo...", locationArea: "Leonardo", createdAt: new Date(Date.now() - 1000 * 60 * 10), isArchived: false, isValidatedForCarousel: false, profileId: "AUTO-A1B2C3D4" },
    { id: "M2", isAppunti: true, text: "Cerco riassunti di Analisi 2 disperatamente, pago in spritz.", locationArea: "Milano", createdAt: new Date(Date.now() - 1000 * 60 * 60), isArchived: false, isValidatedForCarousel: true, profileId: "AUTO-X9M1P2L3" },
    { id: "M3", isAppunti: false, text: "Ragazza bionda al bar principale, eri bellissima...", locationArea: "Bovisa", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), isArchived: false, isValidatedForCarousel: true, profileId: "IG-mario_rossi" },
    { id: "M4", isAppunti: false, text: "Per il signore che mi ha aiutato a rialzare la bici in Piola. Grazie infinite!", locationArea: "Città Studi", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), isArchived: true, isValidatedForCarousel: false, profileId: "AUTO-Z7L4K5J6" },
  ]);
  const [profiles, setProfiles] = useState<any[]>([
     { id: "AUTO-A1B2C3D4", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)", suspectNames: ["@michele_"], messageIds: ["M1"] },
     { id: "IG-mario_rossi", userAgent: "Instagram/300.0.0.0.0", messageIds: ["M3"] },
  ]);
  const [loading, setLoading] = useState(false);

  // No effect needed since we are mocking data to bypass Firebase auth
  
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-800 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-white border-r border-slate-100 flex flex-col pb-6 md:pb-0 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-10 hidden md:flex">
        <div className="p-6 shrink-0 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">Agora<span className="text-indigo-600">.</span></span>
        </div>
        
        <div className="px-4 flex-1 overflow-y-auto pt-2 space-y-1 hide-scrollbar">
          <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase px-2 mb-3 mt-4">Workspace</div>
          <NavItem id="overview" label="Overview" icon={<LayoutDashboard size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="messages" label="Messages" icon={<MessageSquare size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} badge={14} />
          <NavItem id="profiles" label="Identities" icon={<Users size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase px-2 mb-3 mt-8">Studio Tools</div>
          <NavItem id="templates" label="Templates" icon={<LayoutTemplate size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
          <NavItem id="analytics" label="Analytics" icon={<BarChart3 size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase px-2 mb-3 mt-8">System</div>
          <NavItem id="settings" label="Settings" icon={<Settings size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        
        <div className="p-4 mt-auto shrink-0 border-t border-slate-100/60">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-600">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">Admin Workspace</div>
              <div className="text-[11px] font-medium text-slate-500 truncate">Superuser Mode</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FAFAFA]">
        {/* Top Header */}
        <header className="h-[72px] shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight capitalize text-slate-900">
              {activeTab === "overview" ? "Dashboard" : activeTab}
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live System
            </span>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search across workspace..." 
                className="w-72 pl-9 pr-4 py-2 rounded-xl bg-slate-100/50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <kbd className="hidden lg:inline-flex items-center justify-center px-1.5 h-5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">⌘</kbd>
                <kbd className="hidden lg:inline-flex items-center justify-center px-1.5 h-5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">K</kbd>
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-[1400px] mx-auto h-full"
            >
              {activeTab === "overview" && <OverviewTab messages={messages} profiles={profiles} loading={loading} />}
              {activeTab === "messages" && <MessagesTab messages={messages} loading={loading} />}
              {activeTab === "profiles" && <ProfilesTab profiles={profiles} loading={loading} />}
              {activeTab === "templates" && <TemplatesTab messages={messages} />}
              {activeTab === "analytics" && <AnalyticsTab messages={messages} profiles={profiles} loading={loading} />}
              {activeTab === "settings" && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Navigation Item --- //

function NavItem({ id, label, icon, activeTab, setActiveTab, badge }: any) {
  const active = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group font-medium ${
        active 
          ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"} transition-colors`}>
          {icon}
        </span>
        <span className="text-sm">{label}</span>
      </div>
      {badge && badge > 0 && (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
          active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

