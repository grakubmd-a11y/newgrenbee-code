export type Language = 'en' | 'es';

export const translations = {
  en: {
    // Navigation & Header
    'nav.signIn': 'Sign In',
    'nav.createAccount': 'Create Account',
    'nav.hello': 'Hello',
    'nav.myAccount': 'My Account',
    'nav.language': 'Language',
    'nav.menu': 'Menu',

    // Hero Section
    'hero.title': 'Your Home, Our Care',
    'hero.subtitle': 'Professional home services at your fingertips. Book trusted experts in minutes.',
    'hero.cta': 'Book a Service',
    'hero.featured': 'Featured Services',

    // Features
    'features.title': 'Why Choose Greenbee?',
    'features.fast': 'Fast & Easy',
    'features.fastDesc': 'Book services in minutes with our intuitive platform',
    'features.trusted': 'Trusted Professionals',
    'features.trustedDesc': 'Vetted and verified service providers you can rely on',
    'features.secure': 'Secure Payments',
    'features.secureDesc': 'Safe transactions with guaranteed protection',
    'features.support': '24/7 Support',
    'features.supportDesc': 'Our team is always here to help you',

    // Services
    'services.title': 'Our Services',
    'services.cleaning': 'Cleaning',
    'services.lawnCare': 'Lawn Care',
    'services.tvInstall': 'TV Installation',
    'services.furnitureAssembly': 'Furniture Assembly',
    'services.pressureWashing': 'Pressure Washing',
    'services.bookNow': 'Book Now',
    'services.starting': 'Starting at',

    // Testimonials
    'testimonials.title': 'What Our Customers Say',
    'testimonials.great': 'Excellent Service',
    'testimonials.professional': 'Very professional and on time',
    'testimonials.recommend': 'Highly Recommend',
    'testimonials.amazing': 'Amazing experience from start to finish',

    // Trust Section
    'trust.title': 'Trusted by Thousands',
    'trust.customers': 'Happy Customers',
    'trust.bookings': 'Bookings Completed',
    'trust.providers': 'Service Providers',
    'trust.rating': 'Average Rating',

    // CTA Section
    'cta.ready': 'Ready to Get Started?',
    'cta.description': 'Join thousands of homeowners who trust Greenbee for their home service needs.',
    'cta.button': 'Browse Services',
    'cta.or': 'or',
    'cta.contact': 'Contact Us',

    // Auth
    'auth.login': 'Sign In',
    'auth.signup': 'Create Account',
    'auth.continueGoogle': 'Continue with Google',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.submit': 'Submit',
  },
  es: {
    // Navigation & Header
    'nav.signIn': 'Iniciar Sesión',
    'nav.createAccount': 'Crear Cuenta',
    'nav.hello': 'Hola',
    'nav.myAccount': 'Mi Cuenta',
    'nav.language': 'Idioma',
    'nav.menu': 'Menú',

    // Hero Section
    'hero.title': 'Tu Hogar, Nuestro Cuidado',
    'hero.subtitle': 'Servicios profesionales para el hogar al alcance de tu mano. Reserva expertos confiables en minutos.',
    'hero.cta': 'Reservar Servicio',
    'hero.featured': 'Servicios Destacados',

    // Features
    'features.title': '¿Por Qué Elegir Greenbee?',
    'features.fast': 'Rápido y Fácil',
    'features.fastDesc': 'Reserva servicios en minutos con nuestra plataforma intuitiva',
    'features.trusted': 'Profesionales Confiables',
    'features.trustedDesc': 'Proveedores verificados y confiables',
    'features.secure': 'Pagos Seguros',
    'features.secureDesc': 'Transacciones seguras con protección garantizada',
    'features.support': 'Soporte 24/7',
    'features.supportDesc': 'Nuestro equipo siempre está listo para ayudarte',

    // Services
    'services.title': 'Nuestros Servicios',
    'services.cleaning': 'Limpieza',
    'services.lawnCare': 'Cuidado del Césped',
    'services.tvInstall': 'Instalación de TV',
    'services.furnitureAssembly': 'Ensamblaje de Muebles',
    'services.pressureWashing': 'Lavado a Presión',
    'services.bookNow': 'Reservar Ahora',
    'services.starting': 'Desde',

    // Testimonials
    'testimonials.title': '¿Qué Dicen Nuestros Clientes?',
    'testimonials.great': 'Servicio Excelente',
    'testimonials.professional': 'Muy profesional y puntual',
    'testimonials.recommend': 'Altamente Recomendado',
    'testimonials.amazing': 'Experiencia increíble de principio a fin',

    // Trust Section
    'trust.title': 'Confiado por Miles',
    'trust.customers': 'Clientes Satisfechos',
    'trust.bookings': 'Reservas Completadas',
    'trust.providers': 'Proveedores de Servicios',
    'trust.rating': 'Calificación Promedio',

    // CTA Section
    'cta.ready': '¿Listo para Comenzar?',
    'cta.description': 'Únete a miles de propietarios que confían en Greenbee para sus necesidades de servicios del hogar.',
    'cta.button': 'Explorar Servicios',
    'cta.or': 'o',
    'cta.contact': 'Contactanos',

    // Auth
    'auth.login': 'Iniciar Sesión',
    'auth.signup': 'Crear Cuenta',
    'auth.continueGoogle': 'Continuar con Google',
    'auth.email': 'Correo',
    'auth.password': 'Contraseña',
    'auth.confirmPassword': 'Confirmar Contraseña',
    'auth.submit': 'Enviar',
  },
};

export function t(key: keyof typeof translations.en, language: Language): string {
  return translations[language][key] || translations.en[key] || key;
}

export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('greenbee_language');
  if (stored === 'es' || stored === 'en') return stored;
  return navigator.language.startsWith('es') ? 'es' : 'en';
}
