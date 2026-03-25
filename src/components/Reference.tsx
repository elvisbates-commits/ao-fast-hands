import { useState, useMemo, useEffect } from 'react';
import { Command } from '../types';
import { detectOSFromShortcuts, getShortcutForDetectedOS } from '../utils/osDetector';
import { getCommandDescription } from '../utils/commandDescriptions';
import { useTheme } from '../contexts/ThemeContext';

interface ReferenceProps {
  commands: Command[];
}

export function Reference({ commands }: ReferenceProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Detect OS from shortcuts
  const detectedOS = useMemo(() => detectOSFromShortcuts(commands), [commands]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(commands.map(cmd => cmd.category))).sort();
    return cats;
  }, [commands]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    let filtered = commands;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(cmd => cmd.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cmd =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query) ||
        getCommandDescription(cmd.name).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [commands, selectedCategory, searchQuery]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Expand all / collapse all
  const expandAll = () => {
    setExpandedCategories(new Set(categories));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // If a specific category is selected, expand it by default
  useEffect(() => {
    if (selectedCategory !== 'all') {
      setExpandedCategories(prev => {
        if (!prev.has(selectedCategory)) {
          const newSet = new Set(prev);
          newSet.add(selectedCategory);
          return newSet;
        }
        return prev;
      });
    }
  }, [selectedCategory]);

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            style={{
              color: theme.textSecondary,
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Category:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.5rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: theme.surface,
              color: theme.text,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <label
            style={{
              color: theme.textSecondary,
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Search:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by command name..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: theme.surface,
              color: theme.text,
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* Expand/Collapse Controls */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={expandAll}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: theme.surface,
              color: theme.text,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: theme.surface,
              color: theme.text,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '1rem', color: theme.textSecondary, fontSize: '0.9rem' }}>
        Showing {filteredCommands.length} of {commands.length} commands
        {detectedOS && ` (${detectedOS} shortcuts)`}
      </div>

      {/* Commands Table */}
      <div
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: theme.surface,
        }}
      >
        {Object.keys(groupedCommands).length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: theme.textSecondary }}>
            No commands found matching your filters.
          </div>
        ) : (
          Object.entries(groupedCommands)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, categoryCommands]) => {
              const isExpanded = expandedCategories.has(category);
              return (
                <div key={category}>
                  {/* Category Header */}
                  <div
                    onClick={() => toggleCategory(category)}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: theme.surfaceSecondary,
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: '600',
                      color: theme.text,
                      userSelect: 'none',
                    }}
                  >
                    <span>
                      {category} ({categoryCommands.length})
                    </span>
                    <span style={{ fontSize: '0.8rem', color: theme.textSecondary }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>

                  {/* Category Commands Table */}
                  {isExpanded && (
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '0.9rem',
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              backgroundColor: theme.background,
                              borderBottom: `2px solid ${theme.border}`,
                            }}
                          >
                            <th
                              style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: theme.text,
                                borderRight: `1px solid ${theme.border}`,
                              }}
                            >
                              Command Name
                            </th>
                            <th
                              style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: theme.text,
                                borderRight: `1px solid ${theme.border}`,
                              }}
                            >
                              Description
                            </th>
                            <th
                              style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: theme.text,
                              }}
                            >
                              Shortcut
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryCommands
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((cmd, idx) => (
                              <tr
                                key={`${cmd.name}-${idx}`}
                                style={{
                                  borderBottom: `1px solid ${theme.border}`,
                                  backgroundColor: idx % 2 === 0 ? theme.surface : theme.background,
                                }}
                              >
                                <td
                                  style={{
                                    padding: '0.75rem 1rem',
                                    color: theme.text,
                                    borderRight: `1px solid ${theme.border}`,
                                    fontWeight: '500',
                                  }}
                                >
                                  {cmd.name}
                                </td>
                                <td
                                  style={{
                                    padding: '0.75rem 1rem',
                                    color: theme.textSecondary,
                                    borderRight: `1px solid ${theme.border}`,
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {getCommandDescription(cmd.name)}
                                </td>
                                <td
                                  style={{
                                    padding: '0.75rem 1rem',
                                    color: theme.text,
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {getShortcutForDetectedOS(cmd.shortcut, detectedOS)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

