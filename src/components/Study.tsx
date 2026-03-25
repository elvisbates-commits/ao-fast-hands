import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Command, OperatingSystem } from '../types';
import { getShortcutForOS, isModifierKey, eventToState, shortcutToState, compareShortcutStates } from '../utils/shortcutNormalizer';
import { getCommandDescription } from '../utils/commandDescriptions';
import { useTheme } from '../contexts/ThemeContext';

interface StudyProps {
  commands: Command[];
  os: OperatingSystem;
}

/**
 * Study component that allows browsing commands by category
 */
export function Study({ commands, os }: StudyProps) {
  const { theme } = useTheme();
  const [highlightedCommandIds, setHighlightedCommandIds] = useState<Set<string>>(new Set());
  
  // Track modifier state separately
  const modifierStateRef = useRef({
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
  });

  // Group commands by category
  const commandsByCategory = useMemo(() => {
    const grouped: Record<string, Command[]> = {};
    commands.forEach((cmd) => {
      if (!grouped[cmd.category]) {
        grouped[cmd.category] = [];
      }
      grouped[cmd.category].push(cmd);
    });
    return grouped;
  }, [commands]);

  const categories = useMemo(() => Object.keys(commandsByCategory).sort(), [commandsByCategory]);
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');

  const selectedCommands = selectedCategory ? commandsByCategory[selectedCategory] || [] : [];

  // Create unique IDs for commands (name + index)
  const getCommandId = (cmd: Command, index: number) => `${cmd.name}-${cmd.category}-${index}`;

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

      // Find matching commands in the selected category
      const matchingIds = new Set<string>();
      selectedCommands.forEach((cmd, index) => {
        const expectedState = shortcutToState(cmd.shortcut, os);
        if (compareShortcutStates(pressedState, expectedState)) {
          matchingIds.add(getCommandId(cmd, index));
        }
      });

      setHighlightedCommandIds(matchingIds);

      // Clear highlight after a delay
      setTimeout(() => {
        setHighlightedCommandIds(new Set());
      }, 2000);
    },
    [selectedCommands, os]
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

  // Clear highlights when category changes
  useEffect(() => {
    setHighlightedCommandIds(new Set());
  }, [selectedCategory]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem', color: theme.text }}>Study Mode</h2>
        <p style={{ color: theme.textSecondary, marginBottom: '1.5rem' }}>
          Browse commands by category to learn shortcuts and their descriptions. Press any shortcut to highlight matching commands.
        </p>

        {/* Category Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: theme.text }}>
            Select Category:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              border: `2px solid ${theme.border}`,
              borderRadius: '6px',
              backgroundColor: theme.inputBackground,
              color: theme.text,
              minWidth: '300px',
              cursor: 'pointer',
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({commandsByCategory[cat].length} commands)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Commands List */}
      {selectedCategory && (
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: theme.text }}>
            {selectedCategory} ({selectedCommands.length} commands)
          </h3>
          
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            }}
          >
            {selectedCommands.map((cmd, index) => {
              const description = getCommandDescription(cmd.name);
              const shortcut = getShortcutForOS(cmd.shortcut, os);
              const commandId = getCommandId(cmd, index);
              const isHighlighted = highlightedCommandIds.has(commandId);

              return (
                <div
                  key={commandId}
                  style={{
                    padding: '1.25rem',
                    border: `2px solid ${isHighlighted ? theme.success : theme.border}`,
                    borderRadius: '8px',
                    backgroundColor: isHighlighted ? theme.successBackground : theme.cardBackground,
                    boxShadow: isHighlighted
                      ? `0 4px 12px ${theme.success}40`
                      : '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s',
                    transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isHighlighted) {
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                      e.currentTarget.style.backgroundColor = theme.cardHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isHighlighted) {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      e.currentTarget.style.backgroundColor = theme.cardBackground;
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      color: theme.text,
                    }}
                  >
                    {cmd.name}
                  </div>

                  {description && (
                    <div
                      style={{
                        fontSize: '0.9rem',
                        color: theme.textSecondary,
                        fontStyle: 'italic',
                        marginBottom: '0.75rem',
                        lineHeight: '1.4',
                      }}
                    >
                      {description}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '0.95rem',
                      color: theme.textSecondary,
                      padding: '0.5rem',
                      backgroundColor: theme.surfaceSecondary,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontWeight: '500',
                    }}
                  >
                    <span style={{ color: theme.textTertiary, fontSize: '0.85rem' }}>Shortcut: </span>
                    <span style={{ color: theme.text }}>{shortcut}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedCommands.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSecondary }}>
          No commands found in this category
        </div>
      )}
    </div>
  );
}

