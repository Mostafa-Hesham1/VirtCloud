import React from 'react';
import { Box, Typography, Link, Container, Grid, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Footer = () => (
  <Box component="footer" sx={{ 
    py: 6, 
    mt: 'auto',
    backgroundColor: '#f8f9fa', 
    borderTop: '1px solid #e0e0e0'
  }}>
    <Container maxWidth="lg">
      <Grid container spacing={4}>
        <Grid item xs={12} sm={4}>
          <Box sx={{ mb: 2 }}>
            <img src="/Logo.png" alt="VirtCloud" height="60" />
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Cloud virtualization platform for managing VMs and containers with ease.
          </Typography>
        </Grid>
        
        <Grid item xs={6} sm={4}>
          <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
            Quick Links
          </Typography>
          <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
            <Box component="li" sx={{ mb: 1 }}>
              <Link component={RouterLink} to="/" color="inherit" underline="hover">
                Home
              </Link>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Link component={RouterLink} to="/dashboard" color="inherit" underline="hover">
                Dashboard
              </Link>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Link component={RouterLink} to="/login" color="inherit" underline="hover">
                Sign In
              </Link>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Link component={RouterLink} to="/signup" color="inherit" underline="hover">
                Sign Up
              </Link>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={4}>
          <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
            Contact
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Email: support@virtcloud.com
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Phone: +1 (123) 456-7890
          </Typography>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} VirtCloud. All rights reserved.
        </Typography>
      </Box>
    </Container>
  </Box>
);

export default Footer;