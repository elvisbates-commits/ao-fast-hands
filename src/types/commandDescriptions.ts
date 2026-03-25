/**
 * Command description data model
 * This matches the schema in data/commandDescriptions.json
 */
export interface CommandDescription {
  /** Short description (required) */
  short: string;
  /** Long description (optional) */
  long?: string;
  /** Additional notes (optional) */
  notes?: string[];
  /** Media references (optional) */
  media?: {
    image?: string;
    gif?: string;
  };
  /** Tags for categorization (optional) */
  tags?: string[];
}

