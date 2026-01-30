import { motion } from 'framer-motion';
import { Landmark, Users, CheckCircle, Clock, Vote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Project {
  id: string;
  title: string;
  description: string;
  imageBefore?: string;
  imageAfter: string;
  budget: number;
  status: 'completed' | 'in_progress' | 'voting';
  impact: string;
  participants: string;
}

const StatusBadge = ({ status }: { status: Project['status'] }) => {
  const { t } = useTranslation();
  
  const styles = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    voting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  };

  const icons = {
    completed: <CheckCircle className="w-3 h-3 mr-1" />,
    in_progress: <Clock className="w-3 h-3 mr-1" />,
    voting: <Vote className="w-3 h-3 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {icons[status]}
      {t(`featured_projects.status.${status}`)}
    </span>
  );
};

export const FeaturedProjects = () => {
  const { t } = useTranslation();

  const PROJECTS: Project[] = [
    {
      id: '1',
      title: t('featured_projects.projects.1.title'),
      description: t('featured_projects.projects.1.description'),
      imageAfter: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2069&auto=format&fit=crop',
      budget: 12500,
      status: 'in_progress',
      impact: t('featured_projects.projects.1.impact'),
      participants: t('featured_projects.projects.1.participants')
    },
    {
      id: '2',
      title: t('featured_projects.projects.2.title'),
      description: t('featured_projects.projects.2.description'),
      imageAfter: 'https://images.unsplash.com/photo-1596496050844-4610e341904a?q=80&w=2073&auto=format&fit=crop',
      budget: 8200,
      status: 'completed',
      impact: t('featured_projects.projects.2.impact'),
      participants: t('featured_projects.projects.2.participants')
    },
    {
      id: '3',
      title: t('featured_projects.projects.3.title'),
      description: t('featured_projects.projects.3.description'),
      imageAfter: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop',
      budget: 4500,
      status: 'voting',
      impact: t('featured_projects.projects.3.impact'),
      participants: t('featured_projects.projects.3.participants')
    }
  ];

  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 10 }}
            viewport={{ once: true }}
            className="inline-block p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 mb-4"
          >
            <Landmark className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </motion.div>
          
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            {t('featured_projects.title')}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400">
            {t('featured_projects.subtitle_prefix')} <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{t('featured_projects.subtitle_highlight')}</span>. 
            {t('featured_projects.subtitle_suffix')}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {PROJECTS.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-900/5 transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="relative h-48 overflow-hidden">
                <div className="absolute top-4 left-4 z-10">
                  <StatusBadge status={project.status} />
                </div>
                <img
                  src={project.imageAfter}
                  alt={project.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="text-sm font-medium opacity-90">{t('featured_projects.investment_label')}</p>
                  <p className="text-lg font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(project.budget)}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {project.title}
                </h3>
                <p className="mt-3 flex-auto text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                  {project.description}
                </p>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                    <Users className="w-4 h-4 mr-2 text-indigo-500" />
                    <span>{project.participants}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                    <Landmark className="w-4 h-4 mr-2 text-indigo-500" />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{project.impact}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
