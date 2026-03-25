/**
 * Theme colors for light and dark modes
 */
export interface Theme {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryHover: string;
  success: string;
  successBackground: string;
  error: string;
  errorBackground: string;
  warning: string;
  warningBackground: string;
  info: string;
  infoBackground: string;
  cardBackground: string;
  cardHover: string;
  inputBackground: string;
  tabActive: string;
  tabInactive: string;
}

export const lightTheme: Theme = {
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceSecondary: '#f9f9f9',
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#888888',
  border: '#dddddd',
  borderLight: '#eeeeee',
  primary: '#4caf50',
  primaryHover: '#45a049',
  success: '#2e7d32',
  successBackground: '#f1f8f4',
  error: '#c62828',
  errorBackground: '#ffebee',
  warning: '#856404',
  warningBackground: '#fff3cd',
  info: '#0066cc',
  infoBackground: '#f0f7ff',
  cardBackground: '#ffffff',
  cardHover: '#f5f5f5',
  inputBackground: '#ffffff',
  tabActive: '#4caf50',
  tabInactive: '#666666',
};

export const darkTheme: Theme = {
  background: '#1a1a1a',
  surface: '#2d2d2d',
  surfaceSecondary: '#252525',
  text: '#e0e0e0',
  textSecondary: '#b0b0b0',
  textTertiary: '#888888',
  border: '#404040',
  borderLight: '#353535',
  primary: '#66bb6a',
  primaryHover: '#81c784',
  success: '#66bb6a',
  successBackground: '#1b3a1f',
  error: '#ef5350',
  errorBackground: '#3d1f1f',
  warning: '#ffb74d',
  warningBackground: '#3d2f1f',
  info: '#64b5f6',
  infoBackground: '#1a2a3a',
  cardBackground: '#2d2d2d',
  cardHover: '#353535',
  inputBackground: '#252525',
  tabActive: '#66bb6a',
  tabInactive: '#b0b0b0',
};

