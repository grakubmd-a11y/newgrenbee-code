/**
 * Static content for the server-rendered "Grenbee for Hosts" landing page.
 *
 * Like areaCopy.ts, this is a plain lang-keyed dictionary because the page is a
 * server component and react-i18next is client-only. ES mirrors EN for now
 * (placeholder — translate before promoting /us/es/hosts).
 */
export type Lang = "en" | "es";

export interface HostsCopy {
  seoTitle: string;
  seoDescription: string;
  breadcrumbHome: string;
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaBook: string;
    ctaCall: string;
  };
  valueProps: { title: string; desc: string }[];
  howTitle: string;
  how: { step: string; title: string; desc: string }[];
  pricing: {
    title: string;
    subtitle: string;
    baseLabel: string;
    basePrice: string;
    rows: { label: string; price: string }[];
    addonsTitle: string;
    addons: { label: string; price: string }[];
    includedNote: string;
  };
  faqTitle: string;
  faqs: { q: string; a: string }[];
  bottomCta: { title: string; subtitle: string; button: string };
}

const en: HostsCopy = {
  seoTitle: "Airbnb & Vacation Rental Cleaning in Utah | Grenbee for Hosts",
  seoDescription:
    "Reliable Airbnb/VRBO turnover cleaning across Park City, Heber & the Wasatch Back. Guest-ready every time, photo-documented, insured. Transparent per-turnover pricing.",
  breadcrumbHome: "Home",
  hero: {
    badge: "Grenbee for Hosts",
    title: "Guest-ready turnovers, every single booking.",
    subtitle:
      "Short-term rental cleaning built for Airbnb & VRBO hosts in Park City, Heber, and across the Wasatch Back. We clean between guests on your schedule, document every turnover with photos, and never leave you scrambling before a check-in.",
    ctaBook: "Book a Turnover",
    ctaCall: "Talk to Us",
  },
  valueProps: [
    {
      title: "Never a missed check-in",
      desc: "We schedule turnovers around your booking calendar and show up on time, every time — back-to-back reservations included.",
    },
    {
      title: "Photo-documented",
      desc: "Every turnover comes with before & after photos, so you have proof of condition and peace of mind for guest disputes.",
    },
    {
      title: "Restock & laundry",
      desc: "Optional amenity restocking and on-site linen laundry keep your property fully guest-ready without you lifting a finger.",
    },
    {
      title: "Vetted & insured",
      desc: "Every cleaner is background-checked, trained, and fully insured — essential protection for your investment property.",
    },
  ],
  howTitle: "How it works",
  how: [
    {
      step: "1",
      title: "Tell us about your property",
      desc: "Bedrooms, bathrooms, and any add-ons. Get an instant, transparent price — no waiting on a quote.",
    },
    {
      step: "2",
      title: "Book around your calendar",
      desc: "Schedule a one-time turnover or set up recurring cleans for a property you manage long-term.",
    },
    {
      step: "3",
      title: "We make it guest-ready",
      desc: "Our insured pros clean, stage, restock, and send you before/after photos. You just collect the next booking.",
    },
  ],
  pricing: {
    title: "Simple, per-turnover pricing",
    subtitle: "No memberships, no surprises. Pay per turnover, scaled to your property.",
    baseLabel: "Studio / 1 Bedroom turnover",
    basePrice: "$89",
    rows: [
      { label: "2 Bedrooms", price: "+$30" },
      { label: "3 Bedrooms", price: "+$55" },
      { label: "4 Bedrooms", price: "+$85" },
      { label: "5+ Bedrooms", price: "+$115" },
      { label: "Extra bathrooms", price: "+$20–$50" },
    ],
    addonsTitle: "Add-ons",
    addons: [
      { label: "Amenity restocking (soap, paper, coffee)", price: "+$20" },
      { label: "Wash & fold linens and towels on-site", price: "+$30" },
      { label: "Express turnover (under 4 hours notice)", price: "+$45" },
    ],
    includedNote: "Before & after photo documentation included with every turnover.",
  },
  faqTitle: "Host FAQs",
  faqs: [
    {
      q: "Do you work around guest check-in / check-out times?",
      a: "Yes. Tell us your turnaround window and we schedule the turnover to fit — including same-day back-to-back bookings.",
    },
    {
      q: "Which areas do you cover for rentals?",
      a: "Park City, Heber, Midway, and across the Wasatch Back and Utah County. Enter your ZIP at checkout to confirm.",
    },
    {
      q: "Can I set up recurring turnovers?",
      a: "Yes — book a one-time turnover or a recurring schedule for properties you manage long-term, with priority scheduling.",
    },
    {
      q: "Do you restock supplies and handle laundry?",
      a: "Both are optional add-ons. We can restock guest amenities and wash & fold linens and towels on-site so the unit is fully reset.",
    },
    {
      q: "Are your cleaners insured?",
      a: "Every Grenbee pro is background-checked, trained, and fully insured — important peace of mind for rental owners.",
    },
  ],
  bottomCta: {
    title: "Ready for stress-free turnovers?",
    subtitle: "Get an instant price and book your first turnover in minutes.",
    button: "Book a Turnover",
  },
};

