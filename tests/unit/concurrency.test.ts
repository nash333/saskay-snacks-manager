import { describe, it, expect } from '@jest/globals';
import { detectVersionConflicts, compareVersionTokens, buildConflictList } from '../../app/services/concurrency';

describe('Version Token Conflict Detection (FR-019, FR-032)', () => {
  describe('compareVersionTokens', () => {
    it('should detect conflicts with timestamp-based tokens', () => {
      const clientToken = '2025-09-29T10:00:00Z';
      const serverToken = '2025-09-29T10:05:00Z'; // 5 minutes newer

      const result = compareVersionTokens(clientToken, serverToken);
      expect(result.isConflict).toBe(true);
      expect(result.clientVersion).toBe(clientToken);
      expect(result.currentVersion).toBe(serverToken);
    });

    it('should pass when tokens match exactly', () => {
      const token = '2025-09-29T10:00:00Z';
      
      const result = compareVersionTokens(token, token);
      expect(result.isConflict).toBe(false);
      expect(result.isClean).toBe(true);
    });

    it('should handle integer-based version tokens', () => {
      const clientVersion = '5';
      const serverVersion = '7';

      const result = compareVersionTokens(clientVersion, serverVersion);
      expect(result.isConflict).toBe(true);
    });

    it('should handle null/undefined client tokens (new entities)', () => {
      const result = compareVersionTokens(null, '2025-09-29T10:00:00Z');
      expect(result.isConflict).toBe(false); // new entities don't conflict
      expect(result.isNewEntity).toBe(true);
    });
  });

  describe('detectVersionConflicts', () => {
    it('should detect conflicts across multiple ingredients', () => {
      const clientData = [
        { id: '1', name: 'Flour', versionToken: '2025-09-29T10:00:00Z' },
        { id: '2', name: 'Sugar', versionToken: '2025-09-29T09:30:00Z' },
        { id: null, name: 'New Item', versionToken: null } // new item
      ];

      const serverData = [
        { id: '1', name: 'Flour', versionToken: '2025-09-29T10:05:00Z' }, // conflict
        { id: '2', name: 'Sugar', versionToken: '2025-09-29T09:30:00Z' }   // clean
      ];

      const conflicts = detectVersionConflicts(clientData, serverData, 'ingredient');
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'ingredient',
        id: '1',
        name: 'Flour',
        clientVersion: '2025-09-29T10:00:00Z',
        currentVersion: '2025-09-29T10:05:00Z'
      });
    });

    it('should detect recipe container version conflicts', () => {
      const clientRecipes = [
        { productId: 'prod1', version: 3, lines: [] }
      ];

      const serverRecipes = [
        { productId: 'prod1', version: 5, lines: [] }
      ];

      const conflicts = detectVersionConflicts(clientRecipes, serverRecipes, 'recipe');
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('recipe');
    });

    it('should return empty array when no conflicts', () => {
      const clientData = [
        { id: '1', versionToken: 'v1' },
        { id: '2', versionToken: 'v2' }
      ];
      
      const serverData = [
        { id: '1', versionToken: 'v1' },
        { id: '2', versionToken: 'v2' }
      ];

      const conflicts = detectVersionConflicts(clientData, serverData, 'ingredient');
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('buildConflictList (for 409 response)', () => {
    it('should build conflict response payload for batch save', () => {
      const ingredientConflicts = [
        {
          type: 'ingredient',
          id: '1',
          name: 'Flour',
          clientVersion: 'v1',
          currentVersion: 'v2'
        }
      ];

      const recipeConflicts = [
        {
          type: 'recipe', 
          id: 'prod1',
          name: 'Chocolate Chip Cookies',
          clientVersion: '3',
          currentVersion: '5'
        }
      ];

  const conflictList = buildConflictList([...ingredientConflicts, ...recipeConflicts] as any[]);
      
      expect(conflictList).toMatchObject({
        error: 'STALE_VERSION',
        conflicts: [
          {
            type: 'ingredient',
            id: '1',
            clientVersion: 'v1',
            currentVersion: 'v2',
            name: 'Flour'
          },
          {
            type: 'recipe',
            id: 'prod1', 
            clientVersion: '3',
            currentVersion: '5',
            name: 'Chocolate Chip Cookies'
          }
        ]
      });
    });

    it('should handle empty conflicts (edge case)', () => {
      const conflictList = buildConflictList([]);
      expect(conflictList.conflicts).toHaveLength(0);
    });
  });
});