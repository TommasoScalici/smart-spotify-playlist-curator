import { PositionRangeSchema } from '@smart-spotify-curator/shared';
import { describe, expect, it } from 'vitest';

describe('Shared Schemas Validation', () => {
  describe('PositionRangeSchema', () => {
    it('should fail validation if minimum position is greater than maximum position', () => {
      const invalidRange = { max: 5, min: 30 };
      const result = PositionRangeSchema.safeParse(invalidRange);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Min position must be less than or equal to max position'
        );
      }
    });

    it('should pass validation if minimum position is less than or equal to maximum position', () => {
      const validRange = { max: 30, min: 5 };
      const result = PositionRangeSchema.safeParse(validRange);

      expect(result.success).toBe(true);
    });

    it('should pass validation for fixed positions (min equals max)', () => {
      const fixedPosition = { max: 10, min: 10 };
      const result = PositionRangeSchema.safeParse(fixedPosition);

      expect(result.success).toBe(true);
    });
  });
});
