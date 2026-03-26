import { supabase } from '../lib/supabase';

export const StorageService = {
  /**
   * Uploads a file to a specific Supabase storage bucket.
   * @param bucket The name of the storage bucket.
   * @param file The file object to upload.
   * @param folder Optional folder path within the bucket.
   * @returns The public URL of the uploaded file.
   */
  ALLOWED_IMAGE_MIMES: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ALLOWED_DOC_MIMES: new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

  validateFile(file: File, allowedMimes?: Set<string>) {
    const mimes = allowedMimes || this.ALLOWED_DOC_MIMES;
    if (!mimes.has(file.type)) {
      throw new Error(`Tipo de archivo no permitido: ${file.type}`);
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`El archivo supera el tamaño máximo de 10MB`);
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext) {
      throw new Error('El archivo no tiene extensión');
    }
  },

  async uploadFile(bucket: string, file: File, folder: string = 'uploads') {
    this.validateFile(file);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Backwards-compatible alias for image uploads.
   */
  async uploadImage(bucket: string, file: File, folder: string = 'uploads') {
    return this.uploadFile(bucket, file, folder);
  },

  /**
   * Deletes a file from a Supabase storage bucket given its public URL or path.
   * @param bucket The name of the storage bucket.
   * @param pathOrUrl The public URL or path of the file to delete.
   */
  async deleteImage(bucket: string, pathOrUrl: string) {
    let path = pathOrUrl;
    
    // If it's a full URL, try to extract the path after the bucket name
    if (pathOrUrl.startsWith('http')) {
      const parts = pathOrUrl.split(`${bucket}/`);
      if (parts.length > 1) {
        path = parts[1];
      }
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }
};
