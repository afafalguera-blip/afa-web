import { Helmet } from 'react-helmet-async';

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
    const siteTitle = "AFA Escola Falguera";
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const defaultDescription = "Web oficial del AFA de l'Escola Falguera. Información sobre actividades extraescolares, servicios de acogida, proyectos y últimas noticias de nuestra comunidad escolar.";
    const metaDescription = description || defaultDescription;
    const url = window.location.href;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={metaDescription} />
            {canonical && <link rel="canonical" href={canonical} />}

            {/* Open Graph / Facebook */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content={ogType} />
            {ogImage && <meta property="og:image" content={ogImage} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={metaDescription} />
            {ogImage && <meta name="twitter:image" content={ogImage} />}

            {/* Structured Data (Schema.org) */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
}
