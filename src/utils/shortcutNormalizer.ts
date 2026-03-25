import { NormalizedShortcut, ModifierKey, ShortcutState } from '../types';

/**
 * Maps Cubase XML modifier strings to our internal ModifierKey type
 */
const MODIFIER_MAP: Record<string, ModifierKey> = {
  'Ctrl': 'Control',
  'Alt': 'Alt',
  'Shift': 'Shift',
  'Cmd': 'Command',
  'Command': 'Command', // Cubase uses "Command" directly
  'Meta': 'Meta',
  'Option': 'Option',
};

/**
 * Maps Cubase key names to standard KeyboardEvent.key values
 */
const KEY_NAME_MAP: Record<string, string> = {
  'Left Arrow': 'ArrowLeft',
  'Right Arrow': 'ArrowRight',
  'Up Arrow': 'ArrowUp',
  'Down Arrow': 'ArrowDown',
  'Pad +': 'NumpadAdd',
  'Pad -': 'NumpadSubtract',
  'Pad *': 'NumpadMultiply',
  'Pad /': 'NumpadDivide',
  'Pad0': 'Numpad0',
  'Pad1': 'Numpad1',
  'Pad2': 'Numpad2',
  'Pad3': 'Numpad3',
  'Pad4': 'Numpad4',
  'Pad5': 'Numpad5',
  'Pad6': 'Numpad6',
  'Pad7': 'Numpad7',
  'Pad8': 'Numpad8',
  'Pad9': 'Numpad9',
  'Return': 'Enter',
  'Del': 'Delete',
};

/**
 * Maps shifted characters to their base key + shift modifier
 * When Cubase stores "+", it means the user presses Shift+=
 * This maps the character to the actual key combination
 */
const SHIFTED_CHAR_MAP: Record<string, { key: string; requiresShift: boolean }> = {
  '+': { key: '=', requiresShift: true },
  '_': { key: '-', requiresShift: true },
  '{': { key: '[', requiresShift: true },
  '}': { key: ']', requiresShift: true },
  '|': { key: '\\', requiresShift: true },
  ':': { key: ';', requiresShift: true },
  '"': { key: "'", requiresShift: true },
  '<': { key: ',', requiresShift: true },
  '>': { key: '.', requiresShift: true },
  '?': { key: '/', requiresShift: true },
  '~': { key: '`', requiresShift: true },
  '!': { key: '1', requiresShift: true },
  '@': { key: '2', requiresShift: true },
  '#': { key: '3', requiresShift: true },
  '$': { key: '4', requiresShift: true },
  '%': { key: '5', requiresShift: true },
  '^': { key: '6', requiresShift: true },
  '&': { key: '7', requiresShift: true },
  '*': { key: '8', requiresShift: true },
  '(': { key: '9', requiresShift: true },
  ')': { key: '0', requiresShift: true },
};

/**
 * Reverse mapping: base key + shift -> shifted character
 * Used for display purposes
 */
export const REVERSE_SHIFTED_MAP: Record<string, string> = {
  '=': '+',
  '-': '_',
  '[': '{',
  ']': '}',
  '\\': '|',
  ';': ':',
  "'": '"',
  ',': '<',
  '.': '>',
  '/': '?',
  '`': '~',
  '1': '!',
  '2': '@',
  '3': '#',
  '4': '$',
  '5': '%',
  '6': '^',
  '7': '&',
  '8': '*',
  '9': '(',
  '0': ')',
};

/**
 * Normalizes a keyboard shortcut string from Cubase XML into our internal format.
 * Cubase XML format examples:
 * - "Ctrl+S" (Windows)
 * - "Cmd+S" (macOS)
 * - "Ctrl+Shift+N"
 * - "Alt+F4"
 */
