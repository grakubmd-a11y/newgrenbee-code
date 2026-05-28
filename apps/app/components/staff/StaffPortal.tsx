import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Briefcase, MapPin, Clock, Phone, User, CheckCircle2,
  Loader2, LogOut, ChevronDown, ChevronUp,
  Calendar, Wrench, History, AlertCircle, Navigation,
  ClipboardList, RefreshCw, Camera, ImagePlus, X,
  ChevronLeft, ChevronRight, LayoutList, CalendarDays,
  DollarSign, MessageSquare, AlertTriangle,
} from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Booking, JobPhoto } from "@grenbee/types";
import { auth, storage } from "@grenbee/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
  uid: string; email: string; name: string; staffId: string; staffName: string;
}
interface StaffPortalProps {
  currentUser: StaffUser;
  onLogout: () => void;
}
type ViewMode = 'list' | 'calendar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function friendlyDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const date     = new Date(Number(y), Number(m) - 1, Number(d));
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString())    return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return `${months[Number(m)-1]} ${d}`;
}

function calcPayout(job: Booking, model: string, rate: number): number {
  if (job.payoutOverride !== undefined) return job.payoutOverride;
  const revenue = Number(job.totalCost || 0);
  if (model === "percentage")    return revenue * (rate / 100);
  if (model === "fixed_per_job") return rate;
  if (model === "hourly")        return rate * 2; // estimate 2h
  return revenue * 0.5;
}

