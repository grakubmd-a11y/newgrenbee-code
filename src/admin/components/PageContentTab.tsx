/**
 * PageContentTab.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin CMS editor for marketing pages: Home, FAQ, Contact.
 *
 * Structure:
 *  Left sidebar  → page selector (Home / FAQ / Contact)
 *  Right panel   → block-based editor for the selected page
 *
 * Content is stored in Firestore /pageContent/{pageId} and loaded by each
 * public page at runtime (with i18n defaults as fallback).
 */

import React, { useState, useEffect, useCallback } from "react";
import * as Icons from "lucide-react";
import { fetchPageContent, savePageContent, fetchMediaItems } from "../../shared/services/firebaseService";
import { auth } from "../../shared/firebase";
import {
  HomePageContent,
  FaqPageContent,
  FaqCategoryContent,
  FaqItemContent,
  ContactPageContent,
  MediaItem,
} from "../../shared/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
    />
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
          {icon}
          {title}
        </div>
        <Icons.ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Media Picker Modal ───────────────────────────────────────────────────────
function MediaPicker({
  currentUrl,
  onSelect,
  onClose,
}: {
  currentUrl?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMediaItems()
      .then((list) => setItems(list.filter((i) => i.mimeType.startsWith("image/"))))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Seleccionar imagen</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Icons.Loader2 className="animate-spin text-emerald-500 w-6 h-6" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">
              No hay imágenes. Sube fotos en la pestaña Media primero.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.url); onClose(); }}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer aspect-video ${
                    item.url === currentUrl
                      ? "border-emerald-500 ring-2 ring-emerald-200"
                      : "border-transparent hover:border-emerald-300"
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.alt || item.filename}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Photo Field ──────────────────────────────────────────────────────────────
function PhotoField({
  label,
  url,
  onChange,
}: {
  label: string;
  url?: string;
  onChange: (url: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {url ? (
          <img
            src={url}
            alt=""
            className="w-24 h-16 object-cover rounded-lg border border-gray-200"
          />
        ) : (
          <div className="w-24 h-16 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
            <Icons.ImagePlus className="w-5 h-5 text-gray-300" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setPickerOpen(true)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
          >
            {url ? "Cambiar foto" : "Seleccionar foto"}
          </button>
          {url && (
            <button
              onClick={() => onChange("")}
              className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      {pickerOpen && (
        <MediaPicker
          currentUrl={url}
          onSelect={onChange}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Bilingual text pair ──────────────────────────────────────────────────────
function BilingualField({
  label,
  valueEn,
  valueEs,
  onChangeEn,
  onChangeEs,
  multiline = false,
  rows = 3,
}: {
  label: string;
  valueEn: string;
  valueEs: string;
  onChangeEn: (v: string) => void;
  onChangeEs: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">🇺🇸 Inglés</p>
          {multiline ? (
            <Textarea value={valueEn} onChange={onChangeEn} rows={rows} />
          ) : (
            <Input value={valueEn} onChange={onChangeEn} />
          )}
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">🇪🇸 Español</p>
          {multiline ? (
            <Textarea value={valueEs} onChange={onChangeEs} rows={rows} />
          ) : (
            <Input value={valueEs} onChange={onChangeEs} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Home Page Editor ─────────────────────────────────────────────────────────
const KNOWN_SERVICES = [
  { id: "lawn-mowing",        name: "Lawn Mowing" },
  { id: "house-cleaning",     name: "House Cleaning" },
  { id: "pressure-washing",   name: "Pressure Washing" },
  { id: "tv-installation",    name: "TV Installation" },
  { id: "furniture-assembly", name: "Furniture Assembly" },
];

function HomeEditor({
  data,
  onChange,
}: {
  data: HomePageContent;
  onChange: (d: HomePageContent) => void;
}) {
  const set = (patch: Partial<HomePageContent>) => onChange({ ...data, ...patch });
  const setPhoto = (svcId: string, url: string) =>
    set({ servicePhotos: { ...data.servicePhotos, [svcId]: url } });

  return (
    <div className="space-y-4">
      {/* Hero */}
      <SectionCard title="Hero" icon={<Icons.Sparkles className="w-4 h-4 text-emerald-500" />}>
        <PhotoField
          label="Foto de fondo"
          url={data.heroPhotoUrl}
          onChange={(url) => set({ heroPhotoUrl: url })}
        />
        <BilingualField
          label="Headline"
          valueEn={data.heroHeadlineEn ?? ""}
          valueEs={data.heroHeadlineEs ?? ""}
          onChangeEn={(v) => set({ heroHeadlineEn: v })}
          onChangeEs={(v) => set({ heroHeadlineEs: v })}
        />
        <BilingualField
          label="Subtítulo"
          valueEn={data.heroSubtitleEn ?? ""}
          valueEs={data.heroSubtitleEs ?? ""}
          onChangeEn={(v) => set({ heroSubtitleEn: v })}
          onChangeEs={(v) => set({ heroSubtitleEs: v })}
          multiline
          rows={2}
        />
        <BilingualField
          label="Texto del botón CTA"
          valueEn={data.heroCtaEn ?? ""}
          valueEs={data.heroCtaEs ?? ""}
          onChangeEn={(v) => set({ heroCtaEn: v })}
          onChangeEs={(v) => set({ heroCtaEs: v })}
        />
      </SectionCard>

      {/* Service Photos */}
      <SectionCard title="Fotos de servicios" icon={<Icons.Images className="w-4 h-4 text-blue-500" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {KNOWN_SERVICES.map((svc) => (
            <PhotoField
              key={svc.id}
              label={svc.name}
              url={data.servicePhotos?.[svc.id]}
              onChange={(url) => setPhoto(svc.id, url)}
            />
          ))}
        </div>
      </SectionCard>

      {/* Coverage */}
      <SectionCard title="Fotos de regiones" icon={<Icons.MapPin className="w-4 h-4 text-amber-500" />}>
        <div className="grid grid-cols-2 gap-4">
          <PhotoField
            label="Miami-Dade County"
            url={data.coverageMiamiPhotoUrl}
            onChange={(url) => set({ coverageMiamiPhotoUrl: url })}
          />
          <PhotoField
            label="Broward County"
            url={data.coverageBrowardPhotoUrl}
            onChange={(url) => set({ coverageBrowardPhotoUrl: url })}
          />
        </div>
      </SectionCard>

      {/* CTA Banner */}
      <SectionCard title="CTA Banner" icon={<Icons.Megaphone className="w-4 h-4 text-purple-500" />}>
        <PhotoField
          label="Foto de fondo del banner"
          url={data.ctaBannerPhotoUrl}
          onChange={(url) => set({ ctaBannerPhotoUrl: url })}
        />
      </SectionCard>
    </div>
  );
}

// ─── FAQ Page Editor ──────────────────────────────────────────────────────────
function FaqEditor({
  data,
  onChange,
}: {
  data: FaqPageContent;
  onChange: (d: FaqPageContent) => void;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(
    data.categories[0]?.id ?? null
  );

  function setCategories(cats: FaqCategoryContent[]) {
    onChange({ ...data, categories: cats });
  }

  function addCategory() {
    const newCat: FaqCategoryContent = {
      id: uid(),
      nameEn: "New Category",
      nameEs: "Nueva Categoría",
      items: [],
    };
    setCategories([...data.categories, newCat]);
    setExpandedCat(newCat.id);
  }

  function removeCategory(id: string) {
    setCategories(data.categories.filter((c) => c.id !== id));
    if (expandedCat === id) setExpandedCat(null);
  }

  function updateCategory(id: string, patch: Partial<FaqCategoryContent>) {
    setCategories(
      data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  function addItem(catId: string) {
    const newItem: FaqItemContent = {
      id: uid(),
      questionEn: "",
      questionEs: "",
      answerEn: "",
      answerEs: "",
    };
    updateCategory(catId, {
      items: [
        ...(data.categories.find((c) => c.id === catId)?.items ?? []),
        newItem,
      ],
    });
  }

  function removeItem(catId: string, itemId: string) {
    const cat = data.categories.find((c) => c.id === catId);
    if (!cat) return;
    updateCategory(catId, { items: cat.items.filter((i) => i.id !== itemId) });
  }

  function updateItem(catId: string, itemId: string, patch: Partial<FaqItemContent>) {
    const cat = data.categories.find((c) => c.id === catId);
    if (!cat) return;
    updateCategory(catId, {
      items: cat.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    });
  }

  return (
    <div className="space-y-3">
      {data.categories.map((cat) => (
        <div key={cat.id} className="border border-gray-100 rounded-2xl overflow-hidden">
          {/* Category header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
            <button
              className="flex-1 text-left flex items-center gap-2 cursor-pointer"
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
            >
              <Icons.ChevronRight
                className={`w-4 h-4 text-gray-400 transition-transform ${expandedCat === cat.id ? "rotate-90" : ""}`}
              />
              <span className="text-sm font-bold text-gray-800">
                {cat.nameEn || "Sin nombre"}
              </span>
              <span className="text-xs text-gray-400">({cat.items.length} preguntas)</span>
            </button>
            <button
              onClick={() => removeCategory(cat.id)}
              className="text-red-400 hover:text-red-600 cursor-pointer p-1"
            >
              <Icons.Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {expandedCat === cat.id && (
            <div className="p-4 space-y-4">
              {/* Category names */}
              <BilingualField
                label="Nombre de categoría"
                valueEn={cat.nameEn}
                valueEs={cat.nameEs}
                onChangeEn={(v) => updateCategory(cat.id, { nameEn: v })}
                onChangeEs={(v) => updateCategory(cat.id, { nameEs: v })}
              />

              {/* FAQ Items */}
              <div className="space-y-3 border-t border-gray-100 pt-3">
                {cat.items.map((item, idx) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-500">
                        Pregunta {idx + 1}
                      </span>
                      <button
                        onClick={() => removeItem(cat.id, item.id)}
                        className="text-red-400 hover:text-red-600 cursor-pointer"
                      >
                        <Icons.Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <BilingualField
                      label="Pregunta"
                      valueEn={item.questionEn}
                      valueEs={item.questionEs}
                      onChangeEn={(v) => updateItem(cat.id, item.id, { questionEn: v })}
                      onChangeEs={(v) => updateItem(cat.id, item.id, { questionEs: v })}
                    />
                    <BilingualField
                      label="Respuesta"
                      valueEn={item.answerEn}
                      valueEs={item.answerEs}
                      onChangeEn={(v) => updateItem(cat.id, item.id, { answerEn: v })}
                      onChangeEs={(v) => updateItem(cat.id, item.id, { answerEs: v })}
                      multiline
                      rows={3}
                    />
                  </div>
                ))}
                <button
                  onClick={() => addItem(cat.id)}
                  className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-bold border border-dashed border-emerald-300 rounded-xl py-2 cursor-pointer hover:bg-emerald-50 transition-colors"
                >
                  + Agregar pregunta
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addCategory}
        className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-bold border border-dashed border-emerald-300 rounded-xl py-3 cursor-pointer hover:bg-emerald-50 transition-colors"
      >
        + Agregar categoría
      </button>
    </div>
  );
}

// ─── Contact Page Editor ──────────────────────────────────────────────────────
function ContactEditor({
  data,
  onChange,
}: {
  data: ContactPageContent;
  onChange: (d: ContactPageContent) => void;
}) {
  const set = (patch: Partial<ContactPageContent>) => onChange({ ...data, ...patch });

  return (
    <div className="space-y-4">
      <SectionCard title="Información de contacto" icon={<Icons.Phone className="w-4 h-4 text-emerald-500" />}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Teléfono</Label>
            <Input
              value={data.phone ?? ""}
              onChange={(v) => set({ phone: v })}
              placeholder="(305) 555-0000"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={data.email ?? ""}
              onChange={(v) => set({ email: v })}
              placeholder="support@grenbee.com"
              type="email"
            />
          </div>
        </div>
        <div>
          <Label>Dirección</Label>
          <Input
            value={data.addressLine ?? ""}
            onChange={(v) => set({ addressLine: v })}
            placeholder="Miami, FL"
          />
        </div>
        <BilingualField
          label="Horarios"
          valueEn={data.hoursEn ?? ""}
          valueEs={data.hoursEs ?? ""}
          onChangeEn={(v) => set({ hoursEn: v })}
          onChangeEs={(v) => set({ hoursEs: v })}
        />
      </SectionCard>

      <SectionCard title="Texto introductorio" icon={<Icons.MessageSquare className="w-4 h-4 text-blue-500" />}>
        <BilingualField
          label="Párrafo de intro"
          valueEn={data.introEn ?? ""}
          valueEs={data.introEs ?? ""}
          onChangeEn={(v) => set({ introEn: v })}
          onChangeEs={(v) => set({ introEs: v })}
          multiline
          rows={3}
        />
      </SectionCard>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type PageId = "home" | "faq" | "contact";

const PAGE_TABS: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: "home",    label: "Home",    icon: <Icons.House className="w-4 h-4" /> },
  { id: "faq",     label: "FAQ",     icon: <Icons.HelpCircle className="w-4 h-4" /> },
  { id: "contact", label: "Contact", icon: <Icons.Mail className="w-4 h-4" /> },
];

function emptyHome(): HomePageContent {
  return {
    pageId: "home",
    servicePhotos: {},
    updatedAt: "",
  };
}

function emptyFaq(): FaqPageContent {
  return {
    pageId: "faq",
    categories: [],
    updatedAt: "",
  };
}

function emptyContact(): ContactPageContent {
  return {
    pageId: "contact",
    updatedAt: "",
  };
}

export default function PageContentTab() {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [homeData, setHomeData]     = useState<HomePageContent>(emptyHome());
  const [faqData, setFaqData]       = useState<FaqPageContent>(emptyFaq());
  const [contactData, setContactData] = useState<ContactPageContent>(emptyContact());
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async (pageId: PageId) => {
    setLoading(true);
    setError(null);
    try {
      if (pageId === "home") {
        const d = await fetchPageContent("home");
        if (d) setHomeData(d);
      } else if (pageId === "faq") {
        const d = await fetchPageContent("faq");
        if (d) setFaqData(d);
      } else {
        const d = await fetchPageContent("contact");
        if (d) setContactData(d);
      }
    } catch {
      setError("Error al cargar el contenido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activePage);
  }, [activePage, load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const email = auth.currentUser?.email ?? "admin";
      if (activePage === "home") {
        await savePageContent({ ...homeData, updatedBy: email });
      } else if (activePage === "faq") {
        await savePageContent({ ...faqData, updatedBy: email });
      } else {
        await savePageContent({ ...contactData, updatedBy: email });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Error al guardar. Verifica permisos de Firestore.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-[600px] animate-in fade-in duration-200">
      {/* ── Left sidebar ───────────────────────────────────────────────── */}
      <aside className="w-48 shrink-0 border-r border-gray-100 bg-gray-50 py-4 px-3 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 mb-3">
          Páginas
        </p>
        {PAGE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePage(tab.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer text-left ${
              activePage === tab.id
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </aside>

      {/* ── Right content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-sm font-black text-gray-950 capitalize">
              Editor — {activePage === "home" ? "Home Page" : activePage === "faq" ? "FAQ" : "Contacto"}
            </h2>
            <p className="text-xs text-gray-400">Los cambios se publican inmediatamente al guardar.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            {saving ? (
              <Icons.Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Icons.CheckCircle2 className="w-4 h-4" />
            ) : (
              <Icons.Save className="w-4 h-4" />
            )}
            {saving ? "Guardando…" : saved ? "¡Guardado!" : "Guardar cambios"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <Icons.AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Icons.Loader2 className="animate-spin text-emerald-500 w-6 h-6" />
            </div>
          ) : (
            <>
              {activePage === "home" && (
                <HomeEditor data={homeData} onChange={setHomeData} />
              )}
              {activePage === "faq" && (
                <FaqEditor data={faqData} onChange={setFaqData} />
              )}
              {activePage === "contact" && (
                <ContactEditor data={contactData} onChange={setContactData} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
