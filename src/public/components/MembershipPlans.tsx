import React, { useState } from "react";
import { ShieldCheck, Check, Sparkles, Award, Star, RefreshCw, Calendar, Eye, Inbox, Heart } from "lucide-react";

interface MembershipPlansProps {
  activeMembership: string | null;
  onSelectMembership: (planId: string) => void;
  onCancelMembership: () => void;
}

export default function MembershipPlans({
  activeMembership,
  onSelectMembership,
  onCancelMembership
}: MembershipPlansProps) {
  const [showCelebration, setShowCelebration] = useState<string | null>(null);

  const plans = [
    {
      id: "essential",
      name: "Essential",
      price: "$29",
      period: "/mo",
      tagline: "Perfect for routine maintenance and peace of mind.",
      features: [
        "Priority booking status",
        "Annual comprehensive inspection",
        "5% discount on all services"
      ],
      buttonText: "Select Essential",
      style: "border-gray-200 hover:border-brand/40 shadow-sm",
      buttonStyle: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-brand hover:text-brand",
      isMostPopular: false
    },
    {
      id: "preferred",
      name: "Preferred",
      price: "$49",
      period: "/mo",
      tagline: "Our most popular plan for comprehensive care.",
      features: [
        "Top priority booking",
        "Bi-annual comprehensive inspections",
        "10% discount on all services",
        "24/7 emergency response line"
      ],
      buttonText: "Get Preferred",
      style: "border-brand bg-white shadow-md ring-2 ring-brand/10 md:-translate-y-2 relative scale-[1.01] md:scale-[1.03]",
      buttonStyle: "bg-brand text-white hover:bg-brand-hover shadow-md shadow-brand/10",
      isMostPopular: true
    },
    {
      id: "premium",
      name: "Premium",
      price: "$79",
      period: "/mo",
      tagline: "Ultimate coverage and dedicated support.",
      features: [
        "VIP guaranteed same-day booking",
        "Quarterly deep-dive inspections",
        "15% discount on all services",
        "Dedicated account manager"
      ],
      buttonText: "Select Premium",
      style: "border-gray-200 hover:border-brand/40 shadow-sm",
      buttonStyle: "bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10",
      isMostPopular: false
    }
  ];

  const handleSelect = (planId: string, planName: string) => {
    onSelectMembership(planId);
    setShowCelebration(planName);
  };

  return (
    <div className="w-full space-y-16 animate-in fade-in duration-300">
      {/* 1. Header Segment */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-4 md:pt-8">
        <span className="text-[10px] text-brand font-extrabold uppercase tracking-widest bg-brand-light px-3 py-1.5 rounded-full select-none inline-flex items-center gap-1 border border-brand/5">
          <Award size={12} className="text-brand shrink-0" />
          <span>Home Services Club Program</span>
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-950 tracking-tight leading-none">
          Elevate Your Home Care
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
          Choose a Springfield regional membership plan that fits your lifestyle. Enjoy priority scheduling, exclusive discounts, and peace of mind all year round.
        </p>

        {activeMembership && (
          <div className="mt-4 bg-brand-light/40 border border-brand/20 p-3 rounded-2xl max-w-md mx-auto flex items-center justify-between text-xs text-brand font-semibold shadow-xs">
            <span className="flex items-center gap-1.5">
              <Check size={14} strokeWidth={3} className="bg-brand text-white rounded-full p-0.5" />
              <span>Active Plan: <strong className="uppercase">{activeMembership}</strong> enabled (+ automatic savings!)</span>
            </span>
            <button
              onClick={onCancelMembership}
              className="text-[10px] text-rose-500 hover:underline hover:text-rose-600 font-bold"
            >
              Cancel Subscription
            </button>
          </div>
        )}
      </div>

      {/* 2. Grid Segment */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch pt-2">
        {plans.map((plan) => {
          const isActive = activeMembership === plan.id;
          return (
            <div
              key={plan.id}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-6 md:p-8 transition-all duration-300 ${plan.style} ${
                isActive ? "ring-4 ring-brand/20 border-brand" : ""
              }`}
            >
              {/* Most Popular Tag */}
              {plan.isMostPopular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest leading-none select-none shadow-sm shadow-brand/20">
                  Best Value
                </span>
              )}

              {/* Top half */}
              <div className="space-y-5">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-xl font-bold text-gray-955 tracking-tight">{plan.name}</h3>
                  {isActive && (
                    <span className="text-[10px] font-bold text-brand uppercase bg-brand-light px-2 py-0.5 rounded-full select-none">
                      Active Plan
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-950 tracking-tight">{plan.price}</span>
                  <span className="text-sm text-gray-400 font-semibold">{plan.period}</span>
                </div>

                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  {plan.tagline}
                </p>

                {/* Features List */}
                <div className="space-y-3.5 pt-4 border-t border-gray-50">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                      <div className="h-4 w-4 rounded-full bg-brand-light text-brand flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span className="font-medium leading-normal">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA button */}
              <div className="pt-8">
                <button
                  type="button"
                  onClick={() => handleSelect(plan.id, plan.name)}
                  className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all duration-350 cursor-pointer ${
                    isActive
                      ? "bg-brand-light text-brand border border-brand/20 cursor-default"
                      : plan.buttonStyle
                  }`}
                  disabled={isActive}
                >
                  {isActive ? "✓ Subscribed" : plan.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. "How Your Membership Works" Section */}
      <div className="max-w-5xl mx-auto border-t border-gray-100 pt-16 space-y-12">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">How Your Membership Works</h3>
          <p className="text-xs text-gray-400 font-medium select-none">Simple home wellness managed directly via your dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Calendar,
              title: "1. Book Instantly",
              desc: "Enjoy priority access to our calendar. Schedule services with zero hassle through your dedicated dashboard."
            },
            {
              icon: Sparkles,
              title: "2. We Manage It",
              desc: "Our vetted professionals handle the work to the highest standards, while your discounts apply automatically."
            },
            {
              icon: Heart,
              title: "3. Relax",
              desc: "Sit back and enjoy a perfectly maintained home, knowing GreenServe is always just a tap away."
            }
          ].map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center space-y-4 px-4">
                <div className="h-14 w-14 rounded-full bg-brand-light text-brand flex items-center justify-center border border-brand/5 shadow-inner">
                  <IconComp size={24} className="text-brand shrink-0" />
                </div>
                <div className="space-y-1.5 focus:outline-none">
                  <h4 className="text-sm font-bold text-gray-950 tracking-tight">{item.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SUCCESS CELEBRATION MODAL */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
          <div className="bg-white max-w-md w-full rounded-2xl border border-gray-100 p-6 md:p-8 space-y-5 text-center animate-in fade-in zoom-in duration-200">
            <div className="mx-auto h-16 w-16 bg-brand-light rounded-full text-brand flex items-center justify-center border border-brand/10 animate-bounce">
              <Award size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Welcome to the Springfield Vetted Club!</h3>
              <p className="text-xs text-gray-500 leading-normal">
                You are now officially subscribed to the <strong className="text-brand font-bold">{showCelebration}</strong> membership plan. Your automatic priority discounts have been enabled on our networks instantly!
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-[11px] text-gray-500 leading-relaxed border border-gray-100 italic">
              "We've locked in your contract. Your discounts are live and will show up automatically on the estimator quote receipt!"
            </div>

            <button
              onClick={() => setShowCelebration(null)}
              className="w-full py-3 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md shadow-brand/15 transition-all cursor-pointer"
            >
              Start Exploring Benefits
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
