/**
 * JobTrack Pro — Frontend Dashboard Application
 * 
 * Features:
 * - HTML5 + Tailwind CSS for responsive styling with Light & Dark Mode support
 * - React 18 for reactive UI state, modals, filters, and dynamic updates
 * - Applied / Candidate Name prominently displayed across Dashboard, Header, Table, & Profile
 * - FastAPI RESTful Backend integration
 */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

// =============================================================================
// API Service Helper Functions
// =============================================================================

const API_BASE = ""; // Relative URL, connects to same host/port serving FastAPI

const api = {
  // System & Metadata
  getHealth: () => fetch(`${API_BASE}/api/health`).then(res => res.json()),
  getMeta: () => fetch(`${API_BASE}/api/meta`).then(res => res.json()),
  getDashboard: () => fetch(`${API_BASE}/api/dashboard`).then(res => res.json()),

  // Applications
  getApplications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.status && params.status !== "All") query.append("status", params.status);
    if (params.job_type && params.job_type !== "All") query.append("job_type", params.job_type);
    return fetch(`${API_BASE}/api/applications?${query.toString()}`).then(res => res.json());
  },
  getApplicationById: (id) => fetch(`${API_BASE}/api/applications/${id}`).then(res => res.json()),
  createApplication: (data) =>
    fetch(`${API_BASE}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create application");
      }
      return res.json();
    }),
  updateApplication: (id, data) =>
    fetch(`${API_BASE}/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update application");
      }
      return res.json();
    }),
  deleteApplication: (id) =>
    fetch(`${API_BASE}/api/applications/${id}`, { method: "DELETE" }).then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to delete application");
      }
      return res.json();
    }),

  // Interviews
  getInterviews: () => fetch(`${API_BASE}/api/interviews`).then(res => res.json()),
  scheduleInterview: (data) =>
    fetch(`${API_BASE}/api/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to schedule interview");
      }
      return res.json();
    }),
  recordOutcome: (appId, interviewId, data) =>
    fetch(`${API_BASE}/api/interviews/${appId}/${interviewId}/outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to record outcome");
      }
      return res.json();
    }),
  cancelInterview: (appId, interviewId, reason = "") =>
    fetch(`${API_BASE}/api/interviews/${appId}/${interviewId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to cancel interview");
      }
      return res.json();
    }),

  // Reminders & Analytics
  getReminders: (days) => {
    const url = days ? `${API_BASE}/api/reminders?days=${days}` : `${API_BASE}/api/reminders`;
    return fetch(url).then(res => res.json());
  },
  getAnalytics: () => fetch(`${API_BASE}/api/analytics`).then(res => res.json()),

  // Settings
  getSettings: () => fetch(`${API_BASE}/api/settings`).then(res => res.json()),
  updateSettings: (data) =>
    fetch(`${API_BASE}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  // Sample Data Seed
  seedSampleData: () =>
    fetch(`${API_BASE}/api/seed-sample-data`, { method: "POST" }).then(res => res.json()),
};

// =============================================================================
// Helper Component: SVG Icons
// =============================================================================

function Icon({ name, className = "w-5 h-5" }) {
  switch (name) {
    case "briefcase":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "chart":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "bell":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case "download":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case "plus":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      );
    case "external-link":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      );
    case "edit":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case "trash":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      );
    case "x":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case "sparkles":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    case "sun":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "moon":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    case "user":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return null;
  }
}

// Status Badges with Light & Dark Mode support
function StatusBadge({ status }) {
  const getBadgeStyle = (st) => {
    switch (st) {
      case "Applied":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60";
      case "Assessment":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60";
      case "Interview":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60";
      case "Offer Received":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60";
      case "Selected":
        return "bg-green-50 text-green-700 border-green-200 font-semibold dark:bg-green-950/60 dark:text-green-300 dark:border-green-800/60";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60";
      case "Withdrawn":
        return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {status}
    </span>
  );
}

// Outcome Badges for Interviews
function OutcomeBadge({ outcome }) {
  if (outcome === "Passed") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/50">Passed</span>;
  }
  if (outcome === "Failed") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border dark:border-rose-800/50">Failed</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-800/50">Pending</span>;
}


