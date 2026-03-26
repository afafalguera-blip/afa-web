import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit } from 'lucide-react';
import { LazyImage } from '../common/LazyImage';
import type { HeroConfig } from '../../services/ConfigService';
import { useBranding } from '../../hooks/useBranding';

interface HomeHeroProps {
    isAdmin: boolean;
    heroConfig: HeroConfig | null;
    onOpenModal: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ isAdmin, heroConfig, onOpenModal }) => {
    const { t } = useTranslation();
    const branding = useBranding();

    return (
        <div className="w-full h-40 lg:h-[300px] mb-6 lg:mb-8 relative rounded-2xl lg:rounded-3xl overflow-hidden mt-4 lg:mt-6 shadow-lg lg:shadow-xl mx-auto max-w-[calc(100%-3rem)] lg:max-w-none group">
            <LazyImage
                src={heroConfig?.image_url || branding.default_hero_url}
                alt="Escola Hero"
                className="w-full h-full object-cover bg-slate-200"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6 lg:p-8">
                <h1 className="text-2xl lg:text-4xl font-bold text-white drop-shadow-md leading-tight">
                    {heroConfig?.title || t('home.welcome_title') || "Benvinguts a l'AFA Falguera"}
                </h1>
            </div>

            {isAdmin && (
                <button
                    onClick={onOpenModal}
                    className="absolute top-4 right-4 z-30 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white p-2.5 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 px-4 backdrop-blur-sm border border-white/20"
                >
                    <Edit size={18} className="text-primary" />
                    <span className="text-sm font-bold">Editar Hero</span>
                </button>
            )}
        </div>
    );
};
