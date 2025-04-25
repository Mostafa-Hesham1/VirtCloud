import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
import theme from './styles/theme';
import PlansPage from './pages/PlansPage';
import CreateVmPage from './pages/CreateVmPage';
import { UserProvider } from './context/UserContext';
import { ThemeModeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeModeProvider>
      <UserProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <Box component="main" sx={{ flexGrow: 1 }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/register" element={<SignupPage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/create-vm" element={<CreateVmPage />} />
                {/* Add protected routes here */}
              </Routes>
            </Box>
            <Footer />
          </Box>
        </ThemeProvider>
      </UserProvider>
    </ThemeModeProvider>
  );
}

export default App;
