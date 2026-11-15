export const MESSAGE_ATTACHMENT_BUCKET = 'message-attachments';
export const MESSAGE_ATTACHMENT_MAX_COUNT = 4;
export const MESSAGE_ATTACHMENT_MAX_SIZE = 4 * 1024 * 1024;
export const MESSAGE_ATTACHMENT_MAX_TOTAL_SIZE = 4 * 1024 * 1024;
export const MESSAGE_ATTACHMENT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',');

const allowedTypes = new Set(MESSAGE_ATTACHMENT_ACCEPT.split(','));

export function isAllowedMessageAttachment(file: { type: string; size: number }) {
  return file.size > 0 && file.size <= MESSAGE_ATTACHMENT_MAX_SIZE && allowedTypes.has(file.type);
}

export function isImageMessageAttachment(contentType: string) {
  return contentType.startsWith('image/');
}

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
