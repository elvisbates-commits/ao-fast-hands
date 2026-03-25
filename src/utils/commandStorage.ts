import { Command } from '../types';

const STORAGE_KEY = 'fast-hands-commands';

/**
 * Saves commands to localStorage
 */
export function saveCommands(commands: Command[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
  } catch (error) {
    console.warn('Failed to save commands to localStorage:', error);
  }
}

/**
 * Loads commands from localStorage
 */
export function loadCommands(): Command[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as Command[];
  } catch (error) {
    console.warn('Failed to load commands from localStorage:', error);
    return null;
  }
}

/**
 * Clears saved commands from localStorage
 */
export function clearCommands(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear commands from localStorage:', error);
  }
}

