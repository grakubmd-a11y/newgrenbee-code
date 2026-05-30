/**
 * AreaContentTab.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin tab for managing area landing page content.
 * Each row is an active coverage area. Clicking "Editar" opens an inline editor
 * where the admin can fill in hero, intro, service blocks, testimonials,
 * neighborhoods and FAQs — all saved to Firestore /areaContent/{id}.
 *
 * Photos are picked from the Media Library (photo picker modal).
 */

import React, { useState, useEffect, useCallback } from "react";
import * as Icons from "lucide-react";
import { SERVICES_DATA } from "@grenbee/config";
import {
  fetchAreaContents,
  saveAreaContent,
  deleteAreaContent,
  fetchMediaItems,
} from "@grenbee/firebase/services";
import { AreaContent, AreaServiceBlock, AreaTestimonial, AreaFaq, MediaItem } from "@grenbee/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyArea(id: string, city: string, state: string): AreaContent {
  return {
    id,
    slug: id,
    city,
    state,
    active: true,
    heroHeadline: `Professional Home Services in ${city}, ${state}`,
    heroSubtitle: `Grenbee brings top-rated lawn care and cleaning to ${city}. Book online in minutes.`,
    introParagraph: `Grenbee is proud to serve ${city} and the surrounding communities. Our licensed and insured technicians deliver reliable, eco-friendly home services on your schedule.`,
    serviceBlocks: [],
    testimonials: [],
    neighborhoods: [],
    faqs: [],
    seoTitle: `Home Services in ${city}, ${state} | Grenbee`,
    seoDescription: `Book professional lawn care and house cleaning in ${city}, ${state}. Same-week availability, eco-friendly products. Get an instant quote from Grenbee.`,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Photo Picker Modal ───────────────────────────────────────────────────────

function PhotoPicker({
  onPick,
  onClose,
}: {
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMediaItems().then(setItems).finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-sm text-gray-800">Seleccionar imagen de la biblioteca</h3>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icons.ImageOff className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No hay imágenes en la biblioteca. Súbelas desde la pestaña Media.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPick(item)}
                  className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-400 transition-all cursor-pointer"
                  title={item.alt || item.filename}
                >
                  <img src={item.url} alt={item.alt} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inline area editor ───────────────────────────────────────────────────────

function AreaEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: AreaContent;
  onSave: (updated: AreaContent) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AreaContent>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoPicker, setPhotoPicker] = useState<
    null | "hero" | { type: "serviceBlock"; idx: number }
  >(null);

  function setField<K extends keyof AreaContent>(key: K, value: AreaContent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Service blocks
  function addServiceBlock() {
    setField("serviceBlocks", [
      ...form.serviceBlocks,
      { serviceId: "", serviceName: "", localDescription: "" } as AreaServiceBlock,
    ]);
  }
  function updateServiceBlock(idx: number, patch: Partial<AreaServiceBlock>) {
    const blocks = [...form.serviceBlocks];
    blocks[idx] = { ...blocks[idx], ...patch };
    setField("serviceBlocks", blocks);
  }
  function removeServiceBlock(idx: number) {
    setField("serviceBlocks", form.serviceBlocks.filter((_, i) => i !== idx));
  }

  // Testimonials
  function addTestimonial() {
    setField("testimonials", [
      ...form.testimonials,
      { name: "", location: "", text: "", rating: 5 } as AreaTestimonial,
    ]);
  }
  function updateTestimonial(idx: number, patch: Partial<AreaTestimonial>) {
    const arr = [...form.testimonials];
    arr[idx] = { ...arr[idx], ...patch };
    setField("testimonials", arr);
  }
  function removeTestimonial(idx: number) {
    setField("testimonials", form.testimonials.filter((_, i) => i !== idx));
  }

  // FAQs
  function addFaq() {
    setField("faqs", [...form.faqs, { question: "", answer: "" } as AreaFaq]);
  }
  function updateFaq(idx: number, patch: Partial<AreaFaq>) {
    const arr = [...form.faqs];
    arr[idx] = { ...arr[idx], ...patch };
    setField("faqs", arr);
  }
  function removeFaq(idx: number) {
    setField("faqs", form.faqs.filter((_, i) => i !== idx));
  }

  // Neighborhoods
  const [neighborhoodInput, setNeighborhoodInput] = useState(form.neighborhoods.join(", "));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated: AreaContent = {
        ...form,
        neighborhoods: neighborhoodInput
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean),
        updatedAt: new Date().toISOString(),
      };
      await onSave(updated);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoPick(item: MediaItem) {
    if (photoPicker === "hero") {
      setField("heroPhotoId", item.id);
      setField("heroPhotoUrl", item.url);
    } else if (photoPicker && typeof photoPicker === "object" && photoPicker.type === "serviceBlock") {
      updateServiceBlock(photoPicker.idx, { photoId: item.id, photoUrl: item.url });
    }
    setPhotoPicker(null);
  }

  return (
    <>
      {photoPicker !== null && (
        <PhotoPicker onPick={handlePhotoPick} onClose={() => setPhotoPicker(null)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-gray-100 rounded-2xl p-5">
        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</div>
        )}

        {/* ── Hero ── */}
        <section>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Hero</h4>
          <div className="space-y-3">
            {/* Hero photo */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Foto de hero</label>
              <div className="flex items-center gap-3">
                {form.heroPhotoUrl ? (
                  <img src={form.heroPhotoUrl} alt="hero" className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Icons.Image className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPhotoPicker("hero")}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                >
                  {form.heroPhotoUrl ? "Cambiar foto" : "Seleccionar de biblioteca"}
                </button>
                {form.heroPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => { setField("heroPhotoId", undefined); setField("heroPhotoUrl", undefined); }}
                    className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Titular</label>
              <input
                type="text"
                value={form.heroHeadline}
                onChange={(e) => setField("heroHeadline", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Subtítulo</label>
              <input
                type="text"
                value={form.heroSubtitle}
                onChange={(e) => setField("heroSubtitle", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Párrafo introductorio</label>
              <textarea
                rows={3}
                value={form.introParagraph}
                onChange={(e) => setField("introParagraph", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>
          </div>
        </section>

        {/* ── Service blocks ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Servicios destacados</h4>
            <button type="button" onClick={addServiceBlock} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer flex items-center gap-1">
              <Icons.Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>
          {form.serviceBlocks.length === 0 && (
            <p className="text-xs text-gray-400">No hay bloques de servicio. Agrega al menos uno.</p>
          )}
          {form.serviceBlocks.map((block, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-3 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Servicio {idx + 1}</span>
                <button type="button" onClick={() => removeServiceBlock(idx)} className="text-red-400 hover:text-red-600 cursor-pointer">
                  <Icons.Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Service selector — dropdown from SERVICES_DATA so admin picks
                  the exact ID without typos. Selecting fills the name too. */}
              <select
                value={block.serviceId}
                onChange={(e) => {
                  const svc = SERVICES_DATA.find((s) => s.id === e.target.value);
                  updateServiceBlock(idx, {
                    serviceId: e.target.value,
                    serviceName: svc ? svc.name : block.serviceName,
                  });
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              >
                <option value="">— Seleccionar servicio —</option>
                {SERVICES_DATA.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} ({svc.id})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nombre visible (se llena automáticamente)"
                value={block.serviceName}
                onChange={(e) => updateServiceBlock(idx, { serviceName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <textarea
                rows={2}
                placeholder="Descripción local específica para esta ciudad"
                value={block.localDescription}
                onChange={(e) => updateServiceBlock(idx, { localDescription: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
              <div className="flex items-center gap-2">
                {block.photoUrl ? (
                  <img src={block.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icons.Image className="w-4 h-4 text-gray-300" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPhotoPicker({ type: "serviceBlock", idx })}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                >
                  {block.photoUrl ? "Cambiar" : "Foto"}
                </button>
                {block.photoUrl && (
                  <button type="button" onClick={() => updateServiceBlock(idx, { photoId: undefined, photoUrl: undefined })}
                    className="text-xs text-red-400 hover:text-red-600 cursor-pointer">Quitar</button>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* ── Testimonials ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Testimonios</h4>
            <button type="button" onClick={addTestimonial} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer flex items-center gap-1">
              <Icons.Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>
          {form.testimonials.map((t, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-3 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Testimonio {idx + 1}</span>
                <button type="button" onClick={() => removeTestimonial(idx)} className="text-red-400 hover:text-red-600 cursor-pointer"><Icons.Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nombre" value={t.name} onChange={(e) => updateTestimonial(idx, { name: e.target.value })}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input type="text" placeholder="Ciudad, vecindario" value={t.location} onChange={(e) => updateTestimonial(idx, { location: e.target.value })}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <textarea rows={2} placeholder="Testimonio..." value={t.text} onChange={(e) => updateTestimonial(idx, { text: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">Calificación:</span>
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => updateTestimonial(idx, { rating: n })}
                    className={`cursor-pointer text-sm ${n <= t.rating ? "text-yellow-400" : "text-gray-200"}`}>★</button>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── Neighborhoods ── */}
        <section>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-2">Vecindarios / SEO links</h4>
          <p className="text-[10px] text-gray-400 mb-2">Separados por comas. Ej: Brickell, Coconut Grove, Wynwood</p>
          <textarea
            rows={2}
            value={neighborhoodInput}
            onChange={(e) => setNeighborhoodInput(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
        </section>

        {/* ── FAQs ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">FAQs</h4>
            <button type="button" onClick={addFaq} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer flex items-center gap-1">
              <Icons.Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>
          {form.faqs.map((faq, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-3 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">FAQ {idx + 1}</span>
                <button type="button" onClick={() => removeFaq(idx)} className="text-red-400 hover:text-red-600 cursor-pointer"><Icons.Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <input type="text" placeholder="Pregunta" value={faq.question} onChange={(e) => updateFaq(idx, { question: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <textarea rows={2} placeholder="Respuesta" value={faq.answer} onChange={(e) => updateFaq(idx, { answer: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
          ))}
        </section>

        {/* ── SEO ── */}
        <section>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">SEO</h4>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Título SEO</label>
              <input type="text" value={form.seoTitle} onChange={(e) => setField("seoTitle", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <p className="text-[10px] text-gray-400 mt-0.5">{form.seoTitle.length}/70 chars</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Meta descripción</label>
              <textarea rows={2} value={form.seoDescription} onChange={(e) => setField("seoDescription", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              <p className="text-[10px] text-gray-400 mt-0.5">{form.seoDescription.length}/160 chars</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Activa</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setField("active", e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500" />
                <span className="text-xs text-gray-600">Mostrar esta landing page al público</span>
              </label>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer">
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}

// ─── Main tab component ───────────────────────────────────────────────────────

export default function AreaContentTab() {
  const [areas, setAreas] = useState<AreaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AreaContent | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAreaContents();
      setAreas(data);
    } catch {
      setError("No se pudo cargar el contenido de áreas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(updated: AreaContent) {
    await saveAreaContent(updated);
    setAreas((prev) => {
      const exists = prev.some((a) => a.id === updated.id);
      return exists ? prev.map((a) => (a.id === updated.id ? updated : a)) : [...prev, updated];
    });
    setEditing(null);
    setSuccess(`Landing page de ${updated.city} guardada correctamente.`);
    setTimeout(() => setSuccess(""), 4000);
  }

  function handleNewArea() {
    const id = prompt("ID del área (ej: miami, coral-gables):");
    if (!id) return;
    const city = id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    setEditing(emptyArea(id, city, "FL"));
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-gray-950">Landing Pages de Áreas</h3>
          <p className="text-[10px] text-gray-400 font-medium">
            Cada área activa puede tener su propia landing SEO en /areas/:slug
          </p>
        </div>
        <button
          onClick={handleNewArea}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
        >
          <Icons.Plus className="w-3.5 h-3.5" />
          Nueva área
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-emerald-700">
          <Icons.CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-xs text-red-700">
          <Icons.AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <AreaEditor
          initial={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : areas.length === 0 && !editing ? (
        <div className="text-center py-12 text-gray-400">
          <Icons.MapPin className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm font-semibold">Aún no hay landing pages de áreas.</p>
          <p className="text-xs mt-1">Haz clic en "Nueva área" para crear la primera.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map((area) => (
            <div key={area.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                {area.heroPhotoUrl ? (
                  <img src={area.heroPhotoUrl} alt={area.city} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icons.MapPin className="w-4 h-4 text-gray-300" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-800">{area.city}, {area.state}</p>
                  <p className="text-[10px] text-gray-400">/areas/{area.slug} · {area.serviceBlocks.length} servicios · {area.testimonials.length} testimonios</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${area.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                  {area.active ? "Activa" : "Inactiva"}
                </span>
                <a
                  href={`/areas/${area.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="Ver landing page"
                >
                  <Icons.ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setEditing(area)}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <Icons.Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
