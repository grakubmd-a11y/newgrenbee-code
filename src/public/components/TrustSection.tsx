import { TrendingUp, Users, CheckCircle2, Award } from 'lucide-react';
import { Language } from '../../shared/i18n';

interface TrustSectionProps {
  language: Language;
}

const stats = [
  {
    iconEn: Users,
    numberEn: '2,500+',
    numberEs: '2,500+',
    titleEn: 'Happy Customers',
    titleEs: 'Clientes Felices',
  },
  {
    iconEn: CheckCircle2,
    numberEn: '5,000+',
    numberEs: '5,000+',
    titleEn: 'Bookings Completed',
    titleEs: 'Reservas Completadas',
  },
  {
    iconEn: TrendingUp,
    numberEn: '250+',
    numberEs: '250+',
    titleEn: 'Service Providers',
    titleEs: 'Proveedores',
  },
  {
    iconEn: Award,
    numberEn: '4.9/5',
    numberEs: '4.9/5',
    titleEn: 'Average Rating',
    titleEs: 'Calificación Promedio',
  },
];

export function TrustSection({ language }: TrustSectionProps) {
  return (
    <section className="w-full py-20 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-950 mb-4 text-balance">
            {language === 'en' ? 'Trusted by Thousands' : 'Confiado por Miles'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            {language === 'en'
              ? 'Join our growing community of satisfied homeowners'
              : 'Únete a nuestra creciente comunidad de propietarios satisfechos'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat) => (
            <div
              key={language === 'en' ? stat.titleEn : stat.titleEs}
              className="p-8 rounded-2xl bg-gradient-to-br from-brand-light to-transparent border border-brand/20 text-center hover:shadow-lg transition-all duration-300 hover:border-brand/40"
            >
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-xl bg-brand/20 flex items-center justify-center">
                  <stat.iconEn size={24} className="text-brand" />
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-black text-brand mb-2">
                {language === 'en' ? stat.numberEn : stat.numberEs}
              </div>
              <p className="font-semibold text-gray-950">
                {language === 'en' ? stat.titleEn : stat.titleEs}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
