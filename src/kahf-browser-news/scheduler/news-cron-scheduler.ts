/**
 * News Cron Scheduler
 * Manages daily scheduled automated news ingestion.
 */

import { runNewsIngestionPipeline, IngestionResult } from '../pipeline/news-ingestion-pipeline';

export interface SchedulerExecutionReport {
  timestamp: string;
  regions: Record<string, IngestionResult>;
  totalDiscovered: number;
  totalSaved: number;
  totalDurationMs: number;
}

/**
 * Executes a full scheduled cycle across all supported regions.
 */
export async function executeScheduledNewsIngestion(): Promise<SchedulerExecutionReport> {
  const startTime = Date.now();
  const regions = ['BD', 'UK', 'SA', 'GLOBAL'];
  const results: Record<string, IngestionResult> = {};

  let totalDiscovered = 0;
  let totalSaved = 0;

  for (const region of regions) {
    try {
      const res = await runNewsIngestionPipeline(region);
      results[region] = res;
      totalDiscovered += res.discoveredCount;
      totalSaved += res.newSavedCount;
    } catch (err: any) {
      results[region] = {
        success: false,
        region,
        sourcesCrawled: 0,
        discoveredCount: 0,
        newSavedCount: 0,
        duplicatesSkipped: 0,
        durationMs: 0,
      };
    }
  }

  return {
    timestamp: new Date().toISOString(),
    regions: results,
    totalDiscovered,
    totalSaved,
    totalDurationMs: Date.now() - startTime,
  };
}
