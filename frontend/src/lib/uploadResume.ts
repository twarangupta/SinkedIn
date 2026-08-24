/**
 * Resume upload — the ONE place that talks to the private `resumes` bucket.
 *
 * Unlike sink images (public bucket, public URLs), resumes are PII: the bucket
 * is PRIVATE, so we store only the object KEY on the Application and read the
 * file back through a short-lived SIGNED URL. Storage RLS (see the bucket
 * policies) confines every user to their own `{supabaseUserId}/...` folder, so
 * one user can never read or overwrite another's resume.
 *
 * Setup required in Supabase once: a PRIVATE bucket named `resumes` plus RLS
 * policies allowing an authenticated user to read/insert/update/delete only
 * objects whose first path segment equals their auth.uid().
 */

import { supabase } from './supabase';

const BUCKET = 'resumes';
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB (also enforced by the bucket limit)

/** Resolve the signed-in user's Supabase id (the RLS folder prefix). */
async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('You need to be signed in to upload a resume.');
  return id;
}

/**
 * Validate + upload one resume PDF, returning its storage KEY (not a URL).
 * The key is `{supabaseUserId}/{uuid}.pdf`; store it on the Application. Throws
 * a user-friendly message on any problem.
 */
export async function uploadResume(file: File): Promise<string> {
  if (file.type !== 'application/pdf') {
    throw new Error('Resume must be a PDF file.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Resume is too big (max 3 MB).');
  }

  const userId = await currentUserId();
  // A fresh random id per upload means re-uploading never collides; the caller
  // deletes the previous object after the new key is saved.
  const key = `${userId}/${crypto.randomUUID()}.pdf`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error(error.message);

  return key;
}

/**
 * Mint a short-lived signed URL to view/download a resume. Private bucket, so
 * there is no public URL. `downloadName` sets the suggested filename when the
 * browser saves it (e.g. "Google-SWE-resume.pdf").
 */
export async function resumeSignedUrl(
  key: string,
  downloadName?: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 60, downloadName ? { download: downloadName } : undefined);
  if (error || !data) throw new Error(error?.message ?? 'Could not open the resume.');
  return data.signedUrl;
}

/** Delete a resume object by key. Best-effort: a missing object is not an error. */
export async function deleteResume(key: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([key]);
  if (error) throw new Error(error.message);
}
