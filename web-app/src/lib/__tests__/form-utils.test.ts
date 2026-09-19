import { describe, expect, it } from 'vitest';

import { countAllErrors, getFlatErrorMessages } from '../form-utils';

describe('form-utils', () => {
  describe('countAllErrors', () => {
    it('returns 0 for null or undefined or empty object', () => {
      expect(countAllErrors(null)).toBe(0);
      expect(countAllErrors(undefined)).toBe(0);
      expect(countAllErrors({})).toBe(0);
    });

    it('counts single level errors', () => {
      const errors = {
        name: { message: 'Name is required' },
        rules: { message: 'At least one rule is required' }
      };
      expect(countAllErrors(errors)).toBe(2);
    });

    it('counts nested errors recursively', () => {
      const nestedErrors = {
        filters: {
          bpm: {
            min: { message: 'Min BPM must be positive' }
          }
        },
        name: { message: 'Name is required' },
        rules: [
          { message: 'Rule 1 invalid' },
          { condition: { message: 'Condition invalid' } }
        ] as unknown as Record<string, unknown>
      };
      expect(countAllErrors(nestedErrors)).toBe(4);
    });
  });

  describe('getFlatErrorMessages', () => {
    it('returns empty array for empty or null objects', () => {
      expect(getFlatErrorMessages(null)).toEqual([]);
      expect(getFlatErrorMessages(undefined)).toEqual([]);
      expect(getFlatErrorMessages({})).toEqual([]);
    });

    it('extracts flat list of error message strings', () => {
      const errors = {
        email: { message: 'Invalid email' },
        nested: {
          deep: { message: 'Deep error' }
        }
      };
      expect(getFlatErrorMessages(errors)).toEqual(['Invalid email', 'Deep error']);
    });
  });
});
