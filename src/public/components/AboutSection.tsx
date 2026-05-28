import React from "react";
import { 
  ShieldCheck, 
  Sparkles, 
  Leaf, 
  Flame, 
  Award, 
  Users, 
  TrendingUp, 
  Smile, 
  CheckCircle2, 
  MapPin, 
  ChevronRight,
  Calculator
} from "lucide-react";

interface AboutSectionProps {
  onSelectTab: (tabId: string) => void;
}

export default function AboutSection({ onSelectTab }: AboutSectionProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-16 py-6 text-left animate-in fade-in duration-300">
      
      {/* Hero Banner SEO optimized for Grenbee Standards */}
      <section className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white rounded-3xl p-8 md:p-14 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 bg-grid-pattern opacity-10 w-full h-full pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-brand/20 filter blur-[100px] pointer-events-none" />
        
        <div className="max-w-3xl space-y-6 relative z-10">
          <span className="text-[10px] font-black tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full uppercase inline-block select-none">
             ESTÁNDAR ECOLÓGICO GREENBEE • ORGULLO LOCAL
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Nuestra Misión: Hogares Impecables con Impacto Carbono Neutro
          </h1>
          <p className="text-xs sm:text-base text-slate-300 leading-relaxed font-medium">
            En HomeServicesHub, combinamos la agilidad tecnológica de despacho en Illinois con las estrictas prácticas ecológicas desarrolladas por los pioneros de Grenbee. Creemos que una limpieza de primer nivel y un soporte de herrería o césped no debe comprometer la salud de tu familia ni de tus mascotas.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onSelectTab("estimator")}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>Prueba el Cotizador ahora</span>
              <Calculator size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid layout of stats */}
      <section className="space-y-6">
        <h2 className="text-xl font-extrabold text-slate-950 tracking-tight font-sans text-center md:text-left">
          Los 4 Pilares de Compromiso Springfield
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white border border-gray-150 p-6 rounded-2xl space-y-3 shadow-xxs">
            <div className="h-10 w-10 bg-emerald-50 text-brand rounded-xl flex items-center justify-center shrink-0">
              <Leaf size={18} />
            </div>
            <h3 className="font-bold text-sm text-gray-950">Ingredientes 100% Verdes</h3>
            <p className="text-xxs text-gray-500 leading-normal">
              Utilizamos soluciones de limpieza certificadas EcoLogo. Libres de fosfatos, parabenos o aromatizantes artificiales agresivos. Totalmente amigables con cachorros y asmáticos.
            </p>
          </div>

          <div className="bg-white border border-gray-150 p-6 rounded-2xl space-y-3 shadow-xxs">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <h3 className="font-bold text-sm text-gray-950">Filtro Doble Selección</h3>
            <p className="text-xxs text-gray-500 leading-normal">
              Cada miembro de la cuadrilla pasa un riguroso análisis antecedentes penales de Illinois, además de 40 horas de formación de acabados de precisión en Springfield Desk.
            </p>
          </div>

          <div className="bg-white border border-gray-150 p-6 rounded-2xl space-y-3 shadow-xxs">
            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <h3 className="font-bold text-sm text-gray-950">Ruta Descarbonizada</h3>
            <p className="text-xxs text-gray-500 leading-normal">
              Nuestro algoritmo agrupa automáticamente las visitas de limpieza o podado por proximidad para reducir los traslados vehiculares hasta en un 38%, minimizando CO2.
            </p>
          </div>

          <div className="bg-white border border-gray-150 p-6 rounded-2xl space-y-3 shadow-xxs">
            <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <Smile size={18} />
            </div>
            <h3 className="font-bold text-sm text-gray-950">Garantía Real del 100%</h3>
            <p className="text-xxs text-gray-500 leading-normal">
              ¿No estás conforme? Si algún rincón no quedó óptimo bajo el checklist, nuestro despachador enviará una cuadrilla de repaso sin costo el mismo día útil.
            </p>
          </div>

        </div>
      </section>

      {/* SEO rich text comparison section */}
      <section className="bg-white border border-gray-150 rounded-3xl p-6 md:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 items-center text-left">
        <div className="space-y-5">
          <span className="text-[9px] font-black tracking-widest text-brand uppercase bg-brand-light px-3 py-1 rounded-md block w-max">
            DIFERENCIADOR DE PRESTACIÓN
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 font-sans">
            ¿Por qué elegir HomeServicesHub en Springfield?
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed font-normal">
            A diferencia de las agencias tradicionales que subcontratan sin supervisión o utilizan productos genéricos abrasivos para acelerar, nuestro esquema se basa en tarifas fijas transparentes y un control de calidad simulador en tiempo real.
          </p>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={15} className="text-brand shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900">Checklist Digital Abierto</h4>
                <p className="text-xxs text-gray-500 leading-normal">Tu reporte final viene certificado bajo 42 puntos de inspección detallados antes/después.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={15} className="text-brand shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 font-sans">Soporte Local las 24 Horas</h4>
                <p className="text-xxs text-gray-500 leading-normal">Sin conmutadores ruidosos. Te enlazamos directo con operaciones Springfield.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic visual representation of green operations */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-gray-150 relative overflow-hidden select-none text-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold bg-emerald-100/60 px-3 py-1.5 rounded-xl w-max">
            <Leaf size={14} />
            <span>Simulador de Neutralidad Ambiental 2026</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-[10px] text-gray-400 uppercase tracking-wider">
              <span>Indicador de Huella</span>
              <span>Nivel Realizado</span>
            </div>
            
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between font-semibold">
                <span>Químicos de Impacto Biodegradables</span>
                <span className="text-brand">100% de Cumplimiento</span>
              </div>
              <div className="h-2 bg-gray-250 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full w-[100%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span>Rendimiento Logístico Clientes Próximos</span>
                <span className="text-brand">Ahorro del 38% vs Independientes</span>
              </div>
              <div className="h-2 bg-gray-250 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full w-[38%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span>Reducción de residuos plásticos (envases reciclables)</span>
                <span className="text-emerald-700">92% de Rescate</span>
              </div>
              <div className="h-2 bg-gray-250 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 italic pt-1 text-center">
            * Datos calculados conforme a la red de vehículos eléctricos y optimización satelital.
          </p>
        </div>
      </section>

    </div>
  );
}
