import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

// This is a simple redirect component
const RegisterPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to SignupPage
    navigate('/signup', { replace: true });
  }, [navigate]);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
      <CircularProgress />
      <Typography mt={2}>Redirecting to signup...</Typography>
    </Box>
  );
};

export default RegisterPage;
