import { Star } from 'lucide-react';
import { Language } from '../../shared/i18n';

interface TestimonialsSectionProps {
  language: Language;
}

const testimonials = [
  {
    nameEn: 'Sarah Johnson',
    nameEs: 'Sarah Johnson',
    titleEn: 'Homeowner, California',
    titleEs: 'Propietaria, California',
    textEn: 'Amazing service! The team was professional, punctual, and did an excellent job. Highly recommend!',
    textEs: '¡Servicio increíble! El equipo fue profesional, puntual y realizó un excelente trabajo. ¡Altamente recomendado!',
    rating: 5,
  },
  {
    nameEn: 'Michael Chen',
    nameEs: 'Michael Chen',
    titleEn: 'Business Owner, Texas',
    titleEs: 'Dueño de Negocio, Texas',
    textEn: 'I use Greenbee for all our commercial cleaning needs. Consistent quality and reliable service.',
    textEs: 'Uso Greenbee para todas nuestras necesidades de limpieza comercial. Calidad consistente y servicio confiable.',
    rating: 5,
  },
  {
    nameEn: 'Emily Rodriguez',
    nameEs: 'Emily Rodriguez',
    titleEn: 'Busy Mom, Florida',
    titleEs: 'Mamá Ocupada, Florida',
    textEn: 'Such a time-saver! Booking was easy and the service exceeded my expectations. Will definitely book again!',
    textEs: '¡Un ahorro de tiempo! La reserva fue fácil y el servicio superó mis expectativas. ¡Definitivamente voy a reservar de nuevo!',
    rating: 5,
  },
];

export function TestimonialsSection({ language }: TestimonialsSectionProps) {
  return (
    <section className="w-full py-20 md:py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-950 mb-4 text-balance">
            {language === 'en' ? 'What Our Customers Say' : '¿Qué Dicen Nuestros Clientes?'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            {language === 'en'
              ? 'Trusted by thousands of happy homeowners'
              : 'Confiado por miles de propietarios satisfechos'}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={language === 'en' ? testimonial.nameEn : testimonial.nameEs}
              className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-brand/20 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className="fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-gray-700 mb-6 leading-relaxed text-sm md:text-base">
                {language === 'en' ? testimonial.textEn : testimonial.textEs}
              </p>

              {/* Author */}
              <div>
                <p className="font-bold text-gray-950">
                  {language === 'en' ? testimonial.nameEn : testimonial.nameEs}
                </p>
                <p className="text-sm text-gray-500">
                  {language === 'en' ? testimonial.titleEn : testimonial.titleEs}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
