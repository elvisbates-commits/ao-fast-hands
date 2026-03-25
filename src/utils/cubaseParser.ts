import { Command } from '../types';
import { normalizeShortcut } from './shortcutNormalizer';

/**
 * Parses a Cubase Key Commands XML file and extracts all commands
 * 
 * Actual Cubase XML structure:
 * <KeyCommandsPreset>
 *   <member name="Preset">
 *     <list name="Categories" type="list">
 *       <item>
 *         <string name="Name" value="Category Name"/>
 *         <list name="Commands" type="list">
 *           <item>
 *             <string name="Name" value="Command Name"/>
 *             <string name="Key" value="Ctrl+S"/>  <!-- or list for multiple shortcuts -->
 *           </item>
 *         </list>
 *       </item>
 *     </list>
 *   </member>
 * </KeyCommandsPreset>
 */
export function parseCubaseKeyCommands(xmlContent: string): Command[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`Failed to parse XML: ${parserError.textContent}`);
  }
  
  const commands: Command[] = [];
  
  // Find the Categories list
  const categoriesList = doc.querySelector('list[name="Categories"]');
  if (!categoriesList) {
    console.warn('No Categories list found in XML');
    return commands;
  }
  
  // Iterate through each category
  const categoryItems = categoriesList.querySelectorAll('item');
  
  categoryItems.forEach((categoryItem) => {
    // Get category name
    const categoryNameElement = categoryItem.querySelector('string[name="Name"]');
    const categoryName = categoryNameElement?.getAttribute('value') || 'Uncategorized';
    
    // Get commands list for this category
    const commandsList = categoryItem.querySelector('list[name="Commands"]');
    if (!commandsList) {
      return;
    }
    
    // Iterate through each command in this category
    const commandItems = commandsList.querySelectorAll('item');
    
    commandItems.forEach((commandItem) => {
      // Get command name
      const commandNameElement = commandItem.querySelector('string[name="Name"]');
      const commandName = commandNameElement?.getAttribute('value') || '';
      
      if (!commandName) {
        return;
      }
      
      // Get shortcut(s) - can be a single string or a list
      const keyString = commandItem.querySelector('string[name="Key"]');
      const keyList = commandItem.querySelector('list[name="Key"]');
      
      let shortcutStrings: string[] = [];
      
      if (keyString) {
        // Single shortcut - try both value attribute and textContent
        let value = keyString.getAttribute('value');
        // If value attribute is null, try textContent
        if (value === null) {
          value = keyString.textContent?.trim() || null;
        }
        // Push any non-null value, including empty strings and single characters like "+"
        if (value !== null) {
          shortcutStrings.push(value);
        }
      } else if (keyList) {
        // Multiple shortcuts
        const keyItems = keyList.querySelectorAll('item');
        keyItems.forEach((keyItem) => {
          const value = keyItem.getAttribute('value');
          if (value !== null) {
            shortcutStrings.push(value);
          }
        });
      }
      
      // Process shortcut - create command even if no shortcut exists
      if (shortcutStrings.length > 0) {
        // Use the first shortcut (or we could create multiple entries)
        const shortcutString = shortcutStrings[0];
        
        // Handle empty string shortcuts (shouldn't happen, but be safe)
        if (shortcutString.trim() === '') {
          // Create command with empty shortcut
          commands.push({
            name: commandName,
            category: categoryName,
            shortcut: {
              modifiers: [],
              key: '',
              macOS: '',
              windows: '',
            },
          });
        } else {
          try {
            const normalizedShortcut = normalizeShortcut(shortcutString);
            
            commands.push({
              name: commandName,
              category: categoryName,
              shortcut: normalizedShortcut,
            });
          } catch (error) {
            // Skip commands with invalid shortcuts
            console.warn(`Failed to normalize shortcut "${shortcutString}" for command "${commandName}":`, error);
          }
        }
      } else {
        // Command has no shortcut - create it anyway with empty shortcut
        commands.push({
          name: commandName,
          category: categoryName,
          shortcut: {
            modifiers: [],
            key: '',
            macOS: '',
            windows: '',
          },
        });
      }
    });
  });
  
  return commands;
}

