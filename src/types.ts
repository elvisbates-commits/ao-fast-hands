/**
 * Supported operating systems for keyboard shortcuts
 */
export type OperatingSystem = 'macOS' | 'Windows';

/**
 * Modifier keys that can be part of a keyboard shortcut
 */
export type ModifierKey = 'Control' | 'Alt' | 'Shift' | 'Meta' | 'Command' | 'Option';

/**
 * Normalized keyboard shortcut representation
 * This internal model supports both macOS and Windows variants
 */
export interface NormalizedShortcut {
  /** Modifier keys (e.g., ['Meta', 'Shift'] for macOS or ['Control', 'Shift'] for Windows) */
  modifiers: ModifierKey[];
  /** The main key (e.g., 'S', 'Enter', 'ArrowUp') */
  key: string;
  /** macOS variant of the shortcut */
  macOS: string;
  /** Windows variant of the shortcut */
  windows: string;
}

/**
 * Parsed command from Cubase Key Commands XML
 */
export interface Command {
  /** The command name (e.g., "Set Left Locator") */
  name: string;
  /** Category/group the command belongs to */
  category: string;
  /** Normalized shortcut with both OS variants */
  shortcut: NormalizedShortcut;
}

/**
 * Quiz feedback state
 */
export type QuizFeedback = 'none' | 'correct' | 'incorrect';

/**
 * Normalized shortcut structure for comparison
 * Uses boolean flags for modifiers instead of arrays
 */
export interface ShortcutState {
  /** The terminal (non-modifier) key */
  key: string;
  /** Shift modifier is pressed */
  shift: boolean;
  /** Alt/Option modifier is pressed */
  alt: boolean;
  /** Control modifier is pressed */
  ctrl: boolean;
  /** Meta/Command modifier is pressed */
  meta: boolean;
}

