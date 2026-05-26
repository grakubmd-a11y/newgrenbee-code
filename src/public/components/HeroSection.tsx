import React from "react";
import { ArrowRight, Sparkles, Home } from "lucide-react";

interface HeroSectionProps {
  onBooking: () => void;
  onLearnMore: () => void;
}

export default function HeroSection({ onBooking, onLearnMore }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden pt-20">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/30 backdrop-blur-sm">
              <Sparkles size={16} className="text-brand" />
              <span className="text-sm font-semibold text-brand">Servicios a Domicilio Profesionales</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight">
                Tu hogar,
                <span className="block bg-gradient-to-r from-brand to-emerald-300 bg-clip-text text-transparent">
                  perfectamente cuidado
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-gray-300 max-w-lg leading-relaxed">
                Servicios profesionales de limpieza, mantenimiento y reparación. Confiables, rápidos y con garantía de satisfacción.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <button
                onClick={onBooking}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-brand hover:bg-brand-hover text-white font-bold transition-all duration-200 hover:shadow-lg hover:shadow-brand/50 hover:scale-105"
              >
                Reservar Ahora
                <ArrowRight size={20} />
              </button>
              <button
                onClick={onLearnMore}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-gray-600 hover:border-white text-white font-bold transition-all duration-200 hover:bg-white/5"
              >
                Ver Servicios
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-700">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-brand">500+</div>
                <p className="text-sm text-gray-400">Clientes Satisfechos</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-brand">4.9★</div>
                <p className="text-sm text-gray-400">Calificación Media</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-brand">24/7</div>
                <p className="text-sm text-gray-400">Disponible</p>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative h-96 lg:h-[600px] hidden lg:flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-blue-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-3xl p-8 border border-gray-600 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
                    <Home size={24} className="text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Limpieza Profunda</p>
                    <p className="text-xs text-gray-400">Por solo $49</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Home size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Mantenimiento</p>
                    <p className="text-xs text-gray-400">Garantizado</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Home size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Equipo Certificado</p>
                    <p className="text-xs text-gray-400">+ 10 años experiencia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
