import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
// Update the theme import path to the correct location
import theme from './styles/theme';
import { UserProvider } from './context/UserContext';
import { DockerProvider } from './context/DockerContext';

// Create root using the modern API
const container = document.getElementById('root');
const root = createRoot(container);

// Render using the root.render method instead of ReactDOM.render
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserProvider>
          <DockerProvider>
            <App />
          </DockerProvider>
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
