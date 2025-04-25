import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Create the context
export const ThemeModeContext = createContext();

// Custom hook to use the context
export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return context;
};

// Theme provider component
export const ThemeModeProvider = ({ children }) => {
  // Get initial mode from localStorage if available
  const [mode, setMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('themeMode');
      return savedMode === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return 'light';
    }
  });

  // Function to toggle theme
  const toggleThemeMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    try {
      localStorage.setItem('themeMode', newMode);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  // Create the theme object
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          // Keep brand colors consistent in both themes
          primary: {
            main: '#1976d2', // Your blue brand color
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
            paper: mode === 'light' ? '#fff' : '#1e1e1e',
          },
        },
      }),
    [mode]
  );

  // Value to be provided to consumers
  const contextValue = useMemo(
    () => ({
      mode,
      toggleThemeMode,
    }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
