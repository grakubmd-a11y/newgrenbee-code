import { Zap, Shield, Clock, HeadphonesIcon } from 'lucide-react';
import { Language, t } from '../../shared/i18n';

interface FeaturesSectionProps {
  language: Language;
}

const features = [
  {
    icon: Zap,
    titleEn: 'Fast & Easy',
    titleEs: 'Rápido y Fácil',
    descEn: 'Book services in minutes with our intuitive platform',
    descEs: 'Reserva servicios en minutos con nuestra plataforma intuitiva',
  },
  {
    icon: Shield,
    titleEn: 'Trusted Professionals',
    titleEs: 'Profesionales Confiables',
    descEn: 'Vetted and verified service providers you can rely on',
    descEs: 'Proveedores verificados y confiables',
  },
  {
    icon: Clock,
    titleEn: 'Flexible Scheduling',
    titleEs: 'Horarios Flexibles',
    descEn: 'Choose times that work best for you',
    descEs: 'Elige horarios que se adapten a ti',
  },
  {
    icon: HeadphonesIcon,
    titleEn: '24/7 Support',
    titleEs: 'Soporte 24/7',
    descEn: 'Our team is always here to help you',
    descEs: 'Nuestro equipo siempre está listo para ayudarte',
  },
];

export function FeaturesSection({ language }: FeaturesSectionProps) {
  return (
    <section className="w-full py-20 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-950 mb-4 text-balance">
            {language === 'en' ? 'Why Choose Greenbee?' : '¿Por Qué Elegir Greenbee?'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            {language === 'en' 
              ? 'We make home services simple, reliable, and affordable'
              : 'Hacemos que los servicios del hogar sean simples, confiables y asequibles'}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            const title = language === 'en' ? feature.titleEn : feature.titleEs;
            const desc = language === 'en' ? feature.descEn : feature.descEs;
            return (
              <div
                key={title}
                className="group p-6 md:p-8 rounded-2xl bg-gray-50 hover:bg-brand-light border border-gray-100 hover:border-brand/20 transition-all duration-300 hover:shadow-lg hover:shadow-brand/10"
              >
                <div className="h-12 w-12 rounded-xl bg-brand/10 group-hover:bg-brand/20 flex items-center justify-center mb-4 transition-colors">
                  <Icon size={24} className="text-brand" />
                </div>
                <h3 className="text-lg font-bold text-gray-950 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
