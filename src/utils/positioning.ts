import type { Event } from '../types';
import { filterEvents } from './events';

/**
 * Calculate event position and dimensions within a cell
 */
export interface EventDimensions {
  startPct: number;
  lengthPct: number;
  innerStartPct: number;
  innerLengthPct: number;
}

export function calculateEventDimensions(
  eventStartTime: number,
  eventEndTime: number,
  cellStartTime: number,
  cellEndTime: number,
): EventDimensions {
  const start = Math.max(cellStartTime, eventStartTime);
  const end = Math.min(cellEndTime, eventEndTime);

  const duration = cellEndTime - cellStartTime;

  const startRatio = (start - cellStartTime) / duration;
  const endRatio = (end - cellStartTime) / duration;

  const startPct = startRatio * 100;
  const lengthRatio = endRatio - startRatio;
  const lengthPct = lengthRatio * 100;

  const innerLengthPct = lengthRatio > 0 ? 100 / lengthRatio : 100;
  const innerStartPct = lengthRatio > 0 ? -(startRatio / lengthRatio) * 100 : 0;

  return { startPct, lengthPct, innerStartPct, innerLengthPct };
}

/**
 * Merge consecutive blocks that should be rendered together
 */
export function mergeVisibleBlocks(
  blocks: Array<{ start: number; end: number }>,
  event: Event,
  cellEvents: Event[],
): Array<{ start: number; end: number }> {
  const mergedBlocks: Array<{ start: number; end: number }> = [];
  let currentBlock: { start: number; end: number } | null = null;

  for (const block of blocks) {
    // Find all events that overlap with this block time period
    const events = filterEvents(cellEvents, block.start, block.end);

    // The last one is the topmost event
    if (events.length > 0 && events[events.length - 1] === event) {
      if (currentBlock && currentBlock.end === block.start) {
        currentBlock.end = block.end;
      } else {
        if (currentBlock) mergedBlocks.push(currentBlock);
        currentBlock = { ...block };
      }
    } else {
      if (currentBlock) {
        mergedBlocks.push(currentBlock);
        currentBlock = null;
      }
    }
  }

  if (currentBlock) mergedBlocks.push(currentBlock);

  return mergedBlocks;
}

/**
 * Calculate sub-block position within event
 */
export function calculateSubBlockPosition(
  block: { start: number; end: number },
  cellStartTime: number,
  duration: number,
): { startPct: number; lengthPct: number } {
  const startRatio = (block.start - cellStartTime) / duration;
  const endRatio = (block.end - cellStartTime) / duration;

  const startPct = startRatio * 100;
  const lengthPct = (endRatio - startRatio) * 100;

  return { startPct, lengthPct };
}

/**
 * Generate sub-blocks for event rendering
 * Divides events into 5-minute intervals for rendering
 */
export function generateEventSubBlocks(
  eventStart: number,
  eventEnd: number,
  cellStartTime: number,
  cellEndTime: number,
): Array<{ start: number; end: number }> {
  const BLOCK_INTERVAL_MINUTES = 5;
  const BLOCK_INTERVAL_MS = BLOCK_INTERVAL_MINUTES * 60 * 1000;

  const blocks: Array<{ start: number; end: number }> = [];

  // Find the first event block start that is >= cellStartTime
  const cellStartDate = new Date(cellStartTime);
  const cellStartMinutes = cellStartDate.getMinutes();
  const roundedCellStartMinutes =
    Math.floor(cellStartMinutes / BLOCK_INTERVAL_MINUTES) *
    BLOCK_INTERVAL_MINUTES;
  cellStartDate.setMinutes(roundedCellStartMinutes, 0, 0);
  let currentBlockStart = cellStartDate.getTime();

  // If we rounded down, move to the next block if needed
  if (currentBlockStart < cellStartTime) {
    currentBlockStart += BLOCK_INTERVAL_MS;
  }

  // Find the last event block end that is <= cellEndTime
  const cellEndDate = new Date(cellEndTime);
  const cellEndMinutes = cellEndDate.getMinutes();
  const roundedCellEndMinutes =
    Math.ceil(cellEndMinutes / BLOCK_INTERVAL_MINUTES) * BLOCK_INTERVAL_MINUTES;
  cellEndDate.setMinutes(roundedCellEndMinutes, 0, 0);
  const finalBlockEnd = Math.min(cellEndDate.getTime(), cellEndTime);

  while (currentBlockStart < finalBlockEnd) {
    const currentBlockEnd = Math.min(
      currentBlockStart + BLOCK_INTERVAL_MS,
      finalBlockEnd,
    );

    // Only create block if it overlaps with the actual event
    if (currentBlockEnd > eventStart && currentBlockStart < eventEnd) {
      blocks.push({
        start: Math.max(currentBlockStart, eventStart),
        end: Math.min(currentBlockEnd, eventEnd),
      });
    }

    currentBlockStart = currentBlockEnd;
  }

  return blocks;
}
