import { useEffect, useState, useCallback, useRef } from 'react';
import { Command, OperatingSystem, QuizFeedback } from '../types';
import {
  getShortcutForOS,
  isModifierKey,
  eventToState,
  shortcutToState,
  compareShortcutStates,
} from '../utils/shortcutNormalizer';
import { getCommandDescription } from '../utils/commandDescriptions';
import { useTheme } from '../contexts/ThemeContext';

interface QuizProps {
  commands: Command[];
  os: OperatingSystem;
}

/**
 * Quiz component that displays commands and listens for keyboard input
 * Properly handles modifier keys by tracking state separately and only evaluating on terminal key presses
 */
export function Quiz({ commands, os }: QuizProps) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<QuizFeedback>('none');
  const [isListening, setIsListening] = useState(true);
  const [isModifiersActive, setIsModifiersActive] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isRandomized, setIsRandomized] = useState(false);

  // Track modifier state separately
  const modifierStateRef = useRef({
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
  });

  const currentCommand = commands[currentIndex];
  const expectedShortcut = currentCommand?.shortcut;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if not listening or if no command is loaded
      if (!isListening || !expectedShortcut) return;

      // Ignore key repeats
      if (event.repeat) return;

      const key = event.key;
      const isModifier = isModifierKey(key);

      // Update modifier state from event properties (most reliable)
      // This handles both explicit modifier key presses and modifier state
      modifierStateRef.current.shift = event.shiftKey;
      modifierStateRef.current.alt = event.altKey;
      if (os === 'macOS') {
        modifierStateRef.current.meta = event.metaKey;
        modifierStateRef.current.ctrl = event.ctrlKey;
      } else {
        modifierStateRef.current.ctrl = event.ctrlKey;
        modifierStateRef.current.meta = false;
      }

      // If this is a modifier key press, update UI but don't evaluate
      if (isModifier) {
        // Update UI to show we're listening for the terminal key
        const hasAnyModifier =
          modifierStateRef.current.shift ||
          modifierStateRef.current.alt ||
          modifierStateRef.current.ctrl ||
          modifierStateRef.current.meta;
        setIsModifiersActive(hasAnyModifier);

        // Never evaluate on modifier-only presses
        return;
      }

      // Terminal key pressed - now we can evaluate
      // Build the complete shortcut state from event
      const pressedState = eventToState(event, os);

      // Get expected state
      const expectedState = shortcutToState(expectedShortcut, os);

      // Compare
      const isCorrect = compareShortcutStates(pressedState, expectedState);

      // Prevent default browser shortcuts (but allow refresh)
      if (event.metaKey || event.ctrlKey) {
        if (key === 'r' || key === 'R') {
          // Allow refresh
          return;
        }
        event.preventDefault();
      }

      if (isCorrect) {
        setFeedback('correct');
        setIsListening(false);
        setIsModifiersActive(false);
        setShowHint(false); // Reset hint when correct

        // Reset modifier state
        modifierStateRef.current = {
          shift: false,
          alt: false,
          ctrl: false,
          meta: false,
        };

        // Move to next command after a brief delay
        setTimeout(() => {
          if (isRandomized) {
            // Pick a random index, avoiding the current one if there are multiple commands
            let nextIndex;
            if (commands.length > 1) {
              do {
                nextIndex = Math.floor(Math.random() * commands.length);
              } while (nextIndex === currentIndex);
            } else {
              nextIndex = 0;
            }
            setCurrentIndex(nextIndex);
          } else {
            // Sequential order
            setCurrentIndex((prev) => (prev + 1) % commands.length);
          }
          setFeedback('none');
          setIsListening(true);
          setShowHint(false); // Reset hint for next command
        }, 1000);
      } else {
        // Only show incorrect if we have modifiers or a terminal key was pressed
        // (This handles the case where user presses wrong terminal key with correct modifiers)
        setFeedback('incorrect');
        setTimeout(() => {
          setFeedback('none');
        }, 500);
      }
    },
    [isListening, expectedShortcut, os, commands.length, isRandomized, currentIndex]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!isListening) return;

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

      // Update UI state
      const hasAnyModifier =
        modifierStateRef.current.shift ||
        modifierStateRef.current.alt ||
        modifierStateRef.current.ctrl ||
        modifierStateRef.current.meta;
      setIsModifiersActive(hasAnyModifier);
    },
    [isListening, os]
  );

  // Reset modifier state and hint when command changes
  useEffect(() => {
    modifierStateRef.current = {
      shift: false,
      alt: false,
      ctrl: false,
      meta: false,
    };
    setIsModifiersActive(false);
    setShowHint(false);
  }, [currentIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  if (!currentCommand) {
    return <div style={{ color: theme.text }}>No commands available</div>;
  }

  const shortcutDisplay = getShortcutForOS(expectedShortcut, os);
  const feedbackColor =
    feedback === 'correct'
      ? theme.success
      : feedback === 'incorrect'
      ? theme.error
      : theme.surfaceSecondary;

  return (
    <div
      style={{
        padding: '2rem',
        border: `2px solid ${theme.border}`,
        borderRadius: '8px',
        backgroundColor: theme.surface,
        maxWidth: '600px',
        margin: '0 auto',
        transition: 'background-color 0.3s, border-color 0.3s',
      }}
    >
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: theme.textSecondary }}>
          Command {currentIndex + 1} of {commands.length}
        </div>
        <button
          onClick={() => setIsRandomized(!isRandomized)}
          style={{
            padding: '0.5rem 1rem',
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: isRandomized ? theme.primary : theme.surface,
            color: isRandomized ? theme.surface : theme.text,
            fontSize: '0.9rem',
            fontWeight: isRandomized ? 'bold' : 'normal',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isRandomized) {
              e.currentTarget.style.backgroundColor = theme.surfaceSecondary;
            }
          }}
          onMouseLeave={(e) => {
            if (!isRandomized) {
              e.currentTarget.style.backgroundColor = theme.surface;
            }
          }}
        >
          {isRandomized ? '🔀 Random' : '🔀 Sequential'}
        </button>
      </div>

      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          minHeight: '2rem',
          color: theme.text,
        }}
      >
        {currentCommand.name}
      </div>

      {(() => {
        const description = getCommandDescription(currentCommand.name);
        return description ? (
          <div
            style={{
              marginBottom: '1rem',
              fontSize: '0.95rem',
              color: theme.textSecondary,
              fontStyle: 'italic',
              lineHeight: '1.4',
            }}
          >
            {description}
          </div>
        ) : null;
      })()}

      <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: theme.textSecondary }}>
        Category: {currentCommand.category}
      </div>

      {/* Hint Button */}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => setShowHint(!showHint)}
          style={{
            padding: '0.5rem 1rem',
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: showHint ? theme.surfaceSecondary : theme.surface,
            color: theme.text,
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!showHint) {
              e.currentTarget.style.backgroundColor = theme.surfaceSecondary;
            }
          }}
          onMouseLeave={(e) => {
            if (!showHint) {
              e.currentTarget.style.backgroundColor = theme.surface;
            }
          }}
        >
          {showHint ? 'Hide Hint' : 'Show Hint'}
        </button>
      </div>

      {/* Hint Display */}
      {showHint && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: theme.infoBackground,
            borderRadius: '4px',
            border: `1px solid ${theme.info}`,
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: theme.info, marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Hint:
          </div>
          <div
            style={{
              fontSize: '1.2rem',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: theme.text,
            }}
          >
            {shortcutDisplay}
          </div>
        </div>
      )}

      <div
        style={{
          padding: '1rem',
          backgroundColor: feedbackColor,
          borderRadius: '4px',
          transition: 'background-color 0.2s',
          minHeight: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {feedback === 'correct' && (
          <span style={{ color: theme.surface, fontSize: '1.2rem', fontWeight: 'bold' }}>✓ Correct!</span>
        )}
        {feedback === 'incorrect' && (
          <span style={{ color: theme.surface, fontSize: '1.2rem', fontWeight: 'bold' }}>✗ Incorrect</span>
        )}
        {feedback === 'none' && (
          <span style={{ color: theme.textSecondary, fontSize: '1rem' }}>
            {isModifiersActive ? (
              <>Listening for shortcut...</>
            ) : (
              <>Press the keyboard shortcut for this command</>
            )}
          </span>
        )}
      </div>

      {!isListening && (
        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: theme.textSecondary }}>
          Moving to next command...
        </div>
      )}
    </div>
  );
}

