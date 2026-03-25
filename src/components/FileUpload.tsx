import { useRef, ChangeEvent } from 'react';
import { Command } from '../types';
import { parseCubaseKeyCommands } from '../utils/cubaseParser';
import { useTheme } from '../contexts/ThemeContext';

interface FileUploadProps {
  onFileParsed: (commands: Command[]) => void;
}

/**
 * Component for uploading and parsing Cubase Key Commands XML files
 */
export function FileUpload({ onFileParsed }: FileUploadProps) {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xml')) {
      alert('Please upload an XML file');
      return;
    }

    try {
      const text = await file.text();
      const commands = parseCubaseKeyCommands(text);
      
      if (commands.length === 0) {
        alert('No valid commands found in the XML file');
        return;
      }

      onFileParsed(commands);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.text }}>
        Upload Cubase Key Commands XML:
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        onChange={handleFileChange}
        style={{
          padding: '0.5rem',
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: theme.inputBackground,
          color: theme.text,
        }}
      />
    </div>
  );
}

