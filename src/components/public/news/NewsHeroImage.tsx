import { proxyStorageUrl } from '../../../utils/storageUrl';

interface NewsHeroImageProps {
    imageUrl: string | null;
    title: string;
    sources?: string | null;
}

export function NewsHeroImage({ imageUrl, title, sources }: NewsHeroImageProps) {
    const fallbackImage = 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop';

    return (
        <div className="max-w-5xl mx-auto px-0 sm:px-8 mb-16 overflow-hidden">
            <div className="relative aspect-[21/9] sm:aspect-[16/7] sm:rounded-[3rem] overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                    src={proxyStorageUrl(imageUrl) || fallbackImage}
                    alt={title}
                    className="w-full h-full object-cover"
                />
            </div>
            {sources && (
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-4 italic">
                    Font: {sources}
                </p>
            )}
        </div>
    );
}
