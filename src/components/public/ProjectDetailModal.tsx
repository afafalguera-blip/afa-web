
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    title: string;
    description: string;
    details?: string;
    imageAfter: string;
    impact?: string;
    participants?: string;
    budget?: number;
    status: 'completed' | 'in_progress' | 'voting' | 'active' | 'archived';
  } | null;
}

export const ProjectDetailModal = ({ isOpen, onClose, project }: ProjectDetailModalProps) => {
  const { t } = useTranslation();

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!project) return null;

  // Function to render text with newlines (simple markdown-like)
  const renderDetails = (text?: string) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
        if (line.startsWith('###')) {
             return <h3 key={index} className="text-xl font-bold text-slate-800 dark:text-white mt-6 mb-3">{line.replace('###', '').trim()}</h3>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
             return <strong key={index} className="block mt-4 mb-2 text-slate-900 dark:text-white">{line.replace(/\*\*/g, '')}</strong>;
        }
        if (line.trim().startsWith('- ')) {
             return <li key={index} className="ml-4 mb-1 text-slate-600 dark:text-slate-300 list-disc">{line.replace('- ', '')}</li>;
        }
        return <p key={index} className="mb-4 text-slate-600 dark:text-slate-300 leading-relaxed">{line}</p>;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="relative h-64 sm:h-80 shrink-0">
              <img
                src={project.imageAfter}
                alt={project.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <span className={`inline-block px-3 py-1 mb-3 text-xs font-bold rounded-full uppercase tracking-wider ${
                    project.status === 'completed' ? 'bg-green-500 text-white' : 
                    project.status === 'voting' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                    {(() => {
                        const statusMap: Record<string, string> = {
                            'completed': 'featured_projects.status.completed',
                            'in_progress': 'featured_projects.status.in_progress',
                            'voting': 'featured_projects.status.voting',
                            'active': 'admin.projects.status_active',
                            'archived': 'admin.projects.status_archived'
                        };
                        return t(statusMap[project.status] as any || 'admin.projects.status_active');
                    })()}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{project.title}</h2>
                <p className="text-white/90 text-lg sm:text-xl max-w-2xl line-clamp-2">{project.description}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {project.details ? (
                      <div className="prose dark:prose-invert max-w-none">
                          {renderDetails(project.details)}
                      </div>
                  ) : (
                      <div className="text-slate-500 italic">No details available.</div>
                  )}
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700">
                        <h4 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-wider">Detalles del Proyecto</h4>
                        
                        <div className="space-y-4">
                            {project.impact && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg shrink-0">
                                        <Landmark size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-medium mb-0.5">{t('admin.projects.field_impact')}</p>
                                        <p className="text-slate-800 dark:text-slate-200 font-medium">{project.impact}</p>
                                    </div>
                                </div>
                            )}

                            {project.participants && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-medium mb-0.5">{t('admin.projects.field_participants')}</p>
                                        <p className="text-slate-800 dark:text-slate-200 font-medium">{project.participants}</p>
                                    </div>
                                </div>
                            )}

                             {project.budget && project.budget > 0 && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                                        <span className="font-bold text-sm">€</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-medium mb-0.5">{t('featured_projects.investment_label')}</p>
                                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(project.budget)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                    {t('common.close') || 'Cerrar'}
                </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
