import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { FormFieldType } from '../types/formTypes';
import { FORM_FOLDERS, WEEKDAY_CODES, WEEKDAY_LABELS_CA } from '../types/formTypes';
import { formService } from '../services/formService';
import TranslationsPanel from './TranslationsPanel';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  X,
  Loader2,
  Info,
  FolderOpen,
  FolderPlus,
  Eye,
  Copy,
  Minus,
} from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { PreviewFormRender } from './PublicFormRender';

const toDatetimeLocalValue = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocalValue = (local: string): string | null => {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

const fieldSchema = z
  .object({
    id: z.string(),
    type: z.enum([
      'text',
      'long_text',
      'select',
      'checkbox',
      'radio',
      'file',
      'date',
      'email',
      'phone',
      'number',
      'weekdays',
      'section_header',
    ]),
    label: z.string().min(1, 'La pregunta no puede estar vacía'),
    placeholder: z.string().optional(),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
    logic: z
      .object({
        dependsOn: z.string().optional(),
        value: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (['select', 'radio', 'checkbox'].includes(data.type) && (!data.options || data.options.length === 0)) {
        return false;
      }
      return true;
    },
    { message: 'Las opciones son obligatorias para select/radio/checkbox', path: ['options'] },
  );

const formTemplateSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional(),
  slug: z
    .string()
    .min(3, 'El slug debe tener al menos 3 letras')
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones (ej: mi-slug)'),
  header_image_url: z.string().optional(),
  folder: z.string().nullable().optional(),
  closes_at: z.string().nullable().optional(),
  is_active: z.boolean(),
  fields_schema: z.array(fieldSchema).min(1, 'Debes agregar al menos un campo'),
  // translations shape is managed by TranslationsPanel; no client validation needed.
  translations: z.any().optional(),
});

type FormBuilderData = z.infer<typeof formTemplateSchema>;

const fieldTypesRecord: Record<FormFieldType, string> = {
  text: 'Texto corto',
  long_text: 'Párrafo',
  select: 'Desplegable',
  checkbox: 'Casillas (multi)',
  radio: 'Selección única',
  file: 'Archivo / imagen',
  date: 'Fecha',
  email: 'Email',
  phone: 'Teléfono',
  number: 'Número',
  weekdays: 'Días de la semana',
  section_header: 'Separador / sección',
};

const PLACEHOLDER_TYPES: FormFieldType[] = ['text', 'long_text', 'email', 'phone', 'number'];

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<FormBuilderData> & { id?: string };
}

