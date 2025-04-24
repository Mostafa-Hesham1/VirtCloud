import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Divider,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const PricingPage = ({ currentPlan = "Free" }) => {
  const [openModal, setOpenModal] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const plans = [
    {
      name: "Free Plan",
      price: "$0",
      credits: "15 credits/month",
      features: [
        "Up to 4-hour VM sessions",
        "Basic support",
        "Community access",
      ],
      button: currentPlan === "Free" ? "Current Plan" : "Get Started",
      color: "#e0e0e0",
      disabled: currentPlan === "Free",
      action: "getStarted"
    },
    {
      name: "Pro Plan",
      price: "$9",
      credits: "150 credits/month",
      features: [
        "Unlimited VM session length",
        "Priority support",
        "Advanced VM configurations"
      ],
      button: currentPlan === "Pro" ? "Current Plan" : "Upgrade",
      color: "#bbdefb",
      disabled: currentPlan === "Pro",
      action: "upgrade"
    },
    {
      name: "Unlimited Plan",
      price: "$29",
      credits: "600 credits/month",
      features: [
        "All Pro features",
        "24/7 premium support",
        "Custom image support"
      ],
      button: currentPlan === "Unlimited" ? "Current Plan" : "Upgrade",
      color: "#c8e6c9",
      disabled: currentPlan === "Unlimited",
      action: "upgrade"
    },
    {
      name: "Pay-as-you-Go",
      price: "No monthly fee",
      credits: "Recharge anytime ($5 = 10 credits)",
      features: [
        "VM: 0.5 credits/hr",
        "RAM: 0.1 credits/GB/hr",
        "CPU: 0.2 credits/core/hr",
        "Disk: 0.05 credits/GB"
      ],
      button: currentPlan === "PayGo" ? "Current Plan" : "Recharge",
      color: "#ffecb3",
      disabled: currentPlan === "PayGo" && false,
      action: "recharge"
    }
  ];

  const handleAction = (action) => {
    switch (action) {
      case "upgrade":
        console.log("Upgrade clicked");
        // Handle upgrade action
        break;
      case "recharge":
        console.log("Recharge clicked");
        // Handle recharge action
        break;
      case "getStarted":
        console.log("Get started clicked");
        // Handle get started action
        break;
      default:
        break;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom>
          Pricing Plans
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Choose the plan that works for you
          <Tooltip title="Click for more info">
            <IconButton size="small" onClick={handleOpenModal}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {plans.map((plan, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              elevation={3} 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                backgroundColor: `${plan.color}30`,
                borderTop: `4px solid ${plan.color}`,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                }
              }}
            >
              <CardHeader
                title={plan.name}
                titleTypographyProps={{ align: 'center', variant: 'h5' }}
                sx={{ backgroundColor: `${plan.color}40` }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h4" component="span">
                    {plan.price}
                  </Typography>
                  {plan.price !== "No monthly fee" && (
                    <Typography variant="subtitle1" component="span">
                      /month
                    </Typography>
                  )}
                </Box>
                
                <Typography variant="subtitle1" align="center" sx={{ fontWeight: 'bold', mb: 2 }}>
                  {plan.credits}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                {plan.features.map((feature, idx) => (
                  <Box key={idx} display="flex" alignItems="center" mb={1}>
                    <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="body2">{feature}</Typography>
                  </Box>
                ))}
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button 
                  variant="contained" 
                  color={plan.button === "Current Plan" ? "success" : "primary"}
                  disabled={plan.disabled}
                  fullWidth
                  onClick={() => handleAction(plan.action)}
                >
                  {plan.button}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* How Credits Work Modal */}
      <Dialog 
        open={openModal} 
        onClose={handleCloseModal}
        fullWidth
        maxWidth="md"
        fullScreen={isSmallScreen}
      >
        <DialogTitle>How Credits Work</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            VirtCloud uses a credit system to give you flexibility in how you use resources:
          </Typography>
          
          <Typography variant="h6" gutterBottom>Credit Costs:</Typography>
          <Typography paragraph>
            • Virtual Machine: 0.5 credits per hour (base cost)<br />
            • RAM: 0.1 credits per GB per hour<br />
            • CPU: 0.2 credits per core per hour<br />
            • Storage: 0.05 credits per GB
          </Typography>
          
          <Typography paragraph>
            <strong>Example:</strong> A VM with 4GB RAM, 2 cores, and 40GB storage would cost:
          </Typography>
          <Typography paragraph sx={{ pl: 2 }}>
            0.5 (base) + (4 × 0.1) + (2 × 0.2) + (40 × 0.05) = 3.1 credits/hour
          </Typography>
          
          <Typography variant="h6" gutterBottom>Plan Benefits:</Typography>
          <Typography paragraph>
            • <strong>Free Plan:</strong> Good for quick testing and learning with 15 credits (about 5 hours of basic VM usage)<br />
            • <strong>Pro Plan:</strong> Best for regular development with 150 credits/month<br />
            • <strong>Unlimited Plan:</strong> Ideal for intensive workloads with 600 credits/month<br />
            • <strong>Pay-as-you-Go:</strong> Perfect if you have variable usage patterns and prefer to pay only for what you use
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PricingPage;