export function normalizeShortcut(shortcutString: string): NormalizedShortcut {
  // Trim the input first
  const trimmed = shortcutString.trim();
  
  // Handle single-character shortcuts (no "+" separator, or just "+" itself)
  // Examples: "+", "-", "A", "1", etc.
  // Special case: if the string is just "+", splitting by "+" would give ["", ""]
  if (!trimmed.includes('+') || trimmed === '+') {
    // Check if this is a shifted character (like "+" which is Shift+=)
    const shiftedChar = SHIFTED_CHAR_MAP[trimmed];
    if (shiftedChar) {
      // This character requires Shift + base key
      const baseKey = KEY_NAME_MAP[shiftedChar.key] || shiftedChar.key;
      // Store the original character for display, but use base key + shift for matching
      return {
        modifiers: ['Shift'],
        key: baseKey,
        macOS: trimmed, // Display the original character
        windows: trimmed, // Display the original character
      };
    }
    
    // Regular single character (no shift required)
    let mainKey = trimmed;
    mainKey = KEY_NAME_MAP[mainKey] || mainKey;
    
    return {
      modifiers: [],
      key: mainKey,
      macOS: mainKey,
      windows: mainKey,
    };
  }
  
  const parts = shortcutString.split('+').map(s => s.trim());
  
  // The last part is always the main key
  let mainKey = parts[parts.length - 1];
  
  // Normalize key name (e.g., "Left Arrow" -> "ArrowLeft")
  mainKey = KEY_NAME_MAP[mainKey] || mainKey;
  
  // Everything before the last part are modifiers
  const modifierStrings = parts.slice(0, -1);
  
  // Convert modifier strings to our ModifierKey type
  const modifiers: ModifierKey[] = modifierStrings
    .map(mod => MODIFIER_MAP[mod] || mod as ModifierKey)
    .filter(Boolean);
  
  // Remove duplicates from original modifiers first
  const uniqueModifiers = Array.from(new Set(modifiers));
  
  // Determine macOS and Windows variants
  // macOS uses Command (Meta) and Option (Alt)
  // Windows uses Control and Alt
  const macOSModifiers = uniqueModifiers.map(mod => {
    if (mod === 'Control') return 'Command';
    if (mod === 'Command' || mod === 'Meta') return 'Command';
    return mod;
  });
  
  const windowsModifiers = uniqueModifiers.map(mod => {
    if (mod === 'Command' || mod === 'Meta') return 'Control';
    return mod;
  });
  
  // Deduplicate after OS conversion (in case Control+Command both became Command on macOS)
  const deduplicate = (mods: ModifierKey[]): ModifierKey[] => {
    return Array.from(new Set(mods));
  };
  
  const macOSModifiersDedup = deduplicate(macOSModifiers);
  const windowsModifiersDedup = deduplicate(windowsModifiers);
  
  // Build display strings for each OS
  const formatShortcut = (mods: ModifierKey[]): string => {
    if (mods.length === 0) return mainKey;
    return [...mods, mainKey].join('+');
  };
  
  return {
    modifiers,
    key: mainKey,
    macOS: formatShortcut(macOSModifiersDedup),
    windows: formatShortcut(windowsModifiersDedup),
  };
}

/**
 * Gets the shortcut string for a specific OS
 */
export function getShortcutForOS(shortcut: NormalizedShortcut, os: 'macOS' | 'Windows'): string {
  return os === 'macOS' ? shortcut.macOS : shortcut.windows;
}

/**
 * Converts a pressed key event into a comparable string format
 * Handles both macOS and Windows modifier keys
 */
export function normalizePressedKeys(
  event: KeyboardEvent,
  os: 'macOS' | 'Windows'
): string {
  const parts: string[] = [];
  
  // Add modifiers in a consistent order
  if (os === 'macOS') {
    if (event.metaKey) parts.push('Command');
    if (event.altKey) parts.push('Option');
  } else {
    if (event.ctrlKey) parts.push('Control');
    if (event.altKey) parts.push('Alt');
  }
  
  if (event.shiftKey) parts.push('Shift');
  
  // Add the main key
  // Use 'key' property which gives us the actual key value
  // Normalize letter keys to uppercase for consistency
  let key = event.key;
  
  // Normalize single-letter keys to uppercase (case-insensitive comparison)
  // Special keys like 'ArrowUp', 'Enter', etc. are kept as-is
  if (key.length === 1 && /[a-zA-Z]/.test(key)) {
    key = key.toUpperCase();
  }
  
  parts.push(key);
  
  return parts.join('+');
}

/**
 * Normalizes a key string for comparison
 * Handles case-insensitive letter keys and special key names
 */
function normalizeKeyForComparison(key: string): string {
  // Normalize special key names first
  const normalizedKey = KEY_NAME_MAP[key] || key;
  
  // For single-letter keys, use uppercase for consistency
  // Special keys (like ArrowUp, Enter, etc.) are case-sensitive
  if (normalizedKey.length === 1 && /[a-zA-Z]/.test(normalizedKey)) {
    return normalizedKey.toUpperCase();
  }
  return normalizedKey;
}

