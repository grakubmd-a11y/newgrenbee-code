/**
 * Static chrome copy for the server-rendered area landing pages.
 *
 * react-i18next runs client-only (initReactI18next + localStorage), so server
 * components cannot call t(). These labels — mirrored from the `areaPage.*`
 * keys in packages/i18n/locales/en.json — live here as a plain lang-keyed
 * dictionary so the pages stay bilingual-ready while rendering on the server.
 *
 * Page CONTENT (hero, descriptions, testimonials, faqs) comes from AreaContent
 * data, not from here.
 */
export type Lang = "en" | "es";

export interface AreaCopy {
  home: string;
  serviceAreas: string;
  bookService: string;
  callUs: string;
  bookNow: string;
  servicesTitle: (city: string) => string;
  difference: {
    eyebrow: string;
    title: string;
    pillars: { title: string; desc: string }[];
  };
  stats: { stat: string; label: string }[];
  plansCta: { title: string; subtitle: string; button: string };
  testimonialsTitle: (city: string) => string;
  testimonialsSubtitle: string;
  neighborhoodsTitle: (city: string) => string;
  faqTitle: string;
  bottomCta: {
    title: (city: string) => string;
    subtitle: string;
    button: (city: string) => string;
  };
  otherServices: string;
  hub: {
    heading: string;
    subheading: string;
    availableNow: string;
    comingSoon: string;
    comingSoonLabel: string;
    waitlistHeading: string;
    waitlistSubheading: string;
    waitlistSuccess: string;
    zipPlaceholder: string;
    emailPlaceholder: string;
    notifyMe: string;
  };
}

const en: AreaCopy = {
  home: "Home",
  serviceAreas: "Service Areas",
  bookService: "Book a Service",
  callUs: "Call Us",
  bookNow: "Book now",
  servicesTitle: (city) => `Services in ${city}`,
  difference: {
    eyebrow: "Our Promise",
    title: "The Grenbee Difference",
    pillars: [
      { title: "Spotless Results", desc: "We don't leave until the job meets our quality standard." },
      { title: "Vetted Technicians", desc: "Every pro is background-checked, trained, and insured." },
      { title: "Fully Insured", desc: "All work is covered. Zero risk for you." },
      { title: "On Time & Reliable", desc: "We show up when we say we will. Every time." },
    ],
  },
  stats: [
    { stat: "5,000+", label: "Happy Customers" },
    { stat: "500+", label: "5-Star Reviews" },
    { stat: "100%", label: "Insured & Vetted" },
    { stat: "Same Day", label: "Available" },
  ],
  plansCta: {
    title: "Save with a membership plan",
    subtitle: "Regular service? Our membership plans lock in your price with zero hassle.",
    button: "View Plans →",
  },
  testimonialsTitle: (city) => `What ${city} homeowners say`,
  testimonialsSubtitle: "500+ five-star reviews and counting",
  neighborhoodsTitle: (city) => `Neighborhoods we serve in ${city}`,
  faqTitle: "Frequently asked questions",
  bottomCta: {
    title: (city) => `Ready for a cleaner home in ${city}?`,
    subtitle: "Book in 60 seconds. Transparent pricing. No surprises.",
    button: (city) => `Book a Service in ${city}`,
  },
  otherServices: "Other services in",
  hub: {
    heading: "Coverage Areas",
    subheading:
      "Grenbee is growing fast across Utah County and the Wasatch Back. Check if we serve your city, or join the waitlist to hear when we expand near you.",
    availableNow: "Available Now",
    comingSoon: "Coming Soon",
    comingSoonLabel: "Coming soon",
    waitlistHeading: "Not in your area yet?",
    waitlistSubheading:
      "Leave your zip code and email and we'll notify you the moment Grenbee launches near you.",
    waitlistSuccess: "You're on the list! We'll email you when we reach your area.",
    zipPlaceholder: "Zip code",
    emailPlaceholder: "your@email.com",
    notifyMe: "Notify Me",
  },
};

// Spanish mirrors English for now (placeholder — translate before launching /es).
const es: AreaCopy = {
  ...en,
  home: "Inicio",
  serviceAreas: "Áreas de Servicio",
  bookService: "Reservar un Servicio",
  callUs: "Llámanos",
  bookNow: "Reservar ahora",
  servicesTitle: (city) => `Servicios en ${city}`,
  difference: {
    eyebrow: "Nuestra Promesa",
    title: "La Diferencia Grenbee",
    pillars: en.difference.pillars,
  },
  testimonialsTitle: (city) => `Lo que dicen los vecinos de ${city}`,
  testimonialsSubtitle: "Más de 500 reseñas de 5 estrellas",
  neighborhoodsTitle: (city) => `Vecindarios que atendemos en ${city}`,
  faqTitle: "Preguntas frecuentes",
  bottomCta: {
    title: (city) => `¿Listo para un hogar más limpio en ${city}?`,
    subtitle: "Reserva en 60 segundos. Precios claros. Sin sorpresas.",
    button: (city) => `Reservar un Servicio en ${city}`,
  },
  otherServices: "Otros servicios en",
  hub: {
    heading: "Áreas de Cobertura",
    subheading:
      "Grenbee crece rápido en Utah County y el Wasatch Back. Verifica si atendemos tu ciudad, o únete a la lista de espera para saber cuándo llegamos.",
    availableNow: "Disponible Ahora",
    comingSoon: "Próximamente",
    comingSoonLabel: "Próximamente",
    waitlistHeading: "¿Aún no llegamos a tu zona?",
    waitlistSubheading:
      "Deja tu código postal y correo y te avisamos en cuanto Grenbee llegue cerca de ti.",
    waitlistSuccess: "¡Estás en la lista! Te avisaremos cuando lleguemos a tu área.",
    zipPlaceholder: "Código postal",
    emailPlaceholder: "tu@correo.com",
    notifyMe: "Avísame",
  },
};

export const AREA_COPY: Record<Lang, AreaCopy> = { en, es };
