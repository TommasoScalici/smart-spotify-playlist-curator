import { createContext, useContext } from 'react';

export type Theme = 'dark' | 'light' | 'system';

export type ThemeProviderState = {
  setTheme: (theme: Theme) => void;
  theme: Theme;
};

export const initialState: ThemeProviderState = {
  setTheme: () => null,
  theme: 'system'
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
