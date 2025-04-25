import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    isAuthenticated: false,
    email: '',
    username: '',
    plan: 'free',
    credits: 100, // Default credits
  });
  const [loading, setLoading] = useState(true);

  // Check for existing token and validate on component mount
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      console.log("Token check:", token ? "Token exists" : "No token found");
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        console.log("Validating token with backend...");
        // Set up axios defaults to include token in all requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Call the backend to verify the token and get user data
        const response = await axios.get('http://localhost:8000/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log("User data received:", response.data);
        
        // If successful, update the user state
        setUser({
          isAuthenticated: true,
          email: response.data.email,
          username: response.data.username,
          plan: response.data.plan || 'free',
          credits: response.data.credits || 100
        });
        console.log("Authentication successful, user state updated");
      } catch (error) {
        // If token validation fails, clear it
        console.error("Token validation failed:", error);
        localStorage.removeItem('token');
        // Clear axios default headers
        delete axios.defaults.headers.common['Authorization'];
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
          console.log("401 Unauthorized response detected");
          // Clear localStorage and reset user state on auth failures
          localStorage.removeItem('token');
          setUser({
            isAuthenticated: false,
            email: '',
            username: '',
            plan: 'free',
            credits: 0
          });
        }
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptor on unmount
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      console.log("Attempting login for:", email);
      const response = await axios.post('http://localhost:8000/auth/login', {
        email,
        password
      });
      
      // Store token in localStorage
      const token = response.data.access_token;
      localStorage.setItem('token', token);
      console.log("Token stored in localStorage");
      
      // Set default Authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user details
      const userResponse = await axios.get('http://localhost:8000/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("User data received after login:", userResponse.data);
      
      // Update user context
      setUser({
        isAuthenticated: true,
        email: userResponse.data.email,
        username: userResponse.data.username,
        plan: userResponse.data.plan || 'free',
        credits: userResponse.data.credits || 100
      });
      
      console.log("User state updated, authentication complete");
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { 
        success: false, 
        message: error.response?.data?.detail || "Login failed" 
      };
    }
  };

  // Logout function
  const logout = () => {
    console.log("Logging out user");
    localStorage.removeItem('token');
    // Clear axios default headers
    delete axios.defaults.headers.common['Authorization'];
    setUser({
      isAuthenticated: false,
      email: '',
      username: '',
      plan: 'free',
      credits: 0
    });
    console.log("User logged out successfully");
  };

  // For debugging
  useEffect(() => {
    console.log("UserContext state updated:", {
      isAuthenticated: user.isAuthenticated,
      email: user.email,
      loading
    });
  }, [user, loading]);

  return (
    <UserContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);