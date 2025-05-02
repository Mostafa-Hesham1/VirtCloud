import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Container,
  Avatar,
  Tab,
  Tabs,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ComputerIcon from '@mui/icons-material/Computer';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useUser } from '../context/UserContext';

const Navbar = () => {
  const theme = useTheme();
  // eslint-disable-next-line no-unused-vars
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Handle user menu open/close
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle mobile drawer
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  // Determine active tab 
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 0;
    if (path === '/create-vm') return 1;
    if (path === '/plans') return 2;
    return false;
  };
  
  const handleTabChange = (event, newValue) => {
    switch (newValue) {
      case 0: navigate('/dashboard'); break;
      case 1: navigate('/create-vm'); break;
      case 2: navigate('/plans'); break;
      default: navigate('/');
    }
  };

  // Mobile drawer content
  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={handleDrawerToggle}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        <Avatar 
          src="/logo.png" 
          alt="VirtCloud" 
          sx={{ 
            mr: 1,
            width: 64,
            height: 64
          }} 
        />
        <Typography variant="h6" color="primary">VirtCloud</Typography>
      </Box>
      <Divider />
      <List>
        <ListItem button={true.toString()} component={Link} to="/">
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Home" />
        </ListItem>
        {/* Always show Plans link */}
        <ListItem button={true.toString()} component={Link} to="/plans">
          <ListItemIcon><MonetizationOnIcon /></ListItemIcon>
          <ListItemText primary="Plans" />
        </ListItem>
        {user.isAuthenticated ? (
          <>
            <ListItem button={true.toString()} component={Link} to="/dashboard">
              <ListItemIcon><DashboardIcon /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            <ListItem button={true.toString()} component={Link} to="/create-vm">
              <ListItemIcon><ComputerIcon /></ListItemIcon>
              <ListItemText primary="Create VM" />
            </ListItem>
            <Divider />
            <ListItem button={true.toString()} onClick={handleLogout}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </>
        ) : (
          <>
            <ListItem button={true.toString()} component={Link} to="/login">
              <ListItemIcon><AccountCircleIcon /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItem>
            <ListItem button={true.toString()} component={Link} to="/signup">
              <ListItemIcon><AccountCircleIcon /></ListItemIcon>
              <ListItemText primary="Sign Up" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Logo - made much bigger */}
            <Avatar 
              src="/logo.png" 
              alt="VirtCloud"
              component={Link} 
              to="/"
              sx={{ 
                display: 'flex', 
                mr: 2,
                width: 96,   // Much larger size
                height: 96,  // Much larger size
              }}
            />
            
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                mr: 2,
                display: 'flex',
                fontWeight: 600,
                color: 'inherit',
                textDecoration: 'none',
                flexGrow: { xs: 1, md: 0 }
              }}
            >
              VirtCloud
            </Typography>

            {/* Mobile menu icon */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Desktop navigation links - hide on mobile */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              <Button startIcon={<HomeIcon />} color="inherit" component={Link} to="/" sx={{ mx: 1 }}>
                Home
              </Button>
              {user.isAuthenticated && (
                <Tabs 
                  value={getActiveTab()} 
                  onChange={handleTabChange}
                  indicatorColor="primary"
                  textColor="primary"
                  sx={{ ml: 2 }}
                >
                  <Tab icon={<DashboardIcon sx={{ fontSize: '1rem', mr: 1 }} />} iconPosition="start" label="Dashboard" />
                  <Tab icon={<ComputerIcon sx={{ fontSize: '1rem', mr: 1 }} />} iconPosition="start" label="Create VM" />
                  <Tab icon={<MonetizationOnIcon sx={{ fontSize: '1rem', mr: 1 }} />} iconPosition="start" label="Plans" />
                </Tabs>
              )}
              {!user.isAuthenticated && (
                <Button startIcon={<MonetizationOnIcon />} color="inherit" component={Link} to="/plans" sx={{ mx: 1 }}>
                  Plans
                </Button>
              )}
            </Box>

            {/* Authentication buttons - hide on mobile */}
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              {user.isAuthenticated ? (
                <>
                  <Button 
                    startIcon={<AccountCircleIcon />}
                    onClick={handleMenuOpen}
                    color="inherit"
                  >
                    {user.username || user.email}
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem component={Link} to="/dashboard">My Dashboard</MenuItem>
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                  </Menu>
                </>
              ) : (
                <>
                  <Button color="inherit" component={Link} to="/login" sx={{ ml: 1 }}>
                    Login
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    component={Link} 
                    to="/signup"
                    sx={{ ml: 1 }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navbar;
