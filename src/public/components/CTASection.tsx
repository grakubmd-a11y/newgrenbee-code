import { ArrowRight } from 'lucide-react';
import { Language, t } from '../../shared/i18n';

interface CTASectionProps {
  language: Language;
  onBrowse: () => void;
  onContact: () => void;
}

export function CTASection({ language, onBrowse, onContact }: CTASectionProps) {
  return (
    <section className="w-full py-20 md:py-32 bg-gradient-to-r from-brand to-brand-hover relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><circle cx=%2250%22 cy=%2250%22 r=%2230%22 fill=%22white%22 opacity=%220.1%22/></svg>')] bg-repeat" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Content */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 text-balance">
          {language === 'en' ? 'Ready to Get Started?' : '¿Listo para Comenzar?'}
        </h2>
        
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto text-balance">
          {language === 'en'
            ? 'Join thousands of homeowners who trust Greenbee for their home service needs.'
            : 'Únete a miles de propietarios que confían en Greenbee para sus necesidades de servicios del hogar.'}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onBrowse}
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-brand font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {language === 'en' ? 'Browse Services' : 'Explorar Servicios'}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={onContact}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/20 border border-white text-white font-bold text-lg hover:bg-white/30 transition-all duration-200"
          >
            {language === 'en' ? 'Contact Us' : 'Contactanos'}
          </button>
        </div>

        {/* Trust badge */}
        <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-300">★</span>
            ))}
          </div>
          <span className="text-sm font-semibold text-white/90">
            {language === 'en' ? '4.9/5 from 2,500+ reviews' : '4.9/5 de más de 2,500 reseñas'}
          </span>
        </div>
      </div>
    </section>
  );
}
