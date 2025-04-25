import React, { useState } from 'react';
import { 
  Avatar, 
  Menu, 
  MenuItem, 
  IconButton, 
  Typography, 
  Divider,
  ListItemIcon,
  Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

// Icons
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentIcon from '@mui/icons-material/Payment';

const UserMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const { user, logout } = useUser();
  
  const open = Boolean(anchorEl);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };
  
  // If not logged in, show minimal version
  if (!user.isAuthenticated) {
    return (
      <Box>
        <IconButton color="inherit" onClick={() => navigate('/login')}>
          <AccountCircleIcon />
        </IconButton>
      </Box>
    );
  }
  
  return (
    <Box>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-controls={open ? 'account-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        color="inherit"
      >
        <Avatar 
          sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
        >
          {user.email ? user.email[0].toUpperCase() : 'U'}
        </Avatar>
      </IconButton>
      <Menu
        id="account-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1">{user.displayName || user.email}</Typography>
          <Typography variant="caption" color="text.secondary">
            Plan: {user.plan} | Credits: {user.credits}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { handleClose(); navigate('/dashboard'); }}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          Dashboard
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); navigate('/billing'); }}>
          <ListItemIcon>
            <PaymentIcon fontSize="small" />
          </ListItemIcon>
          Billing & Credits
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserMenu;
