import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, 
         ListItem, ListItemText, Box, Menu, MenuItem, Avatar, Container } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useNavigate } from 'react-router-dom';

const navLinks = [
  { title: 'Home', path: '/' },
  { title: 'Dashboard', path: '/dashboard' },
  { title: 'Plans', path: '/plans' }
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoggedIn(Boolean(localStorage.getItem('token')));
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
    handleMenuClose();
    navigate('/login');
  };

  const drawer = (
    <Box 
      onClick={handleDrawerToggle} 
      sx={{ 
        textAlign: 'center',
        py: 2,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box 
        component={Link} 
        to="/" 
        sx={{ 
          my: 2, 
          display: 'inline-block', 
          textDecoration: 'none', 
          color: 'inherit',
          mx: 'auto'
        }}
      >
        <img src="/Logo.png" alt="VirtCloud" height="80" />
      </Box>
      <List sx={{ width: '100%' }}>
        {navLinks.map((item) => (
          <ListItem 
            button 
            component={Link} 
            to={item.path} 
            key={item.title}
            sx={{
              borderRadius: 1,
              mx: 1,
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.08)',
              }
            }}
          >
            <ListItemText 
              primary={item.title} 
              primaryTypographyProps={{
                fontWeight: 'medium'
              }}
            />
          </ListItem>
        ))}
        {!loggedIn && (
          <>
            <ListItem 
              button 
              component={Link} 
              to="/login"
              sx={{
                borderRadius: 1,
                mx: 1,
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                }
              }}
            >
              <ListItemText 
                primary="Sign In" 
                primaryTypographyProps={{
                  fontWeight: 'medium'
                }}
              />
            </ListItem>
            <ListItem 
              button 
              component={Link} 
              to="/signup"
              sx={{
                borderRadius: 1,
                mx: 1,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                }
              }}
            >
              <ListItemText 
                primary="Sign Up" 
                primaryTypographyProps={{
                  fontWeight: 'bold'
                }}
              />
            </ListItem>
          </>
        )}
        {loggedIn && (
          <ListItem 
            button 
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              mx: 1,
              color: 'error.main',
              '&:hover': {
                bgcolor: 'rgba(211, 47, 47, 0.08)',
              }
            }}
          >
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{
                fontWeight: 'medium'
              }}
            />
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <Box>
      <AppBar 
        position="static" 
        elevation={2}
        sx={{ 
          bgcolor: 'white', 
          color: 'text.primary' 
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ px: { xs: 1, sm: 2 }, minHeight: { xs: '80px' } }}>
            <IconButton 
              color="inherit" 
              edge="start" 
              onClick={handleDrawerToggle} 
              sx={{ display: { md: 'none' }, mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Box 
              component={Link} 
              to="/" 
              sx={{ 
                mr: 3,
                display: 'flex', 
                alignItems: 'center',
                textDecoration: 'none', 
                color: 'inherit',
                maxHeight: '70px'
              }}
            >
              <img 
                src="/Logo.png" 
                alt="VirtCloud" 
                style={{ 
                  maxHeight: '70px',
                  width: 'auto',
                  objectFit: 'contain',
                  marginRight: '8px'
                }} 
              />
            </Box>
            
            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, gap: 1 }}>
              {navLinks.map((item) => (
                <Button 
                  key={item.title} 
                  component={Link} 
                  to={item.path} 
                  sx={{ 
                    color: 'inherit',
                    fontWeight: 500,
                    mx: 0.5,
                    '&:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.08)',
                    }
                  }}
                >
                  {item.title}
                </Button>
              ))}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!loggedIn ? (
                <Button 
                  variant="contained"
                  color="primary"
                  component={Link} 
                  to="/signup"
                  sx={{
                    fontWeight: 'bold',
                    px: 3
                  }}
                >
                  Sign Up
                </Button>
              ) : (
                <>
                  <IconButton 
                    color="inherit" 
                    onClick={handleMenuOpen}
                    sx={{
                      border: '2px solid',
                      borderColor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'rgba(25, 118, 210, 0.08)',
                      }
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }} />
                  </IconButton>
                  <Menu 
                    anchorEl={anchorEl} 
                    open={Boolean(anchorEl)} 
                    onClose={handleMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    PaperProps={{
                      elevation: 3,
                      sx: {
                        mt: 1.5,
                        '& .MuiMenuItem-root': {
                          px: 2,
                          py: 1,
                        },
                      },
                    }}
                  >
                    <MenuItem 
                      onClick={() => { 
                        handleMenuClose(); 
                        navigate('/profile'); 
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">Profile</Typography>
                    </MenuItem>
                    <MenuItem 
                      onClick={handleLogout}
                      sx={{ 
                        color: 'error.main',
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">Logout</Typography>
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Drawer 
        anchor="left" 
        open={mobileOpen} 
        onClose={handleDrawerToggle} 
        sx={{ 
          display: { md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Navbar;