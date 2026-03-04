export const MAX_EMAIL_LENGTH = 255;
export const MAX_FULLNAME_LENGTH = 255;
export const MAX_PASSWORD_LENGTH = 255;
export const MAX_ROLE_LENGTH = 20;
export const MAX_TITLE_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_BIO_LENGTH = 500;
export const MAX_TAGS_INPUT_LENGTH = 500;
export const MAX_COMPANY_NAME_LENGTH = 255;
export const MAX_COMPANY_DESC_LENGTH = 1000;
export const MAX_COVER_LETTER_LENGTH = 2000;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_SEARCH_LENGTH = 255;
export const MAX_CHAT_EMAIL_LENGTH = 255;

export function sanitize(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[<>]/g, "");
}

export function validateLength(str, max) {
  if (typeof str !== "string") return false;
  return str.length <= max;
}

export function validateEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (!validateLength(trimmed, MAX_EMAIL_LENGTH)) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(trimmed);
}

export function validatePositiveNumber(n) {
  const num = Number(n);
  return !isNaN(num) && num >= 0 && num < 1e9;
}
