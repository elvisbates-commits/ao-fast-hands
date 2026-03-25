import { OperatingSystem } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface OSSelectorProps {
  os: OperatingSystem;
  onOSChange: (os: OperatingSystem) => void;
}

/**
 * Component for selecting the operating system (affects which shortcut variant is used)
 */
export function OSSelector({ os, onOSChange }: OSSelectorProps) {
  const { theme } = useTheme();
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.text }}>
        Operating System:
      </label>
      <select
        value={os}
        onChange={(e) => onOSChange(e.target.value as OperatingSystem)}
        style={{
          padding: '0.5rem',
          fontSize: '1rem',
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          backgroundColor: theme.inputBackground,
          color: theme.text,
        }}
      >
        <option value="macOS">macOS</option>
        <option value="Windows">Windows</option>
      </select>
    </div>
  );
}