// =============================================================================
// Main App Component
// =============================================================================

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, applications, interviews, reminders, analytics, exports, settings

  // Dark Mode State with LocalStorage Persistence
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("jobtrack_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (e) {
      return false;
    }
  });

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("jobtrack_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("jobtrack_theme", "light");
    }
  };

  // Sync HTML tag class on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Core Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [reminders, setReminders] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [settings, setSettings] = useState(null);
  const [applicantName, setApplicantName] = useState("Naga Chiranjeevi");

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobTypeFilter, setJobTypeFilter] = useState("All");

  // Loading & Network States
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(true);

  // Modals & Drawers
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [detailApp, setDetailApp] = useState(null);
  
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [targetAppForInterview, setTargetAppForInterview] = useState(null);

  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [targetInterviewForOutcome, setTargetInterviewForOutcome] = useState(null);

  const [deleteConfirmApp, setDeleteConfirmApp] = useState(null);
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);

  // Notification Toast State
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Initial Data Fetch
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, apps, ivs, rems, meta, sett] = await Promise.all([
        api.getDashboard(),
        api.getApplications({ search: searchQuery, status: statusFilter, job_type: jobTypeFilter }),
        api.getInterviews(),
        api.getReminders(),
        api.getMeta(),
        api.getSettings(),
      ]);

      setDashboardData(dash);
      setApplications(apps);
      setInterviews(ivs);
      setReminders(rems);
      setMetadata(meta);
      setSettings(sett);
      if (dash.applicant_name) {
        setApplicantName(dash.applicant_name);
      }
      setServerOnline(true);
    } catch (err) {
      console.error("API connection failed:", err);
      setServerOnline(false);
      showToast("Could not connect to FastAPI server. Make sure server is running on port 8000.", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, jobTypeFilter]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Seeding Sample Data
  const handleSeedData = async () => {
    try {
      const res = await api.seedSampleData();
      showToast(res.message, "success");
      await loadAllData();
    } catch (err) {
      showToast("Error loading demo data: " + err.message, "error");
    }
  };

  // Calculations for Urgent Alerts
  const totalAlertCount = useMemo(() => {
    if (!reminders) return 0;
    return (reminders.interviews_today?.length || 0) + (reminders.overdue_deadlines?.length || 0);
  }, [reminders]);

  // Get Initials for Candidate Avatar
  const candidateInitials = useMemo(() => {
    if (!applicantName) return "NC";
    return applicantName
      .split(" ")
      .map(part => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  }, [applicantName]);

  return (
    <div className="h-full flex overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${
            toast.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800"
          }`}>
            <Icon name={toast.type === "error" ? "x" : "check"} className="w-5 h-5 flex-shrink-0" />
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 flex flex-col justify-between flex-shrink-0 border-r border-slate-800 select-none">
        <div>
          {/* Brand Logo Header */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
              <Icon name="briefcase" className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight">JobTrack</span>
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">PRO</span>
            </div>
          </div>

          {/* Candidate Profile Widget in Sidebar */}
          <div className="mx-3 my-3 p-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow">
              {candidateInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{applicantName}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active Candidate
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: "chart" },
              { id: "applications", label: "Applications", icon: "briefcase", count: applications.length },
              { id: "interviews", label: "Interviews", icon: "calendar", count: interviews.length },
              { id: "reminders", label: "Reminders & Alerts", icon: "bell", badge: totalAlertCount },
              { id: "analytics", label: "Funnel Analytics", icon: "sparkles" },
              { id: "exports", label: "Export to CSV", icon: "download" },
              { id: "settings", label: "Settings", icon: "settings" },
            ].map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 ? (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  ) : item.count !== undefined ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-brand-700 text-brand-100" : "bg-slate-800 text-slate-400"}`}>
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Server Status & Demo Seed Button */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={handleSeedData}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            title="Populate realistic companies and interview rounds for demonstration"
          >
            <Icon name="sparkles" className="w-4 h-4 text-amber-400" />
            <span>Load Demo Data</span>
          </button>

          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${serverOnline ? "bg-emerald-500" : "bg-rose-500"}`}></span>
              {serverOnline ? "FastAPI Connected" : "Backend Offline"}
            </span>
            <span className="font-mono text-[10px] text-slate-500">v2.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-8 flex items-center justify-between flex-shrink-0 z-10 transition-colors">
          {/* Search bar */}
          <div className="flex items-center gap-3 w-80 md:w-96">
            <div className="relative w-full">
              <Icon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search company, role, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-slate-100/80 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 border border-transparent focus:border-brand-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <Icon name={darkMode ? "sun" : "moon"} className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </button>

            {/* Candidate Name Pill Header Badge */}
            <div
              onClick={() => setActiveTab("settings")}
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:border-brand-500 transition"
              title="Click to edit Candidate Name in Settings"
            >
              <div className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center">
                {candidateInitials}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                {applicantName}
              </span>
            </div>

            {/* Urgent Notification Bell with Popover toggle */}
            <button
              onClick={() => setAlertDrawerOpen(!alertDrawerOpen)}
              className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="View Reminders & Alerts"
            >
              <Icon name="bell" className="w-5 h-5" />
              {totalAlertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
              )}
            </button>

            {/* Add Application Primary Button */}
            <button
              onClick={() => {
                setEditingApp(null);
                setAppModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-500/30 transition transform active:scale-95"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span className="hidden md:inline">New Application</span>
            </button>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950 transition-colors">
          {loading && !dashboardData ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <DashboardView
                  data={dashboardData}
                  applicantName={applicantName}
                  onAddApp={() => { setEditingApp(null); setAppModalOpen(true); }}
                  onViewApp={(app) => setDetailApp(app)}
                  onScheduleInterview={(app) => { setTargetAppForInterview(app); setInterviewModalOpen(true); }}
                />
              )}

              {activeTab === "applications" && (
                <ApplicationsView
                  applications={applications}
                  applicantName={applicantName}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  jobTypeFilter={jobTypeFilter}
                  setJobTypeFilter={setJobTypeFilter}
                  onAdd={() => { setEditingApp(null); setAppModalOpen(true); }}
                  onView={(app) => setDetailApp(app)}
                  onEdit={(app) => { setEditingApp(app); setAppModalOpen(true); }}
                  onDelete={(app) => setDeleteConfirmApp(app)}
                  onSchedule={(app) => { setTargetAppForInterview(app); setInterviewModalOpen(true); }}
                  onSeed={handleSeedData}
                />
              )}

              {activeTab === "interviews" && (
                <InterviewsView
                  interviews={interviews}
                  onOutcome={(iv) => { setTargetInterviewForOutcome(iv); setOutcomeModalOpen(true); }}
                  onCancel={async (iv) => {
                    if (confirm(`Cancel interview for ${iv.company_name}?`)) {
                      try {
                        await api.cancelInterview(iv.application_id, iv.interview_id, "User requested cancellation");
                        showToast("Interview cancelled", "success");
                        loadAllData();
                      } catch (err) {
                        showToast(err.message || "Failed to cancel interview", "error");
                      }
                    }
                  }}
                  onScheduleNew={() => {
                    if (applications.length === 0) {
                      showToast("Create a job application first before scheduling an interview.", "error");
                    } else {
                      setTargetAppForInterview(applications[0]);
                      setInterviewModalOpen(true);
                    }
                  }}
                />
              )}

              {activeTab === "reminders" && (
                <RemindersView
                  reminders={reminders}
                  onViewApp={(app) => setDetailApp(app)}
                />
              )}

              {activeTab === "analytics" && (
                <AnalyticsView data={dashboardData} applicantName={applicantName} />
              )}

              {activeTab === "exports" && (
                <ExportsView />
              )}

              {activeTab === "settings" && (
                <SettingsView
                  settings={settings}
                  applicantName={applicantName}
                  darkMode={darkMode}
                  onToggleDarkMode={toggleDarkMode}
                  onSave={async (newSettings) => {
                    try {
                      await api.updateSettings(newSettings);
                      if (newSettings.applicant_name) {
                        setApplicantName(newSettings.applicant_name);
                      }
                      showToast("Settings updated successfully!", "success");
                      loadAllData();
                    } catch (err) {
                      showToast(err.message || "Failed to update settings", "error");
                    }
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* =====================================================================
          Modals and Drawers
         ===================================================================== */}

      {/* Application Create / Edit Modal */}
      {appModalOpen && (
        <ApplicationModal
          editingApp={editingApp}
          defaultApplicantName={applicantName}
          metadata={metadata}
          onClose={() => setAppModalOpen(false)}
          onSave={async (formData) => {
            try {
              if (editingApp) {
                await api.updateApplication(editingApp.application_id, formData);
                showToast("Application updated successfully!");
              } else {
                await api.createApplication(formData);
                showToast("Application created successfully!");
              }
              setAppModalOpen(false);
              loadAllData();
            } catch (err) {
              showToast(err.message, "error");
            }
          }}
        />
      )}

      {/* Application Detail View Drawer */}
      {detailApp && (
        <ApplicationDetailDrawer
          app={detailApp}
          applicantName={applicantName}
          onClose={() => setDetailApp(null)}
          onEdit={() => {
            setEditingApp(detailApp);
            setDetailApp(null);
            setAppModalOpen(true);
          }}
          onScheduleInterview={() => {
            setTargetAppForInterview(detailApp);
            setInterviewModalOpen(true);
          }}
          onOutcome={(iv) => {
            setTargetInterviewForOutcome({
              ...iv,
              application_id: iv.application_id || detailApp.application_id,
              company_name: detailApp.company_name,
              job_role: detailApp.job_role
            });
            setOutcomeModalOpen(true);
          }}
        />
      )}

      {/* Schedule Interview Modal */}
      {interviewModalOpen && targetAppForInterview && (
        <InterviewModal
          app={targetAppForInterview}
          applications={applications}
          metadata={metadata}
          onClose={() => setInterviewModalOpen(false)}
          onSave={async (formData) => {
            try {
              await api.scheduleInterview(formData);
              showToast("Interview scheduled successfully!");
              setInterviewModalOpen(false);
              loadAllData();
            } catch (err) {
              showToast(err.message, "error");
            }
          }}
        />
      )}

      {/* Log Interview Outcome Modal */}
      {outcomeModalOpen && targetInterviewForOutcome && (
        <OutcomeModal
          interview={targetInterviewForOutcome}
          onClose={() => setOutcomeModalOpen(false)}
          onSave={async (outcome, notes) => {
            try {
              await api.recordOutcome(
                targetInterviewForOutcome.application_id,
                targetInterviewForOutcome.interview_id,
                { outcome, notes }
              );
              showToast(`Outcome marked as ${outcome}!`);
              setOutcomeModalOpen(false);
              loadAllData();
            } catch (err) {
              showToast(err.message, "error");
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Icon name="trash" className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Job Application?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete <strong className="text-slate-800 dark:text-slate-200">{deleteConfirmApp.company_name} — {deleteConfirmApp.job_role}</strong>? All associated interview rounds will also be deleted.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmApp(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.deleteApplication(deleteConfirmApp.application_id);
                    showToast(`Deleted application for ${deleteConfirmApp.company_name}.`);
                    setDeleteConfirmApp(null);
                    loadAllData();
                  } catch (err) {
                    showToast(err.message, "error");
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Alert Drawer / Notification Popover */}
      {alertDrawerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setAlertDrawerOpen(false)}>
          <div
            className="absolute top-16 right-8 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-scale-up z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Icon name="bell" className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Alerts & Reminders</h4>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                {totalAlertCount} active
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {reminders?.interviews_today?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    Interviews Scheduled Today
                  </p>
                  {reminders.interviews_today.map((item, idx) => (
                    <div key={idx} className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-800/60 mb-2">
                      <p className="font-bold text-sm text-purple-950 dark:text-purple-200">{item.application.company_name} — {item.interview.round_name}</p>
                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">Time: {item.interview.interview_time}</p>
                      {item.interview.meeting_link && (
                        <a href={item.interview.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-semibold mt-2 hover:underline">
                          Join Meeting <Icon name="external-link" className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {reminders?.overdue_deadlines?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    Overdue Deadlines
                  </p>
                  {reminders.overdue_deadlines.map((app, idx) => (
                    <div key={idx} className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-800/60 mb-2">
                      <p className="font-bold text-sm text-rose-950 dark:text-rose-200">{app.company_name} ({app.job_role})</p>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">Deadline was {app.application_deadline}</p>
                    </div>
                  ))}
                </div>
              )}

              {totalAlertCount === 0 && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <Icon name="check" className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">All caught up! No urgent alerts.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => { setAlertDrawerOpen(false); setActiveTab("reminders"); }}
              className="w-full py-2 text-center text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline transition pt-2 border-t border-slate-100 dark:border-slate-800"
            >
              View Full Reminders Calendar →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// =============================================================================
// View: Dashboard Overview
// =============================================================================

function DashboardView({ data, applicantName, onAddApp, onViewApp, onScheduleInterview }) {
  if (!data) return null;
  const { kpis, status_distribution, alerts, recent_applications } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner featuring APPLICANT NAME */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 dark:from-brand-700 dark:via-indigo-800 dark:to-purple-800 rounded-2xl p-6 text-white shadow-xl shadow-brand-500/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Applied As: {applicantName}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Welcome back, {applicantName}! 👋
          </h1>
          <p className="text-brand-100 text-sm mt-1">
            Tracking your pipeline across <span className="font-bold underline decoration-brand-300">{kpis.total_applications} job applications</span> and interview stages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddApp}
            className="px-4 py-2.5 rounded-xl bg-white text-brand-700 font-bold text-sm shadow-md hover:bg-brand-50 transition transform active:scale-95"
          >
            + Add New Application
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Applications</span>
            <span className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <Icon name="briefcase" className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.total_applications}</span>
            <span className="text-xs font-semibold text-slate-400">submitted</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Interviews</span>
            <span className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
              <Icon name="calendar" className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{kpis.total_interviews}</span>
            <span className="text-xs font-semibold text-slate-400">rounds logged</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Offers Received</span>
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Icon name="sparkles" className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.offers_received}</span>
            <span className="text-xs font-semibold text-slate-400">offers secured</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Interview Rate</span>
            <span className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Icon name="chart" className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.interview_conversion_rate}%</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">funnel rate</span>
          </div>
        </div>
      </div>

      {/* Urgent Alert Banner (if any) */}
      {(alerts.interviews_today?.length > 0 || alerts.overdue_deadlines?.length > 0) && (
        <div className="bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 dark:from-purple-950/30 dark:via-rose-950/30 dark:to-amber-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 animate-bounce">
              <Icon name="bell" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Action Items Require Attention</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {alerts.interviews_today?.length > 0 && `You have ${alerts.interviews_today.length} interview(s) today. `}
                {alerts.overdue_deadlines?.length > 0 && `You have ${alerts.overdue_deadlines.length} active application deadline(s) overdue.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Funnel Visualizer */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Application Pipeline Stages</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Distribution across active hiring phases</p>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            Total: {kpis.total_applications} applications
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {[
            { label: "Applied", color: "blue", count: status_distribution["Applied"] || 0 },
            { label: "Assessment", color: "amber", count: status_distribution["Assessment"] || 0 },
            { label: "Interview", color: "purple", count: status_distribution["Interview"] || 0 },
            { label: "Offer Received", color: "emerald", count: status_distribution["Offer Received"] || 0 },
            { label: "Selected", color: "green", count: status_distribution["Selected"] || 0 },
            { label: "Rejected", color: "rose", count: status_distribution["Rejected"] || 0 },
            { label: "Withdrawn", color: "slate", count: status_distribution["Withdrawn"] || 0 },
          ].map((item) => (
            <div key={item.label} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{item.label}</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Applications Mini-Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Applications</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Candidate: <span className="font-semibold text-brand-600 dark:text-brand-400">{applicantName}</span>
            </p>
          </div>
          <button
            onClick={onAddApp}
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline transition"
          >
            + Add Application
          </button>
        </div>

        {recent_applications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Icon name="briefcase" className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No applications recorded yet. Click above to add your first!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-6">Company & Role</th>
                  <th className="py-3 px-6">Applied By</th>
                  <th className="py-3 px-6">Applied Date</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent_applications.map((app) => (
                  <tr key={app.application_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-6 font-bold text-slate-900 dark:text-white">
                      <div>{app.company_name}</div>
                      <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{app.job_role}</div>
                    </td>
                    <td className="py-3 px-6">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {app.applicant_name || applicantName}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-500 dark:text-slate-400">{app.application_date}</td>
                    <td className="py-3 px-6">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <button
                        onClick={() => onViewApp(app)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => onScheduleInterview(app)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 transition"
                      >
                        + Interview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// =============================================================================
// View: Applications Management
// =============================================================================

function ApplicationsView({
  applications,
  applicantName,
  statusFilter,
  setStatusFilter,
  jobTypeFilter,
  setJobTypeFilter,
  onAdd,
  onView,
  onEdit,
  onDelete,
  onSchedule,
  onSeed,
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["All", "Applied", "Assessment", "Interview", "Offer Received", "Selected", "Rejected", "Withdrawn"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Job Type Dropdown & New Button */}
        <div className="flex items-center gap-3">
          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="All">All Job Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
            <option value="Freelance">Freelance</option>
          </select>

          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {applications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-3">
            <Icon name="briefcase" className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">No Applications Found</h3>
            <p className="text-sm max-w-sm mx-auto text-slate-500 dark:text-slate-400">
              No job applications matched your active filter or search query.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={onAdd}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
              >
                + Add Application
              </button>
              <button
                onClick={onSeed}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-6">Company & Role</th>
                  <th className="py-3.5 px-6">Applied By (Name)</th>
                  <th className="py-3.5 px-6">Location & Type</th>
                  <th className="py-3.5 px-6">Applied Date</th>
                  <th className="py-3.5 px-6">Deadline</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Interviews</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {applications.map((app) => (
                  <tr key={app.application_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white text-base">{app.company_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{app.job_role}</div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{app.application_id}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700">
                        <Icon name="user" className="w-3.5 h-3.5 text-brand-500" />
                        <span>{app.applicant_name || applicantName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{app.location}</div>
                      <div className="text-xs text-slate-400">{app.job_type}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300">{app.application_date}</td>
                    <td className="py-4 px-6">
                      {app.application_deadline ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                          {app.application_deadline}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-4 px-6">
                      {app.interviews?.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                          {app.interviews.length} round{app.interviews.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0 rounds</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onView(app)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition"
                        title="View Full Profile & Interviews"
                      >
                        <Icon name="search" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSchedule(app)}
                        className="p-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Schedule Interview Round"
                      >
                        <Icon name="calendar" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(app)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Edit Application"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(app)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Delete Application"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// =============================================================================
// View: Interviews Management
// =============================================================================

function InterviewsView({ interviews, onOutcome, onCancel, onScheduleNew }) {
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    if (filter === "All") return interviews;
    return interviews.filter((iv) => iv.interview_status === filter);
  }, [interviews, filter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {["All", "Scheduled", "Completed", "Cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filter === st
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          onClick={onScheduleNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
        >
          <Icon name="plus" className="w-4 h-4" />
          <span>Schedule New Round</span>
        </button>
      </div>

      {/* Grid of Interview Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 space-y-3 shadow-sm">
          <Icon name="calendar" className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">No Interviews Scheduled</h3>
          <p className="text-sm max-w-sm mx-auto text-slate-500 dark:text-slate-400">
            No interview rounds match this filter. Schedule a round to start tracking dates, links, and preparation notes!
          </p>
          <div className="pt-2">
            <button
              onClick={onScheduleNew}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
            >
              + Schedule Interview
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((iv) => (
            <div
              key={iv.interview_id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm card-hover flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Header: Company & Round */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-lg">{iv.company_name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{iv.job_role}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                    {iv.round_name}
                  </span>
                </div>

                {/* Details: Date, Time, Mode */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Icon name="calendar" className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{iv.interview_date}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-purple-700 dark:text-purple-400 font-bold">{iv.interview_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="briefcase" className="w-4 h-4 text-slate-400" />
                    <span>Mode: <strong className="text-slate-800 dark:text-slate-200">{iv.interview_mode}</strong></span>
                  </div>
                  {iv.meeting_link && (
                    <div className="flex items-center gap-2">
                      <Icon name="external-link" className="w-4 h-4 text-slate-400" />
                      <a
                        href={iv.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 dark:text-brand-400 hover:underline font-semibold truncate max-w-xs"
                      >
                        {iv.meeting_link}
                      </a>
                    </div>
                  )}
                  {iv.prep_notes && (
                    <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 italic">
                      "{iv.prep_notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Outcome Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <OutcomeBadge outcome={iv.outcome} />
                </div>
                <div className="space-x-1.5">
                  {iv.interview_status !== "Completed" && iv.interview_status !== "Cancelled" && (
                    <>
                      <button
                        onClick={() => onOutcome(iv)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition"
                      >
                        Log Outcome
                      </button>
                      <button
                        onClick={() => onCancel(iv)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 transition"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// =============================================================================
// View: Reminders & Alerts
// =============================================================================

function RemindersView({ reminders, onViewApp }) {
  if (!reminders) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deadline & Interview Reminders</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Active lookahead window: <strong className="text-slate-800 dark:text-slate-200">{reminders.window_days} days</strong> (Reference: {reminders.reference_date})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interviews Today */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-purple-100 dark:border-purple-800/40">
            <h3 className="font-bold text-purple-950 dark:text-purple-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
              Interviews Scheduled Today
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
              {reminders.interviews_today?.length || 0}
            </span>
          </div>

          {reminders.interviews_today?.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No interviews scheduled for today.</p>
          ) : (
            reminders.interviews_today.map((item, idx) => (
              <div key={idx} className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-800/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{item.application.company_name}</span>
                  <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-700">
                    {item.interview.interview_time}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">Round: {item.interview.round_name}</p>
                {item.interview.meeting_link && (
                  <a href={item.interview.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-700 dark:text-purple-400 font-bold mt-2 hover:underline">
                    Open Video Room <Icon name="external-link" className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {/* Overdue Deadlines */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-200/80 dark:border-rose-800/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-800/40">
            <h3 className="font-bold text-rose-950 dark:text-rose-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              Overdue Deadlines
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
              {reminders.overdue_deadlines?.length || 0}
            </span>
          </div>

          {reminders.overdue_deadlines?.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No active deadlines are overdue.</p>
          ) : (
            reminders.overdue_deadlines.map((app, idx) => (
              <div key={idx} className="p-3.5 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-800/40 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{app.company_name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{app.job_role}</p>
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mt-1">Deadline was {app.application_deadline}</p>
                </div>
                <button
                  onClick={() => onViewApp(app)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition"
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Interviews in Window */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">Upcoming Interviews ({reminders.window_days} Days)</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {reminders.upcoming_interviews?.length || 0}
            </span>
          </div>

          {reminders.upcoming_interviews?.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No upcoming interviews in this window.</p>
          ) : (
            reminders.upcoming_interviews.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{item.application.company_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.interview.round_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-brand-600 dark:text-brand-400">{item.interview.interview_date}</p>
                  <p className="text-[11px] text-slate-400">{item.interview.interview_time}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Deadlines in Window */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">Upcoming Deadlines</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {reminders.upcoming_deadlines?.length || 0}
            </span>
          </div>

          {reminders.upcoming_deadlines?.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No upcoming deadlines.</p>
          ) : (
            reminders.upcoming_deadlines.map((app, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{app.company_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{app.job_role}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Due {app.application_deadline}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// View: Funnel Analytics
// =============================================================================

function AnalyticsView({ data, applicantName }) {
  if (!data) return null;
  const { kpis, status_distribution } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pipeline Analytics & Funnel Ratios</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Conversion data for candidate: <strong className="text-slate-800 dark:text-slate-200">{applicantName}</strong>
        </p>
      </div>

      {/* Funnel Conversion Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Application to Interview</span>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{kpis.interview_conversion_rate}%</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Percentage of applications advancing to at least one interview round.
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(kpis.interview_conversion_rate, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Interview to Offer</span>
          <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{kpis.interview_to_offer_rate}%</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Percentage of candidates who pass rounds and convert to an offer.
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(kpis.interview_to_offer_rate, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Offer Rate</span>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.offer_conversion_rate}%</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total offers received divided by all submitted job applications.
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${Math.min(kpis.offer_conversion_rate, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Visual Status Distribution Bar Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base">Stage Distribution Breakdown</h3>
        <div className="space-y-3 pt-2">
          {Object.entries(status_distribution).map(([statusName, count]) => {
            const pct = kpis.total_applications > 0 ? Math.round((count / kpis.total_applications) * 100) : 0;
            return (
              <div key={statusName} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{statusName}</span>
                  <span className="text-slate-500 dark:text-slate-400">{count} ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// View: CSV Export Downloads
// =============================================================================

function ExportsView() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Spreadsheet-Safe CSV Exports</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Export your complete job application dataset, interview transcripts, and analytics reports. All exports include built-in formula injection defenses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Icon name="briefcase" className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">All Applications</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Includes candidate name, salaries, locations, dates, notes, and URLs.
            </p>
          </div>
          <a
            href="/api/export/applications"
            download
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition"
          >
            <Icon name="download" className="w-4 h-4" />
            <span>Download Applications CSV</span>
          </a>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <Icon name="calendar" className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Interview History</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              All interview rounds, dates, times, meeting links, prep notes, and outcomes.
            </p>
          </div>
          <a
            href="/api/export/interviews"
            download
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
          >
            <Icon name="download" className="w-4 h-4" />
            <span>Download Interviews CSV</span>
          </a>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Icon name="sparkles" className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Analytics Summary</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Computed conversion rates, distribution tables, and funnel velocity statistics.
            </p>
          </div>
          <a
            href="/api/export/analytics"
            download
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            <Icon name="download" className="w-4 h-4" />
            <span>Download Analytics CSV</span>
          </a>
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// View: Settings Management (with Applicant Name & Dark Mode)
// =============================================================================

function SettingsView({ settings, applicantName, darkMode, onToggleDarkMode, onSave }) {
  const [formData, setFormData] = useState({
    applicant_name: applicantName || settings?.applicant_name || "Naga Chiranjeevi",
    theme_mode: darkMode ? "dark" : "light",
    reminder_window_days: settings?.reminder_window_days || 7,
    default_application_status: settings?.default_application_status || "Applied",
    date_display_format: settings?.date_display_format || "%Y-%m-%d",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-2xl bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Preferences & Profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your candidate identity, dark mode, and reminder settings.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* APPLICANT NAME SETTING */}
        <div className="p-4 rounded-xl bg-brand-50/50 dark:bg-slate-800/60 border border-brand-100 dark:border-slate-700">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-900 dark:text-brand-300 mb-1.5 flex items-center gap-2">
            <Icon name="user" className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            Candidate / Applicant Name (Displayed on Dashboard)
          </label>
          <input
            type="text"
            required
            value={formData.applicant_name}
            onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
            placeholder="e.g. Naga Chiranjeevi"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 text-sm font-semibold"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            This name appears prominently on the dashboard greeting banner, top navigation bar, and application logs.
          </p>
        </div>

        {/* DARK MODE THEME TOGGLE */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Appearance Theme
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (darkMode) onToggleDarkMode();
                setFormData({ ...formData, theme_mode: "light" });
              }}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition ${
                !darkMode
                  ? "bg-brand-50 border-brand-500 text-brand-700 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Icon name="sun" className="w-4 h-4 text-amber-500" />
              <span>☀️ Light Mode</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!darkMode) onToggleDarkMode();
                setFormData({ ...formData, theme_mode: "dark" });
              }}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition ${
                darkMode
                  ? "bg-brand-950/80 border-brand-500 text-brand-300 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Icon name="moon" className="w-4 h-4 text-purple-400" />
              <span>🌙 Dark Mode</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Reminder Lookahead Window (Days)
          </label>
          <input
            type="number"
            min="1"
            max="90"
            value={formData.reminder_window_days}
            onChange={(e) => setFormData({ ...formData, reminder_window_days: parseInt(e.target.value) || 7 })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 text-sm font-semibold"
          />
          <p className="text-xs text-slate-400 mt-1">
            Deadlines and scheduled interviews within this number of days will show in the reminders panel.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Default Application Status
          </label>
          <select
            value={formData.default_application_status}
            onChange={(e) => setFormData({ ...formData, default_application_status: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 text-sm font-semibold bg-white"
          >
            <option value="Applied">Applied</option>
            <option value="Assessment">Assessment</option>
            <option value="Interview">Interview</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Date Presentation Format
          </label>
          <select
            value={formData.date_display_format}
            onChange={(e) => setFormData({ ...formData, date_display_format: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 text-sm font-semibold bg-white"
          >
            <option value="%Y-%m-%d">YYYY-MM-DD (ISO Standard)</option>
            <option value="%d-%m-%Y">DD-MM-YYYY (European / Indian)</option>
            <option value="%m/%d/%Y">MM/DD/YYYY (US Standard)</option>
          </select>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 transition"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}


// =============================================================================
// Modals & Drawers
// =============================================================================

function ApplicationModal({ editingApp, defaultApplicantName, metadata, onClose, onSave }) {
  const [formData, setFormData] = useState({
    company_name: editingApp?.company_name || "",
    job_role: editingApp?.job_role || "",
    applicant_name: editingApp?.applicant_name || defaultApplicantName || "Naga Chiranjeevi",
    location: editingApp?.location || "Remote",
    job_type: editingApp?.job_type || "Full-time",
    job_description: editingApp?.job_description || "",
    application_date: editingApp?.application_date || new Date().toISOString().split("T")[0],
    application_deadline: editingApp?.application_deadline || "",
    job_url: editingApp?.job_url || "",
    min_salary: editingApp?.min_salary || "",
    max_salary: editingApp?.max_salary || "",
    status: editingApp?.status || "Applied",
    notes: editingApp?.notes || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const minSal = formData.min_salary !== "" && formData.min_salary !== null && !isNaN(formData.min_salary)
      ? parseFloat(formData.min_salary)
      : null;
    const maxSal = formData.max_salary !== "" && formData.max_salary !== null && !isNaN(formData.max_salary)
      ? parseFloat(formData.max_salary)
      : null;
    onSave({
      ...formData,
      min_salary: minSal,
      max_salary: maxSal,
      application_deadline: formData.application_deadline || null,
      job_url: formData.job_url || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up space-y-5 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {editingApp ? `Edit Application: ${editingApp.company_name}` : "Add New Job Application"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Google, Stripe, Microsoft"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Job Role / Title *</label>
              <input
                type="text"
                required
                value={formData.job_role}
                onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                placeholder="e.g. Full Stack Engineer"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500 font-semibold"
              />
            </div>
          </div>

          {/* APPLICANT NAME FIELD */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Applicant Name</label>
            <input
              type="text"
              value={formData.applicant_name}
              onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
              placeholder="Candidate Name"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Remote, Bengaluru"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Job Type</label>
              <select
                value={formData.job_type}
                onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500 bg-white"
              >
                {metadata?.job_types?.map((jt) => (
                  <option key={jt} value={jt}>{jt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500 bg-white"
              >
                {metadata?.application_statuses?.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Application Date *</label>
              <input
                type="date"
                required
                value={formData.application_date}
                onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Deadline (Optional)</label>
              <input
                type="date"
                value={formData.application_deadline}
                onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Min Salary ($)</label>
              <input
                type="number"
                min="0"
                value={formData.min_salary}
                onChange={(e) => setFormData({ ...formData, min_salary: e.target.value })}
                placeholder="e.g. 80000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Max Salary ($)</label>
              <input
                type="number"
                min="0"
                value={formData.max_salary}
                onChange={(e) => setFormData({ ...formData, max_salary: e.target.value })}
                placeholder="e.g. 120000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Job Posting URL (Optional)</label>
            <input
              type="url"
              value={formData.job_url}
              onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
              placeholder="https://..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Referral / Prep Notes</label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Referred by recruiter, questions asked, follow-up timeline..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
            ></textarea>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 transition"
            >
              {editingApp ? "Save Changes" : "Create Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function ApplicationDetailDrawer({ app, applicantName, onClose, onEdit, onScheduleInterview, onOutcome }) {
  if (!app) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-fade-in p-8 border-l border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-mono text-xs text-slate-400">{app.application_id}</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">{app.company_name}</h2>
              <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{app.job_role}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={app.status} />
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              {app.job_type}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              {app.location}
            </span>
          </div>

          {/* Candidate / Applied By Card */}
          <div className="p-4 rounded-xl bg-brand-50/60 dark:bg-slate-800/60 border border-brand-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                <Icon name="user" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Applied Candidate</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{app.applicant_name || applicantName}</p>
              </div>
            </div>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-bold">Applied On</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{app.application_date}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold">Deadline</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{app.application_deadline || "No deadline"}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold">Salary Range</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{app.min_salary || app.max_salary ? `$${app.min_salary?.toLocaleString()} - $${app.max_salary?.toLocaleString()}` : "Not Disclosed"}</p>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold">Posting URL</span>
              <p className="mt-0.5">
                {app.job_url ? (
                  <a href={app.job_url} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline inline-flex items-center gap-1">
                    Open Job Link <Icon name="external-link" className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic">None</span>
                )}
              </p>
            </div>
          </div>

          {/* Notes */}
          {app.notes && (
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes & Comments</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                {app.notes}
              </p>
            </div>
          )}

          {/* Nested Interview Timeline */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Interview Pipeline ({app.interviews?.length || 0} rounds)</h3>
              <button
                onClick={onScheduleInterview}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline transition"
              >
                + Schedule Round
              </button>
            </div>

            {app.interviews?.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                No interview rounds scheduled yet for this role.
              </p>
            ) : (
              <div className="space-y-3">
                {app.interviews.map((iv) => (
                  <div key={iv.interview_id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{iv.round_name}</span>
                      <OutcomeBadge outcome={iv.outcome} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{iv.interview_date} at {iv.interview_time}</span>
                      <span>•</span>
                      <span>{iv.interview_mode}</span>
                    </div>
                    {iv.meeting_link && (
                      <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline inline-flex items-center gap-1">
                        Meeting Link <Icon name="external-link" className="w-3 h-3" />
                      </a>
                    )}
                    {iv.prep_notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">"{iv.prep_notes}"</p>
                    )}
                    {iv.interview_status !== "Completed" && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => onOutcome(iv)}
                          className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                        >
                          Log Outcome
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Bottom Actions */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            Edit Application
          </button>
          <button
            onClick={onScheduleInterview}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition"
          >
            + Add Interview
          </button>
        </div>
      </div>
    </div>
  );
}


function InterviewModal({ app, applications, metadata, onClose, onSave }) {
  const [selectedAppId, setSelectedAppId] = useState(app?.application_id || applications?.[0]?.application_id || "");
  const [formData, setFormData] = useState({
    round_name: metadata?.interview_rounds?.[0] || "Technical",
    interview_date: new Date().toISOString().split("T")[0],
    interview_time: "14:00",
    interview_mode: "Online / Video",
    meeting_link: "",
    prep_notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetId = selectedAppId || app?.application_id || applications?.[0]?.application_id;
    if (!targetId) {
      alert("Please select a valid job application first.");
      return;
    }
    onSave({
      application_id: targetId,
      ...formData,
      meeting_link: formData.meeting_link || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Schedule Interview Round</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Target Application *</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold bg-white focus:outline-none focus:border-purple-500"
            >
              {applications.map((a) => (
                <option key={a.application_id} value={a.application_id}>
                  {a.company_name} — {a.job_role} ({a.application_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Round Name *</label>
              <select
                value={formData.round_name}
                onChange={(e) => setFormData({ ...formData, round_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold bg-white focus:outline-none focus:border-purple-500"
              >
                {metadata?.interview_rounds?.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Delivery Mode</label>
              <select
                value={formData.interview_mode}
                onChange={(e) => setFormData({ ...formData, interview_mode: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold bg-white focus:outline-none focus:border-purple-500"
              >
                {metadata?.interview_modes?.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Date (YYYY-MM-DD) *</label>
              <input
                type="date"
                required
                value={formData.interview_date}
                onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Time (HH:MM 24h) *</label>
              <input
                type="time"
                required
                value={formData.interview_time}
                onChange={(e) => setFormData({ ...formData, interview_time: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Meeting Link (URL)</label>
            <input
              type="url"
              value={formData.meeting_link}
              onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
              placeholder="https://meet.google.com/... or Zoom link"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Preparation Notes / Agenda</label>
            <textarea
              rows="2"
              value={formData.prep_notes}
              onChange={(e) => setFormData({ ...formData, prep_notes: e.target.value })}
              placeholder="Topics to study, interviewer name, questions to ask..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-purple-500"
            ></textarea>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition"
            >
              Schedule Interview
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function OutcomeModal({ interview, onClose, onSave }) {
  const [outcome, setOutcome] = useState("Passed");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(outcome, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Record Outcome: {interview?.round_name || "Interview Round"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Round Outcome</label>
            <div className="grid grid-cols-3 gap-2">
              {["Passed", "Failed", "Pending"].map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setOutcome(opt)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    outcome === opt
                      ? opt === "Passed"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : opt === "Failed"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Feedback / Outcome Notes</label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Feedback received from interviewer, areas for improvement..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
            ></textarea>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 transition"
            >
              Save Outcome
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// React DOM Render
// =============================================================================

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
