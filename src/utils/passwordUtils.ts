import { GameQuiz } from '../types';

/**
 * Calculates a deterministic 6-digit dynamic PIN based on game ID and time interval.
 */
export function getDynamicPin(gameId: string, intervalSeconds: number = 30, offsetBlocks: number = 0): string {
  const safeInterval = Math.max(1, Math.min(100, intervalSeconds || 30));
  const currentBlock = Math.floor(Date.now() / (safeInterval * 1000)) + offsetBlocks;

  // FNV-1a hash followed by Murmur-like bitwise avalanche mixing for non-sequential random numbers
  let h = 2166136261;
  const str = `${gameId}_salt_lanie_${currentBlock}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  // Bit avalanche mixing steps
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;

  const positiveHash = (h >>> 0);
  const pinNum = (positiveHash % 900000) + 100000;
  return String(pinNum);
}

/**
 * Returns seconds remaining until the next dynamic password rotation.
 */
export function getDynamicSecondsRemaining(intervalSeconds: number = 30): number {
  const safeInterval = Math.max(1, Math.min(100, intervalSeconds || 30));
  const currentSec = Math.floor(Date.now() / 1000);
  const rem = safeInterval - (currentSec % safeInterval);
  return rem === 0 ? safeInterval : rem;
}

/**
 * Returns the effective password for a game at the current moment.
 */
export function getCurrentGamePassword(game: GameQuiz): string {
  if (game.passwordType === 'none') {
    return '';
  }
  if (game.passwordType === 'static') {
    return game.passwordValue || '';
  }
  // Dynamic password
  return getDynamicPin(game.id, game.dynamicInterval || 30);
}

/**
 * Validates a student-provided password against the game.
 * Accepts current PIN or previous PIN block for dynamic mode to avoid transition failures.
 */
export function validateGamePassword(game: GameQuiz, provided: string): boolean {
  if (game.passwordType === 'none') {
    return true;
  }

  const cleanProvided = provided.trim();

  if (game.passwordType === 'static') {
    return cleanProvided === (game.passwordValue || '').trim();
  }

  if (game.passwordType === 'dynamic') {
    const currentPin = getDynamicPin(game.id, game.dynamicInterval || 30, 0);
    const prevPin = getDynamicPin(game.id, game.dynamicInterval || 30, -1);
    return cleanProvided === currentPin || cleanProvided === prevPin;
  }

  return true;
}
