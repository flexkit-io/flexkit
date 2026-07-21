const EXTENSION_TO_MIME_TYPE: { [key: string]: string } = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  ico: 'image/vnd.microsoft.icon',
  bmp: 'image/bmp',
  gif: 'image/gif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  apng: 'image/apng',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  midi: 'audio/midi',
  oga: 'audio/ogg',
  avi: 'video/x-msvideo',
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  ts: 'video/mp2t',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  '7z': 'application/x-7z-compressed',
  zip: 'application/zip',
  azw: 'application/vnd.amazon.ebook',
  bin: 'application/octet-stream',
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  eot: 'application/vnd.ms-fontobject',
  gz: 'application/gzip',
  jar: 'application/java-archive',
  json: 'application/json',
  jsonld: 'application/ld+json',
  mjs: 'text/javascript',
  odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odt: 'application/vnd.oasis.opendocument.text',
  ogg: 'application/ogg',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rar: 'application/vnd.rar',
  tar: 'application/x-tar',
  vsd: 'application/vnd.visio',
  xhtml: 'application/xhtml+xml',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xml: 'application/xml',
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
};

export function mimeTypeFromFilename(filename: string): string {
  const extension = filename.match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase() ?? '';

  return EXTENSION_TO_MIME_TYPE[extension] ?? 'application/octet-stream';
}

export function mimeTypeFromResponse(responseContentType: string | null, filename: string): string {
  const normalized = responseContentType?.split(';')[0]?.trim() ?? '';

  if (normalized && normalized !== 'application/octet-stream') {
    return normalized;
  }

  return mimeTypeFromFilename(filename);
}
