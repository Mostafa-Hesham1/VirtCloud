import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  Divider,
  useMediaQuery,
  useTheme,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';

const HowCreditsWorkDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const creditRates = [
    { resource: 'VM base cost', rate: '0.5 credits/hour' },
    { resource: 'RAM', rate: '0.1 credits/GB/hour' },
    { resource: 'CPU', rate: '0.2 credits/core/hour' },
    { resource: 'Disk space', rate: '0.05 credits/GB (one-time)' }
  ];
  
  const examples = [
    {
      name: 'Development VM',
      config: '2 cores, 4GB RAM, 20GB disk',
      hourly: '1.5 credits/hour',
      monthly: '360 credits (8h/day, 30 days)'
    },
    {
      name: 'Database Server',
      config: '4 cores, 8GB RAM, 50GB disk',
      hourly: '3.3 credits/hour',
      monthly: '792 credits (8h/day, 30 days)'
    },
    {
      name: 'Web Server',
      config: '2 cores, 2GB RAM, 20GB disk',
      hourly: '1.3 credits/hour',
      monthly: '312 credits (8h/day, 30 days)'
    }
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Understanding the Credit System
      </DialogTitle>
      
      <DialogContent>
        <Typography paragraph>
          VirtCloud uses a credit-based system to provide flexibility in how you use our services.
          Credits are consumed based on the resources you use and the duration of use.
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Credit Rates
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell><strong>Resource</strong></TableCell>
                  <TableCell><strong>Rate</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {creditRates.map((row) => (
                  <TableRow key={row.resource}>
                    <TableCell>{row.resource}</TableCell>
                    <TableCell>{row.rate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            How to Calculate Credit Usage
          </Typography>
          <Typography paragraph>
            The total credit usage for a VM is calculated as follows:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography component="div" variant="body2" sx={{ fontFamily: 'monospace' }}>
              Total Credits = <br />
              Base Cost (0.5) + <br />
              (RAM in GB × 0.1) + <br />
              (CPU cores × 0.2) + <br />
              (Disk in GB × 0.05) <br /><br />
              For example, a VM with 2 cores, 4GB RAM, and 20GB disk: <br />
              0.5 + (4 × 0.1) + (2 × 0.2) + (20 × 0.05) = 1.9 credits/hour
            </Typography>
          </Paper>
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Example Configurations
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell><strong>Use Case</strong></TableCell>
                  <TableCell><strong>Configuration</strong></TableCell>
                  <TableCell><strong>Hourly Cost</strong></TableCell>
                  <TableCell><strong>Estimated Monthly</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {examples.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.config}</TableCell>
                    <TableCell>{row.hourly}</TableCell>
                    <TableCell>{row.monthly}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Plans Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight="bold">Free Plan</Typography>
                <Typography variant="body2">
                  15 credits/month<br />
                  Perfect for getting started and experimenting
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight="bold">Pro Plan</Typography>
                <Typography variant="body2">
                  150 credits/month<br />
                  Ideal for developers and small projects
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight="bold">Unlimited Plan</Typography>
                <Typography variant="body2">
                  600 credits/month<br />
                  Best for teams and production workloads
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight="bold">Pay-as-you-Go</Typography>
                <Typography variant="body2">
                  Recharge as needed<br />
                  Great for variable usage patterns
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HowCreditsWorkDialog;
