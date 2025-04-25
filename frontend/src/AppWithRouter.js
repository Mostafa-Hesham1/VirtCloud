import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { UserProvider } from './context/UserContext';

/**
 * AppWithRouter component
 * Wraps the main App component with Router and context providers
 */
const AppWithRouter = () => {
  return (
    <UserProvider>
      <Router>
        <App />
      </Router>
    </UserProvider>
  );
};

export default AppWithRouter;
