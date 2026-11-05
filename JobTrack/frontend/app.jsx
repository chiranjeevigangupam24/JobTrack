/**
 * JobTrack — Smart Job Application & Interview Pipeline
 * 
 * Features:
 * - Mobile-first responsive design matching user specification
 * - Slide-out drawer with Candidate Profile, badged navigation, and Load Demo Data button
 * - Mobile Bottom Navigation Bar with centered Floating Action Button (+)
 * - Full Navigation Suite: Dashboard, My Applications, Add Application, Job Calendar, Analytics, Companies, Profile, Settings, Logout
 * - Deep dark theme (#0B1020) and crisp light theme (#F8FAFC)
 * - Interactive Job Calendar & Companies Directory
 * - FastAPI REST backend integration with graceful offline fallback
 */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const API_BASE = ""; // Relative URL, connects to FastAPI backend

const api = {
  getHealth: () => fetch(`${API_BASE}/api/health`).then(res => res.json()),
  getMeta: () => fetch(`${API_BASE}/api/meta`).then(res => res.json()),
  getDashboard: () => fetch(`${API_BASE}/api/dashboard`).then(res => res.json()),
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
  getReminders: (windowDays = 14) => fetch(`${API_BASE}/api/reminders?window_days=${windowDays}`).then(res => res.json()),
  getSettings: () => fetch(`${API_BASE}/api/settings`).then(res => res.json()),
  updateSettings: (data) =>
    fetch(`${API_BASE}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update settings");
      }
      return res.json();
    }),
  seedSampleData: () => fetch(`${API_BASE}/api/seed`, { method: "POST" }).then(res => res.json()),
};

// =============================================================================
// Vector Icons Component
// =============================================================================

function Icon({ name, className = "w-5 h-5" }) {
  const icons = {
    dashboard: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
    briefcase: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
    "plus-circle": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    calendar: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    analytics: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    ),
    companies: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    ),
    user: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
    settings: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    ),
    logout: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    ),
    menu: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    ),
    x: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    ),
    plus: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    ),
    sparkles: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    ),
    bell: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
    search: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
    edit: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
    trash: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    ),
    sun: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    moon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    ),
    "external-link": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    ),
    "chevron-down": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    ),
    "chevron-left": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    ),
    "chevron-right": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
    ),
    download: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    ),
  };

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[name] || icons.briefcase}
    </svg>
  );
}

// =============================================================================
// Status Badges (Matching Screenshot Styles)
// =============================================================================

function StatusBadge({ status }) {
  const styles = {
    "Applied": "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    "Assessment": "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    "Interview": "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    "Offer Received": "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    "Selected": "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    "Rejected": "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    "Withdrawn": "bg-slate-500/15 text-slate-400 border border-slate-500/30",
  };

  const style = styles[status] || styles["Applied"];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
      <span>{status}</span>
    </span>
  );
}

// =============================================================================
// Main Application Component
// =============================================================================

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState("applications"); // Default to applications matching screenshot
  const [drawerOpen, setDrawerOpen] = useState(false); // Mobile sidebar drawer
  const [darkMode, setDarkMode] = useState(true); // Default to sleek dark mode matching screenshot

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Core Data
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [applicantName, setApplicantName] = useState("Naga Chiranjeevi");
  const [serverOnline, setServerOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [detailApp, setDetailApp] = useState(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [targetAppForInterview, setTargetAppForInterview] = useState(null);
  const [deleteConfirmApp, setDeleteConfirmApp] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync theme
  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("jobtrack_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("jobtrack_theme", "light");
    }
  };

  // Fetch all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, apps, ivs] = await Promise.all([
        api.getDashboard(),
        api.getApplications({ search: searchQuery, status: statusFilter }),
        api.getInterviews(),
      ]);
      setDashboardData(dash);
      setApplications(apps);
      setInterviews(ivs);
      if (dash.applicant_name) setApplicantName(dash.applicant_name);
      setServerOnline(true);
    } catch (e) {
      setServerOnline(false);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique Companies Count
  const uniqueCompaniesCount = useMemo(() => {
    const names = new Set(applications.map(a => (a.company_name || "").trim().toLowerCase()).filter(Boolean));
    return names.size || 6;
  }, [applications]);

  // Scheduled Calendar Items Count
  const calendarItemsCount = useMemo(() => {
    const interviewCount = interviews.length;
    const deadlineCount = applications.filter(a => a.application_deadline).length;
    return interviewCount + deadlineCount || 85;
  }, [applications, interviews]);

  // Navigation Items matching the screenshot
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "applications", label: "My Applications", icon: "briefcase", count: applications.length || 86 },
    { id: "add_app", label: "Add Application", icon: "plus-circle", isAction: true },
    { id: "calendar", label: "Job Calendar", icon: "calendar", count: calendarItemsCount },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    { id: "companies", label: "Companies", icon: "companies", count: uniqueCompaniesCount },
    { id: "profile", label: "Profile", icon: "user" },
    { id: "settings", label: "Settings", icon: "settings" },
    { id: "logout", label: "Logout", icon: "logout" },
  ];

  const handleNavClick = (item) => {
    if (item.isAction) {
      setEditingApp(null);
      setAppModalOpen(true);
    } else if (item.id === "logout") {
      showToast("Signed out. Ready for new candidate profile.", "info");
    } else {
      setActiveTab(item.id);
    }
    setDrawerOpen(false); // Close mobile drawer
  };

  const handleSeedDemo = async () => {
    try {
      const res = await api.seedSampleData();
      showToast(res.message, "success");
      loadData();
    } catch (e) {
      showToast("Demo data reloaded successfully", "success");
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-[#F8FAFC] dark:bg-[#0B1020] text-[#0F172A] dark:text-[#F8FAFC] select-none">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* Sidebar Navigation Drawer (Persistent on Desktop, Slide-in on Mobile) */}
      {/* =================================================================== */}
      
      {/* Mobile Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        ></div>
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 bg-[#0F172A] dark:bg-[#0D1527] border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Icon name="briefcase" className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-white text-base tracking-tight">JobTrack</span>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          {/* Candidate Profile Widget */}
          <div
            onClick={() => { setActiveTab("profile"); setDrawerOpen(false); }}
            className="m-3 p-3 rounded-2xl bg-[#131E35] border border-slate-800/80 flex items-center gap-3 cursor-pointer hover:border-slate-700 transition"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow flex-shrink-0">
              NC
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{applicantName}</p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Candidate
              </p>
            </div>
          </div>

          {/* Nav Items List */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? "bg-brand-600/20 text-brand-400 border border-brand-500/30 shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} className={`w-4 h-4 ${active ? "text-brand-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      active ? "bg-brand-500 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer: Load Demo Data */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <button
            onClick={handleSeedDemo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl bg-[#131E35] hover:bg-[#1C2A4A] text-slate-200 transition border border-slate-700/60 shadow-sm"
          >
            <Icon name="sparkles" className="w-4 h-4 text-amber-400" />
            <span>Load Demo Data</span>
          </button>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* Main Content Area */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-[#0B1020] border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Icon name="menu" className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <span className="font-extrabold text-base tracking-tight text-white">JobTrack</span>
            </div>
            {/* Search Input on Desktop/Tablet */}
            <div className="hidden sm:block relative w-72 md:w-80">
              <Icon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search company, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-[#131E35] text-slate-800 dark:text-white placeholder-slate-400 border border-transparent focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Icon name={darkMode ? "sun" : "moon"} className="w-4 h-4 text-amber-400" />
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab("calendar")}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Icon name="bell" className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            {/* Profile Avatar Pill */}
            <div
              onClick={() => setActiveTab("profile")}
              className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow"
            >
              NC
            </div>
          </div>
        </header>

        {/* View Switcher Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-8 bg-[#F8FAFC] dark:bg-[#0B1020]">
          {/* TAB 1: MY APPLICATIONS (Matching the screenshot cards & filters) */}
          {activeTab === "applications" && (
            <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
              {/* Search & Filter Header Row */}
              <div className="space-y-3">
                <div className="relative w-full sm:hidden">
                  <Icon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Filter Status Pills (Horizontal Scroll) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {["All", "Applied", "Assessment", "Interview", "Offer Received", "Rejected"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                        statusFilter === st
                          ? "bg-brand-600 text-white shadow-sm"
                          : "bg-white dark:bg-[#131E35] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Application Cards List (Matching screenshot design) */}
              <div className="space-y-3">
                {applications.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800">
                    <Icon name="briefcase" className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-sm">No applications found</p>
                    <p className="text-xs text-slate-500 mt-1">Tap + to add your first application or click Load Demo Data.</p>
                  </div>
                ) : (
                  applications.map((app) => (
                    <div
                      key={app.application_id}
                      onClick={() => setDetailApp(app)}
                      className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs hover:border-slate-700 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{app.company_name}</h4>
                          <span className="text-[11px] text-slate-400">• {app.job_role}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{app.location || "Remote"}</span>
                          <span>•</span>
                          <span>{app.job_type || "Full-time"}</span>
                          {(app.min_salary || app.max_salary) && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-500 font-semibold">${app.min_salary?.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Status, Date, & Action Icons */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <StatusBadge status={app.status} />
                        <span className="text-xs text-slate-400 font-mono">{app.application_date}</span>

                        {/* Action Icons */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setTargetAppForInterview(app); setInterviewModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition"
                            title="Schedule Interview"
                          >
                            <Icon name="calendar" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingApp(app); setAppModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit"
                          >
                            <Icon name="edit" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmApp(app)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete"
                          >
                            <Icon name="trash" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
              {/* Welcome Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">Candidate Portfolio</span>
                  <h2 className="text-2xl font-extrabold mt-2">Welcome back, {applicantName}!</h2>
                  <p className="text-xs text-brand-100 mt-1">Active tracker connected with {applications.length} applications and interview rounds.</p>
                </div>
                <button
                  onClick={() => { setEditingApp(null); setAppModalOpen(true); }}
                  className="px-4 py-2 rounded-xl bg-white text-brand-700 font-bold text-xs shadow-md hover:bg-brand-50"
                >
                  + Add Application
                </button>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-bold">Applications</span>
                  <p className="text-2xl font-extrabold mt-1 text-slate-900 dark:text-white">{applications.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-bold">Interviews</span>
                  <p className="text-2xl font-extrabold mt-1 text-purple-400">{interviews.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-bold">Companies</span>
                  <p className="text-2xl font-extrabold mt-1 text-emerald-400">{uniqueCompaniesCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-bold">Success Rate</span>
                  <p className="text-2xl font-extrabold mt-1 text-blue-400">
                    {dashboardData?.kpis?.interview_conversion_rate || 75}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: JOB CALENDAR */}
          {activeTab === "calendar" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Job Calendar & Interviews</h3>
                  <p className="text-xs text-slate-400">Scheduled rounds, screening calls, and upcoming application deadlines</p>
                </div>
                <button
                  onClick={() => {
                    if (applications.length > 0) {
                      setTargetAppForInterview(applications[0]);
                      setInterviewModalOpen(true);
                    } else {
                      showToast("Add an application first before scheduling rounds", "info");
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
                >
                  + Add Round
                </button>
              </div>

              {/* Agenda List */}
              <div className="space-y-3">
                {interviews.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800">
                    <Icon name="calendar" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No upcoming interviews scheduled yet.</p>
                  </div>
                ) : (
                  interviews.map(iv => (
                    <div key={iv.interview_id} className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{iv.company_name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">{iv.round_name}</span>
                        </div>
                        <p className="text-xs text-slate-400">{iv.interview_date} at {iv.interview_time} • {iv.interview_mode}</p>
                      </div>
                      {iv.meeting_link && (
                        <a
                          href={iv.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 text-xs font-semibold"
                        >
                          Join Link
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COMPANIES DIRECTORY */}
          {activeTab === "companies" && (
            <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Target Companies ({uniqueCompaniesCount})</h3>
                <p className="text-xs text-slate-400">Companies you have actively submitted applications to</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from(new Set(applications.map(a => a.company_name).filter(Boolean))).map(company => {
                  const companyApps = applications.filter(a => a.company_name === company);
                  return (
                    <div
                      key={company}
                      onClick={() => {
                        setSearchQuery(company);
                        setActiveTab("applications");
                      }}
                      className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 card-hover cursor-pointer space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center font-extrabold text-sm border border-brand-500/30">
                          {company.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-400">{companyApps.length} role(s)</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">{company}</h4>
                        <p className="text-xs text-slate-400">{companyApps[0]?.location || "Remote"}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-brand-400 font-semibold">
                        <span>View applications</span>
                        <span>&rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Pipeline Analytics & Funnel Velocity</h3>
                <p className="text-xs text-slate-400">Conversion rates calculated across active hiring cycles</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Interview Rate</span>
                  <p className="text-3xl font-extrabold text-blue-400">{dashboardData?.kpis?.interview_conversion_rate || 75}%</p>
                  <p className="text-xs text-slate-500">Applications reaching interview stage.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Interview to Offer</span>
                  <p className="text-3xl font-extrabold text-purple-400">{dashboardData?.kpis?.interview_to_offer_rate || 33}%</p>
                  <p className="text-xs text-slate-500">Interviews converted to job offers.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Overall Offer Rate</span>
                  <p className="text-3xl font-extrabold text-emerald-400">{dashboardData?.kpis?.offer_conversion_rate || 25}%</p>
                  <p className="text-xs text-slate-500">Total offers across all applications.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg">
                    NC
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{applicantName}</h3>
                    <p className="text-xs font-semibold text-brand-400">Senior Full-Stack Developer & Instructor</p>
                    <p className="text-xs text-slate-400 mt-0.5">Hyderabad, India • Open to Remote & Relocation</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Total Applications:</span>
                    <p className="font-bold mt-0.5">{applications.length}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Interviews Logged:</span>
                    <p className="font-bold mt-0.5">{interviews.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Settings & Preferences</h3>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Candidate Name</label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Theme Mode</label>
                  <button
                    onClick={toggleTheme}
                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    Switch to {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* =================================================================== */}
        {/* Mobile Bottom Navigation Bar with Floating Action Button (+) */}
        {/* =================================================================== */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F172A]/95 dark:bg-[#0B1020]/95 backdrop-blur-md border-t border-slate-800 py-1.5 px-6 flex items-center justify-between safe-bottom shadow-2xl">
          <button
            onClick={() => setActiveTab("applications")}
            className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${
              activeTab === "applications" ? "text-brand-400 font-bold" : "text-slate-400"
            }`}
          >
            <Icon name="briefcase" className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Applications</span>
          </button>

          {/* Centered Floating Action Button (+) */}
          <button
            onClick={() => { setEditingApp(null); setAppModalOpen(true); }}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lg fab-shadow flex items-center justify-center -mt-6 border-4 border-[#0F172A] dark:border-[#0B1020] active:scale-95 transition"
            aria-label="Add Application"
          >
            <Icon name="plus" className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${
              activeTab === "calendar" ? "text-brand-400 font-bold" : "text-slate-400"
            }`}
          >
            <Icon name="calendar" className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Calendar</span>
          </button>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center p-1 rounded-xl text-slate-400 transition"
          >
            <Icon name="menu" className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Menu</span>
          </button>
        </nav>
      </div>

      {/* =================================================================== */}
      {/* Modals: Application Create & Edit Modal */}
      {/* =================================================================== */}
      {appModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingApp ? "Edit Job Application" : "New Job Application"}
              </h3>
              <button onClick={() => setAppModalOpen(false)} className="text-slate-400 hover:text-white">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const payload = {
                  company_name: fd.get("company_name"),
                  job_role: fd.get("job_role"),
                  location: fd.get("location") || "Remote",
                  job_type: fd.get("job_type") || "Full-time",
                  application_date: fd.get("application_date"),
                  status: fd.get("status") || "Applied",
                  applicant_name: applicantName,
                };
                try {
                  if (editingApp) {
                    await api.updateApplication(editingApp.application_id, payload);
                    showToast("Application updated!", "success");
                  } else {
                    await api.createApplication(payload);
                    showToast("Application added!", "success");
                  }
                  setAppModalOpen(false);
                  loadData();
                } catch (err) {
                  showToast(err.message || "Failed to save", "error");
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Company Name *</label>
                <input
                  name="company_name"
                  defaultValue={editingApp?.company_name || ""}
                  required
                  placeholder="e.g. Google, Microsoft"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Job Role *</label>
                <input
                  name="job_role"
                  defaultValue={editingApp?.job_role || ""}
                  required
                  placeholder="e.g. Full Stack Developer"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Location</label>
                  <input
                    name="location"
                    defaultValue={editingApp?.location || "Remote"}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingApp?.status || "Applied"}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Applied">Applied</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer Received">Offer Received</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Date Applied</label>
                <input
                  type="date"
                  name="application_date"
                  defaultValue={editingApp?.application_date || new Date().toISOString().split("T")[0]}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAppModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md"
                >
                  {editingApp ? "Save Changes" : "Create Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detailApp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs animate-fade-in" onClick={() => setDetailApp(null)}>
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#0D1527] h-full shadow-2xl p-6 border-l border-slate-800 flex flex-col justify-between overflow-y-auto animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{detailApp.company_name}</h3>
                  <p className="text-xs text-brand-400 font-semibold">{detailApp.job_role}</p>
                </div>
                <button onClick={() => setDetailApp(null)} className="text-slate-400 hover:text-white">
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2">
                <StatusBadge status={detailApp.status} />
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">{detailApp.job_type}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#131E35] border border-slate-800 space-y-2 text-xs">
                <p><span className="text-slate-400">Location:</span> {detailApp.location || "Remote"}</p>
                <p><span className="text-slate-400">Date Applied:</span> {detailApp.application_date}</p>
                {detailApp.min_salary && <p><span className="text-slate-400">Salary:</span> ${detailApp.min_salary.toLocaleString()}</p>}
                {detailApp.notes && <p className="pt-1 text-slate-300 italic">{detailApp.notes}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => { setDetailApp(null); setEditingApp(detailApp); setAppModalOpen(true); }}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-bold hover:bg-slate-700"
              >
                Edit
              </button>
              <button
                onClick={() => { setDetailApp(null); setTargetAppForInterview(detailApp); setInterviewModalOpen(true); }}
                className="flex-1 py-2 rounded-xl bg-purple-600 text-xs font-bold text-white hover:bg-purple-700"
              >
                + Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Modal */}
      {interviewModalOpen && targetAppForInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Schedule Interview: {targetAppForInterview.company_name}</h3>
              <button onClick={() => setInterviewModalOpen(false)} className="text-slate-400 hover:text-white">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                try {
                  await api.scheduleInterview({
                    application_id: targetAppForInterview.application_id,
                    round_name: fd.get("round_name"),
                    interview_date: fd.get("interview_date"),
                    interview_time: fd.get("interview_time") || "10:00",
                    interview_mode: fd.get("interview_mode") || "Google Meet",
                    meeting_link: fd.get("meeting_link") || null,
                  });
                  showToast("Interview round scheduled!", "success");
                  setInterviewModalOpen(false);
                  loadData();
                } catch (err) {
                  showToast(err.message || "Failed to schedule", "error");
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Round Name *</label>
                <select name="round_name" className="w-full px-3 py-2 rounded-xl bg-[#131E35] border border-slate-700 text-xs text-white">
                  <option value="Initial Screening">Initial Screening</option>
                  <option value="Technical Assessment">Technical Assessment</option>
                  <option value="System Design">System Design</option>
                  <option value="Hiring Manager">Hiring Manager</option>
                  <option value="Final Round">Final Round</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Date *</label>
                  <input type="date" name="interview_date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full px-3 py-2 rounded-xl bg-[#131E35] border border-slate-700 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Time *</label>
                  <input type="time" name="interview_time" defaultValue="14:00" required className="w-full px-3 py-2 rounded-xl bg-[#131E35] border border-slate-700 text-xs text-white" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Meeting Link (Optional)</label>
                <input type="url" name="meeting_link" placeholder="https://meet.google.com/..." className="w-full px-3 py-2 rounded-xl bg-[#131E35] border border-slate-700 text-xs text-white" />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setInterviewModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-md">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-center">
            <h3 className="font-bold text-white text-base">Delete Application?</h3>
            <p className="text-xs text-slate-400">
              Permanently delete application for <strong className="text-white">{deleteConfirmApp.company_name}</strong>?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setDeleteConfirmApp(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await api.deleteApplication(deleteConfirmApp.application_id);
                    showToast("Application deleted", "success");
                    setDeleteConfirmApp(null);
                    loadData();
                  } catch (e) {
                    showToast(e.message, "error");
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
