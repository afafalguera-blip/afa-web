import { useState, useEffect } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
    placeholder?: string;
}

export function LazyImage({ src, alt, className, placeholder, ...props }: LazyImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(placeholder || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

    useEffect(() => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            setCurrentSrc(src);
            setLoaded(true);
        };
    }, [src]);

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
