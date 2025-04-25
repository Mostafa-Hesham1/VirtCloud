import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Box,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlanCard from './PlanCard';
import PayAsYouGoCard from './PayAsYouGoCard';
import HowCreditsWorkDialog from './HowCreditsWorkDialog';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const PlansPage = () => {
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [creditBalance, setCreditBalance] = useState(0);
  const [openCreditsDialog, setOpenCreditsDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    // Fetch user's current plan and available plans
    const fetchPlanData = async () => {
      try {
        setLoading(true);
        
        // Get the token
        const token = localStorage.getItem('token');
        
        if (!token) {
          showSnackbar('Please log in to view plans', 'error');
          setLoading(false);
          return;
        }
        
        // Get user's current plan
        const userPlanResponse = await axios.get(`${API_URL}/billing/user/plan`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        setCurrentPlan(userPlanResponse.data.plan.id);
        setCreditBalance(userPlanResponse.data.credits);
      } catch (error) {
        console.error('Error fetching plan data:', error);
        
        // Handle authentication errors
        if (error.response && error.response.status === 401) {
          showSnackbar('Session expired. Please log in again.', 'error');
        } else {
          showSnackbar('Failed to load plan information. Please try again later.', 'error');
        }
        
        // Default to free plan if there's an error
        setCurrentPlan('free');
        setCreditBalance(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlanData();
  }, []);

  const handleOpenCreditsDialog = () => {
    setOpenCreditsDialog(true);
  };

  const handleCloseCreditsDialog = () => {
    setOpenCreditsDialog(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handlePlanSelect = async (planId) => {
    if (planId === currentPlan) return;
    
    try {
      // Update plan in backend
      const token = localStorage.getItem('token');
      
      if (!token) {
        showSnackbar('Please log in to change plans', 'error');
        return;
      }
      
      await axios.post(
        `${API_URL}/billing/user/plan`, 
        { plan_id: planId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      setCurrentPlan(planId);
      
      const planNames = {
        'free': 'Free Plan',
        'pro': 'Pro Plan',
        'unlimited': 'Unlimited Plan',
        'payg': 'Pay-as-you-Go'
      };
      
      showSnackbar(`✅ Successfully switched to ${planNames[planId]}`);
    } catch (error) {
      console.error('Error changing plan:', error);
      
      // Handle authentication errors
      if (error.response && error.response.status === 401) {
        showSnackbar('Session expired. Please log in again.', 'error');
      } else {
        showSnackbar('Failed to change plan. Please try again later.', 'error');
      }
    }
  };

  const handleRecharge = async (amount) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showSnackbar('Please log in to recharge credits', 'error');
        return;
      }
      
      const response = await axios.post(
        `${API_URL}/billing/user/credits/recharge`, 
        { amount },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      setCreditBalance(response.data.current_balance);
      showSnackbar(`💰 Added ${response.data.credits_added} credits to your account`);
    } catch (error) {
      console.error('Error recharging credits:', error);
      showSnackbar('Failed to recharge credits', 'error');
    }
  };

  // Format plans data for rendering - now including PAYG with the other plans
  const allPlans = [
    {
      name: "Free Plan",
      price: "$0",
      credits: "15 credits/month",
      features: [
        "Max runtime per VM: 4 hours",
        "Up to 2 CPUs",
        "Up to 2GB RAM",
        "Up to 20GB Disk",
        "Community support"
      ],
      color: "grey",
      buttonText: currentPlan === "free" ? "Current Plan" : "Get Started",
      isCurrentPlan: currentPlan === "free",
      type: "standard"
    },
    {
      name: "Pro Plan",
      price: "$9",
      credits: "150 credits/month",
      features: [
        "Unlimited VM session length",
        "Up to 4 CPUs",
        "Up to 8GB RAM",
        "Up to 50GB Disk",
        "Email support"
      ],
      color: "blue",
      buttonText: currentPlan === "pro" ? "Current Plan" : "Upgrade to Pro",
      isCurrentPlan: currentPlan === "pro",
      type: "standard"
    },
    {
      name: "Unlimited Plan",
      price: "$29",
      credits: "600 credits/month",
      features: [
        "All Pro features",
        "Up to 8 CPUs",
        "Up to 16GB RAM",
        "Up to 200GB Disk",
        "Persistent VMs",
        "Priority support"
      ],
      color: "green",
      buttonText: currentPlan === "unlimited" ? "Current Plan" : "Upgrade to Unlimited",
      isCurrentPlan: currentPlan === "unlimited",
      type: "standard"
    },
    {
      name: "Pay-as-you-Go",
      price: "No monthly fee",
      credits: "Recharge anytime",
      features: [
        "No minimum commitment",
        "Scale resources as needed",
        "All resource limits same as Unlimited plan",
        "Recharge anytime"
      ],
      color: "purple", // Changed color to purple for better appearance
      buttonText: currentPlan === "payg" ? "Current Plan" : "Switch to PAYG",
      isCurrentPlan: currentPlan === "payg",
      type: "payg",
      creditBalance: creditBalance
    }
  ];

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading billing information...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ 
        mb: 6, 
        textAlign: 'center',
        backgroundImage: 'linear-gradient(120deg, rgba(230,235,245,0.6) 0%, rgba(245,245,255,0.6) 100%)',
        borderRadius: theme.shape.borderRadius * 2,
        py: 4,
        px: 2
      }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" color="primary.dark">
          Choose Your Plan
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph sx={{ maxWidth: '700px', mx: 'auto' }}>
          Select the plan that fits your needs. All plans offer our core VM functionality 
          with varying resource limits and credits.
        </Typography>
        <Button
          variant="outlined"
          size="large"
          startIcon={<InfoOutlinedIcon />}
          onClick={handleOpenCreditsDialog}
          sx={{ 
            mt: 2,
            borderRadius: theme.shape.borderRadius * 4,
            px: 3, 
            py: 1 
          }}
        >
          How credits work
        </Button>
      </Box>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        {allPlans.map((plan, index) => (
          <Grid item xs={12} md={3} key={index}>
            {plan.type === 'payg' ? (
              <PayAsYouGoCard 
                isCurrentPlan={plan.isCurrentPlan}
                creditBalance={plan.creditBalance}
                onRecharge={handleRecharge}
                onSelect={handlePlanSelect}
                color="purple"
              />
            ) : (
              <PlanCard
                {...plan}
                onSelect={handlePlanSelect}
              />
            )}
          </Grid>
        ))}
      </Grid>

      {/* How Credits Work Dialog */}
      <HowCreditsWorkDialog 
        open={openCreditsDialog} 
        onClose={handleCloseCreditsDialog}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PlansPage;
