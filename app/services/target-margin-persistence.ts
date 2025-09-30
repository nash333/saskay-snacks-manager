/**
 * Target Margin Persistence Service
 * Implements FR-038 (target margin persistence - read/write metafield)
 * Task 33: Implement target margin persistence (FR-038)
 */

import type { MetaobjectsService } from './metaobjects';

export interface TargetMarginRecord {
  id?: string;
  productId: string;
  packagingOptionId: string;
  targetMarginPercent: number;
  lastUpdated: string;
  changedBy?: string;
  versionToken?: string;
}

export interface TargetMarginHistoryRecord extends TargetMarginRecord {
  changedAt: string;
  previousMargin?: number;
}

interface TargetMarginPersistenceServiceDependencies {
  metaobjectsService: MetaobjectsService;
}

export class TargetMarginPersistenceService {
  private readonly DEFAULT_MARGIN = 50.0;
  private readonly MIN_MARGIN = 0.1;
  private readonly MAX_MARGIN = 94.9;

  constructor(private deps: TargetMarginPersistenceServiceDependencies) {}

  /**
   * Get target margin for product-packaging combination
   * Returns stored value or system default (FR-038)
   */
  async getTargetMargin(
    productId: string,
    packagingOptionId: string
  ): Promise<number> {
    try {
      const results = await this.deps.metaobjectsService.query(`
        query GetTargetMargin($productId: String!, $packagingOptionId: String!) {
          metaobjects(type: "target_margin", first: 1, query: "product_id:\\"$productId\\" AND packaging_option_id:\\"$packagingOptionId\\" AND active_flag:true") {
            nodes {
              id
              field(key: "target_margin_percent") {
                value
              }
              field(key: "last_updated") {
                value
              }
            }
          }
        }
      `, { productId, packagingOptionId });

      if (results.results.length > 0) {
        const storedMargin = parseFloat(results.results[0].fields.targetMarginPercent);
        return this.validateMargin(storedMargin) ? storedMargin : this.DEFAULT_MARGIN;
      }

      return this.DEFAULT_MARGIN;
    } catch (err: unknown) {
      console.warn('Failed to load target margin, using default:', err);
      return this.DEFAULT_MARGIN;
    }
  }

  /**
   * Save target margin for product-packaging combination
   */
  async saveTargetMargin(
    productId: string,
    packagingOptionId: string,
    targetMargin: number,
    changedBy?: string
  ): Promise<TargetMarginRecord> {
    // Validate margin is within acceptable bounds
    if (!this.validateMargin(targetMargin)) {
      throw new Error(`Target margin must be between ${this.MIN_MARGIN}% and ${this.MAX_MARGIN}%`);
    }

    try {
      // Check if record already exists
      const existing = await this.findExistingRecord(productId, packagingOptionId);
      
      const timestamp = new Date().toISOString();

      if (existing) {
        // Update existing record
        const updated = await this.deps.metaobjectsService.update(existing.id!, {
          target_margin_percent: targetMargin.toString(),
          last_updated: timestamp,
          changed_by: changedBy || 'system',
          version_token: this.generateVersionToken()
        });

        // Create history record
        await this.createHistoryRecord(productId, packagingOptionId, targetMargin, existing.targetMarginPercent, changedBy);

        return {
          id: updated.id,
          productId,
          packagingOptionId,
          targetMarginPercent: targetMargin,
          lastUpdated: timestamp,
          changedBy,
          versionToken: updated.fields.versionToken
        };
      } else {
        // Create new record
        const created = await this.deps.metaobjectsService.create('target_margin', {
          product_id: productId,
          packaging_option_id: packagingOptionId,
          target_margin_percent: targetMargin.toString(),
          active_flag: 'true',
          last_updated: timestamp,
          changed_by: changedBy || 'system',
          version_token: this.generateVersionToken()
        });

        // Create initial history record
        await this.createHistoryRecord(productId, packagingOptionId, targetMargin, this.DEFAULT_MARGIN, changedBy);

        return {
          id: created.id,
          productId,
          packagingOptionId,
          targetMarginPercent: targetMargin,
          lastUpdated: timestamp,
          changedBy,
          versionToken: created.fields.versionToken
        };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Concurrent modification')) {
        throw new Error('Target margin was modified by another user. Please refresh and try again.');
      }
      throw err;
    }
  }

  /**
   * Get target margin change history
   */
  async getTargetMarginHistory(
    productId: string,
    packagingOptionId: string,
    limit: number = 20
  ): Promise<TargetMarginHistoryRecord[]> {
    try {
      const results = await this.deps.metaobjectsService.query(`
        query GetTargetMarginHistory($productId: String!, $packagingOptionId: String!, $limit: Int!) {
          metaobjects(type: "target_margin_history", first: $limit, 
                     query: "product_id:\\"$productId\\" AND packaging_option_id:\\"$packagingOptionId\\"",
                     sortKey: "created_at", reverse: true) {
            nodes {
              id
              field(key: "target_margin_percent") { value }
              field(key: "previous_margin") { value }
              field(key: "changed_at") { value }
              field(key: "changed_by") { value }
            }
          }
        }
      `, { productId, packagingOptionId, limit });

      return results.results.map((record: any) => ({
        id: record.id,
        productId,
        packagingOptionId,
        targetMarginPercent: parseFloat(record.fields.targetMarginPercent),
        previousMargin: record.fields.previousMargin ? parseFloat(record.fields.previousMargin) : undefined,
        changedAt: record.fields.changedAt,
        changedBy: record.fields.changedBy,
        lastUpdated: record.fields.changedAt
      }));
    } catch (err: unknown) {
      console.warn('Failed to load target margin history:', err);
      return [];
    }
  }

