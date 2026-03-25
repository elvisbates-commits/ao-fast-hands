import { useState, useCallback, useEffect, useRef } from 'react';
import { Command, OperatingSystem } from '../types';
import {
  isModifierKey,
  eventToState,
  shortcutToState,
  compareShortcutStates,
  getShortcutForOS,
  REVERSE_SHIFTED_MAP,
} from '../utils/shortcutNormalizer';
import { getCommandDescription } from '../utils/commandDescriptions';
import { useTheme } from '../contexts/ThemeContext';

interface ExploreProps {
  commands: Command[];
  os: OperatingSystem;
}

/**
 * Explore component that shows which command matches a pressed key combination
 */
export function Explore({ commands, os }: ExploreProps) {
  const { theme } = useTheme();
  const [matchedCommands, setMatchedCommands] = useState<Command[]>([]);
  const [lastPressedShortcut, setLastPressedShortcut] = useState<string>('');

  // Track modifier state separately
  const modifierStateRef = useRef({
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {

      // Ignore key repeats
      if (event.repeat) return;

      // Prevent default browser shortcuts (but allow refresh)
      if (event.metaKey || event.ctrlKey) {
        if (event.key === 'r' || event.key === 'R') {
          return; // Allow refresh
        }
        event.preventDefault();
      }

      const key = event.key;
      const isModifier = isModifierKey(key);

      // Update modifier state from event properties
      modifierStateRef.current.shift = event.shiftKey;
      modifierStateRef.current.alt = event.altKey;
      if (os === 'macOS') {
        modifierStateRef.current.meta = event.metaKey;
        modifierStateRef.current.ctrl = event.ctrlKey;
      } else {
        modifierStateRef.current.ctrl = event.ctrlKey;
        modifierStateRef.current.meta = false;
      }

      // If this is a modifier key press, don't search yet
      if (isModifier) {
        return;
      }

      // Terminal key pressed - now we can search
      const pressedState = eventToState(event, os);

      // Build the shortcut string for display
      // When Shift is pressed with a character key, show the shifted character
      // Examples: Shift+9 → "(", Shift+= → "+", Shift+1 → "!"
      let displayKey = pressedState.key;
      let showShiftInDisplay = pressedState.shift;
      
      // Check if this key (when shifted) produces a shifted character
      if (pressedState.shift) {
        const shiftedChar = REVERSE_SHIFTED_MAP[pressedState.key];
        if (shiftedChar) {
          // This is a base key that produces a shifted character
          displayKey = shiftedChar;
          showShiftInDisplay = false; // Don't show "Shift" - the character itself implies it
        } else {
          // Check if the key itself is already a shifted character
          // (some browsers send the shifted char directly, e.g., "(" instead of "9")
          const isShiftedChar = Object.values(REVERSE_SHIFTED_MAP).includes(pressedState.key);
          if (isShiftedChar) {
            // Key is already the shifted character, don't show "Shift"
            showShiftInDisplay = false;
          }
        }
      }
      
      const shortcutParts: string[] = [];
      if (showShiftInDisplay) shortcutParts.push('Shift');
      if (pressedState.alt) shortcutParts.push(os === 'macOS' ? 'Option' : 'Alt');
      if (pressedState.ctrl) shortcutParts.push('Control');
      if (pressedState.meta) shortcutParts.push(os === 'macOS' ? 'Command' : 'Control');
      shortcutParts.push(displayKey);
      const shortcutString = shortcutParts.join('+');
      setLastPressedShortcut(shortcutString);

      // Find matching commands
      const matches: Command[] = [];
      commands.forEach((cmd) => {
        const expectedState = shortcutToState(cmd.shortcut, os);
        if (compareShortcutStates(pressedState, expectedState)) {
          matches.push(cmd);
        }
      });

      setMatchedCommands(matches);
    },
    [commands, os]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {

      // Update modifier state from event properties
      modifierStateRef.current.shift = event.shiftKey;
      modifierStateRef.current.alt = event.altKey;
      if (os === 'macOS') {
        modifierStateRef.current.meta = event.metaKey;
        modifierStateRef.current.ctrl = event.ctrlKey;
      } else {
        modifierStateRef.current.ctrl = event.ctrlKey;
        modifierStateRef.current.meta = false;
      }
    },
    [os]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Reset when OS changes
  useEffect(() => {
    setMatchedCommands([]);
    setLastPressedShortcut('');
    modifierStateRef.current = {
      shift: false,
      alt: false,
      ctrl: false,
      meta: false,
    };
  }, [os]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem', color: theme.text }}>Explore Mode</h2>
        <p style={{ color: theme.textSecondary, marginBottom: '1.5rem' }}>
          Press any key combination to see which command it triggers
        </p>

        {/* Instructions */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: theme.infoBackground,
            borderRadius: '8px',
            border: `1px solid ${theme.info}`,
            marginBottom: '2rem',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: theme.info }}>
            How to use:
          </div>
          <div style={{ color: theme.textSecondary, fontSize: '0.95rem', lineHeight: '1.6' }}>
            Simply press any keyboard shortcut combination. The app will detect what you pressed
            and show you the matching command(s), if any. Modifier keys alone won't trigger a search
            - you need to press a terminal key (like a letter, number, or arrow key) along with any
            modifiers.
          </div>
        </div>

        {/* Last Pressed Shortcut Display */}
        {lastPressedShortcut && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: theme.surfaceSecondary,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              marginBottom: '2rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: theme.textSecondary, marginBottom: '0.5rem' }}>
              Last pressed:
            </div>
            <div
              style={{
                fontSize: '1.3rem',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: theme.text,
              }}
            >
              {lastPressedShortcut}
            </div>
          </div>
        )}

        {/* Matched Commands */}
        {matchedCommands.length > 0 ? (
          <div>
            <div style={{ marginBottom: '1rem', fontSize: '1rem', color: theme.textSecondary }}>
              Found {matchedCommands.length} matching command{matchedCommands.length !== 1 ? 's' : ''}:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {matchedCommands.map((cmd, index) => {
                const description = getCommandDescription(cmd.name);
                const shortcut = getShortcutForOS(cmd.shortcut, os);

                return (
                  <div
                    key={`${cmd.name}-${index}`}
                    style={{
                      padding: '1.5rem',
                      border: `2px solid ${theme.success}`,
                      borderRadius: '8px',
                      backgroundColor: theme.successBackground,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        marginBottom: '0.75rem',
                        color: theme.success,
                      }}
                    >
                      {cmd.name}
                    </div>

                    {description && (
                      <div
                        style={{
                          fontSize: '1rem',
                          color: theme.textSecondary,
                          fontStyle: 'italic',
                          marginBottom: '0.75rem',
                          lineHeight: '1.5',
                        }}
                      >
                        {description}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: theme.textSecondary,
                          padding: '0.5rem 1rem',
                          backgroundColor: theme.surface,
                          borderRadius: '4px',
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        <span style={{ fontWeight: 'bold' }}>Category:</span> {cmd.category}
                      </div>
                      <div
                        style={{
                          fontSize: '0.95rem',
                          color: theme.text,
                          padding: '0.5rem 1rem',
                          backgroundColor: theme.surface,
                          borderRadius: '4px',
                          border: `1px solid ${theme.border}`,
                          fontFamily: 'monospace',
                          fontWeight: '500',
                        }}
                      >
                        <span style={{ fontWeight: 'bold', fontFamily: 'system-ui' }}>Shortcut:</span>{' '}
                        {shortcut}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : lastPressedShortcut ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: theme.warningBackground,
              borderRadius: '8px',
              border: `1px solid ${theme.warning}`,
              color: theme.warning,
            }}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              No matching command found
            </div>
            <div style={{ fontSize: '0.95rem' }}>
              The shortcut <strong>{lastPressedShortcut}</strong> doesn't match any command in your
              key commands file.
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: theme.surfaceSecondary,
              borderRadius: '8px',
              border: `2px dashed ${theme.border}`,
              color: theme.textSecondary,
            }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: theme.text }}>Ready to explore</div>
            <div style={{ fontSize: '0.95rem' }}>
              Press any keyboard shortcut to see what command it triggers
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

