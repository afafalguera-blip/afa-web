import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { formService } from '../services/formService';
import type { FormTemplate, FormField } from '../types/formTypes';
import { WEEKDAY_CODES, WEEKDAY_LABELS_CA, logicMatches } from '../types/formTypes';
import { resolveTemplateText, resolveField } from '../utils/resolveTranslations';
import { Loader2, CheckCircle, AlertCircle, Upload, Check, X as XIcon } from 'lucide-react';
import { sanitizeRichTextHtml } from '../../../utils/htmlSanitizer';

const MAX_FILE_SIZE_MB = 10;

interface FileUploadFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (path: string) => void;
  error?: string;
  formSlug: string;
}

function FileUploadField({ label, required, value, onChange, error, formSlug }: FileUploadFieldProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);

  const handleViewFile = async () => {
    try {
      const url = await formService.getFileUrl(value);
      window.open(url, '_blank', 'noreferrer');
    } catch {
      alert(t('forms.public.file_cant_get_url'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(t('forms.public.file_too_large', { mb: MAX_FILE_SIZE_MB }));
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const path = `${formSlug}/${fileName}`;
      const uploadedPath = await formService.uploadFile(file, path);
      onChange(uploadedPath);
    } catch (err) {
      console.error('Error uploading file', err);
      alert(t('forms.public.file_error'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        {label} {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {value ? (
        <div className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-xl">
          <div className="flex items-center text-green-800 flex-1 overflow-hidden">
            <Check className="w-6 h-6 text-white bg-green-500 rounded-full p-1 shadow-sm mr-3" />
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm uppercase tracking-wider">{t('forms.public.file_uploaded')}</span>
              <span className="text-xs text-green-600 truncate">{value.split('/').pop()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleViewFile}
              className="px-3 py-1 text-xs font-bold bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm"
            >
              {t('forms.public.file_view')}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-gray-400 hover:text-red-500 p-2 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <label
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
              isUploading
                ? 'bg-gray-50 border-blue-300'
                : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            } ${error ? 'border-red-300' : ''}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-sm font-medium text-gray-500">{t('forms.public.file_uploading')}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-bold text-gray-600">{t('forms.public.file_upload')}</span>
                <span className="text-xs text-gray-400 mt-1">{t('forms.public.file_types', { mb: MAX_FILE_SIZE_MB })}</span>
              </div>
            )}
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
          </label>
        </div>
      )}
      {error && <p className="text-red-500 text-xs font-medium mt-1.5">{error}</p>}
    </div>
  );
}

const generateZodSchema = (fields: FormField[]) => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((f) => {
    if (f.type === 'section_header') return;
    if (f.type === 'checkbox' || f.type === 'weekdays') {
      schemaShape[f.id] = z.array(z.string()).default([]);
    } else if (f.type === 'file') {
      schemaShape[f.id] = z.unknown().optional();
    } else {
      schemaShape[f.id] = z.string().optional().or(z.literal(''));
    }
  });

  return z.object(schemaShape).superRefine((data: Record<string, unknown>, ctx) => {
    fields.forEach((f) => {
      let isVisible = true;
      if (f.logic && f.logic.dependsOn) {
        isVisible = logicMatches(data[f.logic.dependsOn], f.logic.value);
      }

      if (isVisible && f.required) {
        const val = data[f.id];
        let hasError = false;

        if (f.type === 'checkbox' || f.type === 'weekdays') {
          if (!val || (Array.isArray(val) && val.length === 0)) hasError = true;
        } else {
          if (!val || val === '') hasError = true;
        }

        if (hasError) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'required',
            path: [f.id],
          });
        }
      }

      if (isVisible && f.type === 'email') {
        const val = data[f.id];
        if (val && val !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val as string)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'invalid_email',
            path: [f.id],
          });
        }
      }
    });
  });
};

