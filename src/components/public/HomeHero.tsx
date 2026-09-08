import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit } from 'lucide-react';
import { LazyImage } from '../common/LazyImage';
import type { HeroConfig } from '../../services/ConfigService';
import { useBranding } from '../../hooks/useBranding';

interface HomeHeroProps {
    isAdmin: boolean;
    heroConfig: HeroConfig | null;
    heroResolved: boolean;
    onOpenModal: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ isAdmin, heroConfig, heroResolved, onOpenModal }) => {
    const { t } = useTranslation();
    const branding = useBranding();

    // Mientras no se sepa cual es el hero configurado no se pinta la imagen por
    // defecto: apunta a otro fichero distinto y el cambio se ve como un salto.
    const heroSrc = heroConfig?.image_url || (heroResolved ? branding.default_hero_url : null);

    return (
        <div className="w-full h-44 lg:h-[300px] mb-5 lg:mb-8 relative rounded-2xl overflow-hidden mt-4 lg:mt-6 shadow-md mx-auto max-w-[calc(100%-3rem)] lg:max-w-none group">
            {heroSrc ? (
                <LazyImage
                    src={heroSrc}
                    alt="Escola Hero"
                    className="w-full h-full object-cover bg-slate-200"
                    loading="eager"
                />
            ) : (
                <div className="w-full h-full bg-slate-200 animate-pulse" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-5 lg:p-8">
                <h1 className="text-xl lg:text-4xl font-bold text-white drop-shadow-md leading-tight">
                    {heroConfig?.title || t('home.welcome_title') || "Benvinguts a l'AFA Falguera"}
                </h1>
                <p className="mt-1 text-sm lg:text-lg text-white/85 drop-shadow-sm">
                    {t('home.welcome_subtitle', 'Escola, families i comunitat.')}
                </p>
            </div>

            {/* Solo el lapiz: el boton decia "Editar Hero" en grande y competia con el
                titulo de la portada para las tres personas que pueden pulsarlo. */}
            {isAdmin && (
                <button
                    onClick={onOpenModal}
                    aria-label={t('common.edit', 'Editar')}
                    title={t('common.edit', 'Editar')}
                    className="absolute top-3 right-3 z-30 w-9 h-9 flex items-center justify-center bg-white/85 dark:bg-slate-900/85 rounded-full shadow-md backdrop-blur-sm border border-white/30 hover:scale-110 active:scale-95 transition-all"
                >
                    <Edit size={16} className="text-primary" />
                </button>
            )}
        </div>
    );
};
