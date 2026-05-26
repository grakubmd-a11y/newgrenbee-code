import React, { useState } from "react";
import { 
  BookOpen, 
  Search, 
  Clock, 
  User, 
  Eye, 
  ChevronRight, 
  Leaf, 
  Wrench, 
  CheckSquare, 
  Scissors, 
  Award,
  ArrowLeft
} from "lucide-react";

interface BlogSectionProps {
  onSelectTab: (tabId: string) => void;
  onSelectServiceEstimator: (serviceId: string) => void;
}

interface BlogPost {
  id: string;
  category: "cleaning" | "handyman" | "garden" | "assembly";
  categoryLabel: string;
  title: string;
  excerpt: string;
  content: string[];
  author: string;
  date: string;
  readTime: string;
  views: number;
  tags: string[];
  relatedServiceId: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: "eco-cleaning-solutions",
    category: "cleaning",
    categoryLabel: "Limpieza Ecológica",
    title: "Soluciones Ecológicas Hechas en Casa para un Baño Impecable",
    excerpt: "Descubre cómo el bicarbonato de sodio, el vinagre blanco destilado y los aceites esenciales de té de árbol pueden sustituir de forma segura y económica a los desinfectantes industriales abrasivos.",
    content: [
      "La limpieza del baño suele ser el reto más complejo de las labores del hogar, lo que lleva a muchas personas a recurrir a blanqueadores industriales sumamente corrosivos que liberan vapores nocivos (VOCs) nocivos tanto para humanos como para mascotas domésticas.",
      "Para un baño impecable sin químicos dañinos, puedes mezclar una taza de bicarbonato de sodio con diez gotas de aceite esencial de árbol de té. Esta mezcla elimina hongos de manera natural y absorbe impurezas con gran potencia.",
      "Para las mamparas de vidrio manchadas por la dureza de la cal del agua de Springfield, el vinagre blanco atomizado templado disuelve de inmediato las sales minerales. Déjalo actuar durante 8 minutos y sécalo con un paño de microfibra limpio.",
      "Si buscas un servicio profundo profesional sin esfuerzos ni químicos corrosivos, nuestro equipo cuenta con agentes limpiadores Eco-Verify listos para dejar tu baño resplandeciente."
    ],
    author: "Elena Patterson (Especialista en Química Verde)",
    date: "2026-05-18",
    readTime: "4 min de lectura",
    views: 1240,
    tags: ["Limpieza Verde", "Hazlo Tú Mismo", "Hogar Saludable"],
    relatedServiceId: "house-cleaning"
  },
  {
    id: "tv-mount-drywall-tips",
    category: "handyman",
    categoryLabel: "Soporte e Instalaciones",
    title: "Guía de Seguridad para Montar tu Pantalla de TV en Drywall o Yeso",
    excerpt: "¿Tienes dudas sobre la resistencia de tu tabique de yeso? Te explicamos cómo localizar los perfiles de soporte metálicos o de madera y qué tarugos autoperforantes de expansión emplear.",
    content: [
      "Montar una pantalla plana de gran tamaño es un incremento estético innegable para tu sala, pero un error de fijación puede provocar daños estructurales graves al caer de la pared.",
      "Nunca confíes el peso total de una televisión de más de 40 pulgadas al drywall hueco sin anclaje de perfilería. Es indispensable buscar los montantes de madera o metal (studs) usando un detector magnético.",
      "Si resulta imposible alinear el soporte exactamente en un montante, utiliza tornillos de mariposa (toggle bolts) de alta capacidad de 1/4 de pulgada. Estos se abren en forma de ancla detrás del panel de yeso, distribuyendo la carga de tensión de forma balanceada.",
      "Recuerda realizar siempre un nivelado exacto de tres niveles (burbuja izquierda, centro y derecha) antes de apretar de forma definitiva. Si prefieres un acabado limpio con ocultamiento de cables eléctricos sin complicaciones, nuestros instaladores asisten en minutos."
    ],
    author: "James Miller (Técnico Master Springfield)",
    date: "2026-05-12",
    readTime: "5 min de lectura",
    views: 932,
    tags: ["Montaje TV", "Herramientas", "Seguridad"],
    relatedServiceId: "tv-mounting"
  },
  {
    id: "lawn-aeration-spring",
    category: "garden",
    categoryLabel: "Césped y Paisajismo",
    title: "La Aireación del Suelo: El Secreto para un Jardín Frondoso en Primavera",
    excerpt: "Aprende por qué compactar la tierra sofoca las raíces de tu césped y de qué manera la aireación de tapones facilita la absorción óptima de agua, nitrógeno y potasio.",
    content: [
      "Muchos propietarios de Springfield se preguntan por qué su césped luce seco o amarillento a pesar de regarlo con regularidad. La causa principal suele ser la compactación del suelo arcilloso típico de Illinois.",
      "La compactación impide que el agua, los nutrientes de los fertilizantes y el oxígeno penetren a la profundidad de la raíz. La aireación retira pequeños 'tapones' de tierra, permitiendo que las raíces respiren y se multipliquen con fuerza.",
      "La mejor época del año para realizar la aireación es en primavera o inicios de otoño, justo antes de sembrar nuevas semillas de césped resistente. Mantén el regado profundo pero espaciado para fomentar raíces largas.",
      "Recuerda recortar el césped a una altura no menor de 2.5 pulgadas para no debilitarle frente a las plagas. El podado periódico coordinado por nuestro equipo automatizado mantiene el jardín reluciente mes a mes."
    ],
    author: "Marcus Vance (Agrónomo y Paisajista)",
    date: "2026-05-04",
    readTime: "4 min de lectura",
    views: 812,
    tags: ["Césped Saludable", "Jardinería", "Nutrientes"],
    relatedServiceId: "lawn-mowing"
  },
  {
    id: "ikea-assembly-shortcuts",
    category: "assembly",
    categoryLabel: "Ensamblaje Eficiente",
    title: "4 Atajos Mentales para no Desperar Ensamblando Muebles de Embalaje Plano",
    excerpt: "No dejes que los planos imposibles arruinen tu tarde. Organizar la tornillería por tipología y no apretar por completo los pernos de unión son las claves de oro.",
    content: [
      "El despiece de un mueble de paquete plano (como los muebles IKEA) puede resultar abrumador. El error más común es vaciar toda la bolsa de tornillos, tarugos y pernos en un solo contenedor caótico.",
      "Primer atajo de oro: Clasifica los componentes sobre una manta o cartón antes de empezar. Cuenta el número exacto de piezas según la primera página del manual para advertir fallas de fábrica antes de armar.",
      "Segundo atajo de oro: No utilices destornilladores eléctricos de alto impacto en maderas MDF o aglomeradas blandas. Una fuerza desmedida barre la rosca de forma irreversible. Trabaja manualmente con movimientos firmes.",
      "Tercer atajo: Deja las uniones estructurales con una holgura del 10% hasta que todo el esqueleto esté ensamblado. Esto te dará margen de ajuste para alinear puertas o repisas. Al final, da el apriete de firmeza general.",
      "Si tienes un armario gigante de tres cuerpos o camas complejas, ahorrarás valioso tiempo de descanso contratando a nuestros especialistas de ensamblaje en HomeServicesHub."
    ],
    author: "Clara Geller (Diseñadora de Espacios)",
    date: "2026-04-28",
    readTime: "3 min de lectura",
    views: 1560,
    tags: ["Muebles", "Tutorial", "IKEA Hacks"],
    relatedServiceId: "furniture-assembly"
  }
];

