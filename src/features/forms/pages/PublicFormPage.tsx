import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicFormRender from '../components/PublicFormRender';

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  if (!slug) {
    return <div className="text-center p-12 text-gray-500">{t('forms.public.invalid_link')}</div>;
  }

  return <PublicFormRender slug={slug} />;
}
