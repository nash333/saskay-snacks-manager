/**
 * Optimistic concurrency control for version token management (FR-019, FR-032)
 * Handles conflict detection and resolution workflows
 */

export interface VersionConflict {
  type: 'ingredient' | 'recipe';
  id: string;
  name: string;
  clientVersion: string;
  currentVersion: string;
}

export interface VersionComparison {
  isConflict: boolean;
  isClean?: boolean;
  isNewEntity?: boolean;
  clientVersion: string | null;
  currentVersion: string;
}

export interface ConflictList {
  error: 'STALE_VERSION';
  conflicts: VersionConflict[];
}

export interface VersionedEntity {
  id: string | null;
  name?: string;
  versionToken: string | null;
}

export interface VersionedRecipe {
  productId: string;
  version: number;
  lines: any[];
}

/**
 * Compare version tokens for conflict detection
 */
export function compareVersionTokens(
  clientToken: string | null, 
  serverToken: string
): VersionComparison {
  // New entities (null client token) don't conflict
  if (clientToken === null || clientToken === undefined) {
    return {
      isConflict: false,
      isNewEntity: true,
      clientVersion: clientToken,
      currentVersion: serverToken
    };
  }

  // Exact match = clean
  if (clientToken === serverToken) {
    return {
      isConflict: false,
      isClean: true,
      clientVersion: clientToken,
      currentVersion: serverToken
    };
  }

  // Attempt intelligent comparison for timestamps
  if (isTimestampToken(clientToken) && isTimestampToken(serverToken)) {
    const clientTime = new Date(clientToken).getTime();
    const serverTime = new Date(serverToken).getTime();
    
    return {
      isConflict: clientTime < serverTime,
      clientVersion: clientToken,
      currentVersion: serverToken
    };
  }

  // Attempt integer comparison
  if (isIntegerToken(clientToken) && isIntegerToken(serverToken)) {
    const clientNum = parseInt(clientToken, 10);
    const serverNum = parseInt(serverToken, 10);
    
    return {
      isConflict: clientNum < serverNum,
      clientVersion: clientToken,
      currentVersion: serverToken
    };
  }

  // Fallback: any difference is a conflict
  return {
    isConflict: true,
    clientVersion: clientToken,
    currentVersion: serverToken
  };
}

/**
 * Detect conflicts across multiple entities
 * Supports both VersionedEntity and VersionedRecipe formats
 */
export function detectVersionConflicts<T extends VersionedEntity | VersionedRecipe>(
  clientData: T[],
  serverData: T[],
  entityType: 'ingredient' | 'recipe'
): VersionConflict[] {
  const conflicts: VersionConflict[] = [];

  for (const clientEntity of clientData) {
    let clientId: string | null;
    let clientVersion: string | null;
    let entityName: string;

    // Handle recipe format (productId + version) vs entity format (id + versionToken)
    if ('productId' in clientEntity) {
      // Recipe format
      const recipeEntity = clientEntity as VersionedRecipe;
      clientId = recipeEntity.productId;
      clientVersion = recipeEntity.version.toString();
      entityName = `Recipe for product ${clientId}`;
    } else {
      // Standard entity format
      const entity = clientEntity as VersionedEntity;
      clientId = entity.id;
      clientVersion = entity.versionToken;
      entityName = entity.name || `${entityType} ${clientId}`;
    }

    // Skip new entities
    if (!clientId) continue;

    // Find matching server entity
    let serverEntity: T | undefined;
    let serverVersion: string;

    if ('productId' in clientEntity) {
      // Recipe matching
      const matchingRecipe = serverData.find(s => 'productId' in s && (s as VersionedRecipe).productId === clientId) as VersionedRecipe | undefined;
      if (matchingRecipe) {
        serverEntity = matchingRecipe as T;
        serverVersion = matchingRecipe.version.toString();
      } else {
        continue; // Entity deleted on server
      }
    } else {
      // Standard entity matching
      const matchingEntity = serverData.find(s => 'id' in s && (s as VersionedEntity).id === clientId) as VersionedEntity | undefined;
      if (matchingEntity) {
        serverEntity = matchingEntity as T;
        serverVersion = matchingEntity.versionToken || '';
      } else {
        continue; // Entity deleted on server
      }
    }

    const comparison = compareVersionTokens(clientVersion, serverVersion);

    if (comparison.isConflict) {
      conflicts.push({
        type: entityType,
        id: clientId,
        name: entityName,
        clientVersion: comparison.clientVersion || '',
        currentVersion: comparison.currentVersion
      });
    }
  }

  return conflicts;
}

/**
 * Specialized conflict detection for recipe containers
 */
export function detectRecipeVersionConflicts(
  clientRecipes: VersionedRecipe[],
  serverRecipes: VersionedRecipe[]
): VersionConflict[] {
  const conflicts: VersionConflict[] = [];

  for (const clientRecipe of clientRecipes) {
    const serverRecipe = serverRecipes.find(s => s.productId === clientRecipe.productId);
    if (!serverRecipe) continue;

    const comparison = compareVersionTokens(
      clientRecipe.version.toString(),
      serverRecipe.version.toString()
    );

    if (comparison.isConflict) {
      conflicts.push({
        type: 'recipe',
        id: clientRecipe.productId,
        name: `Recipe for product ${clientRecipe.productId}`,
        clientVersion: clientRecipe.version.toString(),
        currentVersion: serverRecipe.version.toString()
      });
    }
  }

  return conflicts;
}

/**
 * Build 409 conflict response payload
 */
export function buildConflictList(conflicts: VersionConflict[]): ConflictList {
  return {
    error: 'STALE_VERSION',
    conflicts
  };
}

/**
 * Helper to determine if token looks like a timestamp
 */
function isTimestampToken(token: string): boolean {
  // ISO 8601 pattern or timestamp-like
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token) || /^\d{13}$/.test(token);
}

/**
 * Helper to determine if token looks like an integer
 */
function isIntegerToken(token: string): boolean {
  return /^\d+$/.test(token);
}

/**
 * Generate new version token (timestamp-based)
 */
export function generateVersionToken(): string {
  return new Date().toISOString();
}

/**
 * Increment integer-based version token
 */
export function incrementVersionToken(currentVersion: string | number): string {
  if (typeof currentVersion === 'number') {
    return (currentVersion + 1).toString();
  }
  
  if (isIntegerToken(currentVersion)) {
    return (parseInt(currentVersion, 10) + 1).toString();
  }

  // Fallback to timestamp
  return generateVersionToken();
}