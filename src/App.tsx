import { useState, useMemo, useRef, useEffect } from 'react';
import { Command } from './types';
import { FileUpload } from './components/FileUpload';
import { Quiz } from './components/Quiz';
import { Study } from './components/Study';
import { Explore } from './components/Explore';
import { Reference } from './components/Reference';
import { AuthorMode } from './components/AuthorMode';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { detectOSFromShortcuts } from './utils/osDetector';
import { filterAssignedCommands } from './utils/commandFilter';
import { useSearchParams } from './hooks/useSearchParams';
import { saveCommands, loadCommands, clearCommands } from './utils/commandStorage';

type TabMode = 'quiz' | 'study' | 'explore' | 'reference' | 'author';

function AppContent() {
  // Load commands from localStorage on mount
  const [commands, setCommands] = useState<Command[]>(() => {
    const saved = loadCommands();
    return saved || [];
  });
  const [activeTab, setActiveTab] = useState<TabMode>('quiz');
  const { theme, isDark, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  const themeClickRef = useRef({ count: 0, lastClickTime: 0 });
  const hasAutoSwitchedRef = useRef(false);

  // Check for author mode (dev-only, via query param)
  // This now reacts to URL changes in real-time
  const isAuthorMode = useMemo(() => {
    const isDev = import.meta.env.DEV;
    const hasAuthorFlag = searchParams.has('__author');
    const result = isDev && hasAuthorFlag;
    // Debug logging in dev mode
    if (isDev) {
      console.log('[Author Mode]', {
        isDev,
        hasAuthorFlag,
        searchString: window.location.search,
        result,
      });
    }
    return result;
  }, [searchParams]);

  // Wrapper for setCommands that also handles persistence
  const handleCommandsChange = (newCommands: Command[]) => {
    setCommands(newCommands);
    if (newCommands.length === 0) {
      clearCommands();
    }
  };

  // Save commands to localStorage whenever they change
  useEffect(() => {
    if (commands.length > 0) {
      saveCommands(commands);
    }
  }, [commands]);

  // Auto-switch to Author Mode tab when ?__author is detected and commands are loaded
  // Only do this once on initial load, not when user manually switches tabs
  useEffect(() => {
    if (isAuthorMode && commands.length > 0 && activeTab !== 'author' && !hasAutoSwitchedRef.current) {
      setActiveTab('author');
      hasAutoSwitchedRef.current = true;
    }
  }, [isAuthorMode, commands.length, activeTab]);

  // Reset auto-switch flag when Author Mode is disabled or commands are cleared
  useEffect(() => {
    if (!isAuthorMode || commands.length === 0) {
      hasAutoSwitchedRef.current = false;
    }
  }, [isAuthorMode, commands.length]);

  // Auto-detect OS from shortcuts
  const detectedOS = useMemo(() => detectOSFromShortcuts(commands), [commands]);

  // Filter to only assigned commands for Quiz, Study, and Explore
  // Reference shows all commands (assigned and unassigned)
  const assignedCommands = useMemo(() => filterAssignedCommands(commands), [commands]);

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: theme.background,
        color: theme.text,
        minHeight: '100vh',
        transition: 'background-color 0.3s, color 0.3s',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header with Dark Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ flex: 1 }}>
            {(() => {
              // Check if ?__author is in the URL but not detected yet
              const currentSearch = new URLSearchParams(window.location.search);
              const hasAuthorInURL = currentSearch.has('__author');
              const isDev = import.meta.env.DEV;
              
              if (isDev && hasAuthorInURL) {
                return (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#ff6b6b',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    🔧 Author Mode
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <h1 style={{ marginBottom: 0, textAlign: 'center', flex: 1, color: theme.text }}>Fast Hands</h1>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                const now = Date.now();
                const timeSinceLastClick = now - themeClickRef.current.lastClickTime;
                
                // Check current URL state directly (not just cached state from hook)
                const currentSearch = window.location.search;
                const currentSearchParams = new URLSearchParams(currentSearch);
                const hasAuthorFlag = currentSearchParams.has('__author');
                const isDev = import.meta.env.DEV;
                const authorModeAvailable = isDev && hasAuthorFlag && commands.length > 0;
                
                // Debug log
                if (isDev) {
                  console.log('[Theme Button Click]', {
                    fullURL: window.location.href,
                    searchString: currentSearch,
                    searchStringLength: currentSearch.length,
                    searchParamsKeys: Array.from(currentSearchParams.keys()),
                    hasAuthorFlag,
                    isDev,
                    commandsLoaded: commands.length > 0,
                    authorModeAvailable,
                    clickCount: themeClickRef.current.count,
                    timeSinceLastClick,
                  });
                }
                
                // Toggle theme on every click
                toggleTheme();
                
                // If this is the second click within 1 second and Author Mode is available
                if (authorModeAvailable) {
                  if (themeClickRef.current.count === 1 && timeSinceLastClick < 1000) {
                    // Second click within 1 second - switch to Author Mode
                    console.log('[Theme Button] Switching to Author Mode');
                    setActiveTab('author');
                    themeClickRef.current.count = 0;
                    themeClickRef.current.lastClickTime = 0;
                  } else {
                    // First click or too much time passed - start counting
                    themeClickRef.current.count = 1;
                    themeClickRef.current.lastClickTime = now;
                  }
                } else {
                  // Reset if Author Mode not available
                  themeClickRef.current.count = 0;
                  themeClickRef.current.lastClickTime = 0;
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: theme.surface,
                color: theme.text,
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.surface;
              }}
            >
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
        <p style={{ textAlign: 'center', color: theme.textSecondary, marginBottom: '2rem' }}>
          Train your muscle memory for DAW keyboard shortcuts
        </p>

        {commands.length === 0 ? (
          <>
            <FileUpload onFileParsed={handleCommandsChange} />
            {/* Show Author Mode tab even when no commands are loaded (if ?__author is present) */}
            {isAuthorMode && (
              <div style={{ marginTop: '2rem' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    borderBottom: `2px solid ${theme.border}`,
                  }}
                >
                  <button
                    onClick={() => setActiveTab('author')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      borderBottom: activeTab === 'author' ? `3px solid ${theme.primary}` : '3px solid transparent',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: activeTab === 'author' ? 'bold' : 'normal',
                      color: activeTab === 'author' ? theme.primary : theme.tabInactive,
                      transition: 'all 0.2s',
                    }}
                  >
                    🔧 Author Mode
                  </button>
                </div>
                {activeTab === 'author' && <AuthorMode commands={commands} />}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '2rem',
                borderBottom: `2px solid ${theme.border}`,
              }}
            >
              <button
                onClick={() => setActiveTab('quiz')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === 'quiz' ? `3px solid ${theme.primary}` : '3px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: activeTab === 'quiz' ? 'bold' : 'normal',
                  color: activeTab === 'quiz' ? theme.primary : theme.tabInactive,
                  transition: 'all 0.2s',
                }}
              >
                Quiz Yourself
              </button>
              <button
                onClick={() => setActiveTab('study')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === 'study' ? `3px solid ${theme.primary}` : '3px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: activeTab === 'study' ? 'bold' : 'normal',
                  color: activeTab === 'study' ? theme.primary : theme.tabInactive,
                  transition: 'all 0.2s',
                }}
              >
                Study
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === 'explore' ? `3px solid ${theme.primary}` : '3px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: activeTab === 'explore' ? 'bold' : 'normal',
                  color: activeTab === 'explore' ? theme.primary : theme.tabInactive,
                  transition: 'all 0.2s',
                }}
              >
                Explore
              </button>
              <button
                onClick={() => setActiveTab('reference')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === 'reference' ? `3px solid ${theme.primary}` : '3px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: activeTab === 'reference' ? 'bold' : 'normal',
                  color: activeTab === 'reference' ? theme.primary : theme.tabInactive,
                  transition: 'all 0.2s',
                }}
              >
                Reference
              </button>
              {isAuthorMode && (
                <button
                  onClick={() => setActiveTab('author')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderBottom: activeTab === 'author' ? `3px solid ${theme.primary}` : '3px solid transparent',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: activeTab === 'author' ? 'bold' : 'normal',
                    color: activeTab === 'author' ? theme.primary : theme.tabInactive,
                    transition: 'all 0.2s',
                  }}
                >
                  🔧 Author Mode
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ marginRight: 'auto', color: theme.textSecondary, fontSize: '0.9rem' }}>
                Detected OS: <strong>{detectedOS}</strong>
              </div>
              <button
                onClick={() => handleCommandsChange([])}
                style={{
                  padding: '0.5rem 1rem',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: theme.surface,
                  color: theme.text,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surfaceSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.surface;
                }}
              >
                Load Different File
              </button>
            </div>

            {activeTab === 'quiz' ? (
              <Quiz commands={assignedCommands} os={detectedOS} />
            ) : activeTab === 'study' ? (
              <Study commands={assignedCommands} os={detectedOS} />
            ) : activeTab === 'explore' ? (
              <Explore commands={assignedCommands} os={detectedOS} />
            ) : activeTab === 'author' ? (
              <AuthorMode commands={commands} />
            ) : (
              <Reference commands={commands} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

