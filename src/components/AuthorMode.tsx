import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type ColumnSizingState,
  type CellContext,
  type Row,
  type HeaderGroup,
  type Header,
  type Cell,
} from '@tanstack/react-table';
import { Command } from '../types';
import { commandDescriptions } from '../data/commandDescriptions';
import type { CommandDescription } from '../types/commandDescriptions';
import { useTheme } from '../contexts/ThemeContext';
import { hasAssignedShortcut } from '../utils/commandFilter';

interface AuthorModeProps {
  commands: Command[];
}

interface CommandCoverage {
  command: Command;
  hasShort: boolean;
  hasLong: boolean;
  description?: CommandDescription;
}

type FilterOperator = 'AND' | 'OR';

type FilterConditionType =
  | 'missing-short'
  | 'has-short'
  | 'missing-long'
  | 'has-long'
  | 'key-assigned'
  | 'key-unassigned'
  | 'category'
  | 'name-contains';

interface FilterCondition {
  id: string;
  type: FilterConditionType;
  value?: string; // For category and name-contains
  operator?: FilterOperator; // AND/OR before this condition
}

const FILTER_CONDITION_OPTIONS: { value: FilterConditionType; label: string }[] = [
  { value: 'missing-short', label: 'Missing Short' },
  { value: 'has-short', label: 'Has Short' },
  { value: 'missing-long', label: 'Missing Long' },
  { value: 'has-long', label: 'Has Long' },
  { value: 'key-assigned', label: 'Key Command Assigned' },
  { value: 'key-unassigned', label: 'Key Command Unassigned' },
  { value: 'category', label: 'Category' },
  { value: 'name-contains', label: 'Name Contains' },
];

const AUTHOR_MODE_FILTERS_STORAGE_KEY = 'fast-hands-author-mode-filters';

// Load saved filters from localStorage
function loadSavedFilters(): { advancedFilters: FilterCondition[]; useAdvancedFilters: boolean } {
  try {
    const stored = localStorage.getItem(AUTHOR_MODE_FILTERS_STORAGE_KEY);
    if (!stored) {
      return { advancedFilters: [], useAdvancedFilters: false };
    }
    const parsed = JSON.parse(stored);
    return {
      advancedFilters: parsed.advancedFilters || [],
      useAdvancedFilters: parsed.useAdvancedFilters || false,
    };
  } catch (error) {
    console.warn('Failed to load saved filters from localStorage:', error);
    return { advancedFilters: [], useAdvancedFilters: false };
  }
}

// Save filters to localStorage
function saveFilters(advancedFilters: FilterCondition[], useAdvancedFilters: boolean): void {
  try {
    localStorage.setItem(
      AUTHOR_MODE_FILTERS_STORAGE_KEY,
      JSON.stringify({ advancedFilters, useAdvancedFilters })
    );
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error);
  }
}

