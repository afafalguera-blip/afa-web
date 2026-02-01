import { motion } from 'framer-motion';
import { Landmark, Users, CheckCircle, Clock, Vote, Edit, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProjectDetailModal } from './ProjectDetailModal';

interface Project {
  id: string;
  title: string;
  description: string;
  details?: string;
  imageAfter: string;
  budget?: number;
  status: 'completed' | 'in_progress' | 'voting' | 'active' | 'archived';
  impact?: string;
  participants?: string;
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
    active: <Clock className="w-3 h-3 mr-1" />,
    archived: <Landmark className="w-3 h-3 mr-1" />,
  };

  const labels = {
    completed: t('featured_projects.status.completed'),
    in_progress: t('featured_projects.status.in_progress'),
    voting: t('featured_projects.status.voting'),
    active: t('admin.projects.status_active'),
    archived: t('admin.projects.status_archived'),
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.in_progress}`}>
      {icons[status as keyof typeof icons] || icons.active}
      {labels[status as keyof typeof labels] || status}
    </span>
  );
};

export const FeaturedProjects = () => {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [i18n.language]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('display_order', { ascending: true })
        .limit(3);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setProjects(data.map(p => {
          const lang = i18n.language;
          const translation = p.translations?.[lang];
          
          return {
            id: p.id,
            title: translation?.title || p.title,
            description: translation?.description || p.description,
            details: translation?.details || '', 
            impact: translation?.impact || '',
            participants: translation?.participants || '',
            imageAfter: p.image_url || 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2069&auto=format&fit=crop',
            status: p.status,
            budget: 0
          };
        }));
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  if (projects.length === 0) return null;

  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          {/* ... existing header ... */}
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
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedProject(project)}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-900/5 transition-all hover:-translate-y-1 hover:shadow-2xl relative cursor-pointer"
            >
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/admin/projects');
                  }}
                  className="absolute top-4 right-4 z-20 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 scale-0 group-hover:scale-100 transition-transform flex items-center gap-1 text-xs px-3"
                >
                  <Edit size={14} />
                  {t('common.edit')}
                </button>
              )}
              
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
                {project.budget && project.budget > 0 && (
                    <div className="absolute bottom-4 left-4 text-white">
                        <p className="text-sm font-medium opacity-90">{t('featured_projects.investment_label')}</p>
                        <p className="text-lg font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(project.budget)}</p>
                    </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {project.title}
                </h3>
                <p className="mt-3 flex-auto text-base text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {project.description}
                </p>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                        {t('common.read_more')} <ArrowRight size={16} />
                    </span>
                    {(project.participants || project.impact) && (
                        <div className="flex -space-x-2">
                            {project.participants && <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] border border-white" title={t('admin.projects.field_participants')}><Users size={12} /></div>}
                            {project.impact && <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px] border border-white" title={t('admin.projects.field_impact')}><Landmark size={12} /></div>}
                        </div>
                    )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <ProjectDetailModal 
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
      />
    </section>
  );
};
