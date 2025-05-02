import React, { useState, createContext, useContext, useEffect } from 'react';
import axios from 'axios';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    isAuthenticated: false,
    email: '',
    plan: 'free',
    credits: 0,
    displayName: ''
  });
  const [loading, setLoading] = useState(true);

  // Check for existing token and validate on component mount
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      console.log("UserContext: Token check:", token ? "Token exists" : "No token found");
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Attempt to refresh user data
        const success = await refreshUser();
        if (!success) {
          console.log("UserContext: Initial token validation failed");
        }
      } catch (error) {
        console.error("UserContext: Error during initial token validation:", error);
      } finally {
        setLoading(false);
      }
    };
    
    validateToken();
    
    // Set up axios interceptor to handle 401 errors
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          console.log("UserContext: 401 Unauthorized response detected");
          // Clear localStorage and reset user state on auth failures
          localStorage.removeItem('token');
          setUser({
            isAuthenticated: false,
            email: '',
            plan: 'free',
            credits: 0,
            displayName: ''
          });
        }
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptor on unmount
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log("UserContext: No token found during refresh");
      setUser((prev) => ({
        ...prev,
        isAuthenticated: false,
        email: '',
        plan: 'free',
        credits: 0,
        displayName: ''
      }));
      return false;
    }

    try {
      console.log("UserContext: Refreshing user data...");
      
      const [authResponse, planResponse] = await Promise.all([
        axios.get('http://localhost:8000/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8000/billing/user/plan', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setUser((prev) => ({
        ...prev,
        isAuthenticated: true,
        email: authResponse.data.email,
        displayName: authResponse.data.name || authResponse.data.email,
        plan: planResponse.data.plan.id || 'free',
        credits: planResponse.data.credits || 0
      }));

      return true;
    } catch (error) {
      console.error("UserContext: Error refreshing user", error);

      if (error.response?.status === 401) {
        console.log("UserContext: Token expired or invalid, logging out");
        localStorage.removeItem('token');
      }

      setUser((prev) => ({
        ...prev,
        isAuthenticated: false,
        email: '',
        plan: 'free',
        credits: 0,
        displayName: ''
      }));

      return false;
    }
  };

  const login = async (email, password) => {
    try {
      console.log("UserContext: Attempting login for:", email);
      const response = await axios.post('http://localhost:8000/auth/login', {
        email,
        password
      });
      
      if (response.status === 200 && response.data?.access_token) {
        // Store token in localStorage
        const token = response.data.access_token; // Updated to use access_token
        localStorage.setItem('token', token);
        console.log("UserContext: Token stored in localStorage");
        
        // Fetch user details
        const userResponse = await axios.get('http://localhost:8000/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUser({
          isAuthenticated: true,
          email: userResponse.data.email,
          displayName: userResponse.data.name || userResponse.data.email,
          plan: userResponse.data.plan || 'free',
          credits: userResponse.data.credits || 0
        });
        
        console.log("UserContext: User state updated after login");
        return { success: true };
      } else {
        console.error("UserContext: Login response missing access_token", response.data);
        return { 
          success: false, 
          message: "Invalid login response from server" 
        };
      }
    } catch (error) {
      console.error("UserContext: Login error:", error);
      return { 
        success: false, 
        message: error.response?.data?.detail || "Login failed" 
      };
    }
  };

  const logout = () => {
    console.log("UserContext: Logging out user");
    localStorage.removeItem('token');
    setUser({
      isAuthenticated: false,
      email: '',
      plan: 'free',
      credits: 0,
      displayName: ''
    });
  };

  // For debugging
  useEffect(() => {
    console.log("UserContext: State updated:", {
      isAuthenticated: user.isAuthenticated,
      email: user.email,
      loading
    });
  }, [user, loading]);

  return (
    <UserContext.Provider value={{ user, login, logout, refreshUser, loading }}>
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