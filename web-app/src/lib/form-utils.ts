/**
 * Form error processing utilities.
 */

/**
 * Recursively counts all error messages in the form errors object.
 */
export const countAllErrors = (obj: null | Record<string, unknown> | undefined): number => {
  let count = 0;
  if (!obj || typeof obj !== 'object') return 0;
  if ('message' in obj) return 1;
  for (const key in obj) {
    count += countAllErrors(obj[key] as Record<string, unknown>);
  }
  return count;
};

/**
 * Recursively extracts all error messages into a flat array.
 */
export const getFlatErrorMessages = (obj: null | Record<string, unknown> | undefined): string[] => {
  const messages: string[] = [];
  const walk = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    if ('message' in record && typeof record.message === 'string') messages.push(record.message);
    else {
      for (const key in record) walk(record[key]);
    }
  };
  walk(obj);
  return messages;
};