/** Compress + resize an image file to max 1280px, JPEG 0.82 */
async function compressImage(file: File, maxPx = 1280, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio  = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Compression failed")), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image")); };
    img.src = url;
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  scheduled:    { label: "Scheduled",   color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-500"   },
  dispatched:   { label: "En Camino",   color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-500"  },
  "in-progress":{ label: "On Site",     color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",dot: "bg-emerald-500"},
  completed:    { label: "Completed",   color: "text-slate-600",  bg: "bg-slate-100", border: "border-slate-200",  dot: "bg-slate-400"  },
  cancelled:    { label: "Cancelled",   color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200",   dot: "bg-rose-400"   },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Photo Upload Button ──────────────────────────────────────────────────────

function PhotoUploadButton({ phase, bookingId, onUploaded, disabled }: {
  phase: 'before' | 'after'; bookingId: string;
  onUploaded: (photo: JobPhoto) => void; disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setBusy(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Not authenticated.");
      const blob     = await compressImage(file);
      const fileName = `${phase}_${Date.now()}.jpg`;
      const storRef  = ref(storage, `jobs/${bookingId}/${fileName}`);
      await uploadBytes(storRef, blob, { contentType: "image/jpeg" });
      const url     = await getDownloadURL(storRef);
      const idToken = await firebaseUser.getIdToken();
      const resp    = await fetch("/api/save-job-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bookingId, phase, url, fileName }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Failed to save photo.");
      onUploaded(data.photo as JobPhoto);
    } catch (ex: any) {
      setErr(ex?.message || "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleFile} disabled={busy || disabled} />
      <button type="button" disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-none cursor-pointer disabled:opacity-60 transition-colors ${
          phase === 'before' ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
        }`}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
        {phase === 'before' ? 'Add Before' : 'Add After'}
      </button>
      {err && <p className="text-[10px] text-rose-500 mt-1">{err}</p>}
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ photos, startIndex, onClose }: { photos: JobPhoto[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowRight")  setIdx(i => Math.min(i+1, photos.length-1));
      if (e.key === "ArrowLeft")   setIdx(i => Math.max(i-1, 0));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, photos.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <button type="button" onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white border-none bg-transparent cursor-pointer p-2">
        <X size={22} />
      </button>
      <img src={photos[idx].url} alt={photos[idx].phase}
        className="max-w-full max-h-[80vh] object-contain rounded-xl"
        onClick={e => e.stopPropagation()} />
      {photos.length > 1 && (
        <div className="flex items-center gap-3 mt-4" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => setIdx(i => Math.max(i-1,0))} disabled={idx===0}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold disabled:opacity-30 border-none cursor-pointer hover:bg-white/20">← Prev</button>
          <span className="text-white/60 text-xs">{idx+1} / {photos.length}</span>
          <button type="button" onClick={() => setIdx(i => Math.min(i+1,photos.length-1))} disabled={idx===photos.length-1}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold disabled:opacity-30 border-none cursor-pointer hover:bg-white/20">Next →</button>
        </div>
      )}
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, payoutModel, payoutRate, onUpdateStatus, onPhotoAdded, updating }: {
  job: Booking;
  payoutModel: string; payoutRate: number;
  onUpdateStatus: (bookingId: string, status: "in-progress" | "completed", completionNotes?: string) => void;
  onPhotoAdded: (bookingId: string, photo: JobPhoto) => void;
  updating: boolean;
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [lightboxIdx,   setLightboxIdx]   = useState<number | null>(null);
  const [confirmMode,   setConfirmMode]   = useState(false); // completion flow
  const [compNotes,     setCompNotes]     = useState("");

  const photos       = job.photos ?? [];
  const beforePhotos = photos.filter(p => p.phase === 'before');
  const afterPhotos  = photos.filter(p => p.phase === 'after');
  const hasAfterPhoto = afterPhotos.length > 0;

  const isActive   = job.status === "scheduled" || job.status === "dispatched";
  const isProgress = job.status === "in-progress";
  const isDone     = job.status === "completed" || job.status === "cancelled";
  const dateLabel  = friendlyDate(job.bookingDate);
  const isToday    = dateLabel === "Today";

  const payout     = calcPayout(job, payoutModel, payoutRate);

  const handleCompleteClick = () => {
    setExpanded(true);
    setConfirmMode(true);
    setCompNotes("");
  };

  const handleConfirmComplete = () => {
    onUpdateStatus(job.id, "completed", compNotes.trim() || undefined);
    setConfirmMode(false);
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-all ${
      isToday && !isDone ? "border-brand ring-1 ring-brand/20" : "border-gray-150"
    }`}>
      {/* ── Header ── */}
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => { if (!confirmMode) setExpanded(v => !v); }}>
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
            <span className="flex items-center gap-1"><Clock size={11} /> {job.timeSlot}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-gray-500 truncate flex items-center gap-1 flex-1 min-w-0">
              <MapPin size={10} className="shrink-0" /> {job.address}
            </p>
            {!isDone && (
              <span className="text-[10px] font-black text-emerald-600 shrink-0 flex items-center gap-0.5">
                <DollarSign size={9} />{payout.toFixed(0)}
              </span>
            )}
          </div>
          {photos.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Camera size={9} /> {photos.length} foto{photos.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="shrink-0 text-gray-400 mt-1">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 space-y-3">

          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 mt-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Customer</p>
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <User size={12} className="text-gray-400 shrink-0" />
              <span className="font-semibold">{job.customerName}</span>
            </div>
            {job.phone && (
              <a href={`tel:${job.phone}`} className="flex items-center gap-2 text-xs text-brand font-semibold hover:underline">
                <Phone size={12} className="shrink-0" /> {job.phone}
              </a>
            )}
          </div>

          {/* Address */}
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-start gap-2 text-xs text-brand font-semibold hover:underline">
            <Navigation size={12} className="shrink-0 mt-0.5" /> {job.address}
          </a>

          {/* Payout */}
          {!isDone && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <DollarSign size={12} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-emerald-700">
                Est. payout: <strong>${payout.toFixed(2)}</strong>
                {job.payoutOverride !== undefined && <span className="text-[10px] font-normal ml-1">(admin override)</span>}
              </span>
            </div>
          )}

          {/* Units & notes */}
          {(job.units > 1 || job.notes) && (
            <div className="space-y-1">
              {job.units > 1 && <p className="text-xs text-gray-600"><span className="font-bold">{job.units}</span> units</p>}
              {job.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1">Notes</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{job.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Completion notes (read-only when done) */}
          {isDone && job.completionNotes && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Completion notes</p>
              <p className="text-xs text-slate-700 leading-relaxed">{job.completionNotes}</p>
            </div>
          )}

          {/* Photos */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Camera size={10} /> Photos
            </p>
            {(['before', 'after'] as const).map(phase => {
              const phasePics = photos.filter(p => p.phase === phase);
              return (
                <div key={phase} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${phase === 'before' ? 'text-sky-600' : 'text-violet-600'}`}>{phase}</span>
                    {phasePics.length === 0 && <span className="text-[9px] text-gray-300">No photos yet</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {phasePics.map(p => (
                      <button key={p.url} type="button" onClick={() => setLightboxIdx(photos.indexOf(p))}
                        className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity p-0">
                        <img src={p.url} alt={phase} className="w-full h-full object-cover" />
                        <span className={`absolute bottom-0 left-0 right-0 text-[7px] font-black text-center py-0.5 ${phase === 'before' ? 'bg-sky-600/80' : 'bg-violet-600/80'} text-white`}>
                          {phase.toUpperCase()}
                        </span>
                      </button>
                    ))}
                    {!isDone && (
                      <PhotoUploadButton phase={phase} bookingId={job.id}
                        onUploaded={photo => onPhotoAdded(job.id, photo)} disabled={updating} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Action buttons ── */}
          {!isDone && !confirmMode && (
            <div className="flex gap-2 pt-1">
              {isActive && (
                <button onClick={() => onUpdateStatus(job.id, "in-progress")} disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand text-white text-xs font-black border-none cursor-pointer disabled:opacity-60 hover:bg-brand-hover transition-colors">
                  {updating ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
                  Start Job
                </button>
              )}
              {(isActive || isProgress) && (
                <button onClick={handleCompleteClick} disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black border-none cursor-pointer disabled:opacity-60 hover:bg-emerald-700 transition-colors">
                  <CheckCircle2 size={13} />
                  Complete
                </button>
              )}
            </div>
          )}

          {/* ── Completion flow ── */}
          {!isDone && confirmMode && (
            <div className="space-y-3 pt-1 border-t border-gray-100 mt-1">
              <p className="text-xs font-extrabold text-gray-700 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" /> Confirm job completion
              </p>

              {/* Photo warning */}
              {!hasAfterPhoto && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                  <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 font-medium">
                    No "After" photo yet. Consider adding one before completing — it helps with quality control.
                  </p>
                </div>
              )}

              {/* Completion notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Completion notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={compNotes}
                  onChange={e => setCompNotes(e.target.value)}
                  placeholder="Anything the admin should know about this visit…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmMode(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold border-none cursor-pointer hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmComplete} disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black border-none cursor-pointer disabled:opacity-60 hover:bg-emerald-700 transition-colors">
                  {updating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Confirm Complete
                </button>
              </div>
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

      {lightboxIdx !== null && photos.length > 0 && (
        <Lightbox photos={photos} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ jobs, onSelectDay }: {
  jobs: Booking[];
  onSelectDay: (dayKey: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() }; // 0-indexed
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const monthLabel = useMemo(() =>
    new Date(month.year, month.month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [month]
  );

  // Build 42-cell grid (6 rows × 7 days)
  const cells = useMemo(() => {
    const firstDay = new Date(month.year, month.month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
    const result: { dateKey: string | null; day: number | null; isCurrentMonth: boolean }[] = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) result.push({ dateKey: null, day: null, isCurrentMonth: false });

    // Days in month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({ dateKey, day: d, isCurrentMonth: true });
    }

    // Trailing cells to fill 42
    while (result.length < 42) result.push({ dateKey: null, day: null, isCurrentMonth: false });

    return result;
  }, [month]);

  // Map dateKey → jobs
  const jobsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    jobs.forEach(j => {
      if (!j.bookingDate) return;
      const arr = map.get(j.bookingDate) ?? [];
      arr.push(j);
      map.set(j.bookingDate, arr);
    });
    return map;
  }, [jobs]);

  const prev = () => setMonth(m => {
    const d = new Date(m.year, m.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const next = () => setMonth(m => {
    const d = new Date(m.year, m.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button type="button" onClick={prev}
          className="p-1.5 rounded-lg hover:bg-gray-100 border-none bg-transparent cursor-pointer text-gray-500">
          <ChevronLeft size={15} />
        </button>
        <p className="text-sm font-extrabold text-gray-900">{monthLabel}</p>
        <button type="button" onClick={next}
          className="p-1.5 rounded-lg hover:bg-gray-100 border-none bg-transparent cursor-pointer text-gray-500">
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[9px] font-black uppercase text-gray-400 py-2">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell.dateKey || !cell.isCurrentMonth) {
            return <div key={i} className="min-h-[52px] border-b border-r border-gray-50 last:border-r-0" />;
          }
          const dayJobs  = jobsByDay.get(cell.dateKey) ?? [];
          const isToday  = cell.dateKey === todayStr;
          const hasPast  = dayJobs.some(j => j.status === 'completed' || j.status === 'cancelled');
          const hasActive = dayJobs.some(j => j.status !== 'completed' && j.status !== 'cancelled');

          return (
            <button
              key={i}
              type="button"
              onClick={() => cell.dateKey && onSelectDay(cell.dateKey)}
              className={`min-h-[52px] p-1.5 border-b border-r border-gray-50 text-left flex flex-col items-start gap-0.5 hover:bg-gray-50 transition-colors cursor-pointer last:border-r-0 border-none ${
                dayJobs.length > 0 ? 'bg-brand/5' : 'bg-white'
              }`}
            >
              <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                isToday ? 'bg-brand text-white' : 'text-gray-700'
              }`}>
                {cell.day}
              </span>
              {dayJobs.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-auto">
                  {dayJobs.slice(0, 4).map((j, di) => {
                    const cfg = STATUS_CONFIG[j.status];
                    return <span key={di} className={`w-1.5 h-1.5 rounded-full ${cfg?.dot ?? 'bg-gray-400'}`} />;
                  })}
                  {dayJobs.length > 4 && <span className="text-[8px] text-gray-400 font-bold">+{dayJobs.length-4}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        {Object.entries(STATUS_CONFIG).filter(([k]) => ['scheduled','dispatched','in-progress','completed'].includes(k)).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${v.dot}`} />
            <span className="text-[9px] text-gray-500 font-medium">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day Jobs Panel ───────────────────────────────────────────────────────────

function DayJobsPanel({ dayKey, jobs, payoutModel, payoutRate, onUpdateStatus, onPhotoAdded, updating, onClose }: {
  dayKey: string;
  jobs: Booking[];
  payoutModel: string; payoutRate: number;
  onUpdateStatus: (id: string, status: "in-progress" | "completed", notes?: string) => void;
  onPhotoAdded: (id: string, photo: JobPhoto) => void;
  updating: string | null;
  onClose: () => void;
}) {
  const [y, m, d] = dayKey.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const label = `${months[Number(m)-1]} ${Number(d)}, ${y}`;

  return (
    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <Calendar size={14} className="text-brand" /> {label}
          <span className="text-[10px] font-bold text-gray-400">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
        </h3>
        <button type="button" onClick={onClose}
          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border-none cursor-pointer text-gray-500">
          <X size={13} />
        </button>
      </div>
      {jobs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">No jobs on this day.</p>
      ) : (
        jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            payoutModel={payoutModel}
            payoutRate={payoutRate}
            onUpdateStatus={onUpdateStatus}
            onPhotoAdded={onPhotoAdded}
            updating={updating === job.id}
          />
        ))
      )}
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────

export default function StaffPortal({ currentUser, onLogout }: StaffPortalProps) {
  const [jobs,          setJobs]          = useState<Booking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [showHistory,   setShowHistory]   = useState(false);
  const [updating,      setUpdating]      = useState<string | null>(null);
  const [lastRefresh,   setLastRefresh]   = useState<Date>(new Date());
  const [viewMode,      setViewMode]      = useState<ViewMode>('list');
  const [selectedDay,   setSelectedDay]   = useState<string | null>(null);
  const [payoutModel,   setPayoutModel]   = useState("percentage");
  const [payoutRate,    setPayoutRate]    = useState(50);

  // ── Fetch jobs ─────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async (history = showHistory) => {
    setLoading(true); setError("");
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
      if (data.payoutModel) setPayoutModel(data.payoutModel);
      if (data.payoutRate  !== undefined) setPayoutRate(data.payoutRate);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err?.message || "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, [showHistory]);

  useEffect(() => { loadJobs(showHistory); }, [showHistory]);

  // ── Update status ──────────────────────────────────────────────────────────
  const handleUpdateStatus = async (bookingId: string, status: "in-progress" | "completed", completionNotes?: string) => {
    setUpdating(bookingId);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Not authenticated.");
      const idToken = await firebaseUser.getIdToken();
      const resp = await fetch("/api/update-job-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bookingId, status, ...(completionNotes ? { completionNotes } : {}) }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Update failed.");
      setJobs(prev =>
        prev.map(j => j.id === bookingId ? { ...j, status, ...(completionNotes ? { completionNotes } : {}) } : j)
          .filter(j => showHistory || !["completed","cancelled"].includes(j.status))
      );
      setSelectedDay(null); // close day panel on complete
    } catch (err: any) {
      setError(err?.message || "Could not update status.");
    } finally {
      setUpdating(null);
    }
  };

  // ── Photo add ──────────────────────────────────────────────────────────────
  const handlePhotoAdded = (bookingId: string, photo: JobPhoto) => {
    setJobs(prev => prev.map(j => j.id === bookingId ? { ...j, photos: [...(j.photos ?? []), photo] } : j));
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const todayStr    = new Date().toISOString().slice(0, 10);
  const todayJobs   = jobs.filter(j => j.bookingDate === todayStr);
  const activeJobs  = jobs.filter(j => j.status !== "completed" && j.status !== "cancelled");
  const dayJobs     = selectedDay ? jobs.filter(j => j.bookingDate === selectedDay) : [];

  // Month-spanning jobs for calendar (active only — history just clutters the grid)
  const allJobsForCalendar = useMemo(() => jobs, [jobs]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
          <div className="flex items-center gap-1">
            {/* View toggle */}
            <div className="flex bg-white/10 rounded-lg p-0.5 mr-1">
              <button type="button" onClick={() => { setViewMode('list'); setSelectedDay(null); }}
                className={`p-1.5 rounded-md border-none cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-white/20 text-white' : 'bg-transparent text-white/60 hover:text-white'}`}>
                <LayoutList size={14} />
              </button>
              <button type="button" onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-md border-none cursor-pointer transition-colors ${viewMode === 'calendar' ? 'bg-white/20 text-white' : 'bg-transparent text-white/60 hover:text-white'}`}>
                <CalendarDays size={14} />
              </button>
            </div>
            <button onClick={() => loadJobs(showHistory)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent text-white" title="Refresh">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={onLogout}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent text-white" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today",  value: todayJobs.length,  icon: Calendar,  color: "text-brand" },
            { label: "Active", value: activeJobs.length, icon: Wrench,    color: "text-amber-600" },
            { label: "Total",  value: jobs.length,       icon: Briefcase, color: "text-slate-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-150 p-3 text-center shadow-xs">
              <Icon size={16} className={`mx-auto mb-1 ${color}`} />
              <p className="text-lg font-black text-gray-900">{value}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Tab toggle (list mode only) ──────────────────────────────────── */}
        {viewMode === 'list' && (
          <div className="flex bg-white border border-gray-150 rounded-xl p-1 gap-1 shadow-xs">
            <button onClick={() => setShowHistory(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${!showHistory ? "bg-brand text-white shadow-sm" : "text-gray-500 bg-transparent hover:bg-gray-50"}`}>
              <Briefcase size={13} /> My Jobs
            </button>
            <button onClick={() => setShowHistory(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${showHistory ? "bg-brand text-white shadow-sm" : "text-gray-500 bg-transparent hover:bg-gray-50"}`}>
              <History size={13} /> History
            </button>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-sm">
            <Loader2 size={18} className="animate-spin" /> Loading jobs…
          </div>
        )}

        {/* ── Calendar view ───────────────────────────────────────────────── */}
        {!loading && viewMode === 'calendar' && (
          <>
            <CalendarView
              jobs={allJobsForCalendar}
              onSelectDay={key => setSelectedDay(prev => prev === key ? null : key)}
            />
            {selectedDay && (
              <DayJobsPanel
                dayKey={selectedDay}
                jobs={dayJobs}
                payoutModel={payoutModel}
                payoutRate={payoutRate}
                onUpdateStatus={handleUpdateStatus}
                onPhotoAdded={handlePhotoAdded}
                updating={updating}
                onClose={() => setSelectedDay(null)}
              />
            )}
          </>
        )}

        {/* ── List view ───────────────────────────────────────────────────── */}
        {!loading && viewMode === 'list' && (
          <>
            {!error && jobs.length === 0 && (
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
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                payoutModel={payoutModel}
                payoutRate={payoutRate}
                onUpdateStatus={handleUpdateStatus}
                onPhotoAdded={handlePhotoAdded}
                updating={updating === job.id}
              />
            ))}
          </>
        )}

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
