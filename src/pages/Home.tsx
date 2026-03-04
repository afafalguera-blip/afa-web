import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FeaturedProjects } from '../components/public/FeaturedProjects';
import { AcollidaModal } from '../components/public/AcollidaModal';
import { useAuth } from '../hooks/useAuth';
import { HeroSettingsModal } from '../components/public/HeroSettingsModal';
import { AboutSettingsModal } from '../components/public/AboutSettingsModal';
import { ConfigService, type HeroConfig, type AboutConfig, type ContactConfig } from '../services/ConfigService';
import { SEO } from '../components/common/SEO';
import { HomeHero } from '../components/public/HomeHero';
import { HomeNav } from '../components/public/HomeNav';
import { NewsSection } from '../features/news/components/NewsSection';
import { EventsSection } from '../features/events/components/EventsSection';
import { AboutSection } from '../components/public/AboutSection';
import { Link } from 'react-router-dom';

export function Home() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [isAcollidaModalOpen, setIsAcollidaModalOpen] = useState(false);
  const [heroConfig, setHeroConfig] = useState<HeroConfig | null>(null);
  const [aboutConfig, setAboutConfig] = useState<AboutConfig | null>(null);
  const [contactConfig, setContactConfig] = useState<ContactConfig | null>(null);
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  useEffect(() => {
    const fetchConfigs = async () => {
      const [hero, about, contact] = await Promise.all([
        ConfigService.getHeroConfig(),
        ConfigService.getAboutConfig(),
        ConfigService.getContactConfig()
      ]);
      if (hero) setHeroConfig(hero);
      if (about) setAboutConfig(about);
      if (contact) setContactConfig(contact);
    };
    fetchConfigs();
  }, []);

  return (
    <>
      <SEO
        title="Inicio"
        description="Bienvenidos a la web oficial del AFA de l'Escola Falguera. Gestiona inscripciones a extraescolares, consulta el calendario, noticias y servicios de acogida."
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "AFA Escola Falguera",
          "url": "https://afafalguera.com",
          "logo": "https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/Imagenes/logo.png",
          "contactPoint": {
            "@type": "ContactPoint",
            "email": "hola@afafalguera.com",
            "contactType": "customer service"
          },
          "sameAs": [
            "https://www.instagram.com/afafalguera"
          ],
          "hasPart": [
            {
              "@type": "WebPage",
              "name": "Extraescolares",
              "url": "https://afafalguera.com/extraescolars"
            },
            {
              "@type": "WebPage",
              "name": "Tienda",
              "url": "https://afafalguera.com/botiga"
            },
            {
              "@type": "WebPage",
              "name": "Calendario",
              "url": "https://afafalguera.com/calendari"
            },
            {
              "@type": "WebPage",
              "name": "Documentos",
              "url": "https://afafalguera.com/documents"
            }
          ]
        }}
      />

      <HomeHero
        isAdmin={isAdmin}
        heroConfig={heroConfig}
        onOpenModal={() => setIsHeroModalOpen(true)}
      />

      <HomeNav onOpenAcollida={() => setIsAcollidaModalOpen(true)} />

      <NewsSection isAdmin={isAdmin} />

      <EventsSection />

      <section className="px-6 mt-8 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <a
            href="https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/documents/actes/1770072824500-8l989f.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <span className="material-icons-round">description</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {t('home.assemblea_banner.tag')}
                </span>
                <span className="text-slate-400 text-[10px] font-medium">{t('home.course_current')}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('home.assemblea_banner.title')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-1">
                {t('home.assemblea_banner.description')}
              </p>
            </div>
          </a>

          <Link
            to="/contacte"
            className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <span className="material-icons-round">mail</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  {t('home.contact_banner.tag')}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('home.contact_banner.title')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-1">
                {t('home.contact_banner.description')}
              </p>
            </div>
          </Link>
        </div>
      </section>

      <AcollidaModal
        isOpen={isAcollidaModalOpen}
        onClose={() => setIsAcollidaModalOpen(false)}
      />

      <FeaturedProjects />

      <HeroSettingsModal
        isOpen={isHeroModalOpen}
        onClose={() => setIsHeroModalOpen(false)}
        currentConfig={heroConfig}
        onUpdate={(newConfig) => setHeroConfig(newConfig)}
      />

      <AboutSettingsModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        currentConfig={aboutConfig}
        onUpdate={(newConfig) => setAboutConfig(newConfig)}
      />

      <AboutSection
        isAdmin={isAdmin}
        aboutExpanded={aboutExpanded}
        setAboutExpanded={setAboutExpanded}
        aboutConfig={aboutConfig}
        contactConfig={contactConfig}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
      />
    </>
  );
}
