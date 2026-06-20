import { supabase } from '@/integrations/supabase/client';

export const ARCHIVOS_TAREAS_BUCKET = 'archivos_tareas';
export const CONTENIDO_LECCIONES_BUCKET = 'contenido_lecciones';

const STORAGE_PATH_MARKERS = [
  '/storage/v1/object/public/',
  '/storage/v1/object/sign/',
  '/storage/v1/object/authenticated/',
];

export const getStorageObjectPath = (value: string, bucket: string) => {
  const rawValue = value.trim();

  for (const marker of STORAGE_PATH_MARKERS) {
    const markerIndex = rawValue.indexOf(marker);
    if (markerIndex === -1) continue;

    const objectPath = rawValue.slice(markerIndex + marker.length);
    if (!objectPath.startsWith(`${bucket}/`)) continue;

    const pathWithoutBucket = objectPath.slice(bucket.length + 1).split('?')[0];
    return decodeURIComponent(pathWithoutBucket).replace(/^\/+/, '');
  }

  if (rawValue.startsWith(`${bucket}/`)) {
    return rawValue.slice(bucket.length + 1).replace(/^\/+/, '');
  }

  return rawValue.replace(/^\/+/, '');
};

export const downloadStorageFile = async (
  value: string,
  bucket = ARCHIVOS_TAREAS_BUCKET,
  fallbackFileName = 'archivo'
) => {
  const storagePath = getStorageObjectPath(value, bucket);
  const fileName = storagePath.split('/').pop() || fallbackFileName;
  
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60, {
    download: fileName
  });

  if (error) throw error;

  const anchor = document.createElement('a');
  anchor.href = data.signedUrl;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

export const createSignedStorageUrl = async (
  value: string,
  bucket: string,
  expiresIn = 10 * 60
) => {
  const storagePath = getStorageObjectPath(value, bucket);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;

  return data.signedUrl;
};
