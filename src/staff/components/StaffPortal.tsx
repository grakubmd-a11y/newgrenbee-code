import React, { useState, useEffect, useCallback } from "react";
import {
  Briefcase, MapPin, Clock, Phone, User, CheckCircle2,
  RotateCw, Loader2, LogOut, ChevronDown, ChevronUp,
  Calendar, Wrench, History, AlertCircle, Navigation,
  ClipboardList, RefreshCw,
} from "lucide-react";
import type { Booking } from "../../shared/types";
import { auth } from "../../shared/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
  uid: string;
  email: string;
  name: string;
  staffId: string;
  staffName: string;
}

interface StaffPortalProps {
  currentUser: StaffUser;
  onLogout: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function friendlyDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const isToday    = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : `${months[Number(m)-1]} ${d}`;
  return label;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  scheduled:    { label: "Scheduled",   color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  dispatched:   { label: "En Camino",   color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  "in-progress":{ label: "In Progress", color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200" },
  completed:    { label: "Completed",   color: "text-slate-600",  bg: "bg-slate-100", border: "border-slate-200" },
  cancelled:    { label: "Cancelled",   color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  onUpdateStatus,
  updating,
}: {
  job: Booking;
  onUpdateStatus: (bookingId: string, status: "in-progress" | "completed") => void;
  updating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const isActive    = job.status === "scheduled" || job.status === "dispatched";
  const isProgress  = job.status === "in-progress";
  const isDone      = job.status === "completed" || job.status === "cancelled";
  const dateLabel   = friendlyDate(job.bookingDate);
  const isToday     = dateLabel === "Today";

  return (
    <div className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-all ${
      isToday && !isDone ? "border-brand ring-1 ring-brand/20" : "border-gray-150"
    }`}>
      {/* Card header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isDone ? "bg-slate-100 text-slate-400" : isProgress ? "bg-emerald-100 text-emerald-600" : "bg-brand-light text-brand"
        }`}>
          <Briefcase size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900 truncate">{job.serviceName}</p>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className={`font-semibold flex items-center gap-1 ${isToday ? "text-brand font-black" : ""}`}>
              <Calendar size={11} /> {dateLabel}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} /> {job.timeSlot}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
            <MapPin size={10} className="shrink-0" /> {job.address}
          </p>
        </div>

        <div className="shrink-0 text-gray-400 mt-1">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 space-y-3">
          {/* Customer info */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 mt-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Customer</p>
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <User size={12} className="text-gray-400 shrink-0" />
              <span className="font-semibold">{job.customerName}</span>
            </div>
            {job.phone && (
              <a
                href={`tel:${job.phone}`}
                className="flex items-center gap-2 text-xs text-brand font-semibold hover:underline"
              >
                <Phone size={12} className="shrink-0" /> {job.phone}
              </a>
            )}
          </div>

          {/* Address with maps link */}
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Address</p>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-xs text-brand font-semibold hover:underline"
            >
              <Navigation size={12} className="shrink-0 mt-0.5" />
              {job.address}
            </a>
          </div>

          {/* Units & service notes */}
          {(job.units > 1 || job.notes) && (
            <div className="space-y-1">
              {job.units > 1 && (
                <p className="text-xs text-gray-600">
                  <span className="font-bold">{job.units}</span> units
                </p>
              )}
              {job.notes && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Notes</p>
                  <p className="text-xs text-gray-700 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg p-2">
                    {job.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!isDone && (
            <div className="flex gap-2 pt-1">
              {isActive && (
                <button
                  onClick={() => onUpdateStatus(job.id, "in-progress")}
                  disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand text-white text-xs font-black border-none cursor-pointer disabled:opacity-60 disabled:cursor-wait hover:bg-brand-hover transition-colors"
                >
                  {updating ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
                  Start Job
                </button>
              )}
              {(isActive || isProgress) && (
                <button
                  onClick={() => onUpdateStatus(job.id, "completed")}
                  disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black border-none cursor-pointer disabled:opacity-60 disabled:cursor-wait hover:bg-emerald-700 transition-colors"
                >
                  {updating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Complete
                </button>
              )}
            </div>
          )}

          {isDone && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <CheckCircle2 size={12} />
              <span>{job.status === "completed" ? "Job completed" : "Cancelled"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────

export default function StaffPortal({ currentUser, onLogout }: StaffPortalProps) {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── Fetch jobs ─────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async (history = showHistory) => {
    setLoading(true);
    setError("");
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Not authenticated.");
      const idToken = await firebaseUser.getIdToken();

      const url = history ? "/api/staff-jobs?history=1" : "/api/staff-jobs";
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({}),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Could not load jobs.");
      setJobs(data.jobs || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err?.message || "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, [showHistory]);

  useEffect(() => { loadJobs(showHistory); }, [showHistory]);

  // ── Update status ──────────────────────────────────────────────────────────
  const handleUpdateStatus = async (bookingId: string, status: "in-progress" | "completed") => {
    setUpdating(bookingId);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Not authenticated.");
      const idToken = await firebaseUser.getIdToken();

      const resp = await fetch("/api/update-job-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bookingId, status }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Update failed.");

      // Optimistic update
      setJobs((prev) =>
        prev.map((j) => (j.id === bookingId ? { ...j, status } : j))
          .filter((j) => showHistory || !["completed", "cancelled"].includes(j.status))
      );
    } catch (err: any) {
      setError(err?.message || "Could not update status.");
    } finally {
      setUpdating(null);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const todayStr   = new Date().toISOString().split("T")[0];
  const todayJobs  = jobs.filter((j) => j.bookingDate === todayStr);
  const activeJobs = jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-[#0a2e1e] text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center">
              <ClipboardList size={18} className="text-brand" />
            </div>
            <div>
              <p className="text-xs text-green-300 font-semibold leading-none">Staff Portal</p>
              <p className="text-sm font-black leading-tight">{currentUser.staffName || currentUser.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadJobs(showHistory)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent text-white"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent text-white"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today",  value: todayJobs.length,  icon: Calendar,     color: "text-brand" },
            { label: "Active", value: activeJobs.length, icon: Wrench,        color: "text-amber-600" },
            { label: "Total",  value: jobs.length,        icon: Briefcase,    color: "text-slate-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-150 p-3 text-center shadow-xs">
              <Icon size={16} className={`mx-auto mb-1 ${color}`} />
              <p className="text-lg font-black text-gray-900">{value}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Tab toggle ──────────────────────────────────────────────────── */}
        <div className="flex bg-white border border-gray-150 rounded-xl p-1 gap-1 shadow-xs">
          <button
            onClick={() => setShowHistory(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
              !showHistory ? "bg-brand text-white shadow-sm" : "text-gray-500 bg-transparent hover:bg-gray-50"
            }`}
          >
            <Briefcase size={13} /> My Jobs
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
              showHistory ? "bg-brand text-white shadow-sm" : "text-gray-500 bg-transparent hover:bg-gray-50"
            }`}
          >
            <History size={13} /> History
          </button>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-sm">
            <Loader2 size={18} className="animate-spin" />
            Loading jobs…
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
              {showHistory ? <History size={28} className="text-gray-300" /> : <Briefcase size={28} className="text-gray-300" />}
            </div>
            <p className="text-sm font-bold text-gray-500">
              {showHistory ? "No completed jobs yet." : "No jobs assigned to you right now."}
            </p>
            <p className="text-xs text-gray-400">
              {showHistory ? "Completed jobs will appear here." : "Check back later or ask your manager."}
            </p>
          </div>
        )}

        {/* ── Job list ────────────────────────────────────────────────────── */}
        {!loading && jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onUpdateStatus={handleUpdateStatus}
            updating={updating === job.id}
          />
        ))}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {!loading && jobs.length > 0 && (
          <p className="text-center text-[10px] text-gray-400 pb-4">
            Last updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
            <button onClick={() => loadJobs(showHistory)} className="text-brand font-semibold cursor-pointer bg-transparent border-none p-0">
              Refresh
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
