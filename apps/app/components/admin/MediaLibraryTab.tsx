/**
 * MediaLibraryTab.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * WordPress-style media library for the admin panel.
 * Upload photos → stored in Firebase Storage under /media/
 * Metadata (URL, alt, tags) stored in Firestore /media/{id}
 *
 * Features:
 *  • Drag-and-drop + click-to-upload
 *  • Grid view with thumbnail previews
 *  • Click a photo → side panel (copy URL, edit alt/tags, delete)
 *  • Tag filter chips
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Icons from "lucide-react";
import {
  uploadMediaItem,
  fetchMediaItems,
  updateMediaItem,
  deleteMediaItem,
} from "@grenbee/firebase/services";
import { MediaItem } from "@grenbee/types";
import { auth } from "@grenbee/firebase";

const COMMON_TAGS = ["hero", "service", "team", "area", "before-after", "lawn", "cleaning"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryTab() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [editAlt, setEditAlt] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await fetchMediaItems();
      setItems(fetched);
    } catch (e) {
      setError("No se pudo cargar la biblioteca de medios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // When a photo is selected, sync edit state
  useEffect(() => {
    if (selected) {
      setEditAlt(selected.alt);
      setEditTags([...selected.tags]);
      setDeleteConfirm(false);
      setCopied(false);
    }
  }, [selected?.id]);

  const allTags = Array.from(
    new Set(items.flatMap((i) => i.tags))
  ).sort();

  const filtered = tagFilter === "all"
    ? items
    : items.filter((i) => i.tags.includes(tagFilter));

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const user = auth.currentUser;
    if (!user) { setError("Debes estar autenticado para subir archivos."); return; }

    setUploading(true);
    setUploadProgress(0);
    setError("");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" no es una imagen.`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`"${file.name}" supera el límite de 20 MB.`);
        continue;
      }
      try {
        const uploaded = await uploadMediaItem(file, [], "", user.email ?? "admin");
        setItems((prev) => [uploaded, ...prev]);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (e: any) {
        setError(`Error subiendo "${file.name}": ${e?.message ?? "desconocido"}`);
      }
    }
    setUploading(false);
    setUploadProgress(0);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleSaveSelected() {
    if (!selected) return;
    setSaving(true);
    try {
      await updateMediaItem(selected.id, { alt: editAlt, tags: editTags });
      const updated: MediaItem = { ...selected, alt: editAlt, tags: editTags };
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelected(updated);
    } catch {
      setError("No se pudo guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteMediaItem(selected);
      setItems((prev) => prev.filter((i) => i.id !== selected.id));
      setSelected(null);
      setDeleteConfirm(false);
    } catch {
      setError("No se pudo eliminar el archivo.");
    } finally {
      setSaving(false);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleEditTag(tag: string) {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addCustomTag() {
    const t = newTagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !editTags.includes(t)) {
      setEditTags((prev) => [...prev, t]);
    }
    setNewTagInput("");
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-gray-950">Biblioteca de Medios</h3>
          <p className="text-[10px] text-gray-400 font-medium">
            {items.length} {items.length === 1 ? "archivo" : "archivos"} · Imágenes para landing pages y landing de áreas
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
        >
          <Icons.Upload className="w-3.5 h-3.5" />
          Subir
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-xs text-red-700">
          <Icons.AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button className="ml-auto" onClick={() => setError("")}><Icons.X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {uploading && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-emerald-700 mb-1.5">
            <Icons.Loader2 className="w-3.5 h-3.5 animate-spin" />
            Subiendo... {uploadProgress}%
          </div>
          <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Drop zone (shown only when library empty) */}
      {!loading && items.length === 0 && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
            isDragging ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
          }`}
        >
          <Icons.ImagePlus className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">Arrastra imágenes aquí o haz clic para seleccionar</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP · máx 20 MB por archivo</p>
        </div>
      )}

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {["all", ...allTags].map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                tagFilter === tag
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tag === "all" ? "Todos" : tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        {/* Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Drag overlay when items exist */}
              <div
                className={`relative ${isDragging ? "ring-2 ring-emerald-400 ring-offset-2 rounded-2xl" : ""}`}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
              >
                {filtered.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">
                    {tagFilter === "all" ? "Sube tu primera imagen." : `Sin fotos con etiqueta "${tagFilter}".`}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          selected?.id === item.id
                            ? "border-emerald-500 shadow-md"
                            : "border-transparent hover:border-emerald-300"
                        }`}
                        title={item.alt || item.filename}
                      >
                        <img
                          src={item.url}
                          alt={item.alt || item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <div className="w-64 shrink-0 bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4 text-left">
            {/* Preview */}
            <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-200">
              <img src={selected.url} alt={selected.alt} className="w-full h-full object-cover" />
            </div>

            {/* Filename & size */}
            <div>
              <p className="text-xs font-bold text-gray-800 break-all">{selected.filename}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(selected.sizeBytes)} · {selected.mimeType}</p>
              <p className="text-[10px] text-gray-400">{selected.uploadedAt.slice(0, 10)}</p>
            </div>

            {/* Copy URL */}
            <button
              onClick={() => copyUrl(selected.url)}
              className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl border transition-colors cursor-pointer ${
                copied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300"
              }`}
            >
              {copied ? <Icons.Check className="w-3.5 h-3.5" /> : <Icons.Copy className="w-3.5 h-3.5" />}
              {copied ? "¡Copiado!" : "Copiar URL"}
            </button>

            {/* Alt text */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Texto alternativo</label>
              <input
                type="text"
                value={editAlt}
                onChange={(e) => setEditAlt(e.target.value)}
                placeholder="Descripción de la imagen"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Etiquetas</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleEditTag(tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      editTags.includes(tag)
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
                  placeholder="etiqueta personalizada"
                  className="flex-1 border border-gray-200 rounded-xl px-2 py-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  onClick={addCustomTag}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 rounded-xl text-xs font-bold cursor-pointer"
                >+</button>
              </div>
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {editTags.map((t) => (
                    <span key={t} className="flex items-center gap-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-lg">
                      {t}
                      <button onClick={() => toggleEditTag(t)} className="cursor-pointer"><Icons.X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <button
              onClick={handleSaveSelected}
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>

            {/* Delete */}
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-semibold py-1 cursor-pointer"
              >
                <Icons.Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center space-y-2">
                <p className="text-xs text-red-700 font-semibold">¿Eliminar permanentemente?</p>
                <div className="flex gap-2">
                  <button onClick={handleDelete} disabled={saving}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-lg cursor-pointer">
                    Sí, eliminar
                  </button>
                  <button onClick={() => setDeleteConfirm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-1.5 rounded-lg cursor-pointer">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Deselect */}
            <button onClick={() => setSelected(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
