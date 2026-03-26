import { Helmet } from 'react-helmet-async';
import { useBranding } from '../../hooks/useBranding';
import { useTranslation } from 'react-i18next';

interface SEOProps {
    title?: string;
    description?: string;
    canonical?: string;
    ogImage?: string;
    ogType?: string;
    structuredData?: object;
}

export function SEO({
    title,
    description,
    canonical,
    ogImage,
    ogType = 'website',
    structuredData
}: SEOProps) {
    const branding = useBranding();
    const { i18n } = useTranslation();
    const lang = i18n.language as 'ca' | 'es' | 'en';

    const siteTitle = branding.site_name;
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const defaultDescription = branding.default_seo_description[lang] || branding.default_seo_description.ca;
    const metaDescription = description || defaultDescription;
    const url = window.location.href;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={metaDescription} />
            {canonical && <link rel="canonical" href={canonical} />}

            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content={ogType} />
            {ogImage && <meta property="og:image" content={ogImage} />}

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={metaDescription} />
            {ogImage && <meta name="twitter:image" content={ogImage} />}

            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
}