export function AuthorMode({ commands }: AuthorModeProps) {
  const { theme } = useTheme();
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, CommandDescription>>(
    () => ({ ...commandDescriptions })
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMissing, setFilterMissing] = useState<'none' | 'short' | 'long'>('none');
  
  // Load saved filter state from localStorage on mount
  const savedFilterState = loadSavedFilters();
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>(savedFilterState.advancedFilters);
  const [useAdvancedFilters, setUseAdvancedFilters] = useState(savedFilterState.useAdvancedFilters);

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50, // Show 50 rows per page by default
  });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({
    'command.name': 200,
    'command.category': 150,
    'hasShort': 80,
    'hasLong': 80,
    'short': 250,
    'long': 300,
    'notes': 200,
  });

  // Cell selection for keyboard navigation and multi-select
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Build coverage data
  const coverage = useMemo(() => {
    const coverageData: CommandCoverage[] = commands.map((cmd) => {
      const desc = editedDescriptions[cmd.name];
      return {
        command: cmd,
        hasShort: !!desc?.short,
        hasLong: !!desc?.long,
        description: desc,
      };
    });
    return coverageData;
  }, [commands, editedDescriptions]);

  // Apply a single filter condition
  const matchesCondition = (item: CommandCoverage, condition: FilterCondition): boolean => {
    switch (condition.type) {
      case 'missing-short':
        return !item.hasShort;
      case 'has-short':
        return item.hasShort;
      case 'missing-long':
        return !item.hasLong;
      case 'has-long':
        return item.hasLong;
      case 'key-assigned':
        return hasAssignedShortcut(item.command);
      case 'key-unassigned':
        return !hasAssignedShortcut(item.command);
      case 'category':
        return condition.value ? item.command.category === condition.value : false;
      case 'name-contains':
        return condition.value
          ? item.command.name.toLowerCase().includes(condition.value.toLowerCase())
          : false;
      default:
        return true;
    }
  };

  // Filter coverage with advanced AND/OR logic
  const filteredCoverage = useMemo(() => {
    let filtered = coverage;

    if (useAdvancedFilters && advancedFilters.length > 0) {
      // Use advanced filters with AND/OR logic
      filtered = coverage.filter((item) => {
        if (advancedFilters.length === 0) return true;
        
        // Start with the first condition
        let result = matchesCondition(item, advancedFilters[0]);
        
        // Apply remaining conditions with their operators
        for (let i = 1; i < advancedFilters.length; i++) {
          const condition = advancedFilters[i];
          const conditionResult = matchesCondition(item, condition);
          const operator = condition.operator || 'AND';
          
          if (operator === 'AND') {
            result = result && conditionResult;
          } else {
            // OR
            result = result || conditionResult;
          }
        }
        
        return result;
      });
    } else {
      // Use simple filters (backward compatibility)
      // Filter by category
      if (selectedCategory !== 'all') {
        filtered = filtered.filter((item) => item.command.category === selectedCategory);
      }

      // Filter by search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.command.name.toLowerCase().includes(query) ||
            item.command.category.toLowerCase().includes(query)
        );
      }

      // Filter by missing descriptions
      if (filterMissing === 'short') {
        filtered = filtered.filter((item) => !item.hasShort);
      } else if (filterMissing === 'long') {
        filtered = filtered.filter((item) => !item.hasLong);
      }
    }

    return filtered;
  }, [coverage, selectedCategory, searchQuery, filterMissing, useAdvancedFilters, advancedFilters]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(commands.map((c) => c.category))).sort();
    return cats;
  }, [commands]);

  // Advanced filter management
  const addFilterCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      type: 'missing-short',
      operator: advancedFilters.length > 0 ? 'AND' : undefined,
    };
    const updated = [...advancedFilters, newCondition];
    setAdvancedFilters(updated);
    saveFilters(updated, useAdvancedFilters);
  };

  const removeFilterCondition = (id: string) => {
    const updated = advancedFilters.filter((f) => f.id !== id);
    setAdvancedFilters(updated);
    saveFilters(updated, useAdvancedFilters);
  };

  const updateFilterCondition = (id: string, updates: Partial<FilterCondition>) => {
    const updated = advancedFilters.map((f) => (f.id === id ? { ...f, ...updates } : f));
    setAdvancedFilters(updated);
    saveFilters(updated, useAdvancedFilters);
  };

  // Save to localStorage whenever useAdvancedFilters changes
  const handleToggleAdvancedFilters = (enabled: boolean) => {
    setUseAdvancedFilters(enabled);
    saveFilters(advancedFilters, enabled);
  };

  // Update description
  const updateDescription = (commandName: string, field: keyof CommandDescription, value: any) => {
    setEditedDescriptions((prev) => {
      const updated = { ...prev };
      if (!updated[commandName]) {
        updated[commandName] = { short: '' };
      }
      updated[commandName] = {
        ...updated[commandName],
        [field]: value,
      };
      return updated;
    });
  };

  // Update notes
  const updateNotes = (commandName: string, notes: string[]) => {
    setEditedDescriptions((prev) => {
      const updated = { ...prev };
      if (!updated[commandName]) {
        updated[commandName] = { short: '' };
      }
      updated[commandName] = {
        ...updated[commandName],
        notes: notes.length > 0 ? notes : undefined,
      };
      return updated;
    });
  };

  // Helper to check if a cell is selected (single or in range)
  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (!selectedCell) return false;
    
    // If we have a selection range
    if (selectionStart) {
      const minRow = Math.min(selectionStart.row, selectedCell.row);
      const maxRow = Math.max(selectionStart.row, selectedCell.row);
      const minCol = Math.min(selectionStart.col, selectedCell.col);
      const maxCol = Math.max(selectionStart.col, selectedCell.col);
      
      return rowIndex >= minRow && rowIndex <= maxRow && 
             colIndex >= minCol && colIndex <= maxCol;
    }
    
    // Single cell selection
    return selectedCell.row === rowIndex && selectedCell.col === colIndex;
  };

  // Helper to get cell value for copy/paste
  const getCellValue = useCallback((rowIndex: number, colIndex: number, pageIndex: number, pageSize: number): string => {
    const absoluteRowIndex = pageIndex * pageSize + rowIndex;
    if (absoluteRowIndex < 0 || absoluteRowIndex >= filteredCoverage.length) return '';
    
    const item = filteredCoverage[absoluteRowIndex];
    const desc = editedDescriptions[item.command.name] || { short: '' };
    
    switch (colIndex) {
      case 0: return item.command.name;
      case 1: return item.command.category;
      case 2: return item.hasShort ? '✓' : '✗';
      case 3: return item.hasLong ? '✓' : '✗';
      case 4: return desc.short || '';
      case 5: return desc.long || '';
      case 6: return (desc.notes || []).join('\n');
      default: return '';
    }
  }, [filteredCoverage, editedDescriptions]);

  // Define TanStack Table columns - clean and simple
  const columns = useMemo<ColumnDef<CommandCoverage>[]>(
    () => [
      {
        accessorKey: 'command.name',
        header: 'Command Name',
        cell: (info: CellContext<CommandCoverage, unknown>) => {
          const rowIndex = info.row.index;
          const colIndex = 0;
          const isSelected = isCellSelected(rowIndex, colIndex);
          return (
            <div
              onMouseDown={(e) => {
                // Prevent text selection when shift-clicking
                if (e.shiftKey) {
                  e.preventDefault();
                }
              }}
              onClick={(e) => {
                if (e.shiftKey && selectedCell) {
                  // Extend selection
                  if (!selectionStart) {
                    setSelectionStart(selectedCell);
                  }
                  setSelectedCell({ row: rowIndex, col: colIndex });
                } else {
                  // New selection
                  setSelectionStart(null);
                  setSelectedCell({ row: rowIndex, col: colIndex });
                }
                tableContainerRef.current?.focus();
              }}
              style={{
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                color: theme.text,
                fontWeight: '500',
                cursor: 'cell',
                padding: '0.25rem',
                borderRadius: '2px',
                backgroundColor: isSelected ? `${theme.primary}20` : 'transparent',
                border: isSelected ? `2px solid ${theme.primary}` : '2px solid transparent',
              }}
            >
              {info.getValue() as string}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'command.category',
        header: 'Category',
        size: 150,
        minSize: 80,
        maxSize: 300,
        cell: (info: CellContext<CommandCoverage, unknown>) => {
          const rowIndex = info.row.index;
          const colIndex = 1;
          const isSelected = isCellSelected(rowIndex, colIndex);
          return (
            <div
              onMouseDown={(e) => {
                // Prevent text selection when shift-clicking
                if (e.shiftKey) {
                  e.preventDefault();
                }
              }}
              onClick={(e) => {
                if (e.shiftKey && selectedCell) {
                  // Extend selection
                  if (!selectionStart) {
                    setSelectionStart(selectedCell);
                  }
                  setSelectedCell({ row: rowIndex, col: colIndex });
                } else {
                  // New selection
                  setSelectionStart(null);
                  setSelectedCell({ row: rowIndex, col: colIndex });
                }
                tableContainerRef.current?.focus();
              }}
              style={{
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                color: theme.textSecondary,
                fontSize: '0.85rem',
                cursor: 'cell',
                padding: '0.25rem',
                borderRadius: '2px',
                backgroundColor: isSelected ? `${theme.primary}20` : 'transparent',
                border: isSelected ? `2px solid ${theme.primary}` : '2px solid transparent',
              }}
            >
              {info.getValue() as string}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'hasShort',
        header: 'Has Short',
        size: 80,
        minSize: 60,
        maxSize: 100,
        cell: (info: CellContext<CommandCoverage, unknown>) => {
          const rowIndex = info.row.index;
          const colIndex = 2;
          const isSelected = isCellSelected(rowIndex, colIndex);
          const hasShort = info.row.original.hasShort;
          return (
            <div
              onMouseDown={(e) => {
                // Prevent text selection when shift-clicking
                if (e.shiftKey) {
                  e.preventDefault();
                }
              }}
              onClick={(e) => {
                if (e.shiftKey && selectedCell) {
                  // Extend selection
                  if (!selectionStart) {
                    setSelectionStart(selectedCell);
                  }
                  setSelectedCell({ row: rowIndex, col: colIndex });
                } else {
                  // New selection
                  setSelectionStart(null);
                  setSelectedCell({ row: rowIndex, col: colIndex });
                }
                tableContainerRef.current?.focus();
              }}
              style={{
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                color: hasShort ? theme.text : theme.textSecondary,
                cursor: 'cell',
                padding: '0.25rem',
                borderRadius: '2px',
                backgroundColor: isSelected ? `${theme.primary}20` : 'transparent',
                border: isSelected ? `2px solid ${theme.primary}` : '2px solid transparent',
              }}
            >
              {hasShort ? '✓' : '✗'}
            </div>
          );
        },
        enableSorting: true,
        sortingFn: (rowA: Row<CommandCoverage>, rowB: Row<CommandCoverage>) => {
          const a = rowA.original.hasShort ? 1 : 0;
          const b = rowB.original.hasShort ? 1 : 0;
          return a - b;
        },
      },
      {
        id: 'hasLong',
        header: 'Has Long',
        size: 80,
        minSize: 60,
        maxSize: 100,
        cell: (info: CellContext<CommandCoverage, unknown>) => {
          const rowIndex = info.row.index;
          const colIndex = 3;
          const isSelected = isCellSelected(rowIndex, colIndex);
          const hasLong = info.row.original.hasLong;
          return (
            <div
              onMouseDown={(e) => {
                // Prevent text selection when shift-clicking
                if (e.shiftKey) {
                  e.preventDefault();
                }
              }}
              onClick={(e) => {
                if (e.shiftKey && selectedCell) {
                  // Extend selection
                  if (!selectionStart) {
                    setSelectionStart(selectedCell);
                  }
                  setSelectedCell({ row: rowIndex, col: colIndex });
                } else {
                  // New selection
                  setSelectionStart(null);
                  setSelectedCell({ row: rowIndex, col: colIndex });
                }
                tableContainerRef.current?.focus();
              }}
              style={{
                userSelect: 'none', // Prevent text selection
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                color: hasLong ? theme.text : theme.textSecondary,
                cursor: 'cell',
                padding: '0.25rem',
                borderRadius: '2px',
                backgroundColor: isSelected ? `${theme.primary}20` : 'transparent',
                border: isSelected ? `2px solid ${theme.primary}` : '2px solid transparent',
              }}
            >
              {hasLong ? '✓' : '✗'}
            </div>
          );
        },
        enableSorting: true,
        sortingFn: (rowA: Row<CommandCoverage>, rowB: Row<CommandCoverage>) => {
          const a = rowA.original.hasLong ? 1 : 0;
          const b = rowB.original.hasLong ? 1 : 0;
          return a - b;
        },
      },
      {
        id: 'short',
        header: 'Short Description',
        size: 250,
        minSize: 150,
        cell: (info: CellContext<CommandCoverage, unknown>) => {
          const rowIndex = info.row.index;
          const colIndex = 4;
          const isSelected = isCellSelected(rowIndex, colIndex);
          const item = info.row.original;
          const desc = editedDescriptions[item.command.name] || { short: '' };
          return (
            <textarea
              value={desc.short || ''}
              onChange={(e) => updateDescription(item.command.name, 'short', e.target.value)}
              tabIndex={-1}
              readOnly={!isEditing || editingCell?.row !== rowIndex || editingCell?.col !== colIndex}
              onMouseDown={(e) => {
                // Prevent text selection when shift-clicking for range selection
                if (e.shiftKey) {
                  e.preventDefault();
                }
                // For double-click, don't prevent default on first click
                // For single click, prevent default to stop textarea from getting focus
                if (!e.shiftKey && e.detail === 1) {
                  e.preventDefault();
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsEditing(true);
                setEditingCell({ row: rowIndex, col: colIndex });
                setSelectedCell({ row: rowIndex, col: colIndex });
                setSelectionStart(null);
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                  const textarea = e.currentTarget;
                  textarea.focus();
                  textarea.select();
                });
              }}
              onClick={(e) => {
                // Don't handle click if we just double-clicked
                if (e.detail === 2) {
                  return;
                }
                if (e.shiftKey && selectedCell) {
                  if (!selectionStart) {
                    setSelectionStart(selectedCell);
                  }
                  setSelectedCell({ row: rowIndex, col: colIndex });
                } else {
                  setSelectionStart(null);
                  setSelectedCell({ row: rowIndex, col: colIndex });
                }
                setIsEditing(false);
                setEditingCell(null);
                // Only focus container if we're not about to start editing
                if (!isEditing) {
                  tableContainerRef.current?.focus();
                }
              }}
              onBlur={(e) => {
                // Only exit editing if focus is moving outside the table
                if (!tableContainerRef.current?.contains(e.relatedTarget as Node)) {
                  setIsEditing(false);
                  setEditingCell(null);
                }
              }}
              placeholder="Short description..."
              style={{
                width: '100%',
                height: '100%',
                minHeight: '24px',
                padding: '4px 8px',
                margin: 0,
                border: isSelected ? `2px solid ${theme.primary}` : '1px solid transparent',
                backgroundColor: isSelected ? `${theme.primary}10` : 'transparent',
                color: theme.text,
                fontSize: '13px',
                lineHeight: '20px',
                fontFamily: 'inherit',
                resize: 'none',
                overflow: 'hidden',
                outline: 'none',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
                boxSizing: 'border-box',
              }}
              onInput={(e) => {
                // Auto-resize textarea to fit content
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
              }}
            />
          );
        },
      },
      {
        id: 'long',
        header: 'Long Description',
        size: 300,
        minSize: 150,
        cell: (info: CellContext<CommandCoverage, unknown>) => {
          const rowIndex = info.row.index;
          const colIndex = 5;
          const isSelected = isCellSelected(rowIndex, colIndex);
          const item = info.row.original;
          const desc = editedDescriptions[item.command.name] || { short: '' };
          return (
            <textarea
              value={desc.long || ''}
              onChange={(e) => updateDescription(item.command.name, 'long', e.target.value || undefined)}
              tabIndex={-1}
              readOnly={!isEditing || editingCell?.row !== rowIndex || editingCell?.col !== colIndex}
              onMouseDown={(e) => {
                // Prevent text selection when shift-clicking for range selection
                if (e.shiftKey) {
                  e.preventDefault();
                }
                // For double-click, don't prevent default on first click
                // For single click, prevent default to stop textarea from getting focus
                if (!e.shiftKey && e.detail === 1) {
                  e.preventDefault();
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsEditing(true);
                setEditingCell({ row: rowIndex, col: colIndex });
                setSelectedCell({ row: rowIndex, col: colIndex });
                setSelectionStart(null);
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                  const textarea = e.currentTarget;
                  textarea.focus();
                  textarea.select();
                });
              }}
              onClick={(e) => {
                // Don't handle click if we just double-clicked
                if (e.detail === 2) {
                  return;
                }
                if (e.shiftKey && selectedCell) {
                  if (!selectionStart) {
                    setSelectionStart(selectedCell);
                  }
                  setSelectedCell({ row: rowIndex, col: colIndex });
                } else {
                  setSelectionStart(null);
                  setSelectedCell({ row: rowIndex, col: colIndex });
                }
                setIsEditing(false);
                setEditingCell(null);
                // Only focus container if we're not about to start editing
                if (!isEditing) {
                  tableContainerRef.current?.focus();
                }
              }}
              onBlur={(e) => {
                // Only exit editing if focus is moving outside the table
                if (!tableContainerRef.current?.contains(e.relatedTarget as Node)) {
                  setIsEditing(false);
                  setEditingCell(null);
                }
              }}
              placeholder="Long description (optional)..."
              style={{
                width: '100%',
                height: '100%',
                minHeight: '24px',
                padding: '4px 8px',
                margin: 0,
                border: isSelected ? `2px solid ${theme.primary}` : '1px solid transparent',
                backgroundColor: isSelected ? `${theme.primary}10` : 'transparent',
                color: theme.text,
                fontSize: '13px',
                lineHeight: '20px',
                fontFamily: 'inherit',
                resize: 'none',
                overflow: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'auto' : 'hidden',
                outline: 'none',
                userSelect: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'none',
                WebkitUserSelect: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'none',
                MozUserSelect: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'none',
                msUserSelect: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'none',
                boxSizing: 'border-box',
                cursor: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'cell',
              }}
              onInput={(e) => {
                // Auto-resize textarea to fit content
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
              }}
            />
          );
        },
      },
      {
        id: 'notes',
        header: 'Notes',
        size: 200,
        minSize: 150,
        cell: (info: CellContext<CommandCoverage, unknown>) => {
          const rowIndex = info.row.index;
          const colIndex = 6;
          const isSelected = isCellSelected(rowIndex, colIndex);
          const item = info.row.original;
          const desc = editedDescriptions[item.command.name] || { short: '' };
          return (
            <textarea
              value={(desc.notes || []).join('\n')}
              onChange={(e) => {
                const notes = e.target.value
                  .split('\n')
                  .map((n) => n.trim())
                  .filter((n) => n.length > 0);
                updateNotes(item.command.name, notes);
              }}
              tabIndex={-1}
              readOnly={!isEditing || editingCell?.row !== rowIndex || editingCell?.col !== colIndex}
              onMouseDown={(e) => {
                // Prevent text selection when shift-clicking for range selection
                if (e.shiftKey) {
                  e.preventDefault();
                }
                // For double-click, don't prevent default on first click
                // For single click, prevent default to stop textarea from getting focus
                if (!e.shiftKey && e.detail === 1) {
                  e.preventDefault();
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsEditing(true);
                setEditingCell({ row: rowIndex, col: colIndex });
                setSelectedCell({ row: rowIndex, col: colIndex });
                setSelectionStart(null);
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                  const textarea = e.currentTarget;
                  textarea.focus();
                  textarea.select();
                });
              }}
              onClick={(e) => {
                // Don't handle click if we just double-clicked
                if (e.detail === 2) {
                  return;
                }
                if (e.shiftKey && selectedCell) {
                  if (!selectionStart) {
                    setSelectionStart(selectedCell);
                  }
                  setSelectedCell({ row: rowIndex, col: colIndex });
                } else {
                  setSelectionStart(null);
                  setSelectedCell({ row: rowIndex, col: colIndex });
                }
                setIsEditing(false);
                setEditingCell(null);
                // Only focus container if we're not about to start editing
                if (!isEditing) {
                  tableContainerRef.current?.focus();
                }
              }}
              onBlur={(e) => {
                // Only exit editing if focus is moving outside the table
                if (!tableContainerRef.current?.contains(e.relatedTarget as Node)) {
                  setIsEditing(false);
                  setEditingCell(null);
                }
              }}
              placeholder="Notes (one per line)..."
              style={{
                width: '100%',
                height: '100%',
                minHeight: '24px',
                padding: '4px 8px',
                margin: 0,
                border: isSelected ? `2px solid ${theme.primary}` : '1px solid transparent',
                backgroundColor: isSelected ? `${theme.primary}10` : 'transparent',
                color: theme.text,
                fontSize: '13px',
                lineHeight: '20px',
                fontFamily: 'inherit',
                resize: 'none',
                overflow: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'auto' : 'hidden',
                outline: 'none',
                userSelect: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'none',
                WebkitUserSelect: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'none',
                MozUserSelect: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'none',
                msUserSelect: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'none',
                boxSizing: 'border-box',
                cursor: isEditing && editingCell?.row === rowIndex && editingCell?.col === colIndex ? 'text' : 'cell',
              }}
              onInput={(e) => {
                // Auto-resize textarea to fit content
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
              }}
            />
          );
        },
      },
    ],
    [theme, editedDescriptions, selectedCell, isEditing, editingCell]
  );

  // Initialize TanStack Table
  const table = useReactTable({
    data: filteredCoverage,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      sorting,
      columnFilters,
      pagination,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onColumnSizingChange: setColumnSizing,
    manualFiltering: true, // We handle filtering ourselves
  });

  // Simple keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're currently editing a textarea
      const activeElement = document.activeElement;
      const isEditingTextarea = isEditing && editingCell && activeElement instanceof HTMLTextAreaElement;
      
      // Handle Cmd+A / Ctrl+A to select all cells in table
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        if (tableContainerRef.current?.contains(activeElement)) {
          e.preventDefault();
          e.stopPropagation();
          // Select all cells (first to last)
          const firstRow = 0;
          const lastRow = filteredCoverage.length - 1;
          const firstCol = 0;
          const lastCol = columns.length - 1;
          setSelectionStart({ row: firstRow, col: firstCol });
          setSelectedCell({ row: lastRow, col: lastCol });
          setIsEditing(false);
          setEditingCell(null);
          tableContainerRef.current?.focus();
          return;
        }
      }

      // If we're editing a textarea, only handle Escape and Tab
      if (isEditingTextarea) {
        // Allow Escape to exit editing
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsEditing(false);
          setEditingCell(null);
          if (activeElement instanceof HTMLTextAreaElement) {
            activeElement.blur();
          }
          tableContainerRef.current?.focus();
          return;
        }
        // Allow Tab to move to next cell
        if (e.key === 'Tab') {
          // Let the Tab handler below process it
        } else {
          // Allow all other keys for normal text editing - don't interfere
          return;
        }
      }

      // Only handle navigation if table container is focused and we have a selected cell
      if (!tableContainerRef.current?.contains(activeElement) || !selectedCell) {
        return;
      }

      const { row, col } = selectedCell;
      const pageSize = table.getState().pagination.pageSize;
      const currentPage = table.getState().pagination.pageIndex;
      const absoluteRowIndex = currentPage * pageSize + row;

      // Handle arrow keys
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();

        let newAbsoluteRow = absoluteRowIndex;
        let newCol = col;

        if (e.key === 'ArrowUp') {
          newAbsoluteRow = Math.max(0, absoluteRowIndex - 1);
        } else if (e.key === 'ArrowDown') {
          newAbsoluteRow = Math.min(filteredCoverage.length - 1, absoluteRowIndex + 1);
        } else if (e.key === 'ArrowLeft') {
          newCol = Math.max(0, col - 1);
        } else if (e.key === 'ArrowRight') {
          newCol = Math.min(columns.length - 1, col + 1);
        }

        // Handle page changes
        const targetPage = Math.floor(newAbsoluteRow / pageSize);
        const relativeRow = newAbsoluteRow % pageSize;

        // If Shift is held, extend selection instead of moving anchor
        if (e.shiftKey) {
          // Extend selection from the start point
          if (!selectionStart) {
            setSelectionStart(selectedCell);
          }
          if (targetPage !== currentPage) {
            table.setPageIndex(targetPage);
            setTimeout(() => {
              setSelectedCell({ row: relativeRow, col: newCol });
            }, 0);
          } else {
            setSelectedCell({ row: relativeRow, col: newCol });
          }
        } else {
          // Normal navigation - clear selection range
          setSelectionStart(null);
          if (targetPage !== currentPage) {
            table.setPageIndex(targetPage);
            setTimeout(() => {
              setSelectedCell({ row: relativeRow, col: newCol });
            }, 0);
          } else {
            setSelectedCell({ row: relativeRow, col: newCol });
          }
        }
        return;
      }

      // Handle Tab
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        let newAbsoluteRow = absoluteRowIndex;
        let newCol = col + (e.shiftKey ? -1 : 1);

        if (newCol >= columns.length) {
          newCol = 0;
          newAbsoluteRow = Math.min(filteredCoverage.length - 1, absoluteRowIndex + 1);
        } else if (newCol < 0) {
          newCol = columns.length - 1;
          newAbsoluteRow = Math.max(0, absoluteRowIndex - 1);
        }

        const targetPage = Math.floor(newAbsoluteRow / pageSize);
        const relativeRow = newAbsoluteRow % pageSize;

        if (targetPage !== currentPage) {
          table.setPageIndex(targetPage);
          setTimeout(() => {
            setSelectedCell({ row: relativeRow, col: newCol });
            // Don't auto-focus textarea - user must press Enter or double-click
          }, 0);
        } else {
          setSelectedCell({ row: relativeRow, col: newCol });
          // Don't auto-focus textarea - user must press Enter or double-click
        }
        return;
      }

      // Handle Enter - start editing editable cells
      if (e.key === 'Enter' && col >= 4 && col <= 6) {
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(true);
        setEditingCell({ row, col });
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"] textarea`) as HTMLTextAreaElement;
          if (cell) {
            cell.focus();
            cell.select();
          }
        });
        return;
      }
    };

    // Copy handler
    const handleCopy = (e: ClipboardEvent) => {
      if (!tableContainerRef.current?.contains(document.activeElement) || !selectedCell) {
        return;
      }

      const pageSize = table.getState().pagination.pageSize;
      const currentPage = table.getState().pagination.pageIndex;

      // Determine selection range
      let startRow = selectedCell.row;
      let endRow = selectedCell.row;
      let startCol = selectedCell.col;
      let endCol = selectedCell.col;

      if (selectionStart) {
        startRow = Math.min(selectionStart.row, selectedCell.row);
        endRow = Math.max(selectionStart.row, selectedCell.row);
        startCol = Math.min(selectionStart.col, selectedCell.col);
        endCol = Math.max(selectionStart.col, selectedCell.col);
      }

      // Build TSV (tab-separated values) for Google Sheets compatibility
      const tsvRows: string[] = [];
      for (let r = startRow; r <= endRow; r++) {
        const absoluteRow = currentPage * pageSize + r;
        if (absoluteRow >= filteredCoverage.length) break;
        
        const cells: string[] = [];
        for (let c = startCol; c <= endCol; c++) {
          const cellValue = getCellValue(r, c, currentPage, pageSize);
          // Replace newlines with spaces and tabs with spaces for TSV compatibility
          cells.push(cellValue.replace(/\n/g, ' ').replace(/\t/g, ' '));
        }
        tsvRows.push(cells.join('\t'));
      }

      e.clipboardData?.setData('text/plain', tsvRows.join('\n'));
      e.preventDefault();
    };

    // Paste handler
    const handlePaste = (e: ClipboardEvent) => {
      if (!tableContainerRef.current?.contains(document.activeElement) || !selectedCell) {
        return;
      }

      const pasteText = e.clipboardData?.getData('text/plain');
      if (!pasteText) return;

      e.preventDefault();

      const rows = table.getRowModel().rows;
      const pageSize = table.getState().pagination.pageSize;
      const currentPage = table.getState().pagination.pageIndex;
      const { row, col } = selectedCell;

      // Parse pasted data (TSV format)
      const lines = pasteText.split(/\r?\n/).filter(line => line.trim());
      if (lines.length === 0) return;

      // Parse first line
      const cells = lines[0].split(/\t/).map(c => c.trim());

      // Paste into cells starting from selected cell
      cells.forEach((cellValue, offset) => {
        const targetCol = col + offset;
        if (targetCol >= 4 && targetCol <= 6 && row < rows.length) {
          // Only paste into editable columns
          const item = rows[row].original;
          if (targetCol === 4) {
            updateDescription(item.command.name, 'short', cellValue);
          } else if (targetCol === 5) {
            updateDescription(item.command.name, 'long', cellValue || undefined);
          } else if (targetCol === 6) {
            const notes = cellValue.split('\n').map(n => n.trim()).filter(n => n.length > 0);
            updateNotes(item.command.name, notes);
          }
        }
      });

      // If multiple rows pasted, paste into subsequent rows
      for (let i = 1; i < lines.length; i++) {
        const rowCells = lines[i].split(/\t/).map(c => c.trim());
        const targetRow = row + i;
        
        if (targetRow >= rows.length) break;
        
        const absoluteRow = currentPage * pageSize + targetRow;
        if (absoluteRow >= filteredCoverage.length) break;

        rowCells.forEach((cellValue, offset) => {
          const targetCol = col + offset;
          if (targetCol >= 4 && targetCol <= 6) {
            const item = rows[targetRow].original;
            if (targetCol === 4) {
              updateDescription(item.command.name, 'short', cellValue);
            } else if (targetCol === 5) {
              updateDescription(item.command.name, 'long', cellValue || undefined);
            } else if (targetCol === 6) {
              const notes = cellValue.split('\n').map(n => n.trim()).filter(n => n.length > 0);
              updateNotes(item.command.name, notes);
            }
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);
    };
  }, [selectedCell, selectionStart, table, columns.length, filteredCoverage.length, getCellValue]);

  // Export JSON
  const exportJSON = () => {
    const json = JSON.stringify(editedDescriptions, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commandDescriptions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Stats
  const stats = useMemo(() => {
    const total = commands.length;
    const withShort = coverage.filter((c) => c.hasShort).length;
    const withLong = coverage.filter((c) => c.hasLong).length;
    return { total, withShort, withLong };
  }, [commands.length, coverage]);

  if (commands.length === 0) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: theme.text, marginBottom: '1rem' }}>Author Mode</h1>
        <p style={{ color: theme.textSecondary, fontSize: '1rem', marginBottom: '2rem' }}>
          Please load a Cubase Key Commands XML file to begin editing descriptions.
        </p>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem' }}>
          Note: Author Mode requires commands to be loaded. Use the normal app interface to load an XML file first, then access Author Mode with ?__author
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: theme.text, marginBottom: '0.5rem' }}>Author Mode</h1>
        <div
          style={{
            padding: '1rem',
            backgroundColor: theme.surface,
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            marginBottom: '1rem',
          }}
        >
          <p style={{ color: theme.text, fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>
            Internal tool for maintaining command descriptions
          </p>
          <ul style={{ color: theme.textSecondary, fontSize: '0.85rem', margin: 0, paddingLeft: '1.5rem' }}>
            <li>Edit descriptions inline in the table below</li>
            <li>Add descriptions by filling in empty fields</li>
            <li>Delete descriptions by clearing all fields and exporting</li>
            <li>Changes are in-memory only until you click "Export JSON"</li>
            <li>After exporting, run <code style={{ backgroundColor: theme.background, padding: '0.2rem 0.4rem', borderRadius: '2px' }}>npm run generate:descriptions</code> to update the app</li>
          </ul>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: theme.surface,
          borderRadius: '4px',
          border: `1px solid ${theme.border}`,
        }}
      >
        <div>
          <strong style={{ color: theme.text }}>Total Commands:</strong>{' '}
          <span style={{ color: theme.textSecondary }}>{stats.total}</span>
        </div>
        <div>
          <strong style={{ color: theme.text }}>With Short:</strong>{' '}
          <span style={{ color: theme.textSecondary }}>
            {stats.withShort} ({Math.round((stats.withShort / stats.total) * 100)}%)
          </span>
        </div>
        <div>
          <strong style={{ color: theme.text }}>With Long:</strong>{' '}
          <span style={{ color: theme.textSecondary }}>
            {stats.withLong} ({Math.round((stats.withLong / stats.total) * 100)}%)
          </span>
        </div>
      </div>

      {/* Filter Mode Toggle */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={useAdvancedFilters}
            onChange={(e) => handleToggleAdvancedFilters(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ color: theme.text, fontSize: '0.9rem', fontWeight: '500' }}>
            Use Advanced Filters (AND/OR)
          </span>
        </label>
      </div>

      {/* Simple Filters */}
      {!useAdvancedFilters && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>Category:</label>
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
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
            <label style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commands..."
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>Filter:</label>
            <select
              value={filterMissing}
              onChange={(e) => setFilterMissing(e.target.value as 'none' | 'short' | 'long')}
              style={{
                padding: '0.5rem',
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                backgroundColor: theme.surface,
                color: theme.text,
                fontSize: '0.9rem',
              }}
            >
              <option value="none">All Commands</option>
              <option value="short">Missing Short</option>
              <option value="long">Missing Long</option>
            </select>
          </div>

          <button
            onClick={exportJSON}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: theme.primary,
              color: theme.surface,
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
            }}
          >
            Export JSON
          </button>
        </div>
      )}

      {/* Advanced Filters */}
      {useAdvancedFilters && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: theme.surface,
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: theme.text, fontSize: '1rem', margin: 0 }}>Filter Conditions</h3>
            <button
              onClick={addFilterCondition}
              style={{
                padding: '0.5rem 1rem',
                border: `1px solid ${theme.primary}`,
                borderRadius: '4px',
                backgroundColor: theme.primary,
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
              }}
            >
              + Add Condition
            </button>
          </div>

          {advancedFilters.length === 0 ? (
            <p style={{ color: theme.textSecondary, fontSize: '0.9rem', fontStyle: 'italic' }}>
              No filters applied. Click "Add Condition" to start filtering.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {advancedFilters.map((filter, index) => {
                const needsValue = filter.type === 'category' || filter.type === 'name-contains';
                return (
                  <div
                    key={filter.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      padding: '0.75rem',
                      backgroundColor: theme.background,
                      borderRadius: '4px',
                      border: `1px solid ${theme.borderLight || theme.border}`,
                    }}
                  >
                    {index > 0 && (
                      <select
                        value={filter.operator || 'AND'}
                        onChange={(e) =>
                          updateFilterCondition(filter.id, { operator: e.target.value as FilterOperator })
                        }
                        style={{
                          padding: '0.4rem 0.6rem',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '4px',
                          backgroundColor: theme.surface,
                          color: theme.text,
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}

                    <select
                      value={filter.type}
                      onChange={(e) =>
                        updateFilterCondition(filter.id, {
                          type: e.target.value as FilterConditionType,
                          value: undefined,
                        })
                      }
                      style={{
                        padding: '0.4rem 0.6rem',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        backgroundColor: theme.surface,
                        color: theme.text,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        minWidth: '180px',
                      }}
                    >
                      {FILTER_CONDITION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {needsValue && (
                      <>
                        {filter.type === 'category' ? (
                          <select
                            value={filter.value || ''}
                            onChange={(e) => updateFilterCondition(filter.id, { value: e.target.value })}
                            style={{
                              padding: '0.4rem 0.6rem',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '4px',
                              backgroundColor: theme.surface,
                              color: theme.text,
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              minWidth: '150px',
                            }}
                          >
                            <option value="">Select category...</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={filter.value || ''}
                            onChange={(e) => updateFilterCondition(filter.id, { value: e.target.value })}
                            placeholder="Enter text..."
                            style={{
                              padding: '0.4rem 0.6rem',
                              border: `1px solid ${theme.border}`,
                              borderRadius: '4px',
                              backgroundColor: theme.surface,
                              color: theme.text,
                              fontSize: '0.9rem',
                              minWidth: '150px',
                            }}
                          />
                        )}
                      </>
                    )}

                    <button
                      onClick={() => removeFilterCondition(filter.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        border: `1px solid ${theme.error || '#ff4444'}`,
                        borderRadius: '4px',
                        backgroundColor: theme.error || '#ff4444',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={exportJSON}
              style={{
                padding: '0.5rem 1rem',
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                backgroundColor: theme.primary,
                color: theme.surface,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
              }}
            >
              Export JSON
            </button>
          </div>
        </div>
      )}

      {/* Coverage Table - TanStack Table */}
      <div
        ref={tableContainerRef}
        tabIndex={0}
        onKeyDown={(e) => {
          // Ensure container stays focused for keyboard navigation
          if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
            e.currentTarget.focus();
          }
        }}
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          overflow: 'auto',
          backgroundColor: theme.surface,
          maxHeight: '70vh',
          outline: selectedCell ? `2px solid ${theme.primary}` : 'none',
          userSelect: 'none', // Prevent text selection in table (except in textareas when editing)
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        <div style={{ padding: '0.5rem', fontSize: '0.85rem', color: theme.textSecondary, borderBottom: `1px solid ${theme.border}` }}>
          💡 <strong>Google Sheets Mode:</strong> Click any cell to select. Use <kbd style={{ padding: '0.2rem 0.4rem', backgroundColor: theme.background, borderRadius: '3px' }}>Arrow Keys</kbd> to navigate, <kbd style={{ padding: '0.2rem 0.4rem', backgroundColor: theme.background, borderRadius: '3px' }}>Tab</kbd> to move to next cell, <kbd style={{ padding: '0.2rem 0.4rem', backgroundColor: theme.background, borderRadius: '3px' }}>Enter</kbd> to edit editable cells.
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            {table.getHeaderGroups()[0]?.headers.map((header) => (
              <col
                key={header.id}
                style={{
                  width: header.getSize(),
                  minWidth: header.column.columnDef.minSize || 50,
                  maxWidth: header.column.columnDef.maxSize || undefined,
                }}
              />
            ))}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: theme.background }}>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<CommandCoverage>) => (
              <tr key={headerGroup.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                {headerGroup.headers.map((header: Header<CommandCoverage, unknown>) => (
                  <th
                    key={header.id}
                    style={{
                      padding: '4px 8px',
                      textAlign: 'left',
                      color: theme.text,
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      backgroundColor: theme.background,
                      fontSize: '12px',
                      fontWeight: '600',
                      position: 'relative',
                      width: header.getSize(),
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span style={{ fontSize: '10px', color: theme.textSecondary }}>
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? ' ↕'}
                        </span>
                      )}
                    </div>
                    {/* Column resize handle */}
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        cursor: 'col-resize',
                        userSelect: 'none',
                        touchAction: 'none',
                      }}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: theme.textSecondary }}>
                  No commands match your filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row: Row<CommandCoverage>, idx: number) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: `1px solid ${theme.borderLight || theme.border}`,
                    backgroundColor: idx % 2 === 0 ? theme.surface : theme.background,
                    height: '24px',
                  }}
                >
                  {row.getVisibleCells().map((cell: Cell<CommandCoverage, unknown>, cellIdx: number) => (
                    <td
                      key={cell.id}
                      data-row={row.index}
                      data-col={cellIdx}
                      style={{
                        padding: 0,
                        height: '24px',
                        verticalAlign: 'top',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div
        style={{
          marginTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: theme.surface,
          borderRadius: '4px',
          border: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: table.getCanPreviousPage() ? theme.primary : theme.background,
              color: table.getCanPreviousPage() ? '#fff' : theme.textSecondary,
              cursor: table.getCanPreviousPage() ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              opacity: table.getCanPreviousPage() ? 1 : 0.5,
            }}
          >
            {'<<'}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: table.getCanPreviousPage() ? theme.primary : theme.background,
              color: table.getCanPreviousPage() ? '#fff' : theme.textSecondary,
              cursor: table.getCanPreviousPage() ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              opacity: table.getCanPreviousPage() ? 1 : 0.5,
            }}
          >
            {'<'}
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: table.getCanNextPage() ? theme.primary : theme.background,
              color: table.getCanNextPage() ? '#fff' : theme.textSecondary,
              cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              opacity: table.getCanNextPage() ? 1 : 0.5,
            }}
          >
            {'>'}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              backgroundColor: table.getCanNextPage() ? theme.primary : theme.background,
              color: table.getCanNextPage() ? '#fff' : theme.textSecondary,
              cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              opacity: table.getCanNextPage() ? 1 : 0.5,
            }}
          >
            {'>>'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
            Page{' '}
            <strong style={{ color: theme.text }}>
              {table.getState().pagination.pageIndex + 1}
            </strong>{' '}
            of{' '}
            <strong style={{ color: theme.text }}>
              {table.getPageCount()}
            </strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>Rows per page:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
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
            {[25, 50, 100, 200].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
          Showing{' '}
          <strong style={{ color: theme.text }}>
            {table.getRowModel().rows.length === 0
              ? 0
              : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </strong>
          {' - '}
          <strong style={{ color: theme.text }}>
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredCoverage.length
            )}
          </strong>{' '}
          of <strong style={{ color: theme.text }}>{filteredCoverage.length}</strong> commands
        </div>
      </div>
    </div>
  );
}