export default function BlogSection({ onSelectTab, onSelectServiceEstimator }: BlogSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const activePost = BLOG_POSTS.find(p => p.id === selectedPostId);

  return (
    <div className="max-w-5xl mx-auto py-6 text-left animate-in fade-in duration-300 space-y-8">
      
      {/* Search Header or Back to overview button */}
      {selectedPostId && activePost ? (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setSelectedPostId(null)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-gray-200 text-gray-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Volver al Catálogo del Blog</span>
          </button>

          {/* Core Article Render */}
          <article className="bg-white border border-gray-150 rounded-3xl p-6 md:p-10 shadow-sm space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-black text-brand uppercase tracking-wider bg-brand-light px-3 py-1 rounded-md inline-block">
                {activePost.categoryLabel}
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-950 tracking-tight leading-snug">
                {activePost.title}
              </h1>
              
              <div className="flex flex-wrap gap-4 text-xs text-gray-450 pt-2 border-b border-gray-100 pb-4 font-semibold">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-brand" />
                  {activePost.author}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {activePost.readTime}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Eye size={13} />
                  {activePost.views} Lecturas simuladas
                </span>
              </div>
            </div>

            <div className="space-y-5 text-gray-700 text-xs sm:text-sm leading-relaxed max-w-3xl">
              {activePost.content.map((paragraph, idx) => (
                <p key={idx} className="font-normal">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {activePost.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] bg-slate-100 border border-gray-150 text-gray-650 px-2.5 py-0.5 rounded-full font-bold">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Call to action to related estimator */}
              <button
                type="button"
                onClick={() => {
                  onSelectServiceEstimator(activePost.relatedServiceId);
                }}
                className="px-5 py-2 rounded-xl bg-brand text-white hover:bg-brand-hover text-xs font-black shadow-md hover:shadow transition-all cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>Probar Cotizador Asociado</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </article>
        </div>
      ) : (
        /* CATALOG OVERVIEW */
        <div className="space-y-8">
          <div className="border-b border-gray-200 pb-5">
            <span className="text-[10px] text-brand font-black tracking-widest uppercase bg-brand-light px-3.5 py-1.5 rounded-full select-none inline-block border border-brand/20">
              🛠️ SEO HUB DE CONSEJOS OPERACIONALES • SPRINGFIELD DESK
            </span>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight mt-3">
              Consejos de Cuidado del Hogar
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Descubre tutoriales redactados por expertos locales y aprende sobre mantenimiento ecológico, seguridad estructural del drywall y optimización espacial.
            </p>
          </div>

          {/* Search bar & filter tabs */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-3 text-gray-400">
                <Search size={15} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar consejos, tips o etiquetas..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-gray-200 outline-none focus:border-brand bg-white font-semibold text-gray-800 shadow-xxs"
              />
            </div>

            {/* Category selection filters */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "Todos" },
                { id: "cleaning", label: "Limpieza" },
                { id: "handyman", label: "Instalaciones" },
                { id: "garden", label: "Césped" },
                { id: "assembly", label: "Ensamblaje" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-brand text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-slate-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blog posts grid */}
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
              {filteredPosts.map((post) => (
                <div 
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  className="bg-white border border-gray-150 rounded-2xl p-5 hover:border-brand/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-left group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-brand uppercase bg-brand-light px-2.5 py-0.5 rounded border border-brand/10">
                        {post.categoryLabel}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 font-mono">
                        <Clock size={11} /> {post.readTime}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-gray-900 group-hover:text-brand transition-colors leading-tight">
                      {post.title}
                    </h3>

                    <p className="text-xxs sm:text-xs text-gray-500 line-clamp-3 leading-relaxed font-normal">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-4 flex justify-between items-center text-xxs text-gray-400 font-bold">
                    <span>Por {post.author.split(" ")[0]}</span>
                    <span className="text-brand font-black flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Leer Artículo Completo <ChevronRight size={12} />
                    </span>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-gray-200 rounded-2xl">
              <BookOpen size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-semibold">No se encontraron artículos que coincidan con tus parámetros de búsqueda.</p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
