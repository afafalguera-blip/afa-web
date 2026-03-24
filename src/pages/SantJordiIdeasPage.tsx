import { Helmet } from 'react-helmet-async';
import type { ComponentType } from 'react';
import {
  Bookmark,
  ExternalLink,
  Flower2,
  Shield,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';

type IdeaItem = {
  title: string;
  description: string;
  tutorialUrl: string;
};

type IdeaSection = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  ideas: IdeaItem[];
};

const ideaSections: IdeaSection[] = [
  {
    id: 'marcapaginas',
    title: 'Marcapáginas Mágicos',
    icon: Bookmark,
    ideas: [
      {
        title: 'Marcapáginas de Resina',
        description:
          'Elegantes y muy duraderos. Usa moldes de silicona, resina epoxi y añade flores secas o pan de oro.',
        tutorialUrl:
          'https://www.youtube.com/results?search_query=tutorial+marcapaginas+resina+flores+secas',
      },
      {
        title: 'Acuarela y Lettering',
        description:
          'Con papel de acuarela grueso puedes crear fondos rápidos y escribir citas literarias con rotulador negro.',
        tutorialUrl:
          'https://www.youtube.com/results?search_query=tutorial+marcapaginas+acuarela+facil',
      },
      {
        title: 'Esquineros de Origami',
        description:
          'Se encajan en la esquina del libro. Son económicos, rápidos de hacer y gustan mucho a los peques.',
        tutorialUrl:
          'https://www.youtube.com/results?search_query=tutorial+marcapaginas+esquina+origami+dragon',
      },
    ],
  },
  {
    id: 'rosas',
    title: 'Rosas Eternas',
    icon: Flower2,
    ideas: [
      {
        title: 'Broches de Fieltro',
        description:
          'Recorta espirales de fieltro rojo, enróllalas y pégalas sobre un imperdible. Quedan listas para llevar.',
        tutorialUrl:
          'https://www.youtube.com/results?search_query=tutorial+rosa+de+fieltro+enrollada',
      },
      {
        title: 'Rosas de Papel Crepé',
        description:
          'Una alternativa ecológica a la rosa natural. El papel pinocho permite texturas realistas y vistosas.',
        tutorialUrl:
          'https://www.youtube.com/results?search_query=tutorial+rosa+papel+crepe+realista',
      },
      {
        title: 'Rosas a Crochet',
        description:
          'Si controlas el ganchillo, estas rosas se hacen rápido y se perciben como detalle artesanal premium.',
        tutorialUrl:
          'https://www.youtube.com/results?search_query=tutorial+rosa+crochet+facil+principiantes',
      },
    ],
  },
  {
    id: 'dragones',
    title: 'Dragones y Accesorios',
    icon: Shield,
    ideas: [
      {
        title: 'Llaveros de Arcilla (Fimo)',
        description:
          'Modela pequeños dragones, escudos o mini libros. Se hornean en casa y quedan resistentes.',
        tutorialUrl:
          'https://www.youtube.com/results?search_query=tutorial+llavero+arcilla+polimerica+dragon+kawaii',
      },
      {
        title: 'Tote Bags Estampadas',
        description:
          'Bolsas lisas estampadas con sellos caseros y pintura textil. Producto ideal para ticket medio-alto.',
        tutorialUrl:
          'https://www.youtube.com/results?search_query=tutorial+estampar+tote+bag+sellos',
      },
    ],
  },
];

export default function SantJordiIdeasPage() {
  return (
    <>
      <SEO
        title="Ideas y Manualidades de Sant Jordi"
        description="Selección de ideas de manualidades para la paradeta de Sant Jordi con tutoriales prácticos."
        canonical="https://afafalguera.com/especial/sant-jordi"
      />
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="px-4 sm:px-6 py-8 lg:py-10 space-y-10">
        <header className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-700 via-red-600 to-red-800 p-8 lg:p-10 text-white shadow-xl">
          <div className="absolute inset-x-0 top-0 h-2 bg-yellow-300" />
          <div className="relative">
            <p className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Contenido interno para noticia
            </p>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold">
              Manualidades de Sant Jordi
            </h1>
            <p className="mt-3 max-w-3xl text-sm md:text-base text-red-50">
              Ideas fáciles, económicas y con buena presentación para preparar
              la paradeta. Cada tarjeta incluye un enlace a tutorial en YouTube.
            </p>
          </div>
        </header>

        <nav className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {ideaSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                {section.title}
              </a>
            ))}
          </div>
        </nav>

        {ideaSections.map((section) => {
          const Icon = section.icon;
          return (
            <section id={section.id} key={section.id} className="scroll-mt-24">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-red-100 p-2 text-red-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {section.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.ideas.map((idea) => (
                  <article
                    key={idea.title}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <h3 className="text-lg font-bold text-slate-900">
                      {idea.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-slate-600">
                      {idea.description}
                    </p>
                    <a
                      href={idea.tutorialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-red-600 hover:text-white"
                    >
                      Ver tutorial
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
