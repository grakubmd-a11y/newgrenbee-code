/**
 * ContactSubmissionsTab.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays contact form submissions stored in Firestore /contactSubmissions.
 * Admins can read and mark them as read.
 */

import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { fetchContactSubmissions, markContactSubmissionRead } from "@grenbee/firebase/services";
import { ContactSubmission } from "@grenbee/types";

export default function ContactSubmissionsTab() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<ContactSubmission | null>(null);
  const [filter, setFilter]           = useState<"all" | "unread">("unread");

  async function load() {
    setLoading(true);
    const data = await fetchContactSubmissions();
    setSubmissions(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleOpen(sub: ContactSubmission) {
    setSelected(sub);
    if (!sub.read) {
      await markContactSubmissionRead(sub.id);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, read: true } : s))
      );
    }
  }

  const filtered = filter === "unread"
    ? submissions.filter((s) => !s.read)
    : submissions;

  const unreadCount = submissions.filter((s) => !s.read).length;

  return (
    <div className="flex h-full min-h-[600px] animate-in fade-in duration-200">
      {/* ── List panel ──────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-950">Mensajes</h2>
            <button
              onClick={load}
              className="text-gray-400 hover:text-emerald-600 cursor-pointer"
              title="Recargar"
            >
              <Icons.RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1">
            {(["unread", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filter === f
                    ? "bg-emerald-500 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {f === "unread" ? `Sin leer (${unreadCount})` : `Todos (${submissions.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Icons.Loader2 className="animate-spin text-emerald-500 w-5 h-5" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-16 px-4">
              <Icons.Inbox className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              {filter === "unread" ? "No hay mensajes sin leer" : "No hay mensajes"}
            </div>
          ) : (
            filtered.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleOpen(sub)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selected?.id === sub.id ? "bg-emerald-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <span className={`text-sm truncate ${!sub.read ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>
                    {sub.name}
                  </span>
                  {!sub.read && (
                    <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{sub.subject}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {new Date(sub.createdAt).toLocaleDateString("es", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
            <Icons.Mail className="w-12 h-12" />
            <p className="text-sm">Selecciona un mensaje</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            {/* Header */}
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-gray-950 mb-1">{selected.subject}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Icons.User className="w-3.5 h-3.5" />
                  {selected.name}
                </span>
                <a
                  href={`mailto:${selected.email}`}
                  className="flex items-center gap-1.5 text-emerald-600 hover:underline"
                >
                  <Icons.Mail className="w-3.5 h-3.5" />
                  {selected.email}
                </a>
                <span className="flex items-center gap-1.5">
                  <Icons.Clock className="w-3.5 h-3.5" />
                  {new Date(selected.createdAt).toLocaleString("es", {
                    day: "numeric", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Message body */}
            <div className="bg-gray-50 rounded-2xl p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selected.message}
            </div>

            {/* Reply button */}
            <a
              href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Icons.Reply className="w-4 h-4" />
              Responder por email
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
