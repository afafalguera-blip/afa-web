import { supabase } from '../../../lib/supabase';
import { compressImage } from '../../../utils/imageCompression';
import type {
  FormTemplate,
  FormSubmission,
  FormField,
  SupportedLang,
  FormTranslation,
} from '../types/formTypes';
import { FORM_FOLDERS } from '../types/formTypes';

interface FormsRow {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  header_image_url: string | null;
  folder: string | null;
  closes_at: string | null;
  fields_schema: unknown;
  translations: unknown;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FormSubmissionRow {
  id: string;
  form_id: string;
  submitted_by_user_id: string | null;
  answers: unknown;
  submitted_at: string;
}

const FORMS_COLUMNS = 'id, title, description, slug, header_image_url, folder, closes_at, fields_schema, translations, is_active, created_by, created_at, updated_at';
const FORM_SUBMISSIONS_COLUMNS = 'id, form_id, answers, submitted_by_user_id, submitted_at';

const toTemplate = (row: FormsRow): FormTemplate => ({
  id: row.id,
  title: row.title,
  description: row.description ?? '',
  slug: row.slug,
  header_image_url: row.header_image_url ?? undefined,
  folder: row.folder,
  closes_at: row.closes_at,
  fields_schema: (row.fields_schema as FormField[]) ?? [],
  translations: (row.translations as Partial<Record<SupportedLang, FormTranslation>>) ?? {},
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const formService = {
  // ==========================================
  // FORMS MANAGEMENT
  // ==========================================

  async getForms(): Promise<FormTemplate[]> {
    const { data, error } = await supabase
      .from('forms')
      .select(FORMS_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => toTemplate(r as FormsRow));
  },

  async getFormBySlug(slug: string): Promise<FormTemplate | null> {
    const { data, error } = await supabase
      .from('forms')
      .select(FORMS_COLUMNS)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data ? toTemplate(data as FormsRow) : null;
  },

  async createForm(form: Partial<FormTemplate>): Promise<FormTemplate> {
    const payload = {
      title: form.title ?? '',
      description: form.description ?? null,
      slug: form.slug ?? '',
      header_image_url: form.header_image_url ?? null,
      folder: form.folder ?? null,
      closes_at: form.closes_at ?? null,
      fields_schema: form.fields_schema ?? [],
      translations: form.translations ?? {},
      is_active: form.is_active ?? true,
    };
    const { data, error } = await supabase
      .from('forms')
      .insert(payload)
      .select(FORMS_COLUMNS)
      .single();
    if (error) throw error;
    return toTemplate(data as FormsRow);
  },

  async updateForm(id: string, updates: Partial<FormTemplate>): Promise<FormTemplate> {
    const { data, error } = await supabase
      .from('forms')
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select(FORMS_COLUMNS)
      .single();
    if (error) throw error;
    return toTemplate(data as FormsRow);
  },

  async getDistinctFolders(): Promise<string[]> {
    const { data, error } = await supabase
      .from('forms')
      .select('folder')
      .not('folder', 'is', null)
      .order('folder');
    if (error) throw error;

    const dbFolders = [
      ...new Set(
        (data || [])
          .map((r) => (r as { folder: string | null }).folder)
          .filter((f): f is string => f !== null),
      ),
    ];
    const all = [...new Set([...FORM_FOLDERS, ...dbFolders])];
    return all.sort((a, b) => a.localeCompare(b, 'ca'));
  },

  async duplicateForm(original: FormTemplate): Promise<FormTemplate> {
    return this.createForm({
      title: `${original.title} (Còpia)`,
      description: original.description,
      slug: `${original.slug}-${Date.now().toString(36)}`,
      header_image_url: original.header_image_url,
      folder: original.folder,
      closes_at: original.closes_at,
      fields_schema: original.fields_schema,
      translations: original.translations,
      is_active: false,
    });
  },

  async deleteForm(id: string): Promise<void> {
    const { error } = await supabase.from('forms').delete().eq('id', id);
    if (error) throw error;
  },

  // ==========================================
  // SUBMISSIONS
  // ==========================================

  async submitForm(
    formId: string,
    answers: Record<string, unknown>,
    userId?: string,
  ): Promise<FormSubmission> {
    const payload: { form_id: string; answers: Record<string, unknown>; submitted_by_user_id?: string } = {
      form_id: formId,
      answers,
    };
    if (userId) payload.submitted_by_user_id = userId;

    // Note: no .select() here — anon role has INSERT but no SELECT, would 401.
    const { error } = await supabase.from('form_submissions').insert(payload);
    if (error) throw error;

    return {
      id: crypto.randomUUID(),
      form_id: formId,
      answers,
      submitted_by_user_id: userId ?? null,
      submitted_at: new Date().toISOString(),
    };
  },

  async getSubmissionCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('form_id')
      .is('deleted_at', null);
    if (error) throw error;

    const counts: Record<string, number> = {};
    (data || []).forEach((row) => {
      const fid = (row as { form_id: string }).form_id;
      counts[fid] = (counts[fid] || 0) + 1;
    });
    return counts;
  },

  async getSubmissionsByFormId(formId: string): Promise<FormSubmission[]> {
    const { data, error } = await supabase
      .from('form_submissions')
      .select(FORM_SUBMISSIONS_COLUMNS)
      .eq('form_id', formId)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => {
      const r = row as FormSubmissionRow;
      return {
        id: r.id,
        form_id: r.form_id,
        answers: (r.answers as Record<string, unknown>) ?? {},
        submitted_by_user_id: r.submitted_by_user_id ?? undefined,
        submitted_at: r.submitted_at,
      };
    });
  },

  async deleteSubmission(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_form_submission', { submission_id: id });
    if (error) throw error;
  },

  async updateSubmissionAnswers(id: string, answers: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .from('form_submissions')
      .update({ answers })
      .eq('id', id);
    if (error) throw error;
  },

  // ==========================================
  // STORAGE
  // ==========================================

  async uploadFile(file: File, path: string, bucket: string = 'form-data'): Promise<string> {
    const compressed = await compressImage(file).catch(() => file);
    // Si compressImage cambió la extensión (e.g. PNG→WebP), alinear el path.
    const compressedExt = compressed.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const finalPath = path.replace(/\.[^./]+$/, `.${compressedExt}`);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalPath, compressed, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data.path;
  },

  getPublicUrl(path: string, bucket: string = 'form-assets'): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async getFileUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('form-data')
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  },
};
