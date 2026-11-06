/**
 * JobTrack Pro — Modern Job Application & Interview Pipeline Dashboard
 * Human-crafted, responsive React 18 single-page application.
 *
 * Implements the 15 Core Features:
 *   [ 1] Dashboard (Quick Overview)
 *   [ 2] Add Job Application
 *   [ 3] View All Applications
 *   [ 4] View Application Details
 *   [ 5] Update Application
 *   [ 6] Delete Application
 *   [ 7] Search Applications
 *   [ 8] Filter Applications
 *   [ 9] Manage Interviews
 *   [10] View Reminders
 *   [11] Analytics and Reports
 *   [12] Export Data to CSV
 *   [13] Settings
 *   [14] Help & User Guide
 *   [15] Exit
 */

const { useState, useEffect, useCallback, useMemo } = React;

// =============================================================================
// 1. API Client
// =============================================================================

const API_BASE = "";

const api = {
  getHealth: () => fetch(`${API_BASE}/api/health`).then(r => r.json()),
  getDashboard: () => fetch(`${API_BASE}/api/dashboard`).then(r => r.json()),
  getApplications: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.status && params.status !== "All") q.append("status", params.status);
    if (params.job_type && params.job_type !== "All") q.append("job_type", params.job_type);
    return fetch(`${API_BASE}/api/applications?${q.toString()}`).then(r => r.json());
  },
  getApplicationById: (id) => fetch(`${API_BASE}/api/applications/${id}`).then(r => r.json()),
  createApplication: async (data) => {
    const res = await fetch(`${API_BASE}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Failed to create application");
    }
    return res.json();
  },
  updateApplication: async (id, data) => {
    const res = await fetch(`${API_BASE}/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Failed to update application");
    }
    return res.json();
  },
  deleteApplication: async (id) => {
    const res = await fetch(`${API_BASE}/api/applications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Failed to delete application");
    }
    return res.json();
  },
  getInterviews: () => fetch(`${API_BASE}/api/interviews`).then(r => r.json()),
  scheduleInterview: async (data) => {
    const res = await fetch(`${API_BASE}/api/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Failed to schedule interview");
    }
    return res.json();
  },
  recordInterviewOutcome: async (appId, ivId, data) => {
    const res = await fetch(`${API_BASE}/api/interviews/${appId}/${ivId}/outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Failed to record outcome");
    }
    return res.json();
  },
  getReminders: (days = 14) => fetch(`${API_BASE}/api/reminders?window_days=${days}`).then(r => r.json()),
  getSettings: () => fetch(`${API_BASE}/api/settings`).then(r => r.json()),
  saveSettings: async (settings) => {
    // Try PUT first, fallback to POST
    let res = await fetch(`${API_BASE}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok && res.status === 405) {
      res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save settings");
    }
    return res.json();
  },
  seedDemo: () => fetch(`${API_BASE}/api/seed`, { method: "POST" }).then(r => r.json()),
  exportCSV: (type, status = "") => {
    const q = status && status !== "All" ? `?status_filter=${encodeURIComponent(status)}` : "";
    window.open(`${API_BASE}/api/export/${type}${q}`, "_blank");
  },
};

// =============================================================================
// 2. Company Logos & Branded Avatars
// =============================================================================