const es: HostsCopy = {
  ...en,
  seoTitle: "Limpieza de Airbnb y Rentas Vacacionales en Utah | Grenbee para Hosts",
  seoDescription:
    "Limpieza confiable de turnovers Airbnb/VRBO en Park City, Heber y el Wasatch Back. Lista para huéspedes siempre, con fotos, asegurada. Precio transparente por turnover.",
  breadcrumbHome: "Inicio",
  hero: {
    badge: "Grenbee para Hosts",
    title: "Lista para huéspedes en cada reserva.",
    subtitle:
      "Limpieza de rentas de corto plazo para hosts de Airbnb y VRBO en Park City, Heber y todo el Wasatch Back. Limpiamos entre huéspedes según tu agenda, documentamos cada turnover con fotos y nunca te dejamos a las apuradas antes de un check-in.",
    ctaBook: "Reservar un Turnover",
    ctaCall: "Hablar con Nosotros",
  },
  valueProps: [
    {
      title: "Nunca un check-in fallido",
      desc: "Agendamos los turnovers según tu calendario de reservas y llegamos a tiempo, siempre — incluidas reservas consecutivas.",
    },
    {
      title: "Documentado con fotos",
      desc: "Cada turnover incluye fotos de antes y después: prueba del estado y tranquilidad ante disputas con huéspedes.",
    },
    {
      title: "Reposición y lavandería",
      desc: "Reposición de amenidades y lavado de ropa de cama en sitio dejan tu propiedad lista sin que muevas un dedo.",
    },
    {
      title: "Verificados y asegurados",
      desc: "Cada limpiador está verificado, capacitado y asegurado — protección esencial para tu propiedad de inversión.",
    },
  ],
  howTitle: "Cómo funciona",
  how: [
    {
      step: "1",
      title: "Cuéntanos sobre tu propiedad",
      desc: "Habitaciones, baños y extras. Obtén un precio instantáneo y transparente — sin esperar cotización.",
    },
    {
      step: "2",
      title: "Reserva según tu calendario",
      desc: "Agenda un turnover único o configura limpiezas recurrentes para una propiedad que administras a largo plazo.",
    },
    {
      step: "3",
      title: "La dejamos lista para huéspedes",
      desc: "Nuestros pros asegurados limpian, preparan, reponen y te envían fotos antes/después. Tú solo recibes la próxima reserva.",
    },
  ],
  pricing: {
    title: "Precio simple, por turnover",
    subtitle: "Sin membresías, sin sorpresas. Paga por turnover, según tu propiedad.",
    baseLabel: "Turnover Studio / 1 Habitación",
    basePrice: "$89",
    rows: [
      { label: "2 Habitaciones", price: "+$30" },
      { label: "3 Habitaciones", price: "+$55" },
      { label: "4 Habitaciones", price: "+$85" },
      { label: "5+ Habitaciones", price: "+$115" },
      { label: "Baños adicionales", price: "+$20–$50" },
    ],
    addonsTitle: "Extras",
    addons: [
      { label: "Reposición de amenidades (jabón, papel, café)", price: "+$20" },
      { label: "Lavar y doblar ropa de cama y toallas en sitio", price: "+$30" },
      { label: "Turnover express (menos de 4 horas de aviso)", price: "+$45" },
    ],
    includedNote: "Documentación con fotos antes y después incluida en cada turnover.",
  },
  faqTitle: "Preguntas de Hosts",
  faqs: [
    {
      q: "¿Trabajan según los horarios de check-in / check-out?",
      a: "Sí. Dinos tu ventana de cambio y agendamos el turnover para que encaje — incluidas reservas consecutivas el mismo día.",
    },
    {
      q: "¿Qué zonas cubren para rentas?",
      a: "Park City, Heber, Midway y todo el Wasatch Back y Utah County. Ingresa tu código postal al reservar para confirmar.",
    },
    {
      q: "¿Puedo configurar turnovers recurrentes?",
      a: "Sí — reserva un turnover único o un horario recurrente para propiedades que administras a largo plazo, con prioridad.",
    },
    {
      q: "¿Reponen suministros y hacen lavandería?",
      a: "Ambos son extras opcionales. Reponemos amenidades y lavamos y doblamos ropa de cama y toallas en sitio.",
    },
    {
      q: "¿Sus limpiadores están asegurados?",
      a: "Cada pro de Grenbee está verificado, capacitado y asegurado — tranquilidad importante para dueños de rentas.",
    },
  ],
  bottomCta: {
    title: "¿Listo para turnovers sin estrés?",
    subtitle: "Obtén un precio al instante y reserva tu primer turnover en minutos.",
    button: "Reservar un Turnover",
  },
};

export const HOSTS_COPY: Record<Lang, HostsCopy> = { en, es };
