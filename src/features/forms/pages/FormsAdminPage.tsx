import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FormList from '../components/FormList';
import FormBuilder from '../components/FormBuilder';
import FormSubmissionsViewer from '../components/FormSubmissionsViewer';
import type { FormTemplate } from '../types/formTypes';
import { formService } from '../services/formService';

type ViewType = 'list' | 'build' | 'edit' | 'submissions';

export default function FormsAdminPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ViewType>(() => {
    const v = searchParams.get('view');
    return v === 'build' || v === 'edit' || v === 'submissions' ? v : 'list';
  });
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [restoringForm, setRestoringForm] = useState(false);

  useEffect(() => {
    const formId = searchParams.get('formId');
    const v = searchParams.get('view') as ViewType;
    if (formId && (v === 'edit' || v === 'submissions') && !selectedForm) {
      setRestoringForm(true);
      formService
        .getForms()
        .then((forms) => {
          const found = forms.find((f) => f.id === formId);
          if (found) {
            setSelectedForm(found);
            setView(v);
          } else {
            setSearchParams({});
            setView('list');
          }
        })
        .catch(() => {
          setSearchParams({});
          setView('list');
        })
        .finally(() => setRestoringForm(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUrl = useCallback(
    (newView: ViewType, formId?: string) => {
      if (newView === 'list' || newView === 'build') {
        setSearchParams(newView === 'build' ? { view: 'build' } : {});
      } else if (formId) {
        setSearchParams({ view: newView, formId });
      }
    },
    [setSearchParams],
  );

  const handleCreateNew = () => {
    setSelectedForm(null);
    setView('build');
    updateUrl('build');
  };

  const handleEdit = (form: FormTemplate) => {
    setSelectedForm(form);
    setView('edit');
    updateUrl('edit', form.id!);
  };

  const handleViewSubmissions = (form: FormTemplate) => {
    setSelectedForm(form);
    setView('submissions');
    updateUrl('submissions', form.id!);
  };

  const handleDuplicate = async (form: FormTemplate) => {
    const newForm = await formService.duplicateForm(form);
    setSelectedForm(newForm);
    setView('edit');
    updateUrl('edit', newForm.id!);
  };

  const handleBackToList = () => {
    setSelectedForm(null);
    setView('list');
    updateUrl('list');
  };

  if (restoringForm) {
    return (
      <div className="p-3 sm:p-6 flex justify-center items-center py-20 text-gray-400">{t('forms.admin.loading')}</div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      {view === 'list' && (
        <FormList
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onViewSubmissions={handleViewSubmissions}
          onDuplicate={handleDuplicate}
        />
      )}

      {(view === 'build' || view === 'edit') && (
        <FormBuilder
          initialData={selectedForm as Parameters<typeof FormBuilder>[0]['initialData']}
          onSuccess={handleBackToList}
          onCancel={handleBackToList}
        />
      )}

      {view === 'submissions' && selectedForm && (
        <FormSubmissionsViewer form={selectedForm} onBack={handleBackToList} />
      )}
    </div>
  );
}
