import { supabase } from '../../lib/supabase';

export interface AdminDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string;
  file_path: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  /** Undefined when the database has no visibility column yet (see supportsVisibility). */
  is_active?: boolean;
}

export interface DocumentUploadData {
  title: string;
  description: string;
  category: string;
  file: File;
  /** Ignored when the database has no visibility column yet. */
  is_active?: boolean;
}

/**
 * Seed categories. The effective list is `getCategories()`, which merges these
 * with whatever categories already exist in the table, so an admin can add new
 * ones from the upload form without a code change.
 */
export const DEFAULT_DOCUMENT_CATEGORIES = [
  'actes', 'normativa', 'general', 'menjador', 'extraescolars'
] as const;

/** @deprecated Use DEFAULT_DOCUMENT_CATEGORIES or getCategories(). */
export const CATEGORIES = DEFAULT_DOCUMENT_CATEGORIES;

// Postgres "undefined column" / PostgREST "column does not exist in schema cache".
function isMissingColumnError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === '42703' || e.code === 'PGRST204') return true;
  return /is_active/.test(e.message ?? '') && /column|schema cache/i.test(e.message ?? '');
}

export class DocumentVisibilityUnsupportedError extends Error {
  constructor() {
    super('The documents table has no is_active column yet.');
    this.name = 'DocumentVisibilityUnsupportedError';
  }
}

let visibilitySupport: boolean | null = null;

export const AdminDocumentsService = {
  async getAll(): Promise<AdminDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data || []) as AdminDocument[];
    // `select *` silently omits the column when it does not exist, which is the
    // cheapest probe available without an extra round trip.
    if (visibilitySupport === null && rows.length > 0) {
      visibilitySupport = Object.prototype.hasOwnProperty.call(rows[0], 'is_active');
    }
    return rows;
  },

  /** Whether the deployed schema supports per-document visibility. */
  async supportsVisibility(): Promise<boolean> {
    if (visibilitySupport !== null) return visibilitySupport;
    const { error } = await supabase.from('documents').select('id, is_active').limit(1);
    if (!error) {
      visibilitySupport = true;
      return true;
    }
    if (isMissingColumnError(error)) {
      visibilitySupport = false;
      return false;
    }
    // Transient failure (network/RLS): stay optimistic and do not cache.
    return true;
  },

  /** Distinct categories in use, merged with the defaults and sorted. */
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase.from('documents').select('category');
    const used = error ? [] : (data || []).map(row => (row as { category: string }).category);
    return Array.from(new Set([...DEFAULT_DOCUMENT_CATEGORIES, ...used]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  },

  ALLOWED_MIMES: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]),
  MAX_SIZE: 20 * 1024 * 1024, // 20MB

  async upload(data: DocumentUploadData): Promise<void> {
    const file = data.file;

    if (!this.ALLOWED_MIMES.has(file.type)) {
      throw new Error(`Tipo de archivo no permitido: ${file.type}`);
    }
    if (file.size > this.MAX_SIZE) {
      throw new Error('El archivo supera el tamaño máximo de 20MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const category = data.category.trim() || 'general';
    const filePath = `${category}/${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    try {
      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const base = {
        title: data.title,
        description: data.description,
        category,
        file_url: publicUrl,
        file_path: filePath,
        file_type: file.type,
        size_bytes: file.size
      };

      // 3. Insert into Database, retrying without is_active on older schemas.
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{ ...base, is_active: data.is_active ?? true }]);

      if (dbError && isMissingColumnError(dbError)) {
        visibilitySupport = false;
        const { error: retryError } = await supabase.from('documents').insert([base]);
        if (retryError) throw retryError;
      } else if (dbError) {
        throw dbError;
      }
    } catch (error) {
      // Cleanup storage if DB fails
      await supabase.storage
        .from('documents')
        .remove([filePath]);
      throw error;
    }
  },

  /**
   * Toggles public visibility. Throws DocumentVisibilityUnsupportedError when
   * the column is missing so the caller can explain it instead of failing raw.
   */
  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      if (isMissingColumnError(error)) {
        visibilitySupport = false;
        throw new DocumentVisibilityUnsupportedError();
      }
      throw error;
    }
    visibilitySupport = true;
  },

  async delete(doc: AdminDocument): Promise<void> {
    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.warn('Storage delete error (continuing with DB):', storageError);
    }

    // 2. Delete from DB
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (dbError) throw dbError;
  }
};