function DynamicFormInstance({ template, isPreview = false }: { template: FormTemplate; isPreview?: boolean }) {
  const { t, i18n } = useTranslation();
  const activeLang = i18n.resolvedLanguage || i18n.language;
  const resolved = resolveTemplateText(template, activeLang);
  const storageKey = `form_submitted_${template.slug}`;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [isSuccess, setIsSuccess] = useState(() => !isPreview && localStorage.getItem(storageKey) === '1');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dynamicSchema = useMemo(() => generateZodSchema(template.fields_schema), [template]);

  const defaultValues = useMemo(() => {
    const defaults: Record<string, string | string[]> = {};
    template.fields_schema.forEach((field) => {
      if (field.type === 'section_header') return;
      if (field.type === 'checkbox' || field.type === 'weekdays') defaults[field.id] = [];
      else defaults[field.id] = '';
    });
    return defaults;
  }, [template]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues,
  });

  const conditionalParentIds = useMemo(() => {
    const ids = new Set<string>();
    template.fields_schema.forEach((f) => {
      if (f.logic?.dependsOn) ids.add(f.logic.dependsOn);
    });
    return [...ids];
  }, [template.fields_schema]);

  const parentValues = useWatch({ control, name: conditionalParentIds });

  const parentValueMap = useMemo(() => {
    const map: Record<string, unknown> = {};
    conditionalParentIds.forEach((id, i) => {
      map[id] = parentValues[i];
    });
    return map;
  }, [conditionalParentIds, parentValues]);

  useEffect(() => {
    template.fields_schema.forEach((field) => {
      if (field.logic?.dependsOn) {
        const isVisible = logicMatches(parentValueMap[field.logic.dependsOn], field.logic.value);
        if (!isVisible) {
          const currentVal = getValues(field.id);
          const defaultValue = (field.type === 'checkbox' || field.type === 'weekdays') ? [] : '';
          if (JSON.stringify(currentVal) !== JSON.stringify(defaultValue)) {
            setValue(field.id, defaultValue);
          }
        }
      }
    });
  }, [parentValueMap, template.fields_schema, setValue, getValues]);

  const onSubmit = async (data: Record<string, unknown>) => {
    if (submittingRef.current) return;
    if (isPreview) {
      alert(t('forms.public.preview_alert'));
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await formService.submitForm(template.id!, data);
      localStorage.setItem(storageKey, '1');
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      submittingRef.current = false;
      setIsSubmitting(false);
      setSubmitError(t('forms.public.submit_error'));
    }
  };

  if (isSuccess) {
    return (
      <div
        ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="bg-green-50 rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto border-2 border-green-300"
      >
        {template.header_image_url && (
          <div className="w-full h-36 sm:h-48 md:h-64 overflow-hidden">
            <img src={template.header_image_url} alt={resolved.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="bg-green-600 px-4 py-6 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{t('forms.public.success_title')}</h2>
          <p className="text-green-100 text-sm sm:text-base font-medium">{t('forms.public.success_body')}</p>
        </div>

        <div className="p-5 sm:p-8 text-center">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{resolved.title}</h1>
          <p className="text-gray-600 text-sm sm:text-base">{t('forms.public.success_thanks')}</p>
          <div className="mt-5 pt-4 border-t border-green-200">
            <p className="text-xs text-green-700 font-semibold uppercase tracking-wider">{t('forms.public.success_close')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto border border-gray-100">
      {template.header_image_url && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img src={template.header_image_url} alt={resolved.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="bg-white p-4 sm:p-8 border-b border-gray-100 relative">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{resolved.title}</h1>
        {resolved.description && (
          <div
            className="mt-4 text-gray-600 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(resolved.description) }}
          />
        )}
      </div>

      <div className="p-4 sm:p-8 md:p-10">
        {submitError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 flex border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm font-medium">{submitError}</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            if (isSubmitting) {
              e.preventDefault();
              return;
            }
            handleSubmit(onSubmit)(e);
          }}
          className="space-y-8"
        >
          {template.fields_schema.map((rawField) => {
            const field = resolveField(template, rawField, activeLang);
            const rawErr = errors[field.id]?.message as string | undefined;
            const errorMessage = rawErr ? t(`forms.public.${rawErr}`, rawErr) : undefined;

            const isVisible = (() => {
              if (!rawField.logic || !rawField.logic.dependsOn) return true;
              const parentValue = watch(rawField.logic.dependsOn);
              return logicMatches(parentValue, rawField.logic.value);
            })();

            if (!isVisible) return null;

            const Label = () => (
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            );

            const ErrorMsg = () => (errorMessage ? <p className="text-red-500 text-xs font-medium mt-1.5">{errorMessage}</p> : null);

            return (
              <div key={field.id} className="relative group">
                {field.type === 'section_header' && (
                  <div className="pt-6 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <h3 className="mt-3 text-base font-extrabold text-gray-800 uppercase tracking-wide">{field.label}</h3>
                    {field.placeholder && <p className="mt-1 text-sm text-gray-500">{field.placeholder}</p>}
                  </div>
                )}

                {field.type === 'text' && (
                  <div>
                    <Label />
                    <input
                      {...register(field.id)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-base"
                      placeholder={field.placeholder || t('forms.public.your_answer')}
                    />
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'long_text' && (
                  <div>
                    <Label />
                    <textarea
                      {...register(field.id)}
                      rows={4}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-base resize-y"
                      placeholder={field.placeholder || t('forms.public.your_answer')}
                    />
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'select' && (
                  <div>
                    <Label />
                    <select
                      {...register(field.id)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-base bg-white"
                    >
                      <option value="" disabled>
                        {t('forms.public.select_placeholder')}
                      </option>
                      {field.options?.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'radio' && (
                  <div>
                    <Label />
                    <div className="space-y-3 mt-3">
                      {field.options?.map((opt, i) => (
                        <div key={i} className="flex items-center">
                          <input
                            type="radio"
                            id={`${field.id}_opt_${i}`}
                            value={opt}
                            {...register(field.id)}
                            className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300"
                          />
                          <label htmlFor={`${field.id}_opt_${i}`} className="ml-3 block text-base font-medium text-gray-700">
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'checkbox' && (
                  <div>
                    <Label />
                    <div className="space-y-3 mt-3">
                      {field.options?.map((opt, i) => (
                        <div key={i} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`${field.id}_opt_${i}`}
                            value={opt}
                            {...register(field.id)}
                            className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 rounded"
                          />
                          <label htmlFor={`${field.id}_opt_${i}`} className="ml-3 block text-base font-medium text-gray-700">
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'email' && (
                  <div>
                    <Label />
                    <input
                      {...register(field.id)}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-base"
                      placeholder={field.placeholder || 'nom@exemple.com'}
                    />
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'phone' && (
                  <div>
                    <Label />
                    <input
                      {...register(field.id)}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-base"
                      placeholder={field.placeholder || '6XX XXX XXX'}
                    />
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'number' && (
                  <div>
                    <Label />
                    <input
                      {...register(field.id)}
                      type="number"
                      inputMode="numeric"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-base"
                      placeholder={field.placeholder || '0'}
                    />
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'date' && (
                  <div>
                    <Label />
                    <input
                      {...register(field.id)}
                      type="date"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-base bg-white"
                    />
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'weekdays' && (
                  <div>
                    <Label />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {WEEKDAY_CODES.map((code) => (
                        <label
                          key={code}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 has-[:checked]:text-blue-700"
                        >
                          <input
                            type="checkbox"
                            value={code}
                            {...register(field.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium">{WEEKDAY_LABELS_CA[code]}</span>
                        </label>
                      ))}
                    </div>
                    <ErrorMsg />
                  </div>
                )}

                {field.type === 'file' && (
                  <div>
                    <Controller
                      control={control}
                      name={field.id}
                      render={({ field: controllerField }) => (
                        <FileUploadField
                          label={field.label}
                          required={field.required}
                          value={controllerField.value as string}
                          onChange={controllerField.onChange}
                          error={errorMessage}
                          formSlug={template.slug}
                        />
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-6 border-t border-gray-100 flex justify-center sm:justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-8 py-3.5 border border-transparent text-base font-bold rounded-full shadow-md text-white ${
                isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
              } transition-all`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('forms.public.submitting')}
                </span>
              ) : (
                t('forms.public.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PublicFormRender({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const tf = await formService.getFormBySlug(slug);
        if (tf) {
          setFormTemplate(tf);
        } else {
          setError(t('forms.public.not_found'));
        }
      } catch (err: unknown) {
        console.error(err);
        setError(t('forms.public.load_error'));
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] text-blue-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-medium text-gray-500">{t('forms.public.loading')}</p>
      </div>
    );
  }

  if (error || !formTemplate) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center bg-white p-10 rounded-2xl shadow-sm border border-gray-200 max-w-lg">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('forms.public.not_available')}</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const isClosed = formTemplate.closes_at && new Date(formTemplate.closes_at) < new Date();

  if (isClosed) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center bg-white p-10 rounded-2xl shadow-sm border border-gray-200 max-w-lg">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('forms.public.closed_title')}</h2>
          <p className="text-gray-500">{t('forms.public.closed_body')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <LangSwitcher />
        <DynamicFormInstance template={formTemplate} />
      </div>
    </div>
  );
}

function LangSwitcher() {
  const { i18n } = useTranslation();
  const active = i18n.resolvedLanguage || i18n.language;
  const langs: Array<{ code: 'ca' | 'es' | 'en'; label: string }> = [
    { code: 'ca', label: 'CA' },
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' },
  ];
  return (
    <div className="flex justify-end mb-3">
      <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full shadow-sm px-1.5 py-1">
        {langs.map((l) => (
          <button
            key={l.code}
            type="button"
            translate="no"
            onClick={() => i18n.changeLanguage(l.code)}
            className={`notranslate text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
              active === l.code
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { DynamicFormInstance as PreviewFormRender };
