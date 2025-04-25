import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, TextField, Button, Paper, 
  Box, Alert, CircularProgress, Link as MuiLink 
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, login, loading } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated or when authentication completes, redirect to dashboard
  useEffect(() => {
    console.log("LoginPage auth check:", { isAuthenticated: user.isAuthenticated, loading });
    
    // Only redirect if authentication check is complete AND user is authenticated
    if (user.isAuthenticated && !loading) {
      console.log("User is authenticated, redirecting to dashboard");
      // Add a small delay before redirecting to ensure success message is seen
      if (success) {
        const timer = setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500); // 1.5 second delay
        return () => clearTimeout(timer);
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user.isAuthenticated, loading, navigate, success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
      const result = await login(email, password);
      if (result.success) {
        // Login successful - show success message more prominently
        setSuccess("Login successful! Redirecting to dashboard...");
        // The useEffect will handle redirection after a short delay
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        py: 8  // add vertical padding
      }}
    >
      <Paper elevation={3} sx={{ width: '100%', p: 4, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <img src="/logo.png" alt="VirtCloud" height="70" />
          </Box>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ fontWeight: 600 }}
          >
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to access your VirtCloud account
          </Typography>
        </Box>
        
        <Box 
          component="form"
          onSubmit={handleSubmit}
          noValidate 
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}
        >
          <TextField
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            margin="normal"
            sx={{ mb: 1 }}
          />
          
          <TextField
            name="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            margin="normal"
            sx={{ mb: 1 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <MuiLink 
              component={Link} 
              to="/forgot-password" 
              variant="body2"
              sx={{ color: 'primary.main' }}
            >
              Forgot password?
            </MuiLink>
          </Box>
          
          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            disabled={isSubmitting} 
            sx={{ 
              py: 1.5,
              mt: 1,
              mb: 2,
              fontWeight: 600
            }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
          
          {/* Make the success message more prominent */}
          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mt: 2, 
                fontSize: '1rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
            >
              {success}
            </Alert>
          )}
          
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2">
            Don't have an account?{' '}
            <MuiLink 
              component={Link} 
              to="/signup"
              sx={{ 
                color: 'primary.main', 
                fontWeight: 500,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Sign up now
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;