/**
 * Checks if a key is a modifier key
 */
export function isModifierKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return (
    normalizedKey === 'shift' ||
    normalizedKey === 'alt' ||
    normalizedKey === 'option' ||
    normalizedKey === 'control' ||
    normalizedKey === 'ctrl' ||
    normalizedKey === 'meta' ||
    normalizedKey === 'command' ||
    normalizedKey === 'cmd'
  );
}

/**
 * Converts a NormalizedShortcut to a ShortcutState for the given OS
 * Uses the internal modifiers array and key, not the display string
 */
export function shortcutToState(
  shortcut: NormalizedShortcut,
  os: 'macOS' | 'Windows'
): ShortcutState {
  const state: ShortcutState = {
    key: normalizeKeyForComparison(shortcut.key),
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
  };
  
  // Use the internal modifiers array directly (not parsing display string)
  shortcut.modifiers.forEach((mod) => {
    const modLower = mod.toLowerCase();
    if (modLower === 'shift') {
      state.shift = true;
    } else if (modLower === 'alt' || modLower === 'option') {
      state.alt = true;
    } else if (os === 'macOS') {
      // On macOS: Command/Meta maps to meta, Control is rarely used
      if (modLower === 'meta' || modLower === 'command' || modLower === 'cmd') {
        state.meta = true;
      } else if (modLower === 'control' || modLower === 'ctrl') {
        // Control on macOS is uncommon, but we'll map it to ctrl
        state.ctrl = true;
      }
    } else {
      // On Windows: Control maps to ctrl, Command/Meta maps to ctrl
      if (modLower === 'control' || modLower === 'ctrl' || modLower === 'meta' || modLower === 'command' || modLower === 'cmd') {
        state.ctrl = true;
      }
    }
  });
  
  return state;
}

/**
 * Converts a KeyboardEvent to a ShortcutState
 * Normalizes shifted characters to their base keys for comparison
 */
export function eventToState(event: KeyboardEvent, os: 'macOS' | 'Windows'): ShortcutState {
  let key = event.key;
  
  // If shift is pressed, check if the key is a shifted character
  // If so, convert it to the base key for comparison
  // Example: "(" → "9", "+" → "="
  if (event.shiftKey) {
    // Check if this key is a shifted character (like "(", "+", "!", etc.)
    const baseKey = SHIFTED_CHAR_MAP[key]?.key;
    if (baseKey) {
      // This is a shifted character, use the base key for comparison
      key = baseKey;
    }
  }
  
  // Normalize single-letter keys to uppercase
  if (key.length === 1 && /[a-zA-Z]/.test(key)) {
    key = key.toUpperCase();
  }
  
  // Normalize special key names
  key = normalizeKeyForComparison(key);
  
  if (os === 'macOS') {
    return {
      key,
      shift: event.shiftKey,
      alt: event.altKey,
      ctrl: false, // Control key on macOS is not commonly used in shortcuts
      meta: event.metaKey, // Command key
    };
  } else {
    // Windows
    return {
      key,
      shift: event.shiftKey,
      alt: event.altKey,
      ctrl: event.ctrlKey, // Control key
      meta: false, // No meta key on Windows
    };
  }
}

/**
 * Compares two ShortcutState objects
 */
export function compareShortcutStates(pressed: ShortcutState, expected: ShortcutState): boolean {
  return (
    pressed.key === expected.key &&
    pressed.shift === expected.shift &&
    pressed.alt === expected.alt &&
    pressed.ctrl === expected.ctrl &&
    pressed.meta === expected.meta
  );
}

/**
 * Compares a pressed key combination against an expected shortcut
 * @deprecated Use compareShortcutStates instead for better modifier handling
 */
export function compareShortcut(
  pressed: string,
  expected: NormalizedShortcut,
  os: 'macOS' | 'Windows'
): boolean {
  const expectedString = getShortcutForOS(expected, os);
  
  // Normalize both strings for comparison
  // Sort modifiers and normalize keys
  const normalizeForComparison = (str: string): string => {
    const parts = str.split('+');
    const modifiers = parts.slice(0, -1).sort();
    const key = normalizeKeyForComparison(parts[parts.length - 1]);
    return [...modifiers.map(m => m.toLowerCase()), key].join('+');
  };
  
  return normalizeForComparison(pressed) === normalizeForComparison(expectedString);
}

