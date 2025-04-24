import React, { createContext, useState, useContext, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    isAuthenticated: false,
    username: '',
    plan: 'free', // default plan
    credits: 0,
  });

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // In a real app, you'd use a proper JWT decoding library
        // This is a simple mock decoder for demonstration
        const decodedToken = mockDecodeToken(token);
        
        setUser({
          isAuthenticated: true,
          username: decodedToken.username || 'User',
          plan: decodedToken.plan || 'free',
          credits: decodedToken.credits || 0,
        });
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token'); // Invalid token
      }
    }
  }, []);

  // Mock function to simulate JWT decoding
  const mockDecodeToken = (token) => {
    // In a real app, you would use jwt-decode or similar
    // For demo purposes, we'll check if token exists and return mock data
    if (token) {
      // Return mock data or try to parse if it's a JSON string
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch {
        // If not a valid JWT, return default values
        return {
          username: 'DemoUser',
          plan: 'free',
          credits: 50
        };
      }
    }
    return {};
  };

  const updateUserPlan = (newPlan) => {
    setUser(prev => ({ ...prev, plan: newPlan }));
    
    // In a real app, you would call an API to update the user's plan
    // For now, we'll update the mock token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = mockDecodeToken(token);
        decodedToken.plan = newPlan;
        
        // Create a new mock token
        const updatedToken = createMockToken(decodedToken);
        localStorage.setItem('token', updatedToken);
      } catch (error) {
        console.error('Error updating token:', error);
      }
    }
  };

  const addCredits = (amount) => {
    const newCredits = user.credits + amount;
    setUser(prev => ({ ...prev, credits: newCredits }));
    
    // Update mock token with new credits
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = mockDecodeToken(token);
        decodedToken.credits = newCredits;
        
        // Create a new mock token
        const updatedToken = createMockToken(decodedToken);
        localStorage.setItem('token', updatedToken);
      } catch (error) {
        console.error('Error updating token:', error);
      }
    }
  };

  // Helper to create a mock token
  const createMockToken = (payload) => {
    // This is a simplified mock, not an actual JWT
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = btoa('mocksignature');
    return `${header}.${encodedPayload}.${signature}`;
  };

  return (
    <UserContext.Provider value={{ user, updateUserPlan, addCredits }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};