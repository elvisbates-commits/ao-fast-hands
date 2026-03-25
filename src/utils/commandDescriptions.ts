/**
 * Command descriptions for Cubase key commands
 * This file now uses the generated descriptions from the canonical JSON source
 */
import { commandDescriptions } from '../data/commandDescriptions';
import type { CommandDescription } from '../types/commandDescriptions';

/**
 * Gets the short description for a command
 * @param commandName The exact command name from Cubase
 * @returns The short description, or empty string if not found
 */
export function getCommandDescription(commandName: string): string {
  // First try exact match
  const desc = commandDescriptions[commandName];
  if (desc?.short) {
    return desc.short;
  }
  
  // Try case-insensitive lookup
  const lowerName = commandName.toLowerCase();
  for (const [key, value] of Object.entries(commandDescriptions)) {
    if (key.toLowerCase() === lowerName) {
      return value.short || '';
    }
  }
  
  return '';
}

/**
 * Gets the full command description object
 * @param commandName The exact command name from Cubase
 * @returns The full description object, or undefined if not found
 */
export function getCommandDescriptionFull(commandName: string): CommandDescription | undefined {
  // First try exact match
  if (commandDescriptions[commandName]) {
    return commandDescriptions[commandName];
  }
  
  // Try case-insensitive lookup
  const lowerName = commandName.toLowerCase();
  for (const [key, value] of Object.entries(commandDescriptions)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  return undefined;
}

// Legacy export for backwards compatibility
export const COMMAND_DESCRIPTIONS: Record<string, string> = (() => {
  const legacy: Record<string, string> = {};
  Object.entries(commandDescriptions).forEach(([name, desc]) => {
    legacy[name] = desc.short;
  });
  return legacy;
})();
