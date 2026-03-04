import { useTranslation } from 'react-i18next';

export function NewsListHeader() {
    const { t } = useTranslation();

    return (
        <div className="mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
                {t('home.news_title')}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {t('home.news_archive.subtitle') || "Mantén-te al dia de tot el que pasa a la nostra escola i dels projectes de l'AFA."}
            </p>
        </div>
    );
}
