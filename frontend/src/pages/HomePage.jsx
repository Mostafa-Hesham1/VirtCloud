import React from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent, Stack, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import SecurityIcon from '@mui/icons-material/Security';

const HomePage = () => {
  const loggedIn = Boolean(localStorage.getItem('token'));

  return (
    <>
      {/* Hero Section */}
      <Box 
        sx={{
          py: { xs: 6, md: 8 },
          background: 'linear-gradient(45deg, #f5f8ff 30%, #e8f5fe 90%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                component="h1"
                gutterBottom
                sx={{ 
                  fontWeight: 800,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  background: 'linear-gradient(90deg, #1565c0, #42a5f5)',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  mb: 3
                }}
              >
                Cloud Virtual Machines Made Simple
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'text.secondary',
                  mb: 4,
                  fontWeight: 'normal',
                  lineHeight: 1.6
                }}
              >
                Create, manage and scale your virtual machines and containers from a single platform. 
                VirtCloud brings enterprise virtualization capabilities to your fingertips.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button 
                  component={Link} 
                  to={loggedIn ? "/dashboard" : "/signup"} 
                  variant="contained" 
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                    }
                  }}
                >
                  {loggedIn ? 'Go to Dashboard' : 'Get Started'}
                </Button>
                <Button 
                  component={Link} 
                  to="/login" 
                  variant="outlined" 
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    display: loggedIn ? 'none' : 'inline-flex',
                    borderWidth: '2px'
                  }}
                >
                  Sign In
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box 
                component="img"
                src="/Logo.png" 
                alt="VirtCloud"
                sx={{
                  width: '100%',
                  maxHeight: 300,
                  objectFit: 'contain',
                  mb: { xs: 0, md: 0 },
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))',
                  animation: 'float 6s ease-in-out infinite',
                  '@keyframes float': {
                    '0%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                    '100%': { transform: 'translateY(0px)' },
                  }
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 6, mt: { xs: 0, md: 0 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography 
              variant="h3" 
              component="h2" 
              gutterBottom
              sx={{ 
                fontWeight: 700,
                color: 'text.primary'
              }}
            >
              Powerful Cloud Features
            </Typography>
            <Typography 
              variant="h6"
              sx={{ 
                maxWidth: '800px',
                mx: 'auto',
                color: 'text.secondary',
                fontWeight: 'normal'
              }}
            >
              Everything you need to manage virtual machines and containers in one place
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box 
                sx={{ 
                  bgcolor: 'white', 
                  p: 4, 
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  height: '100%'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    mb: 2
                  }}
                >
                  <StorageIcon fontSize="large" />
                </Box>
                <Typography 
                  variant="h5" 
                  component="h3" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    mb: 2
                  }}
                >
                  Virtual Machines
                </Typography>
                <Typography color="text.secondary">
                  Create and manage virtual machines with different OS types ,
                   memory configurations , and disk sizes.
                  Scale as your needs grow. 
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box 
                sx={{ 
                  bgcolor: 'white', 
                  p: 4, 
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  height: '100%'
                

                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: '#03a9f4',
                    color: 'white',
                    mb: 2
                  }}
                >
                  <CloudIcon fontSize="large" />
                </Box>
                <Typography 
                  variant="h5" 
                  component="h3" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    mb: 2
                  }}
                >
                  Containerization
                </Typography>
                <Typography color="text.secondary">
                  Deploy containerized applications with our Docker integration.
                  Push, pull, and manage container images from a single dashboard.
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box 
                sx={{ 
                  bgcolor: 'white', 
                  p: 4, 
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  height: '100%'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: '#4caf50',
                    color: 'white',
                    mb: 2
                  }}
                >
                  <SecurityIcon fontSize="large" />
                </Box>
                <Typography 
                  variant="h5" 
                  component="h3" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    mb: 2
                  }}
                >
                  Security First
                </Typography>
                <Typography color="text.secondary">
                  Ensure your virtual environments are secure with our built-in security features.
                  JWT authentication and encrypted communications.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box 
        sx={{
          py: 8,
          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
          color: 'white'
        }}
      >
        <Container maxWidth="md">
          <Box 
            sx={{
              textAlign: 'center',
              py: { xs: 4, md: 6 }
            }}
          >
            <Typography 
              variant="h3" 
              component="h2"
              sx={{ 
                fontWeight: 700,
                mb: 3
              }}
            >
              Ready to Get Started?
            </Typography>
            <Typography 
              variant="h6"
              sx={{ 
                maxWidth: '700px',
                mx: 'auto',
                mb: 4,
                opacity: 0.9,
                fontWeight: 'normal'
              }}
            >
              Join thousands of users who trust VirtCloud for their virtualization needs.
              Create your free account today and experience the difference.
            </Typography>

            <Button 
              component={Link} 
              to="/signup" 
              variant="contained"
              color="secondary"
              size="large"
              sx={{
                px: 6,
                py: 1.5,
                fontWeight: 600,
                fontSize: '1.1rem',
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)'
                },
                display: loggedIn ? 'none' : 'inline-flex'
              }}
            >
              Sign Up Now
            </Button>

            {loggedIn && (
              <Button 
                component={Link} 
                to="/dashboard" 
                variant="contained"
                color="secondary"
                size="large"
                sx={{
                  px: 6,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.9)'
                  }
                }}
              >
                Go to Dashboard
              </Button>
            )}
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default HomePage;