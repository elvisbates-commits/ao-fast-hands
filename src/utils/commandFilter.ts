import { Command } from '../types';

/**
 * Checks if a command has an assigned shortcut
 * A command is considered assigned if it has a non-empty key
 */
export function hasAssignedShortcut(command: Command): boolean {
  return command.shortcut.key !== '' && command.shortcut.key.trim() !== '';
}

/**
 * Filters commands to only include those with assigned shortcuts
 */
export function filterAssignedCommands(commands: Command[]): Command[] {
  return commands.filter(hasAssignedShortcut);
}

