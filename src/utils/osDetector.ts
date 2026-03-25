import { Command, OperatingSystem } from '../types';

/**
 * Detects the operating system from shortcut format
 * macOS shortcuts typically use "Cmd"/"Command" or "Option"
 * Windows shortcuts typically use "Ctrl"/"Control" or "Alt"
 * 
 * Strategy: Check both variants and look for OS-specific indicators
 * - macOS: "Option" is macOS-specific (vs "Alt" on Windows)
 * - Windows: "Control" in Windows variant suggests Windows origin
 * - If macOS variant has "Command" and Windows variant has "Control", 
 *   check which one looks more "native" (e.g., if original was "Cmd+S", 
 *   macOS variant will be "Command+S" and Windows will be "Control+S")
 */
export function detectOSFromShortcuts(commands: Command[]): OperatingSystem {
  if (commands.length === 0) {
    return 'macOS'; // Default
  }

  let macIndicators = 0;
  let windowsIndicators = 0;

  // Sample first 20 commands to detect OS (more reliable with larger sample)
  const sampleSize = Math.min(20, commands.length);
  for (let i = 0; i < sampleSize; i++) {
    const cmd = commands[i];
    const macShortcut = cmd.shortcut.macOS.toLowerCase();
    const winShortcut = cmd.shortcut.windows.toLowerCase();
    
    // macOS-specific indicators:
    // - "Option" is macOS-specific (Windows uses "Alt")
    // - If macOS variant has "Command" and Windows has "Control", 
    //   and the shortcut is simple (not converted), it's likely macOS
    if (macShortcut.includes('option')) {
      macIndicators++;
    }
    
    // Windows-specific indicators:
    // - "Alt" in Windows variant (macOS would be "Option")
    // - If Windows variant has "Control" and macOS has "Command",
    //   and the pattern suggests Windows origin
    if (winShortcut.includes('alt') && !macShortcut.includes('option')) {
      windowsIndicators++;
    }
    
    // Check for Command vs Control pattern
    // If macOS has "Command" and Windows has "Control", 
    // we need to look at other clues
    if (macShortcut.includes('command') && winShortcut.includes('control')) {
      // If there's no "Option" in macOS, it might be Windows-origin
      // But if there's "Option", it's definitely macOS
      if (macShortcut.includes('option')) {
        macIndicators++;
      } else {
        // Ambiguous - check if there are other modifiers
        // Windows shortcuts more commonly use Ctrl+Alt combinations
        if (winShortcut.includes('alt')) {
          windowsIndicators++;
        } else {
          // Default to macOS for Command-based shortcuts
          macIndicators++;
        }
      }
    }
  }

  // Decision: If we have clear macOS indicators (Option), it's macOS
  // Otherwise, if we have Windows indicators, it's Windows
  // Default to macOS if ambiguous
  if (macIndicators > windowsIndicators) {
    return 'macOS';
  } else if (windowsIndicators > 0) {
    return 'Windows';
  }
  
  // Default to macOS (most DAW users are on macOS)
  return 'macOS';
}

/**
 * Gets the shortcut string for the detected OS
 */
export function getShortcutForDetectedOS(shortcut: { macOS: string; windows: string }, os: OperatingSystem): string {
  return os === 'macOS' ? shortcut.macOS : shortcut.windows;
}