  /**
   * Delete target margin (reverts to default)
   */
  async deleteTargetMargin(
    productId: string,
    packagingOptionId: string,
    deletedBy?: string
  ): Promise<void> {
    const existing = await this.findExistingRecord(productId, packagingOptionId);
    
    if (existing) {
      const timestamp = new Date().toISOString();
      
      // Soft delete by setting active_flag to false
      await this.deps.metaobjectsService.update(existing.id!, {
        active_flag: 'false',
        deleted_at: timestamp,
        deleted_by: deletedBy || 'system'
      });

      // Create deletion history record
      await this.createHistoryRecord(
        productId, 
        packagingOptionId, 
        this.DEFAULT_MARGIN, 
        existing.targetMarginPercent, 
        deletedBy,
        'deleted'
      );
    }
  }

  /**
   * Bulk load target margins for multiple product-packaging combinations
   */
  async bulkLoadTargetMargins(
    requests: Array<{ productId: string; packagingOptionId: string }>
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    // Build query for all combinations
    const queryConditions = requests.map(req => 
      `(product_id:"${req.productId}" AND packaging_option_id:"${req.packagingOptionId}")`
    ).join(' OR ');

    try {
      const metaobjectResults = await this.deps.metaobjectsService.query(`
        query BulkGetTargetMargins {
          metaobjects(type: "target_margin", first: ${requests.length}, 
                     query: "(${queryConditions}) AND active_flag:true") {
            nodes {
              field(key: "product_id") { value }
              field(key: "packaging_option_id") { value }
              field(key: "target_margin_percent") { value }
            }
          }
        }
      `);

      // Map results
      const foundCombinations = new Set<string>();
      
      for (const record of metaobjectResults.results) {
        const r: any = record;
        const key = `${r.fields.productId}:${r.fields.packagingOptionId}`;
        const margin = parseFloat(r.fields.targetMarginPercent);
        
        results.set(key, this.validateMargin(margin) ? margin : this.DEFAULT_MARGIN);
        foundCombinations.add(key);
      }

      // Set default for missing combinations
      for (const req of requests) {
        const key = `${req.productId}:${req.packagingOptionId}`;
        if (!foundCombinations.has(key)) {
          results.set(key, this.DEFAULT_MARGIN);
        }
      }

      return results;
    } catch (error) {
      console.warn('Failed to bulk load target margins, using defaults:', error);
      
      // Return defaults for all requested combinations
      for (const req of requests) {
        const key = `${req.productId}:${req.packagingOptionId}`;
        results.set(key, this.DEFAULT_MARGIN);
      }
      
      return results;
    }
  }

  /**
   * Find existing target margin record
   */
  private async findExistingRecord(
    productId: string,
    packagingOptionId: string
  ): Promise<TargetMarginRecord | null> {
    try {
      const results = await this.deps.metaobjectsService.query(`
        query FindTargetMargin($productId: String!, $packagingOptionId: String!) {
          metaobjects(type: "target_margin", first: 1, 
                     query: "product_id:\\"$productId\\" AND packaging_option_id:\\"$packagingOptionId\\" AND active_flag:true") {
            nodes {
              id
              field(key: "target_margin_percent") { value }
              field(key: "last_updated") { value }
              field(key: "version_token") { value }
            }
          }
        }
      `, { productId, packagingOptionId });

      if (results.results.length > 0) {
        const record = results.results[0];
        return {
          id: record.id,
          productId,
          packagingOptionId,
          targetMarginPercent: parseFloat(record.fields.targetMarginPercent),
          lastUpdated: record.fields.lastUpdated,
          versionToken: record.fields.versionToken
        };
      }

      return null;
    } catch (error) {
      console.warn('Error finding existing record:', error);
      return null;
    }
  }

  /**
   * Create history record for target margin changes
   */
  private async createHistoryRecord(
    productId: string,
    packagingOptionId: string,
    newMargin: number,
    previousMargin: number,
    changedBy?: string,
    changeType: 'updated' | 'deleted' | 'created' = 'updated'
  ): Promise<void> {
    try {
      await this.deps.metaobjectsService.create('target_margin_history', {
        product_id: productId,
        packaging_option_id: packagingOptionId,
        target_margin_percent: newMargin.toString(),
        previous_margin: previousMargin.toString(),
        change_type: changeType,
        changed_at: new Date().toISOString(),
        changed_by: changedBy || 'system'
      });
    } catch (error) {
      console.warn('Failed to create target margin history record:', error);
      // Don't fail the main operation if history creation fails
    }
  }

  /**
   * Validate margin is within acceptable bounds
   */
  private validateMargin(margin: number): boolean {
    return margin >= this.MIN_MARGIN && margin <= this.MAX_MARGIN;
  }

  /**
   * Generate version token for optimistic concurrency control
   */
  private generateVersionToken(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}