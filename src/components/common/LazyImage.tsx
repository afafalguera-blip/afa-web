import { useState, useEffect } from 'react';
import { proxyStorageUrl } from '../../utils/storageUrl';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
    placeholder?: string;
}

export function LazyImage({ src, alt, className, placeholder, ...props }: LazyImageProps) {
    const proxiedSrc = proxyStorageUrl(src);
    const [currentSrc, setCurrentSrc] = useState(placeholder || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    // Derivado, no estado: al cambiar src la imagen previa sigue en pantalla
    // hasta que la nueva termina de cargar, y entonces vuelve a estar "loaded".
    const loaded = currentSrc === proxiedSrc;

    useEffect(() => {
        let cancelled = false;

        const img = new Image();
        img.src = proxiedSrc;
        // El cancelled evita que una carga anterior mas lenta pise a la actual.
        img.onload = () => {
            if (!cancelled) setCurrentSrc(proxiedSrc);
        };

        return () => { cancelled = true; };
    }, [proxiedSrc]);

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-40 blur-sm'}`}
            loading="lazy"
            decoding="async"
            {...props}
        />
    );
}
