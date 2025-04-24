import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Typography,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Stack,
  useTheme,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DoneIcon from '@mui/icons-material/Done';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CreditEstimator from './CreditEstimator';

const PayAsYouGoCard = ({
  isCurrentPlan,
  creditBalance = 87,
  onRecharge,
  onSelect,
  color = "purple" // Default to purple
}) => {
  const theme = useTheme();
  const [rechargeAmount, setRechargeAmount] = useState('5');
  const [openRechargeDialog, setOpenRechargeDialog] = useState(false);
  const [openCalculatorDialog, setOpenCalculatorDialog] = useState(false);

  const handleCostChange = () => {
    // We're not using the cost data but keeping the function
    // for the CreditEstimator component's props
  };

  const handleRechargeOpen = () => {
    setOpenRechargeDialog(true);
  };

  const handleRechargeClose = () => {
    setOpenRechargeDialog(false);
  };

  const handleRechargeSubmit = () => {
    onRecharge && onRecharge(parseFloat(rechargeAmount));
    handleRechargeClose();
  };
  
  const handleCalculatorOpen = () => {
    setOpenCalculatorDialog(true);
  };
  
  const handleCalculatorClose = () => {
    setOpenCalculatorDialog(false);
  };

  return (
    <Card 
      elevation={isCurrentPlan ? 8 : 3} 
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 4,
        overflow: 'hidden',
        border: isCurrentPlan ? `2px solid ${theme.palette.success.main}` : 'none',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
          transform: isCurrentPlan ? 'none' : 'translateY(-12px)',
          boxShadow: isCurrentPlan ? 8 : 10
        },
        position: 'relative',
      }}
    >      
      {isCurrentPlan && (
        <Chip
          icon={<DoneIcon />}
          label="Current Plan"
          color="success"
          sx={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 2,
            fontWeight: 'bold',
            boxShadow: theme.shadows[3]
          }}
        />
      )}
      
      <CardHeader
        title={
          <Typography variant="h5" component="div" fontWeight="bold">
            Pay-as-you-Go
          </Typography>
        }
        sx={{ 
          bgcolor: color === 'purple' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(255, 152, 0, 0.1)',
          pb: 1,
          borderBottom: `2px dashed ${color === 'purple' ? theme.palette.purple?.main || '#9c27b0' : theme.palette.warning.main}`
        }}
      />
      
      <CardContent sx={{ flexGrow: 1, pt: 3, px: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h3" component="div" fontWeight="bold" color={isCurrentPlan ? 'primary.main' : 'text.primary'}>
            No Fee
            <Typography variant="body1" component="span" color="text.secondary" sx={{ ml: 1, fontWeight: 'normal' }}>
              /month
            </Typography>
          </Typography>
          
          <Stack 
            direction="row" 
            spacing={1} 
            alignItems="center" 
            justifyContent="center"
            sx={{
              mt: 2,
              p: 1.5,
              border: '1px dashed',
              borderColor: color === 'purple' ? 'secondary.main' : 'warning.main',
              borderRadius: 3,
              bgcolor: color === 'purple' ? 'rgba(156, 39, 176, 0.05)' : 'rgba(255, 152, 0, 0.05)'
            }}
          >
            <AccountBalanceWalletIcon color={color === 'purple' ? "secondary" : "warning"} />
            <Typography variant="h6" component="div" fontWeight="bold">
              {creditBalance} credits
            </Typography>
          </Stack>
        </Box>
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Open Credit Estimator">
            <Button
              variant="outlined"
              color={color === 'purple' ? "secondary" : "warning"}
              size="small"
              startIcon={<CalculateOutlinedIcon />}
              onClick={handleCalculatorOpen}
            >
              Cost Calculator
            </Button>
          </Tooltip>
        </Box>
        
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}></Box>
        
        <List dense disablePadding sx={{ '& .MuiListItem-root': { py: 1 } }}>
          {[
            "No minimum commitment", 
            "Scale resources as needed", 
            "Same resource limits as Unlimited plan",
            "Recharge anytime ($5 = 10 credits)"
          ].map((feature, index) => (
            <ListItem key={index} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleIcon color={color === 'purple' ? "secondary" : "warning"} />
              </ListItemIcon>
              <ListItemText 
                primary={feature} 
                primaryTypographyProps={{ 
                  variant: 'body2',
                  fontWeight: feature.includes('Recharge') ? 'bold' : 'normal'
                }} 
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
      
      <CardActions sx={{ p: 3, pt: 1 }}>
        <Button 
          variant="contained"
          color={color === 'purple' ? "secondary" : "warning"}
          fullWidth
          size="large"
          startIcon={<CreditCardIcon />}
          onClick={handleRechargeOpen}
          sx={{
            py: 1.5,
            borderRadius: 2,
            fontWeight: 'bold',
            fontSize: '1rem',
            mb: !isCurrentPlan ? 1 : 0
          }}
        >
          Recharge Credits
        </Button>
        
        {!isCurrentPlan && (
          <Button 
            variant="outlined"
            color={color === 'purple' ? "secondary" : "warning"}
            fullWidth
            onClick={() => onSelect('payg')}
            sx={{
              borderRadius: 2,
              fontWeight: 'medium'
            }}
          >
            Switch to Pay-as-you-Go
          </Button>
        )}
      </CardActions>

      {/* Recharge Dialog */}
      <Dialog 
        open={openRechargeDialog} 
        onClose={handleRechargeClose}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h5">Recharge Credits</Typography>
          <IconButton size="small" onClick={handleRechargeClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph sx={{ mt: 1 }}>
            Choose an amount to add credits to your account.
          </Typography>
          
          <TextField
            label="Amount"
            type="number"
            fullWidth
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              inputProps: { min: 5 }
            }}
            helperText={`You will receive ${rechargeAmount === '' ? 0 : Math.floor(parseFloat(rechargeAmount) * 2)} credits`}
            margin="normal"
            sx={{ mt: 2 }}
          />
          
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', mt: 2, mb: 1 }}>
            {[5, 10, 25, 50].map((amount) => (
              <Chip
                key={amount}
                label={`$${amount}`}
                clickable
                color={rechargeAmount === String(amount) ? (color === 'purple' ? "secondary" : "warning") : "default"}
                onClick={() => setRechargeAmount(String(amount))}
                sx={{ minWidth: 60 }}
              />
            ))}
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleRechargeClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleRechargeSubmit} 
            color={color === 'purple' ? "secondary" : "warning"}
            variant="contained"
            disabled={rechargeAmount === '' || parseFloat(rechargeAmount) < 5}
          >
            Recharge
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Calculator Dialog */}
      <Dialog 
        open={openCalculatorDialog} 
        onClose={handleCalculatorClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h5">Credit Usage Calculator</Typography>
          <IconButton size="small" onClick={handleCalculatorClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <CreditEstimator onCostChange={handleCostChange} />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCalculatorClose} 
            color="primary" 
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PayAsYouGoCard;
