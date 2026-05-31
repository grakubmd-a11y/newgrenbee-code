/**
 * PlansAdminTab.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin UI to view, edit and manage membership plans stored in Firestore.
 * Prices, features, and plan-level toggles are all editable here.
 */

import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import {
  fetchMembershipPlans,
  saveMembershipPlanInFirestore,
  deleteMembershipPlanFromFirestore,
} from "@grenbee/firebase/services";
import { MembershipPlan, MembershipPriceTier, YardSizeTier } from "@grenbee/types";

const TIERS: { key: YardSizeTier; label: string }[] = [
  { key: "small",  label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large",  label: "Large" },
  { key: "xl",     label: "XL" },
];

// ─── Inline editable price tier ───────────────────────────────────────────────
function PriceTierEditor({
  tier,
  onChange,
}: {
  tier: MembershipPriceTier;
  onChange: (t: MembershipPriceTier) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase text-gray-400">Display</label>
      <input
        type="text"
        value={tier.priceLabel}
        onChange={e => onChange({ ...tier, priceLabel: e.target.value })}
        placeholder="e.g. $59–$79"
        className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand"
      />
      <label className="text-[10px] font-bold uppercase text-gray-400">Base price ($)</label>
      <input
        type="number"
        min={0}
        value={tier.price}
        onChange={e => onChange({ ...tier, price: Number(e.target.value) })}
        className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand"
      />
      <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={!!tier.customQuote}
          onChange={e => onChange({ ...tier, customQuote: e.target.checked })}
        />
        Show as "Custom Quote"
      </label>
    </div>
  );
}

// ─── Plan editor panel ────────────────────────────────────────────────────────
function PlanEditor({
  plan,
  onSave,
  onCancel,
  saving,
}: {
  plan: MembershipPlan;
  onSave: (p: MembershipPlan) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<MembershipPlan>({ ...plan });

  const setField = <K extends keyof MembershipPlan>(k: K, v: MembershipPlan[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const setPriceTier = (tier: YardSizeTier, val: MembershipPriceTier) =>
    setDraft(d => ({ ...d, pricing: { ...d.pricing, [tier]: val } }));

  const setFirstVisitTier = (tier: YardSizeTier, val: MembershipPriceTier) =>
    setDraft(d => ({
      ...d,
      firstVisit: d.firstVisit
        ? { ...d.firstVisit, pricing: { ...d.firstVisit.pricing, [tier]: val } }
        : undefined,
    }));

  const updateFeature = (idx: number, val: string) => {
    const arr = [...(draft.features || [])];
    arr[idx] = val;
    setField("features", arr);
  };
  const addFeature    = () => setField("features", [...(draft.features || []), ""]);
  const removeFeature = (idx: number) =>
    setField("features", draft.features.filter((_, i) => i !== idx));

  const updateNotIncluded = (idx: number, val: string) => {
    const arr = [...(draft.notIncluded || [])];
    arr[idx] = val;
    setField("notIncluded", arr);
  };
  const addNotIncluded    = () => setField("notIncluded", [...(draft.notIncluded || []), ""]);
  const removeNotIncluded = (idx: number) =>
    setField("notIncluded", draft.notIncluded.filter((_, i) => i !== idx));

  return (
    <div className="bg-white border border-brand/30 rounded-2xl p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h4 className="font-black text-sm text-gray-800 flex items-center gap-1.5">
          <Icons.Edit3 size={14} /> Editing: {draft.name}
        </h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer">
          <Icons.X size={16} />
        </button>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Plan Name</label>
          <input
            value={draft.name}
            onChange={e => setField("name", e.target.value)}
            className="w-full text-sm p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Tagline</label>
          <input
            value={draft.tagline}
            onChange={e => setField("tagline", e.target.value)}
            className="w-full text-sm p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Frequency label</label>
          <input
            value={draft.frequencyLabel}
            onChange={e => setField("frequencyLabel", e.target.value)}
            placeholder="e.g. 2 cuts / month"
            className="w-full text-sm p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={draft.active} onChange={e => setField("active", e.target.checked)} />
          Plan active (visible on /plans)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={!!draft.byQuote} onChange={e => setField("byQuote", e.target.checked)} />
          By-quote card (no prices shown)
        </label>
      </div>

      {/* Pricing matrix */}
      {!draft.byQuote && (
        <div>
          <h5 className="text-xs font-black uppercase text-gray-500 mb-3">Monthly Pricing by Yard Size</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TIERS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <span className="text-[10px] font-black uppercase text-brand block">{label}</span>
                <PriceTierEditor
                  tier={draft.pricing[key]}
                  onChange={val => setPriceTier(key, val)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First Visit Reset pricing */}
      {draft.firstVisit && !draft.byQuote && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-2 text-xs font-black uppercase text-amber-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.firstVisit.required}
                onChange={e =>
                  setDraft(d => ({
                    ...d,
                    firstVisit: d.firstVisit ? { ...d.firstVisit, required: e.target.checked } : undefined,
                  }))
                }
              />
              First Cut Reset (required)
            </label>
          </div>
          {draft.firstVisit.required && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {TIERS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-600 block">{label} reset</span>
                  <PriceTierEditor
                    tier={draft.firstVisit!.pricing[key]}
                    onChange={val => setFirstVisitTier(key, val)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-black uppercase text-gray-500">Features (included)</h5>
            <button onClick={addFeature} className="text-brand text-[10px] font-bold bg-transparent border-none cursor-pointer hover:underline flex items-center gap-1">
              <Icons.Plus size={11} /> Add
            </button>
          </div>
          <div className="space-y-1.5">
            {(draft.features || []).map((f, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={f}
                  onChange={e => updateFeature(i, e.target.value)}
                  className="flex-1 text-xs p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand"
                />
                <button onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer">
                  <Icons.Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-black uppercase text-gray-500">Not Included</h5>
            <button onClick={addNotIncluded} className="text-gray-400 text-[10px] font-bold bg-transparent border-none cursor-pointer hover:underline flex items-center gap-1">
              <Icons.Plus size={11} /> Add
            </button>
          </div>
          <div className="space-y-1.5">
            {(draft.notIncluded || []).map((ni, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={ni}
                  onChange={e => updateNotIncluded(i, e.target.value)}
                  className="flex-1 text-xs p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand"
                />
                <button onClick={() => removeNotIncluded(i)} className="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer">
                  <Icons.Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={() => onSave(draft)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-xs font-bold rounded-xl border-none cursor-pointer disabled:opacity-60 hover:bg-brand/90 transition-colors"
        >
          {saving ? <Icons.RotateCw size={13} className="animate-spin" /> : <Icons.Save size={13} />}
          Save Plan
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border-none cursor-pointer hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <a
          href="/us/plans"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-brand bg-brand/8 rounded-xl hover:bg-brand/15 transition-colors no-underline"
        >
          <Icons.ExternalLink size={12} /> Preview /us/plans
        </a>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────
export default function PlansAdminTab() {
  const [plans, setPlans]       = useState<MembershipPlan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<MembershipPlan | null>(null);
  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchMembershipPlans();
    setPlans(data.sort((a, b) => a.order - b.order));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (plan: MembershipPlan) => {
    setSaving(true);
    try {
      await saveMembershipPlanInFirestore(plan);
      setFeedback(`✅ "${plan.name}" saved.`);
      setEditing(null);
      await load();
    } catch (e: any) {
      setFeedback(`❌ Error: ${e.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async (plan: MembershipPlan) => {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return;
    try {
      await deleteMembershipPlanFromFirestore(plan.id);
      setFeedback(`🗑️ "${plan.name}" deleted.`);
      await load();
    } catch (e: any) {
      setFeedback(`❌ Error: ${e.message}`);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const typeColors: Record<string, string> = {
    lawn:     "bg-emerald-50 text-emerald-800 border-emerald-200",
    cleaning: "bg-sky-50 text-sky-800 border-sky-200",
    bundle:   "bg-purple-50 text-purple-800 border-purple-200",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-black text-lg text-gray-900">Membership Plans</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Edit prices, features, and plan details. Changes reflect immediately on{" "}
            <a href="/us/plans" target="_blank" rel="noopener noreferrer" className="text-brand font-bold hover:underline">
              grenbee.com/us/plans
            </a>
          </p>
        </div>
        <a
          href="/us/plans"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/8 px-3 py-2 rounded-xl hover:bg-brand/15 transition-colors no-underline"
        >
          <Icons.ExternalLink size={13} /> View Page
        </a>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <PlanEditor
          plan={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {/* Plans list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Icons.Loader2 size={22} className="animate-spin text-brand" />
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`bg-white border rounded-2xl p-5 flex flex-wrap items-center gap-4 transition-all ${
                editing?.id === plan.id ? "border-brand ring-1 ring-brand" : "border-gray-100 hover:border-gray-200"
              }`}
            >
              {/* Left: info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm text-gray-900">{plan.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColors[plan.type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {plan.type}
                  </span>
                  {!plan.active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">inactive</span>
                  )}
                  {plan.byQuote && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">by-quote</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{plan.tagline}</p>
                {!plan.byQuote && (
                  <div className="flex gap-3 flex-wrap">
                    {TIERS.map(({ key, label }) => (
                      <span key={key} className="text-[10px] text-gray-400 font-mono">
                        {label}: {plan.pricing[key]?.customQuote ? "Custom" : plan.pricing[key]?.priceLabel}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditing(editing?.id === plan.id ? null : plan)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border-none cursor-pointer transition-colors"
                >
                  <Icons.Edit3 size={12} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan)}
                  className="text-gray-350 hover:text-red-600 bg-transparent border-none cursor-pointer"
                  title="Delete plan"
                >
                  <Icons.Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