function CompanyLogo({ name = "", className = "w-10 h-10" }) {
  const clean = (name || "").trim().toLowerCase();

  // 1. Google
  if (clean.includes("google")) {
    return (
      <div className={`${className} rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-sm border border-slate-200 dark:border-slate-700/60 flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      </div>
    );
  }

  // 2. Microsoft
  if (clean.includes("microsoft")) {
    return (
      <div className={`${className} rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center p-2 shadow-sm border border-slate-200 dark:border-slate-700/60 flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect fill="#F25022" x="2" y="2" width="9.5" height="9.5" rx="1" />
          <rect fill="#7FBA00" x="12.5" y="2" width="9.5" height="9.5" rx="1" />
          <rect fill="#00A4EF" x="2" y="12.5" width="9.5" height="9.5" rx="1" />
          <rect fill="#FFB900" x="12.5" y="12.5" width="9.5" height="9.5" rx="1" />
        </svg>
      </div>
    );
  }

  // 3. Amazon
  if (clean.includes("amazon") || clean.includes("aws")) {
    return (
      <div className={`${className} rounded-2xl bg-[#131A22] text-white flex items-center justify-center p-2 shadow-sm border border-slate-800 flex-shrink-0`}>
        <span className="font-black text-amber-400 text-sm tracking-tighter">a<span className="text-white">mazon</span></span>
      </div>
    );
  }

  // 4. Apple
  if (clean.includes("apple")) {
    return (
      <div className={`${className} rounded-2xl bg-slate-900 text-white flex items-center justify-center p-2 shadow-sm border border-slate-700 flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.8 1.1-1.92.98-3.04-1 .04-2.15.67-2.82 1.45-.58.67-1.1 1.77-.96 2.87 1.11.09 2.19-.55 2.8-1.28z" />
        </svg>
      </div>
    );
  }

  // 5. Meta / Facebook
  if (clean.includes("meta") || clean.includes("facebook")) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center p-2 shadow-sm flex-shrink-0 font-bold text-xs`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      </div>
    );
  }

  // 6. Netflix
  if (clean.includes("netflix")) {
    return (
      <div className={`${className} rounded-2xl bg-black text-rose-600 flex items-center justify-center shadow-sm flex-shrink-0 font-black text-lg border border-slate-800`}>
        N
      </div>
    );
  }

  // 7. Stripe
  if (clean.includes("stripe")) {
    return (
      <div className={`${className} rounded-2xl bg-[#635BFF] text-white flex items-center justify-center shadow-sm flex-shrink-0 font-black text-base`}>
        S
      </div>
    );
  }

  // 8. Spotify
  if (clean.includes("spotify")) {
    return (
      <div className={`${className} rounded-2xl bg-[#1DB954] text-black flex items-center justify-center p-2 shadow-sm flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.625.625 0 01-.28-1.22c3.81-.87 7.076-.5 9.715 1.12a.625.625 0 01.207.857zm1.224-2.719a.782.782 0 01-1.077.257c-2.688-1.652-6.785-2.131-9.965-1.166a.782.782 0 11-.456-1.498c3.633-1.103 8.147-.568 11.241 1.33a.78.78 0 01.257 1.077zm.105-2.835C14.692 8.948 9.38 8.77 6.304 9.704a.938.938 0 11-.547-1.794c3.53-1.07 9.404-.863 13.167 1.37a.938.938 0 01-1.01 1.59z" />
        </svg>
      </div>
    );
  }

  // 9. Uber
  if (clean.includes("uber")) {
    return (
      <div className={`${className} rounded-2xl bg-black text-white flex items-center justify-center shadow-sm flex-shrink-0 font-black text-sm border border-slate-800`}>
        UBER
      </div>
    );
  }

  // Fallback: Elegant colored monogram badge based on hash of company name
  const colors = [
    "from-blue-600 to-indigo-600",
    "from-purple-600 to-pink-600",
    "from-emerald-600 to-teal-600",
    "from-amber-600 to-orange-600",
    "from-rose-600 to-red-600",
    "from-cyan-600 to-blue-600",
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash << 5) - hash + clean.charCodeAt(i);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (name || "CO")
    .split(" ")
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`${className} rounded-2xl bg-gradient-to-tr ${color} text-white font-extrabold text-xs flex items-center justify-center shadow-sm flex-shrink-0 tracking-wider`}>
      {initials}
    </div>
  );
}

// =============================================================================
// 3. Vector Icons
// =============================================================================

function Icon({ name, className = "w-5 h-5" }) {
  const icons = {
    dashboard: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    ),
    briefcase: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
    plus: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    ),
    calendar: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    bell: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
    analytics: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
    download: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    ),
    settings: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    ),
    help: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    logout: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    ),
    search: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
    filter: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    ),
    edit: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
    trash: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    ),
    copy: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
    expand: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    ),
    compress: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 4v4H5m4 0L4 3m11 1v4h4m-4 0l5-5M9 20v-4H5m4 0l-5 5m11-1v-4h4m-4 0l5 5" />
    ),
    x: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    ),
    check: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    ),
    sparkles: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    ),
    link: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    ),
    clock: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    menu: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    ),
  };

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[name] || icons.briefcase}
    </svg>
  );
}

// =============================================================================
// 4. Status Badges
// =============================================================================

function StatusBadge({ status = "Applied" }) {
  const styles = {
    "Applied": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "Assessment": "bg-amber-500/15 text-amber-400 border-amber-500/30",
    "Interview": "bg-purple-500/15 text-purple-400 border-purple-500/30",
    "Offer Received": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "Selected": "bg-teal-500/15 text-teal-400 border-teal-500/30",
    "Rejected": "bg-rose-500/15 text-rose-400 border-rose-500/30",
    "Withdrawn": "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  const badgeStyle = styles[status] || styles["Applied"];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
      <span>{status}</span>
    </span>
  );
}

// =============================================================================
// 5. Main Application Component
// =============================================================================

function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState("dashboard"); // Default to Dashboard (Feature 1)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobTypeFilter, setJobTypeFilter] = useState("All");

  // Core Data State
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [reminders, setReminders] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [applicantName, setApplicantName] = useState("Naga Chiranjeevi");
  const [loading, setLoading] = useState(true);

  // Modals for the 15 Features
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [detailApp, setDetailApp] = useState(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [targetAppForInterview, setTargetAppForInterview] = useState(null);
  const [deleteConfirmApp, setDeleteConfirmApp] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [exportType, setExportType] = useState("applications");
  const [exportStatus, setExportStatus] = useState("All");

  // Live modal company preview
  const [previewCompanyName, setPreviewCompanyName] = useState("");

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Theme Sync
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
    // Save to settings
    api.saveSettings({ theme_mode: next ? "dark" : "light" }).catch(() => {});
  };

  // Fullscreen Toggle (F11)
  const toggleFullscreen = () => {
    try {
      const doc = document;
      const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      if (!isFull) {
        if (doc.documentElement.requestFullscreen) {
          doc.documentElement.requestFullscreen().catch(() => {});
        }
        setIsFullscreen(true);
        showToast("Fullscreen Enabled", "info");
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
        showToast("Fullscreen Exited", "info");
      }
    } catch (e) {}
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setAppModalOpen(false);
        setDetailApp(null);
        setInterviewModalOpen(false);
        setDeleteConfirmApp(null);
        setExportModalOpen(false);
        setHelpModalOpen(false);
        setExitModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Primary Data Loader
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, apps, ivs, rems, settings] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getApplications({ search: searchQuery, status: statusFilter, job_type: jobTypeFilter }).catch(() => []),
        api.getInterviews().catch(() => []),
        api.getReminders(14).catch(() => null),
        api.getSettings().catch(() => null),
      ]);

      if (dash) setDashboardData(dash);
      if (Array.isArray(apps)) setApplications(apps);
      if (Array.isArray(ivs)) setInterviews(ivs);
      if (rems) setReminders(rems);
      if (settings && settings.applicant_name) {
        setApplicantName(settings.applicant_name);
      } else if (dash && dash.applicant_name) {
        setApplicantName(dash.applicant_name);
      }
    } catch (err) {
      console.error("Load error:", err);
      showToast("Could not sync with backend server", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, jobTypeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Seed sample demo data
  const handleSeedDemo = async () => {
    try {
      await api.seedDemo();
      showToast("Demo data populated successfully!", "success");
      loadData();
    } catch (e) {
      showToast("Could not load demo data", "error");
    }
  };

  // Filtered applications list
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      if (statusFilter !== "All" && app.status !== statusFilter) return false;
      if (jobTypeFilter !== "All" && app.job_type !== jobTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (app.company_name || "").toLowerCase();
        const role = (app.job_role || "").toLowerCase();
        const loc = (app.location || "").toLowerCase();
        const notes = (app.notes || "").toLowerCase();
        return comp.includes(q) || role.includes(q) || loc.includes(q) || notes.includes(q);
      }
      return true;
    });
  }, [applications, statusFilter, jobTypeFilter, searchQuery]);

  // Reminders total count for nav badge
  const remindersCount = useMemo(() => {
    if (!reminders) return 0;
    const t = reminders.interviews_today?.length || 0;
    const u = reminders.upcoming_interviews?.length || 0;
    const o = reminders.overdue_deadlines?.length || 0;
    return t + u + o;
  }, [reminders]);

  // All 15 navigation items mapped cleanly
  const navItems = [
    { id: "dashboard", label: "Dashboard (Overview)", icon: "dashboard" },
    { id: "applications", label: "All Applications", icon: "briefcase", count: applications.length },
    { id: "add_app", label: "+ Add Application", icon: "plus", isAction: true },
    { id: "interviews", label: "Manage Interviews", icon: "calendar", count: interviews.length },
    { id: "reminders", label: "View Reminders", icon: "bell", badge: remindersCount },
    { id: "analytics", label: "Analytics & Reports", icon: "analytics" },
    { id: "export_csv", label: "Export Data to CSV", icon: "download", isAction: true },
    { id: "settings", label: "Settings", icon: "settings" },
    { id: "help", label: "Help & User Guide", icon: "help", isAction: true },
    { id: "exit", label: "Exit JobTrack", icon: "logout", isAction: true },
  ];

  const handleNavClick = (item) => {
    if (item.id === "add_app") {
      setEditingApp(null);
      setPreviewCompanyName("");
      setAppModalOpen(true);
    } else if (item.id === "export_csv") {
      setExportModalOpen(true);
    } else if (item.id === "help") {
      setHelpModalOpen(true);
    } else if (item.id === "exit") {
      setExitModalOpen(true);
    } else {
      setActiveTab(item.id);
    }
    setDrawerOpen(false);
  };

  // Safe Application Save Handler (Fixes "does't create a new application")
  const handleSaveApplication = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const getStr = (key) => {
      const val = fd.get(key);
      if (!val || typeof val !== "string") return null;
      const t = val.trim();
      return t === "" ? null : t;
    };

    const getNum = (key) => {
      const val = getStr(key);
      if (!val) return null;
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    };

    const payload = {
      company_name: getStr("company_name") || "Company",
      job_role: getStr("job_role") || "Job Role",
      location: getStr("location") || "Remote",
      job_type: getStr("job_type") || "Full-time",
      application_date: getStr("application_date") || new Date().toISOString().split("T")[0],
      application_deadline: getStr("application_deadline"),
      job_url: getStr("job_url"),
      min_salary: getNum("min_salary"),
      max_salary: getNum("max_salary"),
      status: getStr("status") || "Applied",
      notes: getStr("notes") || "",
      applicant_name: applicantName,
    };

    try {
      if (editingApp) {
        await api.updateApplication(editingApp.application_id, payload);
        showToast("Application updated successfully!", "success");
      } else {
        await api.createApplication(payload);
        showToast("Application added to pipeline!", "success");
      }
      setAppModalOpen(false);
      setEditingApp(null);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to save application", "error");
    }
  };

  // Render Session Closed Screen (Feature 15)
  if (sessionClosed) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0B1020] p-6 text-center animate-fade-in">
        <div className="max-w-md w-full bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Icon name="briefcase" className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Thank You, {applicantName}!</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All your {applications.length} applications and interview schedules are safely persisted in <code>data/applications.json</code>.
          </p>
          <div className="pt-3">
            <button
              onClick={() => setSessionClosed(false)}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Resume JobTrack Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#F8FAFC] dark:bg-[#0B1020] text-[#0F172A] dark:text-[#F8FAFC] select-none">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in pointer-events-none">
          <div className={`px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl border flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-rose-950 text-rose-200 border-rose-800"
              : toast.type === "success"
              ? "bg-emerald-950 text-emerald-200 border-emerald-800"
              : "bg-slate-900 text-white border-slate-700"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              toast.type === "error" ? "bg-rose-400" : toast.type === "success" ? "bg-emerald-400" : "bg-brand-400"
            }`}></span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        ></div>
      )}

      {/* =================================================================== */}
      {/* Sidebar Navigation (Persistent on Desktop, Slide-out on Mobile)     */}
      {/* =================================================================== */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 bg-[#0F172A] dark:bg-[#0D1527] border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 flex-shrink-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
                <Icon name="briefcase" className="w-5 h-5" />
              </div>
              <span className="font-black text-white text-base tracking-tight">JobTrack <span className="text-brand-400">Pro</span></span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          {/* Candidate Card */}
          <div
            onClick={() => { setActiveTab("settings"); setDrawerOpen(false); }}
            className="m-3 p-3 rounded-2xl bg-[#131E35] border border-slate-800/80 flex items-center gap-3 cursor-pointer hover:border-slate-700 transition"
            title="Candidate Profile Settings"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow flex-shrink-0">
              {applicantName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "NC"}
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-brand-600/20 text-brand-400 border border-brand-500/30 shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} className={`w-4 h-4 ${active ? "text-brand-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  ) : item.count !== undefined ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      active ? "bg-brand-500 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Quick Demo Seeder */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={handleSeedDemo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-[#131E35] hover:bg-[#1C2A4A] text-slate-200 transition border border-slate-700/60 shadow-sm cursor-pointer"
          >
            <Icon name="sparkles" className="w-4 h-4 text-amber-400" />
            <span>Load Demo Data</span>
          </button>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* Main Content Area                                                  */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-6 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Open Navigation"
            >
              <Icon name="menu" className="w-5 h-5" />
            </button>

            {/* Instant Search Bar (Feature 7) */}
            <div className="relative w-48 sm:w-64 md:w-80">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search company, role, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isFullscreen ? "bg-brand-600/30 text-brand-300" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode (F11)"}
            >
              <Icon name={isFullscreen ? "compress" : "expand"} className="w-4 h-4" />
            </button>

            {/* + Add Application Button (Feature 2) */}
            <button
              onClick={() => { setEditingApp(null); setPreviewCompanyName(""); setAppModalOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md active:scale-95 transition cursor-pointer"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Application</span>
            </button>

            {/* Export CSV Button (Feature 12) */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition cursor-pointer"
              title="Export CSV"
            >
              <Icon name="download" className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Reminders Bell (Feature 10) */}
            <button
              onClick={() => setActiveTab("reminders")}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="View Reminders"
            >
              <Icon name="bell" className="w-4 h-4" />
              {remindersCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Toggle Theme"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {/* Candidate Avatar Pill */}
            <div
              onClick={() => setActiveTab("settings")}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow hover:scale-105 transition"
              title="Candidate Profile & Settings"
            >
              {applicantName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "NC"}
            </div>
          </div>
        </header>

        {/* Scrollable Main Views Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6 space-y-6">

          {/* =================================================================== */}
          {/* FEATURE 1: DASHBOARD (QUICK OVERVIEW)                               */}
          {/* =================================================================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
              {/* Executive Welcome Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                    JobTrack Pro Pipeline
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black">Welcome back, {applicantName}!</h2>
                  <p className="text-xs text-white/80">
                    You have <strong className="text-white">{applications.length}</strong> tracked applications and <strong className="text-white">{interviews.length}</strong> interview rounds scheduled.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingApp(null); setPreviewCompanyName(""); setAppModalOpen(true); }}
                    className="px-4 py-2 rounded-xl bg-white text-brand-600 hover:bg-slate-100 font-extrabold text-xs shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    <span>New Application</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("applications")}
                    className="px-4 py-2 rounded-xl bg-brand-700/60 hover:bg-brand-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    View All
                  </button>
                </div>
              </div>

              {/* 4 Metric KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Total Applications</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{applications.length}</p>
                  <span className="text-[10px] text-blue-400 font-semibold">[Feature 3] Pipeline Base</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Active Interviews</span>
                  <p className="text-2xl font-black text-purple-400">
                    {applications.filter(a => a.status === "Interview").length}
                  </p>
                  <span className="text-[10px] text-purple-400 font-semibold">{interviews.length} rounds scheduled</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Offers Received</span>
                  <p className="text-2xl font-black text-emerald-400">
                    {applications.filter(a => a.status === "Offer Received" || a.status === "Selected").length}
                  </p>
                  <span className="text-[10px] text-emerald-400 font-semibold">Ready for decision</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Reminders Due</span>
                  <p className="text-2xl font-black text-rose-400">{remindersCount}</p>
                  <span className="text-[10px] text-rose-400 font-semibold">Today & upcoming</span>
                </div>
              </div>

              {/* Spotlight: Today & Upcoming Interviews Banner */}
              {reminders && reminders.interviews_today && reminders.interviews_today.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
                    <div>
                      <h4 className="font-extrabold text-sm text-rose-400">Interview Scheduled for Today!</h4>
                      <p className="text-xs text-slate-300">
                        You have {reminders.interviews_today.length} scheduled round today. Review notes and prepare.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("reminders")}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    View Schedule
                  </button>
                </div>
              )}

              {/* Recent Applications Snapshot */}
              <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Recent Applications</h3>
                  <button
                    onClick={() => setActiveTab("applications")}
                    className="text-xs font-bold text-brand-500 hover:underline cursor-pointer"
                  >
                    View All &rarr;
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {applications.slice(0, 5).map((app) => (
                    <div
                      key={app.application_id}
                      onClick={() => setDetailApp(app)}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyLogo name={app.company_name} className="w-9 h-9" />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{app.company_name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{app.job_role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={app.status} />
                        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{app.application_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* FEATURE 3: VIEW ALL APPLICATIONS (& FEATURE 7 & 8 SEARCH/FILTER)    */}
          {/* =================================================================== */}
          {activeTab === "applications" && (
            <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
              {/* Header Title & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Job Applications</h2>
                  <p className="text-xs text-slate-400">Showing {filteredApps.length} of {applications.length} total records</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={jobTypeFilter}
                    onChange={(e) => setJobTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <option value="All">All Types</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                  <button
                    onClick={() => { setEditingApp(null); setPreviewCompanyName(""); setAppModalOpen(true); }}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    <span>New Application</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Horizontal Pills (Feature 8) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {["All", "Applied", "Assessment", "Interview", "Offer Received", "Selected", "Rejected", "Withdrawn"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      statusFilter === st
                        ? "bg-brand-600 text-white shadow-xs"
                        : "bg-white dark:bg-[#131E35] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Applications List */}
              {filteredApps.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Icon name="briefcase" className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">No applications match your criteria</h4>
                  <p className="text-xs text-slate-400">Try adjusting your search terms or filter pills.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredApps.map((app) => (
                    <div
                      key={app.application_id}
                      onClick={() => setDetailApp(app)}
                      className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs hover:border-slate-600 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <CompanyLogo name={app.company_name} className="w-10 h-10" />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">{app.company_name}</h4>
                            <span className="text-xs text-slate-400 truncate">• {app.job_role}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{app.location || "Remote"}</span>
                            <span>•</span>
                            <span>{app.job_type || "Full-time"}</span>
                            {(app.min_salary || app.max_salary) && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-500 font-semibold font-mono">
                                  ${(app.min_salary || app.max_salary).toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Pill & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <StatusBadge status={app.status} />
                        <span className="text-xs text-slate-400 font-mono hidden md:inline">{app.application_date}</span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setTargetAppForInterview(app); setInterviewModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition cursor-pointer"
                            title="Schedule Interview Round"
                          >
                            <Icon name="calendar" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingApp(app);
                              setPreviewCompanyName(app.company_name);
                              setAppModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Update Application"
                          >
                            <Icon name="edit" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmApp(app)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                            title="Delete Application"
                          >
                            <Icon name="trash" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* FEATURE 9: MANAGE INTERVIEWS                                        */}
          {/* =================================================================== */}
          {activeTab === "interviews" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Interview Schedule & Lifecycle</h3>
                  <p className="text-xs text-slate-400">Track interview rounds, video conference links, and log results</p>
                </div>
                <button
                  onClick={() => {
                    if (applications.length > 0) {
                      setTargetAppForInterview(applications[0]);
                      setInterviewModalOpen(true);
                    } else {
                      showToast("Create an application first to schedule rounds", "info");
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" />
                  <span>Schedule Interview</span>
                </button>
              </div>

              {interviews.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                    <Icon name="calendar" className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">No interview rounds scheduled yet</h4>
                  <p className="text-xs text-slate-400">Click Schedule Interview to add a round for any application.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((iv) => (
                    <div
                      key={iv.interview_id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">{iv.round_name}</span>
                          <span className="text-slate-500">•</span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{iv.company_name}</span>
                        </div>
                        <p className="text-xs text-slate-400">{iv.job_role}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                          <span>📅 {iv.interview_date} at {iv.interview_time}</span>
                          <span>•</span>
                          <span>{iv.interview_mode}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {iv.meeting_link && (
                          <a
                            href={iv.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-bold transition flex items-center gap-1"
                          >
                            <Icon name="link" className="w-3 h-3" />
                            <span>Join</span>
                          </a>
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          iv.outcome === "Passed" ? "bg-emerald-500/15 text-emerald-400" :
                          iv.outcome === "Failed" ? "bg-rose-500/15 text-rose-400" :
                          "bg-amber-500/15 text-amber-400"
                        }`}>
                          {iv.outcome || "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* FEATURE 10: VIEW REMINDERS                                          */}
          {/* =================================================================== */}
          {activeTab === "reminders" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-base text-slate-900 dark:text-white">Reminders & Approaching Deadlines</h3>
                <p className="text-xs text-slate-400">Proactive alerts for today's interviews, upcoming milestones, and expired deadlines</p>
              </div>

              {/* Today's Interviews */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Interviews Scheduled Today ({reminders?.interviews_today?.length || 0})
                  </h4>
                </div>

                {(!reminders?.interviews_today || reminders.interviews_today.length === 0) ? (
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                    No interviews scheduled for today. You are all clear!
                  </div>
                ) : (
                  reminders.interviews_today.map((item, idx) => {
                    const app = item.application || item;
                    const iv = item.interview || item;
                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-black text-rose-400 uppercase">TODAY at {iv.interview_time || "10:00"}</span>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white">{app.company_name} — {app.job_role}</h5>
                          <p className="text-xs text-slate-400">{iv.round_name} • {iv.interview_mode}</p>
                        </div>
                        {iv.meeting_link && (
                          <a
                            href={iv.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md"
                          >
                            Open Meeting
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Upcoming Interviews */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Upcoming Interviews (Next 14 Days) ({reminders?.upcoming_interviews?.length || 0})
                </h4>
                {(!reminders?.upcoming_interviews || reminders.upcoming_interviews.length === 0) ? (
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                    No upcoming rounds in the 14-day window.
                  </div>
                ) : (
                  reminders.upcoming_interviews.map((item, idx) => {
                    const app = item.application || item;
                    const iv = item.interview || item;
                    return (
                      <div key={idx} className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs text-purple-400">{iv.interview_date} at {iv.interview_time}</p>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{app.company_name} — {app.job_role}</p>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{iv.round_name}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* FEATURE 11: ANALYTICS AND REPORTS                                   */}
          {/* =================================================================== */}
          {activeTab === "analytics" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-base text-slate-900 dark:text-white">Pipeline Analytics & Funnel Velocity</h3>
                <p className="text-xs text-slate-400">Real-time conversion metrics calculated over your active applications</p>
              </div>

              {/* 3 Conversion Velocity Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Interview Rate</span>
                  <p className="text-3xl font-black text-purple-400">
                    {applications.length > 0
                      ? `${Math.round((applications.filter(a => a.status === "Interview" || a.status === "Offer Received" || a.status === "Selected").length / applications.length) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="text-[11px] text-slate-500">Applications reaching interview stage</p>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Offer Velocity</span>
                  <p className="text-3xl font-black text-emerald-400">
                    {applications.filter(a => a.status === "Interview" || a.status === "Offer Received" || a.status === "Selected").length > 0
                      ? `${Math.round((applications.filter(a => a.status === "Offer Received" || a.status === "Selected").length / applications.filter(a => a.status === "Interview" || a.status === "Offer Received" || a.status === "Selected").length) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="text-[11px] text-slate-500">Interviews converted to job offers</p>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Selection Rate</span>
                  <p className="text-3xl font-black text-brand-400">
                    {applications.length > 0
                      ? `${Math.round((applications.filter(a => a.status === "Selected").length / applications.length) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="text-[11px] text-slate-500">Overall acceptance & selection</p>
                </div>
              </div>

              {/* Status Breakdown Bars */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">Lifecycle Stage Distribution</h4>
                <div className="space-y-3">
                  {["Applied", "Assessment", "Interview", "Offer Received", "Selected", "Rejected", "Withdrawn"].map(st => {
                    const count = applications.filter(a => a.status === st).length;
                    const pct = applications.length > 0 ? Math.round((count / applications.length) * 100) : 0;
                    return (
                      <div key={st} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{st}</span>
                          <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* FEATURE 13: SETTINGS                                                */}
          {/* =================================================================== */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-xl mx-auto animate-fade-in">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-5">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Candidate Settings</h3>
                  <p className="text-xs text-slate-400">Configure your profile, theme mode, and reminder intervals</p>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const newName = (fd.get("applicant_name") || "").toString().trim() || "Naga Chiranjeevi";
                    const newDays = parseInt(fd.get("reminder_window_days") || "14", 10);
                    try {
                      await api.saveSettings({
                        applicant_name: newName,
                        reminder_window_days: newDays,
                        theme_mode: darkMode ? "dark" : "light",
                      });
                      setApplicantName(newName);
                      showToast("Settings saved successfully!", "success");
                    } catch (err) {
                      showToast(err.message || "Failed to save settings", "error");
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Candidate Name</label>
                    <input
                      name="applicant_name"
                      defaultValue={applicantName}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Reminder Lookahead Window (Days)</label>
                    <input
                      name="reminder_window_days"
                      type="number"
                      min="1"
                      max="90"
                      defaultValue="14"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Theme Appearance</label>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                    >
                      Currently: {darkMode ? "🌙 Sleek Dark Mode (Active)" : "☀️ Light Mode (Active)"} — Click to Switch
                    </button>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      Save Preferences
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* =================================================================== */}
      {/* FEATURE 2 & 5: ADD / UPDATE APPLICATION MODAL                       */}
      {/* =================================================================== */}
      {appModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <CompanyLogo name={previewCompanyName || editingApp?.company_name} className="w-9 h-9" />
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingApp ? "Update Job Application" : "New Job Application"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingApp ? `Application ID: ${editingApp.application_id}` : "Add an opportunity to your tracking pipeline"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAppModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApplication} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Company Name *</label>
                <input
                  name="company_name"
                  defaultValue={editingApp?.company_name || ""}
                  onChange={(e) => setPreviewCompanyName(e.target.value)}
                  required
                  placeholder="e.g. Google, Microsoft, Amazon"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Job Role *</label>
                <input
                  name="job_role"
                  defaultValue={editingApp?.job_role || ""}
                  required
                  placeholder="e.g. Full Stack Developer, ML Engineer"
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
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Employment Type</label>
                  <select
                    name="job_type"
                    defaultValue={editingApp?.job_type || "Full-time"}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Application Date</label>
                  <input
                    type="date"
                    name="application_date"
                    defaultValue={editingApp?.application_date || new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Min Salary ($)</label>
                  <input
                    type="number"
                    name="min_salary"
                    placeholder="e.g. 120000"
                    defaultValue={editingApp?.min_salary || ""}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Max Salary ($)</label>
                  <input
                    type="number"
                    name="max_salary"
                    placeholder="e.g. 150000"
                    defaultValue={editingApp?.max_salary || ""}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Job URL</label>
                <input
                  type="text"
                  name="job_url"
                  placeholder="https://careers.company.com/job/123"
                  defaultValue={editingApp?.job_url || ""}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAppModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md cursor-pointer"
                >
                  {editingApp ? "Save Changes" : "Add to Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE 4: VIEW APPLICATION DETAILS MODAL                           */}
      {/* =================================================================== */}
      {detailApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <CompanyLogo name={detailApp.company_name} className="w-12 h-12" />
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">{detailApp.company_name}</h3>
                  <p className="text-xs text-slate-400">{detailApp.job_role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-brand-300">
                      {detailApp.application_id}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(detailApp.application_id);
                        showToast(`Copied ${detailApp.application_id}`, "info");
                      }}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <Icon name="copy" className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailApp(null)} className="text-slate-400 hover:text-white">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#131E35]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                  <div className="mt-1"><StatusBadge status={detailApp.status} /></div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Application Date</span>
                  <p className="font-mono text-slate-900 dark:text-white mt-1">{detailApp.application_date}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
                  <p className="text-slate-900 dark:text-white mt-1">{detailApp.location || "Remote"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Compensation</span>
                  <p className="font-mono font-bold text-emerald-400 mt-1">
                    {detailApp.min_salary || detailApp.max_salary
                      ? `$${(detailApp.min_salary || detailApp.max_salary).toLocaleString()}`
                      : "Unspecified"}
                  </p>
                </div>
              </div>

              {detailApp.job_url && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Job Posting</span>
                  <p className="mt-1">
                    <a
                      href={detailApp.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:underline flex items-center gap-1 text-xs"
                    >
                      <Icon name="link" className="w-3.5 h-3.5" />
                      <span className="truncate">{detailApp.job_url}</span>
                    </a>
                  </p>
                </div>
              )}

              {/* Interview History */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Interview History ({detailApp.interviews?.length || 0})</span>
                {(!detailApp.interviews || detailApp.interviews.length === 0) ? (
                  <p className="text-[11px] text-slate-500 italic">No interview rounds scheduled yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {detailApp.interviews.map(iv => (
                      <div key={iv.interview_id} className="p-2 rounded-xl bg-slate-800/60 flex items-center justify-between text-[11px]">
                        <div>
                          <strong className="text-purple-300">{iv.round_name}</strong>
                          <span className="text-slate-400 ml-2 font-mono">📅 {iv.interview_date}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          iv.outcome === "Passed" ? "bg-emerald-500/20 text-emerald-400" :
                          iv.outcome === "Failed" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {iv.outcome || "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  const target = detailApp;
                  setDetailApp(null);
                  setDeleteConfirmApp(target);
                }}
                className="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
              >
                Delete Application
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = detailApp;
                    setDetailApp(null);
                    setTargetAppForInterview(target);
                    setInterviewModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  + Interview Round
                </button>
                <button
                  onClick={() => {
                    const target = detailApp;
                    setDetailApp(null);
                    setEditingApp(target);
                    setPreviewCompanyName(target.company_name);
                    setAppModalOpen(true);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SCHEDULE INTERVIEW MODAL                                            */}
      {/* =================================================================== */}
      {interviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Schedule Interview Round</h3>
                <p className="text-[11px] text-slate-400">
                  {targetAppForInterview ? `${targetAppForInterview.company_name} — ${targetAppForInterview.job_role}` : "Select application"}
                </p>
              </div>
              <button onClick={() => setInterviewModalOpen(false)} className="text-slate-400 hover:text-white">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const appId = targetAppForInterview?.application_id || fd.get("application_id");
                const payload = {
                  application_id: appId,
                  round_name: fd.get("round_name") || "Technical Assessment",
                  interview_date: fd.get("interview_date") || new Date().toISOString().split("T")[0],
                  interview_time: fd.get("interview_time") || "10:00",
                  interview_mode: fd.get("interview_mode") || "Online / Video",
                  meeting_link: fd.get("meeting_link") || "",
                  prep_notes: fd.get("prep_notes") || "",
                };

                try {
                  await api.scheduleInterview(payload);
                  showToast("Interview round scheduled!", "success");
                  setInterviewModalOpen(false);
                  loadData();
                } catch (err) {
                  showToast(err.message || "Failed to schedule interview", "error");
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {!targetAppForInterview && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Application *</label>
                  <select
                    name="application_id"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {applications.map(a => (
                      <option key={a.application_id} value={a.application_id}>
                        {a.company_name} — {a.job_role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Round Name *</label>
                <select
                  name="round_name"
                  defaultValue="Technical Assessment"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Initial Screening">Initial Screening</option>
                  <option value="Technical Assessment">Technical Assessment</option>
                  <option value="System Design">System Design</option>
                  <option value="Behavioral">Behavioral</option>
                  <option value="Final Round">Final Round</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Interview Date *</label>
                  <input
                    type="date"
                    name="interview_date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Time (24h) *</label>
                  <input
                    type="time"
                    name="interview_time"
                    defaultValue="10:00"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Meeting Link</label>
                <input
                  type="text"
                  name="meeting_link"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInterviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md cursor-pointer"
                >
                  Schedule Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE 6: DELETE CONFIRMATION MODAL                                */}
      {/* =================================================================== */}
      {deleteConfirmApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl">
              <Icon name="trash" className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">Delete Application?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <strong className="text-white">{deleteConfirmApp.company_name} — {deleteConfirmApp.job_role}</strong>? This action is permanent.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.deleteApplication(deleteConfirmApp.application_id);
                    showToast("Application deleted", "success");
                    setDeleteConfirmApp(null);
                    loadData();
                  } catch (e) {
                    showToast(e.message || "Failed to delete", "error");
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE 12: EXPORT DATA TO CSV MODAL                                */}
      {/* =================================================================== */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Icon name="download" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Export Data to CSV</h3>
                  <p className="text-[11px] text-slate-400">Spreadsheet-safe formula injection defense</p>
                </div>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="text-slate-400 hover:text-white">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Select Dataset</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: "applications", title: "All Applications", desc: `${applications.length} records with salary and dates` },
                    { id: "interviews", title: "All Interviews", desc: `${interviews.length} rounds with links and outcome status` },
                    { id: "analytics", title: "Pipeline Analytics", desc: "Key metrics, stage counts, and funnel velocity" },
                  ].map(item => (
                    <div
                      key={item.id}
                      onClick={() => setExportType(item.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        exportType === item.id
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                          : "bg-slate-50 dark:bg-[#131E35] border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        exportType === item.id ? "border-emerald-400 bg-emerald-400" : "border-slate-600"
                      }`}>
                        {exportType === item.id && <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {exportType === "applications" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Optional Status Filter</label>
                  <select
                    value={exportStatus}
                    onChange={(e) => setExportStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131E35] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="All">All Statuses (Full Pipeline)</option>
                    <option value="Applied">Applied Only</option>
                    <option value="Assessment">Assessment Only</option>
                    <option value="Interview">Interview Only</option>
                    <option value="Offer Received">Offer Received Only</option>
                    <option value="Selected">Selected Only</option>
                    <option value="Rejected">Rejected Only</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  api.exportCSV(exportType, exportStatus);
                  showToast("CSV export generated!", "success");
                  setExportModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE 14: HELP & USER GUIDE MODAL                                 */}
      {/* =================================================================== */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Icon name="help" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Help & User Guide</h3>
                  <p className="text-[11px] text-slate-400">Complete reference for all 15 JobTrack features</p>
                </div>
              </div>
              <button onClick={() => setHelpModalOpen(false)} className="text-slate-400 hover:text-white">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1.5">15 Core Feature Suite</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[1] Dashboard</strong>: Pipeline overview</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[2] Add Application</strong>: Create new record</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[3] View All</strong>: Tabular pipeline list</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[4] View Details</strong>: Full application card</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[5] Update</strong>: Edit fields & salary</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[6] Delete</strong>: Safe confirmed removal</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[7] Search</strong>: Instant role/company search</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[8] Filter</strong>: By status & job type</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[9] Manage Interviews</strong>: Rounds & outcomes</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[10] View Reminders</strong>: Today & upcoming alerts</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[11] Analytics</strong>: Conversion velocity</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[12] Export CSV</strong>: Spreadsheet-safe export</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[13] Settings</strong>: Candidate name & theme</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35]"><strong>[14] Help & Guide</strong>: This interactive guide</div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131E35] sm:col-span-2"><strong>[15] Exit</strong>: Conclude session cleanly</div>
                </div>
              </div>

              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white mb-1">Keyboard Shortcuts</h4>
                <div className="space-y-1 text-[11px]">
                  <p><code className="px-1.5 py-0.5 rounded bg-slate-800 text-brand-300 font-mono">F11</code> : Toggle edge-to-edge fullscreen</p>
                  <p><code className="px-1.5 py-0.5 rounded bg-slate-800 text-brand-300 font-mono">Esc</code> : Close any open modal or drawer</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
                🔒 <strong>Atomic File Persistence:</strong> All changes are written directly to <code>data/applications.json</code> using atomic temp-file replacement, preventing data loss.
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE 15: EXIT CONFIRMATION MODAL                                 */}
      {/* =================================================================== */}
      {exitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <Icon name="logout" className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">Exit JobTrack?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Candidate: <strong className="text-white">{applicantName}</strong>
              </p>
            </div>
            <p className="text-xs text-slate-400">
              All {applications.length} applications and interview records are safely saved. Ready to conclude?
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setExitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                Keep Working
              </button>
              <button
                onClick={() => {
                  setExitModalOpen(false);
                  setSessionClosed(true);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                Conclude Session
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =============================================================================
// React DOM Root Mounting
// =============================================================================

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
