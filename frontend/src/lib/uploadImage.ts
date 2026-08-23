/**
 * Image upload — the ONE place that talks to the storage provider.
 *
 * Everything else (the Sink's `imageUrl`, the composer, the card) is provider-
 * agnostic: it only deals in a plain URL string. To switch from Supabase
 * Storage to ImageKit/Cloudinary/etc later, rewrite JUST this function to upload
 * and return a public URL. Nothing else changes.
 *
 * Setup required in Supabase once: a PUBLIC bucket named `sink-media`, with a
 * storage policy allowing authenticated users to INSERT (upload) objects.
 */

import { supabase } from './supabase';

const BUCKET = 'sink-media';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** Validate + upload one image, returning its public URL. Throws on problems. */
export async function uploadSinkImage(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Use a JPG, PNG, GIF, or WebP image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image is too big (max 5 MB).');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