export default function FormBuilder({ onSuccess, onCancel, initialData }: Props) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<string[]>([...FORM_FOLDERS]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    formService.getDistinctFolders().then(setAvailableFolders).catch(() => {});
  }, []);

  const methods = useForm<FormBuilderData>({
    resolver: zodResolver(formTemplateSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      slug: '',
      folder: null,
      closes_at: null,
      is_active: true,
      fields_schema: [],
      translations: {},
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = methods;

  const { fields, append, remove, move } = useFieldArray({ control, name: 'fields_schema' });

  const onSubmit = async (data: FormBuilderData) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (initialData?.id) {
        await formService.updateForm(initialData.id, data);
      } else {
        await formService.createForm(data);
      }
      onSuccess?.();
    } catch (err: unknown) {
      console.error('formService error:', err);
      if (err instanceof Object && 'code' in err && (err as { code: string }).code === '23505') {
        setSaveError(t('forms.builder.slug_conflict'));
      } else {
        const detail = (err as { message?: string })?.message;
        setSaveError(detail ? `${t('forms.builder.save_error')} (${detail})` : t('forms.builder.save_error'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onInvalid = (errs: typeof errors) => {
    try {
      console.warn(
        'Form validation failed:\n' +
          JSON.stringify(
            errs,
            (_k, v) => (v instanceof HTMLElement ? '[HTMLElement]' : v),
            2,
          ),
      );
    } catch {
      console.warn('Form validation failed:', errs);
    }
    const firstKey = Object.keys(errs)[0];
    const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus?.();
  };

  const handleAddField = (type: FormFieldType) => {
    const needsOptionsList = ['select', 'radio', 'checkbox'].includes(type);
    append({
      id: `field_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      label: '',
      required: false,
      options: needsOptionsList ? [''] : undefined,
    });
  };

  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingHeader(true);
    try {
      const slug = watch('slug') || 'temp';
      const fileName = `${Date.now()}_header_${file.name}`;
      const path = `${slug}/${fileName}`;
      const uploadedPath = await formService.uploadFile(file, path, 'form-assets');
      const publicUrl = formService.getPublicUrl(uploadedPath, 'form-assets');
      setValue('header_image_url', publicUrl);
    } catch (err) {
      console.error(err);
      alert('Error al subir la imagen.');
    } finally {
      setIsUploadingHeader(false);
    }
  };

  const headerImageUrl = watch('header_image_url');

  const buildPreviewTemplate = () => {
    const values = watch();
    return {
      id: '__preview__',
      title: values.title || 'Vista previa',
      description: values.description || '',
      slug: '__preview__',
      header_image_url: values.header_image_url,
      folder: values.folder,
      closes_at: null,
      fields_schema: values.fields_schema ?? [],
      is_active: true,
    };
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {initialData ? t('forms.builder.editing') : t('forms.builder.creating')}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{t('forms.builder.intro')}</p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" /> {t('forms.builder.preview')}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('forms.builder.back')}
            </button>
          )}
        </div>
      </div>

      <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
        <section className="bg-gray-50 p-3 sm:p-5 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Configuración general</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Título</label>
              <input
                {...register('title')}
                placeholder="Ej: Inscripció extraescolars"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
              />
              {errors.title && <span className="text-red-500 text-xs mt-1 block">{errors.title.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Enlace (slug)</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  /f/
                </span>
                <input
                  {...register('slug')}
                  placeholder="inscripcio-extraescolars"
                  className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                />
              </div>
              {errors.slug && <span className="text-red-500 text-xs mt-1 block">{errors.slug.message}</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FolderOpen className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Carpeta / sección
            </label>
            <Controller
              control={control}
              name="folder"
              render={({ field }) => (
                <div className="space-y-2">
                  {isCreatingFolder ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Nombre de la nueva carpeta..."
                        autoFocus
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = newFolderName.trim();
                            if (trimmed) {
                              if (!availableFolders.includes(trimmed)) {
                                setAvailableFolders((prev) =>
                                  [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'ca')),
                                );
                              }
                              field.onChange(trimmed);
                              setNewFolderName('');
                              setIsCreatingFolder(false);
                            }
                          }
                          if (e.key === 'Escape') {
                            setNewFolderName('');
                            setIsCreatingFolder(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newFolderName.trim();
                          if (trimmed) {
                            if (!availableFolders.includes(trimmed)) {
                              setAvailableFolders((prev) =>
                                [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'ca')),
                              );
                            }
                            field.onChange(trimmed);
                            setNewFolderName('');
                            setIsCreatingFolder(false);
                          }
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
                      >
                        Crear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewFolderName('');
                          setIsCreatingFolder(false);
                        }}
                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 text-sm transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border bg-white"
                      >
                        <option value="">Sin carpeta (general)</option>
                        {availableFolders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCreatingFolder(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        <FolderPlus className="w-4 h-4" />
                        Nueva
                      </button>
                    </div>
                  )}
                </div>
              )}
            />
          </div>

          <div className="pt-2">
            <label className="block text-sm font-bold text-gray-800 mb-2">Imagen de cabecera (opcional)</label>
            {headerImageUrl ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 group">
                <img src={headerImageUrl} alt="Header" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setValue('header_image_url', '')}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50">
                {isUploadingHeader ? (
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                    <span className="text-sm font-bold text-gray-600">Subir imagen de cabecera</span>
                    <span className="text-xs text-gray-400">Recomendado: 1200×400px</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleHeaderImageUpload} disabled={isUploadingHeader} />
              </label>
            )}
          </div>

          <div className="pt-2">
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Instrucciones / descripción
              <span className="ml-2 text-xs font-normal text-gray-500">(Admite negrita, listas, etc.)</span>
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  minHeight="200px"
                  placeholder="Escribe aquí las instrucciones para el público..."
                />
              )}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('is_active')}
                id="is_active"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Activar el formulario inmediatamente
              </label>
            </div>
            <div className="flex items-center gap-2 sm:ml-4 sm:pl-4 sm:border-l border-gray-200">
              <label htmlFor="closes_at" className="text-sm text-gray-700 whitespace-nowrap font-medium">
                Cierra automáticamente el:
              </label>
              <Controller
                control={control}
                name="closes_at"
                render={({ field }) => (
                  <div className="flex items-center gap-1">
                    <input
                      id="closes_at"
                      type="datetime-local"
                      value={toDatetimeLocalValue(field.value)}
                      onChange={(e) => field.onChange(fromDatetimeLocalValue(e.target.value))}
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 border text-sm"
                    />
                    {field.value && (
                      <button
                        type="button"
                        onClick={() => field.onChange(null)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Sin fecha de cierre"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Preguntas</h2>
          </div>

          {fields.length === 0 && (
            <div className="text-center p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 text-sm">Aún no hay preguntas en el formulario.</p>
            </div>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => {
              const currentType = watch(`fields_schema.${index}.type`);
              const needsOptions = ['select', 'radio', 'checkbox'].includes(currentType);
              const isSectionHeader = currentType === 'section_header';

              const handleDuplicateField = () => {
                const current = watch(`fields_schema.${index}`);
                append({ ...current, id: `field_${Date.now()}_${Math.random().toString(36).substring(7)}` });
              };

              return (
                <div
                  key={field.id}
                  className={`relative p-3 sm:p-4 border shadow-sm rounded-lg flex flex-col gap-3 group ${
                    isSectionHeader ? 'border-indigo-200 bg-indigo-50/40' : 'border-blue-100 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => index > 0 && move(index, index - 1)}
                      disabled={index === 0}
                      className={`p-1.5 rounded-md transition-colors ${
                        index === 0 ? 'text-gray-200' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                      }`}
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => index < fields.length - 1 && move(index, index + 1)}
                      disabled={index === fields.length - 1}
                      className={`p-1.5 rounded-md transition-colors ${
                        index === fields.length - 1
                          ? 'text-gray-200'
                          : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                      }`}
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                      type="button"
                      onClick={handleDuplicateField}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-2 sm:gap-4">
                    <div className="flex-1 space-y-4 min-w-0">
                      {isSectionHeader ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Minus className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                              Separador / título de sección
                            </span>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                              Título
                            </label>
                            <input
                              {...register(`fields_schema.${index}.label` as const)}
                              placeholder="Ej: Dades de l'infant, Informació addicional..."
                              className="block w-full rounded-xl border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-4 border text-gray-800 font-semibold"
                            />
                            {errors.fields_schema?.[index]?.label && (
                              <span className="text-red-500 text-xs mt-1 block font-bold">
                                {errors.fields_schema[index]?.label?.message}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                              Descripción (opcional)
                            </label>
                            <input
                              {...register(`fields_schema.${index}.placeholder` as const)}
                              placeholder="Texto explicativo debajo del título..."
                              className="block w-full rounded-lg border-indigo-100 shadow-sm focus:border-indigo-400 focus:ring-indigo-400 py-2 px-3 border text-gray-500 text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                              Título de la pregunta
                            </label>
                            <textarea
                              {...register(`fields_schema.${index}.label` as const)}
                              placeholder="Escribe aquí tu pregunta..."
                              rows={2}
                              className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 border text-gray-800 font-medium transition-all"
                            />
                            {errors.fields_schema?.[index]?.label && (
                              <span className="text-red-500 text-xs mt-1 block font-bold">
                                {errors.fields_schema[index]?.label?.message}
                              </span>
                            )}
                          </div>

                          {PLACEHOLDER_TYPES.includes(currentType) && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                Texto de ayuda (placeholder)
                              </label>
                              <input
                                {...register(`fields_schema.${index}.placeholder` as const)}
                                placeholder={`Ej: ${
                                  currentType === 'email'
                                    ? 'nom@exemple.com'
                                    : currentType === 'phone'
                                    ? '6XX XXX XXX'
                                    : 'Tu respuesta...'
                                }`}
                                className="mt-1 block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border text-gray-600 text-sm"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo:</span>
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-600 text-[11px] font-bold uppercase">
                              {fieldTypesRecord[currentType]}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {!isSectionHeader && needsOptions && (
                    <div className="mt-2 pl-4 border-l-2 border-blue-200">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                        {t('forms.builder.q_options_label')}
                      </label>
                      <Controller
                        name={`fields_schema.${index}.options` as const}
                        control={control}
                        render={({ field: controllerField }) => {
                          const opts = controllerField.value ?? [];
                          const updateAt = (i: number, val: string) => {
                            const next = [...opts];
                            next[i] = val;
                            controllerField.onChange(next);
                          };
                          const removeAt = (i: number) => {
                            const next = opts.filter((_, j) => j !== i);
                            controllerField.onChange(next.length === 0 ? [''] : next);
                          };
                          const addOne = () => controllerField.onChange([...opts, '']);
                          return (
                            <div className="space-y-2">
                              {opts.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateAt(i, e.target.value)}
                                    placeholder={t('forms.builder.option_placeholder', { n: i + 1 })}
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeAt(i)}
                                    disabled={opts.length <= 1}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={t('forms.builder.remove_option')}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={addOne}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                {t('forms.builder.add_option')}
                              </button>
                            </div>
                          );
                        }}
                      />
                      {errors.fields_schema?.[index]?.options && (
                        <span className="text-red-500 text-xs mt-1 block">
                          {errors.fields_schema[index]?.options?.message}
                        </span>
                      )}
                    </div>
                  )}

                  {!isSectionHeader && (
                    <div className="mt-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`req_${field.id}`}
                          {...register(`fields_schema.${index}.required` as const)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`req_${field.id}`} className="ml-2 block text-sm text-gray-700 font-medium">
                          Respuesta obligatoria
                        </label>
                      </div>

                      {index > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:pl-4 sm:border-l border-gray-200 pt-2 sm:pt-0 border-t sm:border-t-0">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-tight whitespace-nowrap">
                              Visibilidad:
                            </span>
                          </div>

                          <select
                            {...register(`fields_schema.${index}.logic.dependsOn` as const)}
                            className="text-[11px] border-gray-200 rounded p-1.5 bg-white focus:ring-blue-500 w-full sm:w-auto"
                          >
                            <option value="">Siempre visible</option>
                            {fields.slice(0, index).map((f, i) => {
                              const fieldType = watch(`fields_schema.${i}.type`);
                              if (['select', 'radio', 'checkbox', 'weekdays'].includes(fieldType)) {
                                return (
                                  <option key={f.id} value={f.id}>
                                    Si en "{watch(`fields_schema.${i}.label`)}"
                                  </option>
                                );
                              }
                              return null;
                            })}
                          </select>

                          {watch(`fields_schema.${index}.logic.dependsOn`) && (() => {
                            const dependsOnId = watch(`fields_schema.${index}.logic.dependsOn`);
                            const parentIndex = fields.findIndex((f) => f.id === dependsOnId);
                            if (parentIndex === -1) return null;
                            const parentType = watch(`fields_schema.${parentIndex}.type`);
                            const isParentMulti = parentType === 'checkbox' || parentType === 'weekdays';
                            const parentOptions: Array<{ value: string; label: string }> =
                              parentType === 'weekdays'
                                ? WEEKDAY_CODES.map((c) => ({ value: c, label: WEEKDAY_LABELS_CA[c] }))
                                : ((watch(`fields_schema.${parentIndex}.options`) || []).map((o) => ({ value: o, label: o })));
                            return (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-gray-400">
                                  {isParentMulti ? 'incluye' : 'es igual a'}
                                </span>
                                <select
                                  {...register(`fields_schema.${index}.logic.value` as const)}
                                  className="text-[11px] border-gray-200 rounded p-1.5 bg-white focus:ring-blue-500 w-full sm:w-auto"
                                >
                                  <option value="">Selecciona valor...</option>
                                  {parentOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Añadir nueva pregunta</h3>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="w-full text-[10px] text-gray-400 font-bold mb-1">BÁSICOS</span>
                <button
                  type="button"
                  onClick={() => handleAddField('text')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Texto corto
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('long_text')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Párrafo
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('select')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Desplegable
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('radio')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Selección única
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('checkbox')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Casillas
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('date')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Fecha
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('email')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('phone')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Teléfono
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('number')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Número
                </button>
                <button
                  type="button"
                  onClick={() => handleAddField('weekdays')}
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500" /> Días de la semana
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="w-full text-[10px] text-gray-400 font-bold mb-1">AVANZADO</span>
                <button
                  type="button"
                  onClick={() => handleAddField('file')}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-bold rounded-xl border border-purple-200 flex items-center transition shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Carga de archivos
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="w-full text-[10px] text-gray-400 font-bold mb-1">ESTRUCTURA</span>
                <button
                  type="button"
                  onClick={() => handleAddField('section_header')}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-xl border border-indigo-200 flex items-center transition shadow-sm"
                >
                  <Minus className="w-4 h-4 mr-2" /> Separador / sección
                </button>
              </div>
            </div>
          </div>
          {errors.fields_schema?.root && (
            <span className="text-red-500 text-sm mt-3 block font-bold text-center bg-red-50 p-2 rounded-lg">
              {errors.fields_schema.root.message}
            </span>
          )}
        </section>

        <TranslationsPanel />

        <div className="pt-6 border-t border-gray-200">
          {Object.keys(errors).length > 0 && (
            <div className="mb-4 p-4 bg-amber-50 text-amber-800 text-sm rounded-md border border-amber-200">
              <div className="font-bold mb-2">{t('forms.builder.fix_errors')}:</div>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                {errors.title && <li>{errors.title.message as string}</li>}
                {errors.slug && <li>{errors.slug.message as string}</li>}
                {errors.fields_schema && !Array.isArray(errors.fields_schema) && (
                  <li>{(errors.fields_schema as { message?: string }).message}</li>
                )}
                {Array.isArray(errors.fields_schema) &&
                  errors.fields_schema.map((fe, i) =>
                    fe ? (
                      <li key={i}>
                        {t('forms.builder.q_label')} #{i + 1}:{' '}
                        {(fe as { label?: { message?: string }; options?: { message?: string } }).label?.message ||
                          (fe as { label?: { message?: string }; options?: { message?: string } }).options?.message}
                      </li>
                    ) : null,
                  )}
              </ul>
            </div>
          )}
          {saveError && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{saveError}</div>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className={`w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? t('forms.builder.saving') : t('forms.builder.save')}
          </button>
        </div>
      </form>
      </FormProvider>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-sm font-bold uppercase tracking-widest opacity-70">
                Vista previa del formulario
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" /> Cerrar
              </button>
            </div>
            <PreviewFormRender template={buildPreviewTemplate()} />
          </div>
        </div>
      )}
    </div>
  );
}
