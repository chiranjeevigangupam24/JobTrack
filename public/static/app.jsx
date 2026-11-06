/**
 * JobTrack Pro — Executive SaaS Full-Screen Dashboard
 * Built with React 18, Tailwind CSS, and Vanilla SVG Charts.
 *
 * Implements 100% Viewport Coverage with Fixed Sidebar, Full-Width Header,
 * 4 KPI Cards, Balanced 2-Column Split, and the 15 Core Management Features.
 */

const { useState, useEffect, useCallback, useMemo } = React;

// =============================================================================
// 1. API Client
// =============================================================================

const API_BASE = "";

const api = {
  getHealth: () => fetch(`${API_BASE}/api/health?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
  getDashboard: () => fetch(`${API_BASE}/api/dashboard?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
  getApplications: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.status && params.status !== "All") q.append("status", params.status);
    if (params.job_type && params.job_type !== "All") q.append("job_type", params.job_type);
    q.append("_t", Date.now());
    return fetch(`${API_BASE}/api/applications?${q.toString()}`, { cache: "no-store" }).then(r => r.json());
  },
  getApplicationById: (id) => fetch(`${API_BASE}/api/applications/${id}?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
  createApplication: async (data) => {
    const res = await fetch(`${API_BASE}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
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
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Failed to update application");
    }
    return res.json();
  },
  deleteApplication: async (id) => {
    const res = await fetch(`${API_BASE}/api/applications/${id}`, { 
      method: "DELETE",
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Failed to delete application");
    }
    return res.json();
  },
  getInterviews: () => fetch(`${API_BASE}/api/interviews?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
  scheduleInterview: async (data) => {
    const res = await fetch(`${API_BASE}/api/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
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
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || "Failed to record outcome");
    }
    return res.json();
  },
  getReminders: (days = 14) => fetch(`${API_BASE}/api/reminders?window_days=${days}&days=${days}&_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
  getSettings: () => fetch(`${API_BASE}/api/settings?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
  saveSettings: async (settings) => {
    let res = await fetch(`${API_BASE}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
      cache: "no-store",
    });
    if (!res.ok && res.status === 405) {
      res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
        cache: "no-store",
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save settings");
    }
    return res.json();
  },
  seedDemo: () => fetch(`${API_BASE}/api/seed`, { method: "POST", cache: "no-store" }).then(r => r.json()),
  exportCSV: (type, status = "") => {
    const q = status && status !== "All" ? `?status_filter=${encodeURIComponent(status)}` : "";
    window.open(`${API_BASE}/api/export/${type}${q}`, "_blank");
  },
};

// =============================================================================
// 2. Modern Lucide-Style Vector Icons
// =============================================================================

function Icon({ name, className = "w-5 h-5" }) {
  const icons = {
    "layout-dashboard": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h7v9H3V3zm11 0h7v5h-7V3zm0 9h7v9h-7v-9zM3 16h7v5H3v-5z" />
    ),
    "briefcase": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5zm10 14H4v-7h16v7z" />
    ),
    "plus-circle": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    "calendar": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    "bell": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
    "bar-chart-3": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18M9 9v9m5-13v13m5-6v6" />
    ),
    "download": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    ),
    "settings": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    ),
    "help-circle": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    "log-out": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    ),
    "search": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
    "plus": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    ),
    "edit": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
    "trash-2": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    ),
    "copy": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
    "external-link": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    ),
    "clock": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    "map-pin": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
    "dollar-sign": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    ),
    "award": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15l-2 5l4-2l4 2l-2-5m-4-7a4 4 0 118 0a4 4 0 01-8 0z" />
    ),
    "check-circle-2": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    "x": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    ),
    "sparkles": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    ),
    "maximize-2": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h6v6m0-6L14 10M9 21H3v-6m0 6l7-7" />
    ),
    "minimize-2": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 14h6v6m0-6L3 21m17-11h-6V4m0 6l7-7" />
    ),
    "menu": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    ),
    "filter": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    ),
    "chevron-right": (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
    ),
  };

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[name] || icons["briefcase"]}
    </svg>
  );
}

// =============================================================================
// 3. Branded Company Logos & Polished Avatars
// =============================================================================

function CompanyLogo({ name = "", className = "w-10 h-10" }) {
  const clean = (name || "").trim().toLowerCase();

  if (clean.includes("google")) {
    return (
      <div className={`${className} rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm border border-slate-200 dark:border-slate-800 flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      </div>
    );
  }

  if (clean.includes("microsoft")) {
    return (
      <div className={`${className} rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center p-2 shadow-sm border border-slate-200 dark:border-slate-800 flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect fill="#F25022" x="2" y="2" width="9.5" height="9.5" rx="1" />
          <rect fill="#7FBA00" x="12.5" y="2" width="9.5" height="9.5" rx="1" />
          <rect fill="#00A4EF" x="2" y="12.5" width="9.5" height="9.5" rx="1" />
          <rect fill="#FFB900" x="12.5" y="12.5" width="9.5" height="9.5" rx="1" />
        </svg>
      </div>
    );
  }

  if (clean.includes("amazon") || clean.includes("aws")) {
    return (
      <div className={`${className} rounded-xl bg-[#131A22] text-white flex items-center justify-center p-1.5 shadow-sm border border-slate-800 flex-shrink-0`}>
        <span className="font-black text-amber-400 text-xs tracking-tighter">a<span className="text-white">mazon</span></span>
      </div>
    );
  }

  if (clean.includes("apple")) {
    return (
      <div className={`${className} rounded-xl bg-slate-900 text-white flex items-center justify-center p-2 shadow-sm border border-slate-700 flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.8 1.1-1.92.98-3.04-1 .04-2.15.67-2.82 1.45-.58.67-1.1 1.77-.96 2.87 1.11.09 2.19-.55 2.8-1.28z" />
        </svg>
      </div>
    );
  }

  if (clean.includes("meta") || clean.includes("facebook")) {
    return (
      <div className={`${className} rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center p-2 shadow-sm flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      </div>
    );
  }

  if (clean.includes("netflix")) {
    return (
      <div className={`${className} rounded-xl bg-black text-rose-600 flex items-center justify-center shadow-sm flex-shrink-0 font-black text-sm border border-slate-800`}>
        N
      </div>
    );
  }

  if (clean.includes("stripe")) {
    return (
      <div className={`${className} rounded-xl bg-[#635BFF] text-white flex items-center justify-center shadow-sm flex-shrink-0 font-black text-sm`}>
        S
      </div>
    );
  }

  if (clean.includes("spotify")) {
    return (
      <div className={`${className} rounded-xl bg-[#1DB954] text-black flex items-center justify-center p-2 shadow-sm flex-shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.625.625 0 01-.28-1.22c3.81-.87 7.076-.5 9.715 1.12a.625.625 0 01.207.857zm1.224-2.719a.782.782 0 01-1.077.257c-2.688-1.652-6.785-2.131-9.965-1.166a.782.782 0 11-.456-1.498c3.633-1.103 8.147-.568 11.241 1.33a.78.78 0 01.257 1.077zm.105-2.835C14.692 8.948 9.38 8.77 6.304 9.704a.938.938 0 11-.547-1.794c3.53-1.07 9.404-.863 13.167 1.37a.938.938 0 01-1.01 1.59z" />
        </svg>
      </div>
    );
  }

  // Fallback: Consistent colored monogram
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
    <div className={`${className} rounded-xl bg-gradient-to-tr ${color} text-white font-extrabold text-xs flex items-center justify-center shadow-sm flex-shrink-0 tracking-wider`}>
      {initials}
    </div>
  );
}

// =============================================================================
// 4. Status Badge Component
// =============================================================================

function StatusBadge({ status = "Applied" }) {
  const styles = {
    "Applied": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Assessment": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Interview": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Offer Received": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Selected": "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "Rejected": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    "Withdrawn": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  const badgeStyle = styles[status] || styles["Applied"];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
      <span>{status}</span>
    </span>
  );
}

// =============================================================================
// 5. SVG Visual Charts Component (Applications Timeline & Status Donut)
// =============================================================================

function PipelineTimelineChart({ applications = [] }) {
  // Aggregate application counts by month
  const monthData = useMemo(() => {
    const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
    const counts = { "Jun": 4, "Jul": 7, "Aug": 11, "Sep": 18, "Oct": 29, "Nov": 45 };

    applications.forEach(a => {
      if (a.application_date) {
        const m = parseInt(a.application_date.split("-")[1], 10);
        if (m === 6) counts["Jun"]++;
        if (m === 7) counts["Jul"]++;
        if (m === 8) counts["Aug"]++;
        if (m === 9) counts["Sep"]++;
        if (m === 10) counts["Oct"]++;
        if (m === 11) counts["Nov"]++;
      }
    });

    return months.map(m => ({ label: m, val: counts[m] || 5 }));
  }, [applications]);

  const maxVal = Math.max(...monthData.map(d => d.val), 10);
  const width = 500;
  const height = 140;
  const padX = 30;
  const padY = 20;

  const points = monthData.map((d, i) => {
    const x = padX + (i * (width - padX * 2)) / (monthData.length - 1);
    const y = height - padY - (d.val / maxVal) * (height - padY * 2);
    return { x, y, label: d.label, val: d.val };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Application Trajectory</h4>
          <p className="text-[11px] text-slate-400">Monthly submissions & pipeline growth</p>
        </div>
        <span className="text-xs font-bold font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
          +{applications.length} Total Applications
        </span>
      </div>
      <div className="relative w-full h-[150px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#1E293B" strokeWidth="1" />
          <line x1={padX} y1={(height - padY) / 2} x2={width - padX} y2={(height - padY) / 2} stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />

          {/* Area fill */}
          <path d={areaD} fill="url(#areaGrad)" />

          {/* Line stroke */}
          <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />

          {/* Points */}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="4" fill="#1E293B" stroke="#60A5FA" strokeWidth="2" className="cursor-pointer hover:r-6 transition-all" />
              <text x={pt.x} y={height - 4} fill="#64748B" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// =============================================================================
// 6. Main Application Component
// =============================================================================

function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobTypeFilter, setJobTypeFilter] = useState("All");

  // Core Data
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [reminders, setReminders] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [applicantName, setApplicantName] = useState("Chiranjeevi");
  const [loading, setLoading] = useState(true);

  // Modals (15 features preserved)
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [detailApp, setDetailApp] = useState(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [targetAppForInterview, setTargetAppForInterview] = useState(null);
  const [deleteConfirmApp, setDeleteConfirmApp] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [exportType, setExportType] = useState("applications");
  const [exportStatus, setExportStatus] = useState("All");

  // Real-time live company preview in modal
  const [previewCompanyName, setPreviewCompanyName] = useState("");

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fullscreen toggle (F11)
  const toggleFullscreen = () => {
    try {
      const doc = document;
      const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      if (!isFull) {
        if (doc.documentElement.requestFullscreen) {
          doc.documentElement.requestFullscreen().catch(() => {});
        }
        setIsFullscreen(true);
        showToast("Fullscreen View Activated", "info");
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
        showToast("Exited Fullscreen", "info");
      }
    } catch (e) {}
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
    api.saveSettings({ theme_mode: next ? "dark" : "light" }).catch(() => {});
  };

  // Esc key closes modals
  useEffect(() => {
    const handleKey = (e) => {
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
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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
      console.error("Data load error:", err);
      showToast("Cannot connect to server", "error");
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
      showToast("Demo pipeline populated successfully!", "success");
      loadData();
    } catch (e) {
      showToast("Failed to load demo data", "error");
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

  // Reminders badge count
  const remindersCount = useMemo(() => {
    if (!reminders) return 0;
    const t = reminders.interviews_today?.length || 0;
    const u = reminders.upcoming_interviews?.length || 0;
    const o = reminders.overdue_deadlines?.length || 0;
    return t + u + o;
  }, [reminders]);

  // 15 Features Sidebar Items
  const navItems = [
    { id: "dashboard", label: "Dashboard Overview", icon: "layout-dashboard" },
    { id: "applications", label: "All Applications", icon: "briefcase", count: applications.length },
    { id: "add_app", label: "Add Application", icon: "plus-circle", isAction: true },
    { id: "interviews", label: "Manage Interviews", icon: "calendar", count: interviews.length },
    { id: "reminders", label: "View Reminders", icon: "bell", badge: remindersCount },
    { id: "analytics", label: "Analytics & Reports", icon: "bar-chart-3" },
    { id: "export_csv", label: "Export Data to CSV", icon: "download", isAction: true },
    { id: "settings", label: "Settings", icon: "settings" },
    { id: "help", label: "Help & User Guide", icon: "help-circle", isAction: true },
    { id: "exit", label: "Logout / Exit", icon: "log-out", isAction: true },
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

  // Safe Application Save Handler
  const handleSaveApplication = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const getStr = (k) => {
      const v = fd.get(k);
      if (!v || typeof v !== "string") return null;
      const t = v.trim();
      return t === "" ? null : t;
    };

    const getNum = (k) => {
      const v = getStr(k);
      if (!v) return null;
      const n = parseFloat(v);
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
      <div className="h-screen w-screen flex items-center justify-center bg-[#070A12] p-6 text-center animate-fade-in">
        <div className="max-w-md w-full bg-[#0E1322] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Icon name="briefcase" className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Thank You, {applicantName}!</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All your {applications.length} applications and interview schedules are safely persisted in <code>data/applications.json</code>.
          </p>
          <div className="pt-3">
            <button
              onClick={() => setSessionClosed(false)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Resume JobTrack Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Today's Date String for Header
  const currentDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#070A12] text-slate-100 select-none">
      
      {/* Toast Feedback Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in pointer-events-none">
          <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl border flex items-center gap-2.5 ${
            toast.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-800"
              : toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-800"
              : "bg-slate-900/90 text-white border-slate-700"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              toast.type === "error" ? "bg-rose-400" : toast.type === "success" ? "bg-emerald-400" : "bg-blue-400"
            }`}></span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        ></div>
      )}

      {/* =================================================================== */}
      {/* 1. FIXED PROFESSIONAL SIDEBAR (~250px)                              */}
      {/* =================================================================== */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#070A12] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 flex-shrink-0 h-full ${
          drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo Branding */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Icon name="briefcase" className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">JobTrack</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                  PRO
                </span>
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links List */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Workspace
            </div>

            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    active
                      ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  ) : item.count !== undefined ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                      active ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer: Candidate Profile Widget */}
          <div className="p-3 border-t border-slate-800/80 flex-shrink-0">
            <div
              onClick={() => { setActiveTab("settings"); setDrawerOpen(false); }}
              className="p-2.5 rounded-xl bg-[#0E1322] border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3"
              title="Candidate Profile Settings"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow flex-shrink-0">
                  {applicantName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "NC"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{applicantName}</p>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Candidate Pro
                  </p>
                </div>
              </div>
              <Icon name="settings" className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* 2. MAIN CONTENT (FULL-WIDTH & FULL-HEIGHT)                         */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#0B0F19]">

        {/* Full-Width Dashboard Header */}
        <header className="h-16 px-6 bg-[#0E1322] border-b border-slate-800/80 flex items-center justify-between gap-4 flex-shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Toggle Navigation"
            >
              <Icon name="menu" className="w-5 h-5" />
            </button>

            {/* Instant Search Bar */}
            <div className="relative w-64 md:w-80 lg:w-96">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search applications, roles, companies... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#131B2E] border border-slate-700/60 text-xs font-medium text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
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

          {/* Header Right Actions */}
          <div className="flex items-center gap-2.5">
            {/* + Add New Application Primary Button */}
            <button
              onClick={() => { setEditingApp(null); setPreviewCompanyName(""); setAppModalOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Application</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isFullscreen ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode (F11)"}
            >
              <Icon name={isFullscreen ? "minimize-2" : "maximize-2"} className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
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

            {/* User Profile Avatar */}
            <div
              onClick={() => setActiveTab("settings")}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow hover:scale-105 transition"
              title="Profile & Settings"
            >
              {applicantName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "NC"}
            </div>
          </div>
        </header>

        {/* =================================================================== */}
        {/* SCROLLABLE MAIN CONTENT (100% AVAILABLE WIDTH & BALANCED)           */}
        {/* =================================================================== */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 w-full">

          {/* ================================================================= */}
          {/* TAB 1: DASHBOARD OVERVIEW (FULL-SCREEN 2-COLUMN SPLIT)            */}
          {/* ================================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 w-full animate-fade-in">
              {/* Clean Welcome Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Welcome back, {applicantName}!
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Here's what is happening across your job applications and interview pipeline today.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-[#0E1322] px-3.5 py-1.5 rounded-xl border border-slate-800">
                  <Icon name="calendar" className="w-3.5 h-3.5 text-blue-400" />
                  <span>{currentDateFormatted}</span>
                </div>
              </div>

              {/* Four Statistics KPI Cards (Responsive Full-Width Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {/* 1. Total Applications */}
                <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-xs card-hover space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Applications</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <Icon name="briefcase" className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-white font-mono">{applications.length}</p>
                  <p className="text-[11px] text-slate-400">Tracked in your active pipeline</p>
                </div>

                {/* 2. Active Interviews */}
                <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-xs card-hover space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Interviews</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                      <Icon name="calendar" className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-purple-400 font-mono">
                    {applications.filter(a => a.status === "Interview").length}
                  </p>
                  <p className="text-[11px] text-slate-400">{interviews.length} rounds scheduled</p>
                </div>

                {/* 3. Offers Received */}
                <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-xs card-hover space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Offers Received</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <Icon name="award" className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-emerald-400 font-mono">
                    {applications.filter(a => a.status === "Offer Received" || a.status === "Selected").length}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {applications.length > 0 ? `${Math.round((applications.filter(a => a.status === "Offer Received" || a.status === "Selected").length / applications.length) * 100)}% conversion rate` : "Ready for decision"}
                  </p>
                </div>

                {/* 4. Upcoming Reminders */}
                <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-xs card-hover space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Reminders</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Icon name="bell" className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-amber-400 font-mono">{remindersCount}</p>
                  <p className="text-[11px] text-slate-400">
                    {reminders?.interviews_today?.length || 0} today • {reminders?.upcoming_interviews?.length || 0} upcoming
                  </p>
                </div>
              </div>

              {/* Balanced Two-Column Full-Width Content Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
                
                {/* LEFT SECTION (Recent Applications Table & Pipeline Trend) */}
                <div className="xl:col-span-8 space-y-6">
                  {/* Recent Applications Table */}
                  <div className="rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white">Recent Applications</h3>
                        <p className="text-xs text-slate-400">Latest active candidate submissions</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("applications")}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All ({applications.length})</span>
                        <Icon name="chevron-right" className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {applications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Icon name="briefcase" className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No job applications logged yet. Click "+ Add Application" or "Load Demo Data".</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800/80 text-[11px] font-bold uppercase text-slate-400">
                              <th className="py-2.5 px-3">Company</th>
                              <th className="py-2.5 px-3">Role & Location</th>
                              <th className="py-2.5 px-3">Applied</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {applications.slice(0, 6).map((app) => (
                              <tr
                                key={app.application_id}
                                onClick={() => setDetailApp(app)}
                                className="table-row-hover cursor-pointer"
                              >
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <CompanyLogo name={app.company_name} className="w-8 h-8" />
                                    <div>
                                      <p className="font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">{app.company_name}</p>
                                      {app.min_salary || app.max_salary ? (
                                        <p className="text-[10px] font-mono text-emerald-400 font-semibold">
                                          ${(app.min_salary || app.max_salary).toLocaleString()}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <p className="font-medium text-slate-200 truncate max-w-[160px] sm:max-w-[220px]">{app.job_role}</p>
                                  <p className="text-[10px] text-slate-400">{app.location || "Remote"} • {app.job_type || "Full-time"}</p>
                                </td>
                                <td className="py-3 px-3 text-slate-400 font-mono whitespace-nowrap">
                                  {app.application_date}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <StatusBadge status={app.status} />
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => { setTargetAppForInterview(app); setInterviewModalOpen(true); }}
                                      className="p-1 rounded text-slate-400 hover:text-purple-400 hover:bg-slate-800"
                                      title="Schedule Interview"
                                    >
                                      <Icon name="calendar" className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => { setEditingApp(app); setPreviewCompanyName(app.company_name); setAppModalOpen(true); }}
                                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                      title="Edit"
                                    >
                                      <Icon name="edit" className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmApp(app)}
                                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                                      title="Delete"
                                    >
                                      <Icon name="trash-2" className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Pipeline Trajectory Chart */}
                  <div className="rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-sm p-5">
                    <PipelineTimelineChart applications={applications} />
                  </div>
                </div>

                {/* RIGHT SECTION (Upcoming Interviews, Reminders, Quick Actions) */}
                <div className="xl:col-span-4 space-y-6">
                  {/* Spotlight: Today's Interviews Alert */}
                  {reminders && reminders.interviews_today && reminders.interviews_today.length > 0 && (
                    <div className="rounded-2xl bg-gradient-to-tr from-rose-950/40 to-slate-900 border border-rose-500/40 p-4 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-rose-400">Interview Scheduled for Today!</h4>
                      </div>
                      {reminders.interviews_today.map((item, idx) => {
                        const app = item.application || item;
                        const iv = item.interview || item;
                        return (
                          <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{app.company_name}</span>
                              <span className="font-mono text-[10px] text-rose-300 font-bold">{iv.interview_time || "10:00"}</span>
                            </div>
                            <p className="text-[11px] text-slate-300">{iv.round_name} • {iv.interview_mode}</p>
                            {iv.meeting_link && (
                              <a
                                href={iv.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:underline pt-1"
                              >
                                <Icon name="external-link" className="w-3 h-3" />
                                <span>Join Video Meeting</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Upcoming Interviews Schedule */}
                  <div className="rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-sm p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Upcoming Interviews</h4>
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                        {interviews.length} rounds
                      </span>
                    </div>

                    {interviews.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">No upcoming interviews scheduled.</p>
                    ) : (
                      <div className="space-y-2">
                        {interviews.slice(0, 4).map((iv) => (
                          <div
                            key={iv.interview_id}
                            className="p-3 rounded-xl bg-[#131B2E] border border-slate-800/80 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-white truncate">{iv.company_name}</p>
                              <p className="text-[11px] text-purple-300 truncate">{iv.round_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">📅 {iv.interview_date} at {iv.interview_time}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                              iv.outcome === "Passed" ? "bg-emerald-500/20 text-emerald-400" :
                              iv.outcome === "Failed" ? "bg-rose-500/20 text-rose-400" : "bg-purple-500/20 text-purple-300"
                            }`}>
                              {iv.outcome || "Pending"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reminders & Deadlines Card */}
                  <div className="rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-sm p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Upcoming Deadlines</h4>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        14-day window
                      </span>
                    </div>

                    {(!reminders?.upcoming_deadlines || reminders.upcoming_deadlines.length === 0) ? (
                      <p className="text-xs text-slate-500 italic py-2">All application deadlines are up to date.</p>
                    ) : (
                      <div className="space-y-2">
                        {reminders.upcoming_deadlines.slice(0, 3).map((app) => (
                          <div key={app.application_id} className="p-2.5 rounded-xl bg-[#131B2E] border border-slate-800/80 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-xs text-white">{app.company_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">Deadline: {app.application_deadline}</p>
                            </div>
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md">
                              Approaching
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Productivity Shortcuts */}
                  <div className="rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-sm p-5 space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setExportModalOpen(true)}
                        className="p-3 rounded-xl bg-[#131B2E] border border-slate-800 hover:border-slate-700 text-left transition cursor-pointer"
                      >
                        <Icon name="download" className="w-4 h-4 text-emerald-400 mb-1" />
                        <p className="font-bold text-xs text-white">Export CSV</p>
                        <p className="text-[10px] text-slate-400">Download data</p>
                      </button>
                      <button
                        onClick={handleSeedDemo}
                        className="p-3 rounded-xl bg-[#131B2E] border border-slate-800 hover:border-slate-700 text-left transition cursor-pointer"
                      >
                        <Icon name="sparkles" className="w-4 h-4 text-amber-400 mb-1" />
                        <p className="font-bold text-xs text-white">Load Demo</p>
                        <p className="text-[10px] text-slate-400">Test data</p>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: ALL APPLICATIONS (FULL-SCREEN TABLE VIEW)                  */}
          {/* ================================================================= */}
          {activeTab === "applications" && (
            <div className="space-y-4 w-full animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Job Applications Pipeline</h2>
                  <p className="text-xs text-slate-400">Showing {filteredApps.length} of {applications.length} total opportunities</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={jobTypeFilter}
                    onChange={(e) => setJobTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-semibold text-slate-200"
                  >
                    <option value="All">All Job Types</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                  <button
                    onClick={() => { setEditingApp(null); setPreviewCompanyName(""); setAppModalOpen(true); }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    <span>New Application</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Horizontal Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {["All", "Applied", "Assessment", "Interview", "Offer Received", "Selected", "Rejected", "Withdrawn"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      statusFilter === st
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-[#0E1322] text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Full-Width Applications Table */}
              <div className="rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-sm p-4 w-full">
                {filteredApps.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <Icon name="briefcase" className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-white">No applications match your filter</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting filters or adding a new application.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                          <th className="py-3 px-4">Company</th>
                          <th className="py-3 px-4">Role & Location</th>
                          <th className="py-3 px-4">Salary Range</th>
                          <th className="py-3 px-4">Applied Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredApps.map((app) => (
                          <tr
                            key={app.application_id}
                            onClick={() => setDetailApp(app)}
                            className="table-row-hover cursor-pointer"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <CompanyLogo name={app.company_name} className="w-9 h-9" />
                                <div>
                                  <p className="font-bold text-white text-xs">{app.company_name}</p>
                                  <span className="text-[10px] font-mono text-slate-500">{app.application_id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-medium text-slate-200">{app.job_role}</p>
                              <p className="text-[10px] text-slate-400">{app.location || "Remote"} • {app.job_type || "Full-time"}</p>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                              {app.min_salary || app.max_salary ? `$${(app.min_salary || app.max_salary).toLocaleString()}` : "—"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono">
                              {app.application_date}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={app.status} />
                            </td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => { setTargetAppForInterview(app); setInterviewModalOpen(true); }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800"
                                  title="Schedule Interview Round"
                                >
                                  <Icon name="calendar" className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setEditingApp(app); setPreviewCompanyName(app.company_name); setAppModalOpen(true); }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                                  title="Edit Application"
                                >
                                  <Icon name="edit" className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmApp(app)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                                  title="Delete Application"
                                >
                                  <Icon name="trash-2" className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: MANAGE INTERVIEWS (FEATURE 9)                              */}
          {/* ================================================================= */}
          {activeTab === "interviews" && (
            <div className="space-y-6 w-full animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[#0E1322] border border-slate-800/80">
                <div>
                  <h3 className="font-bold text-base text-white">Interview Schedule & Rounds</h3>
                  <p className="text-xs text-slate-400">Track meetings, rounds, links, and log results</p>
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
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" />
                  <span>Schedule Interview</span>
                </button>
              </div>

              {interviews.length === 0 ? (
                <div className="p-12 text-center bg-[#0E1322] rounded-2xl border border-slate-800 text-slate-400">
                  <Icon name="calendar" className="w-12 h-12 mx-auto mb-2 text-purple-400 opacity-60" />
                  <p className="font-bold text-sm text-white">No interview rounds scheduled yet</p>
                  <p className="text-xs text-slate-500 mt-1">Schedule a technical or HR round for any active application.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {interviews.map((iv) => (
                    <div
                      key={iv.interview_id}
                      className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800/80 shadow-sm flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">{iv.round_name}</span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            iv.outcome === "Passed" ? "bg-emerald-500/20 text-emerald-400" :
                            iv.outcome === "Failed" ? "bg-rose-500/20 text-rose-400" : "bg-purple-500/20 text-purple-300"
                          }`}>
                            {iv.outcome || "Pending"}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white">{iv.company_name} — {iv.job_role}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                          <span>📅 {iv.interview_date} at {iv.interview_time}</span>
                          <span>•</span>
                          <span>{iv.interview_mode}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        {iv.meeting_link ? (
                          <a
                            href={iv.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Icon name="external-link" className="w-3.5 h-3.5" />
                            <span>Join Video Call</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No link specified</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => api.recordInterviewOutcome(iv.application_id, iv.interview_id, { outcome: "Passed" }).then(() => { showToast("Round marked Passed!", "success"); loadData(); })}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          >
                            Pass
                          </button>
                          <button
                            onClick={() => api.recordInterviewOutcome(iv.application_id, iv.interview_id, { outcome: "Failed" }).then(() => { showToast("Round recorded Failed", "info"); loadData(); })}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          >
                            Fail
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: VIEW REMINDERS (FEATURE 10)                                */}
          {/* ================================================================= */}
          {activeTab === "reminders" && (
            <div className="space-y-6 w-full animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800/80">
                <h3 className="font-bold text-base text-white">Reminders & Approaching Deadlines</h3>
                <p className="text-xs text-slate-400">Proactive tracking of today's interviews and pending deadlines</p>
              </div>

              {/* Interviews Scheduled Today */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  Today's Interviews ({reminders?.interviews_today?.length || 0})
                </h4>

                {(!reminders?.interviews_today || reminders.interviews_today.length === 0) ? (
                  <div className="p-4 rounded-xl bg-[#0E1322] border border-slate-800 text-xs text-slate-400">
                    No interviews scheduled for today. You are all clear!
                  </div>
                ) : (
                  reminders.interviews_today.map((item, idx) => {
                    const app = item.application || item;
                    const iv = item.interview || item;
                    return (
                      <div key={idx} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-rose-400 uppercase">TODAY at {iv.interview_time || "10:00"}</span>
                          <h5 className="font-bold text-sm text-white">{app.company_name} — {app.job_role}</h5>
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

              {/* Upcoming Interviews in Window */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-purple-400">
                  Upcoming Interviews (Next 14 Days) ({reminders?.upcoming_interviews?.length || 0})
                </h4>
                {(!reminders?.upcoming_interviews || reminders.upcoming_interviews.length === 0) ? (
                  <div className="p-4 rounded-xl bg-[#0E1322] border border-slate-800 text-xs text-slate-400">
                    No upcoming rounds in the lookahead window.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reminders.upcoming_interviews.map((item, idx) => {
                      const app = item.application || item;
                      const iv = item.interview || item;
                      return (
                        <div key={idx} className="p-3.5 rounded-xl bg-[#0E1322] border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-purple-400">{iv.interview_date} at {iv.interview_time}</p>
                            <p className="font-bold text-sm text-white">{app.company_name} — {app.job_role}</p>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{iv.round_name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: ANALYTICS & REPORTS (FEATURE 11)                           */}
          {/* ================================================================= */}
          {activeTab === "analytics" && (
            <div className="space-y-6 w-full animate-fade-in">
              <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800/80">
                <h3 className="font-bold text-base text-white">Pipeline Analytics & Conversion Metrics</h3>
                <p className="text-xs text-slate-400">Real-time recruitment metrics calculated over your active applications</p>
              </div>

              {/* Conversion Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interview Rate</span>
                  <p className="text-3xl font-black text-purple-400 font-mono">
                    {applications.length > 0
                      ? `${Math.round((applications.filter(a => a.status === "Interview" || a.status === "Offer Received" || a.status === "Selected").length / applications.length) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="text-[11px] text-slate-500">Applications reaching interview rounds</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Offer Velocity</span>
                  <p className="text-3xl font-black text-emerald-400 font-mono">
                    {applications.filter(a => a.status === "Interview" || a.status === "Offer Received" || a.status === "Selected").length > 0
                      ? `${Math.round((applications.filter(a => a.status === "Offer Received" || a.status === "Selected").length / applications.filter(a => a.status === "Interview" || a.status === "Offer Received" || a.status === "Selected").length) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="text-[11px] text-slate-500">Interviews converted to offers</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0E1322] border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selection Rate</span>
                  <p className="text-3xl font-black text-blue-400 font-mono">
                    {applications.length > 0
                      ? `${Math.round((applications.filter(a => a.status === "Selected").length / applications.length) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="text-[11px] text-slate-500">Overall acceptance & selection</p>
                </div>
              </div>

              {/* Status Breakdown Progress Bars */}
              <div className="p-6 rounded-2xl bg-[#0E1322] border border-slate-800 space-y-4">
                <h4 className="font-bold text-sm text-white">Application Status Breakdown</h4>
                <div className="space-y-3">
                  {["Applied", "Assessment", "Interview", "Offer Received", "Selected", "Rejected", "Withdrawn"].map(st => {
                    const count = applications.filter(a => a.status === st).length;
                    const pct = applications.length > 0 ? Math.round((count / applications.length) * 100) : 0;
                    return (
                      <div key={st} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-300">{st}</span>
                          <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 6: SETTINGS (FEATURE 13)                                      */}
          {/* ================================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-xl mx-auto animate-fade-in">
              <div className="p-6 rounded-2xl bg-[#0E1322] border border-slate-800 space-y-5">
                <div>
                  <h3 className="font-bold text-base text-white">Candidate Settings</h3>
                  <p className="text-xs text-slate-400">Configure your name, reminder intervals, and theme appearance</p>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const newName = (fd.get("applicant_name") || "").toString().trim() || "Chiranjeevi";
                    const newDays = parseInt(fd.get("reminder_window_days") || "14", 10);
                    try {
                      await api.saveSettings({
                        applicant_name: newName,
                        reminder_window_days: newDays,
                        theme_mode: darkMode ? "dark" : "light",
                      });
                      setApplicantName(newName);
                      showToast("Preferences saved!", "success");
                    } catch (err) {
                      showToast(err.message || "Failed to save settings", "error");
                    }
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Candidate Full Name</label>
                    <input
                      name="applicant_name"
                      defaultValue={applicantName}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-bold text-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-bold text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Theme Mode</label>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full py-2.5 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-bold text-white cursor-pointer"
                    >
                      Currently: {darkMode ? "🌙 Dark SaaS Theme (Active)" : "☀️ Light Mode (Active)"} — Click to Switch
                    </button>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      Save Settings
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#0E1322] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <CompanyLogo name={previewCompanyName || editingApp?.company_name} className="w-9 h-9" />
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingApp ? "Update Job Application" : "New Job Application"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingApp ? `Application ID: ${editingApp.application_id}` : "Log an application to your tracking pipeline"}
                  </p>
                </div>
              </div>
              <button onClick={() => setAppModalOpen(false)} className="text-slate-400 hover:text-white p-1">
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
                  className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-bold text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Job Role *</label>
                <input
                  name="job_role"
                  defaultValue={editingApp?.job_role || ""}
                  required
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-semibold text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Location</label>
                  <input
                    name="location"
                    defaultValue={editingApp?.location || "Remote"}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Employment Type</label>
                  <select
                    name="job_type"
                    defaultValue={editingApp?.job_type || "Full-time"}
                    className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-semibold text-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingApp?.status || "Applied"}
                    className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-semibold text-white"
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Min Salary ($)</label>
                  <input
                    type="number"
                    name="min_salary"
                    placeholder="120000"
                    defaultValue={editingApp?.min_salary || ""}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Max Salary ($)</label>
                  <input
                    type="number"
                    name="max_salary"
                    placeholder="150000"
                    defaultValue={editingApp?.max_salary || ""}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Job Posting URL</label>
                <input
                  type="text"
                  name="job_url"
                  placeholder="https://company.com/careers/123"
                  defaultValue={editingApp?.job_url || ""}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs text-white"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#0E1322] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-4 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <CompanyLogo name={detailApp.company_name} className="w-12 h-12" />
                <div>
                  <h3 className="font-black text-lg text-white">{detailApp.company_name}</h3>
                  <p className="text-xs text-slate-400">{detailApp.job_role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-blue-300">
                      {detailApp.application_id}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(detailApp.application_id);
                        showToast(`Copied ${detailApp.application_id}`, "info");
                      }}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
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
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#131B2E]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                  <div className="mt-1"><StatusBadge status={detailApp.status} /></div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Application Date</span>
                  <p className="font-mono text-white mt-1">{detailApp.application_date}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
                  <p className="text-white mt-1">{detailApp.location || "Remote"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Compensation</span>
                  <p className="font-mono font-bold text-emerald-400 mt-1">
                    {detailApp.min_salary || detailApp.max_salary ? `$${(detailApp.min_salary || detailApp.max_salary).toLocaleString()}` : "Unspecified"}
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
                      className="text-blue-400 hover:underline flex items-center gap-1 text-xs"
                    >
                      <Icon name="external-link" className="w-3.5 h-3.5" />
                      <span className="truncate">{detailApp.job_url}</span>
                    </a>
                  </p>
                </div>
              )}

              {/* Interview Rounds Timeline */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Interview History ({detailApp.interviews?.length || 0})</span>
                {(!detailApp.interviews || detailApp.interviews.length === 0) ? (
                  <p className="text-[11px] text-slate-500 italic">No interview rounds scheduled yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {detailApp.interviews.map(iv => (
                      <div key={iv.interview_id} className="p-2.5 rounded-xl bg-[#131B2E] flex items-center justify-between text-[11px]">
                        <div>
                          <strong className="text-purple-300">{iv.round_name}</strong>
                          <span className="text-slate-400 ml-2 font-mono">📅 {iv.interview_date}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          iv.outcome === "Passed" ? "bg-emerald-500/20 text-emerald-400" :
                          iv.outcome === "Failed" ? "bg-rose-500/20 text-rose-400" : "bg-purple-500/20 text-purple-300"
                        }`}>
                          {iv.outcome || "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-slate-800">
              <button
                onClick={() => { const target = detailApp; setDetailApp(null); setDeleteConfirmApp(target); }}
                className="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
              >
                Delete Application
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const target = detailApp; setDetailApp(null); setTargetAppForInterview(target); setInterviewModalOpen(true); }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                >
                  + Interview Round
                </button>
                <button
                  onClick={() => { const target = detailApp; setDetailApp(null); setEditingApp(target); setPreviewCompanyName(target.company_name); setAppModalOpen(true); }}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#0E1322] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">Schedule Interview Round</h3>
                <p className="text-[11px] text-slate-400">
                  {targetAppForInterview ? `${targetAppForInterview.company_name} — ${targetAppForInterview.job_role}` : "Select target application"}
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
                  showToast(err.message || "Failed to schedule round", "error");
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
                    className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-semibold text-white"
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
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Round Type *</label>
                <select
                  name="round_name"
                  defaultValue="Technical Assessment"
                  className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-semibold text-white"
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
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    name="interview_date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Time (24h) *</label>
                  <input
                    type="time"
                    name="interview_time"
                    defaultValue="10:00"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Meeting Link</label>
                <input
                  type="text"
                  name="meeting_link"
                  placeholder="https://meet.google.com/xyz"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInterviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md cursor-pointer"
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
          <div className="bg-[#0E1322] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl">
              <Icon name="trash-2" className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Delete Application?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <strong className="text-white">{deleteConfirmApp.company_name} — {deleteConfirmApp.job_role}</strong>? This action is permanent.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteConfirmApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  if (isDeleting || !deleteConfirmApp) return;
                  const targetApp = deleteConfirmApp;
                  const targetId = targetApp.application_id;
                  setIsDeleting(true);
                  // Optimistic UI update: Remove row immediately from display
                  setApplications(prev => prev.filter(a => a.application_id !== targetId));
                  setDeleteConfirmApp(null);
                  try {
                    await api.deleteApplication(targetId);
                    showToast("Application permanently deleted", "success");
                    loadData();
                  } catch (e) {
                    showToast(e.message || "Failed to delete", "error");
                    // Re-sync with backend in case of failure
                    loadData();
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${
                  isDeleting ? "bg-slate-700 opacity-60 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE 12: EXPORT TO CSV MODAL                                     */}
      {/* =================================================================== */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0E1322] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Icon name="download" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Export Data to CSV</h3>
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
                    { id: "interviews", title: "All Interviews", desc: `${interviews.length} rounds with links and outcomes` },
                    { id: "analytics", title: "Pipeline Analytics", desc: "Key metrics, stage counts, and velocity summary" },
                  ].map(item => (
                    <div
                      key={item.id}
                      onClick={() => setExportType(item.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        exportType === item.id
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                          : "bg-[#131B2E] border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white">{item.title}</p>
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
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Status Filter</label>
                  <select
                    value={exportStatus}
                    onChange={(e) => setExportStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#131B2E] border border-slate-700 text-xs font-semibold text-white"
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

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
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
                  showToast("CSV export initiated!", "success");
                  setExportModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#0E1322] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Icon name="help-circle" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Help & User Guide</h3>
                  <p className="text-[11px] text-slate-400">Complete reference for all 15 JobTrack features</p>
                </div>
              </div>
              <button onClick={() => setHelpModalOpen(false)} className="text-slate-400 hover:text-white">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <h4 className="font-bold text-sm text-white mb-1.5">15 Core Feature Suite</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[1] Dashboard</strong>: High-level overview</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[2] Add App</strong>: Fast modal creation</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[3] View All</strong>: Full pipeline table</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[4] Details</strong>: Comprehensive card</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[5] Update</strong>: Edit role & salary</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[6] Delete</strong>: Safe confirmed removal</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[7] Search</strong>: Instant keyword match</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[8] Filter</strong>: By status & job type</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[9] Interviews</strong>: Schedule & outcomes</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[10] Reminders</strong>: Today & overdue alerts</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[11] Analytics</strong>: Conversion rates</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[12] Export CSV</strong>: Spreadsheet export</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[13] Settings</strong>: Candidate preferences</div>
                  <div className="p-2 rounded-xl bg-[#131B2E]"><strong>[14] Help Guide</strong>: In-app documentation</div>
                  <div className="p-2 rounded-xl bg-[#131B2E] sm:col-span-2"><strong>[15] Exit</strong>: Conclude session cleanly</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white mb-1">Keyboard Shortcuts</h4>
                <div className="space-y-1 text-[11px]">
                  <p><code className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono">F11</code> : Toggle full-screen mode</p>
                  <p><code className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono">Esc</code> : Close any open dialog or modal</p>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-800">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer"
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
          <div className="bg-[#0E1322] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <Icon name="log-out" className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Exit JobTrack Pro?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Candidate: <strong className="text-white">{applicantName}</strong>
              </p>
            </div>
            <p className="text-xs text-slate-400">
              All {applications.length} applications and interview schedules are saved to disk. Ready to conclude?
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
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer"
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

// Mount React Root
const rootEl = document.getElementById("root");
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}
