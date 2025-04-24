import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Link from '@mui/material/Link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { signupUser } from '../api/auth';

// Styled components with enhanced design
const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(5),
  gap: theme.spacing(2),
  width: '100%',
  maxWidth: '600px',
  margin: 'auto',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  background: 'rgba(255,255,255,0.95)',
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(4, 3),
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #1565c0, #42a5f5)',
  },
  animation: 'fadeInUp 0.5s ease-out',
  '@keyframes fadeInUp': {
    '0%': {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)',
    },
  }
}));

const Container = styled(Stack)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(4),
  justifyContent: 'center',
  alignItems: 'center',
  background: 'linear-gradient(45deg, #f5f8ff 30%, #e8f5fe 90%)',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.7)',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    '&.Mui-focused': {
      backgroundColor: 'rgba(255,255,255,1)',
      boxShadow: '0 0 0 2px rgba(63,81,181,0.2)',
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '8px',
  padding: '12px 16px',
  fontWeight: 600,
  textTransform: 'none',
  fontSize: '1.1rem',
  background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.3s ease',
  '&:hover': { 
    background: 'linear-gradient(45deg,#1565c0,#1976d2)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)'
  }
}));

const StyledDivider = styled(Divider)(({ theme }) => ({ 
  margin: theme.spacing(3, 0),
  '&::before, &::after': {
    borderColor: 'rgba(0, 0, 0, 0.1)',
  }
}));

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [usernameError, setUsernameError] = useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };
  
  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setUsername(val);
    if (val.length < 3) {
      setUsernameError(true);
      setUsernameErrorMessage('Username must be at least 3 characters.');
    } else {
      setUsernameError(false);
      setUsernameErrorMessage('');
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setEmailError(true);
      setEmailErrorMessage('Email is required.');
    } else if (!emailRegex.test(val)) {
      setEmailError(true);
      setEmailErrorMessage('Enter a valid email address.');
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (val.length < 8) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 8 characters.');
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Final check before submit
    if (!username || username.length < 3 || !email || emailError || !password || password.length < 8) return;
    setLoading(true);
    signupUser({ username, email, password })
      .then(() => {
        setSnackbar({ open: true, message: '✅ Account created. Please log in.', severity: 'success' });
        setTimeout(() => navigate('/login'), 1000);
      })
      .catch(err => {
        setSnackbar({ open: true, message: `❌ ${err.message}`, severity: 'error' });
      })
      .finally(() => setLoading(false));
  };
  
  const isFormValid = username && !usernameError && email && !emailError && password && !passwordError;

  return (
    <Container>
      <Card>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <img src="/Logo.png" alt="VirtCloud" height="90" />
          </Box>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(45deg, #1565c0, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Create an Account
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Join VirtCloud to manage your virtual machines
          </Typography>
        </Box>

        <Box 
          component="form" 
          onSubmit={handleSubmit}
          noValidate 
          sx={{ display:'flex', flexDirection:'column', gap:3, mt:2 }}
        >
          <StyledTextField
            name="username"
            label="Username"
            placeholder="Your username"
            fullWidth
            variant="outlined"
            required
            value={username}
            onChange={handleUsernameChange}
            error={usernameError}
            helperText={usernameErrorMessage}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="primary" />
                </InputAdornment>
              )
            }}
          />
          
          <StyledTextField
            name="email"
            label="Email Address"
            placeholder="you@example.com"
            type="email"
            fullWidth
            variant="outlined"
            required
            value={email}
            onChange={handleEmailChange}
            error={emailError}
            helperText={emailErrorMessage}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="primary" />
                </InputAdornment>
              )
            }}
          />
          
          <StyledTextField
            name="password"
            label="Password"
            placeholder="••••••••"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            required
            value={password}
            onChange={handlePasswordChange}
            error={passwordError}
            helperText={passwordError ? passwordErrorMessage : 'At least 8 characters'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={handleTogglePassword}
                    aria-label="toggle password visibility"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <FormControlLabel
            control={
              <Checkbox color="primary" />
            }
            label={
              <Typography variant="body2">
                I agree to the{' '}
                <Link component={RouterLink} to="/terms" color="primary" sx={{ fontWeight: 600 }}>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link component={RouterLink} to="/privacy" color="primary" sx={{ fontWeight: 600 }}>
                  Privacy Policy
                </Link>
              </Typography>
            }
          />
          
          <StyledButton type="submit" fullWidth variant="contained" disabled={!isFormValid || loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </StyledButton>
        </Box>
        
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
        
        <StyledDivider>or sign up with</StyledDivider>
        
        <Box sx={{ textAlign:'center', mt: 1 }}>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Already have an account?{' '}
            <Link 
              component={RouterLink} 
              to="/login" 
              sx={{ 
                color: 'primary.main', 
                fontWeight: 600,
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </Card>
    </Container>
  );
}