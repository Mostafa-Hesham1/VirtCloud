import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Divider, Alert, Button, LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useUser } from '../context/UserContext';
import axios from 'axios';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

const VmMonitorPage = () => {
  const theme = useTheme();
  const { user } = useUser();
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  
  // Mock monitoring data (in real app, would come from backend)
  const [mockMetrics, setMockMetrics] = useState({});
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    fetchUserVms();
    
    // Set up periodic refresh
    refreshTimerRef.current = setInterval(() => {
      fetchUserVms();
      updateMockMetrics();
    }, 10000);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  const fetchUserVms = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/vm/list', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const vmList = response.data.vms || [];
      setVms(vmList);
      
      // Initialize mock metrics for new VMs
      const newMetrics = { ...mockMetrics };
      vmList.forEach(vm => {
        if (!newMetrics[vm.id]) {
          newMetrics[vm.id] = generateMockMetrics(vm);
        }
      });
      setMockMetrics(newMetrics);
      
    } catch (err) {
      console.error('Error fetching VMs:', err);
      setError('Failed to load virtual machines.');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  const updateMockMetrics = () => {
    const updatedMetrics = { ...mockMetrics };
    
    Object.keys(updatedMetrics).forEach(vmId => {
      updatedMetrics[vmId] = {
        ...updatedMetrics[vmId],
        cpuUsage: Math.min(100, Math.max(5, updatedMetrics[vmId].cpuUsage + (Math.random() * 20 - 10))),
        memoryUsage: Math.min(100, Math.max(10, updatedMetrics[vmId].memoryUsage + (Math.random() * 15 - 7))),
        diskIo: Math.min(100, Math.max(0, updatedMetrics[vmId].diskIo + (Math.random() * 30 - 15))),
        networkIo: Math.min(100, Math.max(0, updatedMetrics[vmId].networkIo + (Math.random() * 25 - 12))),
      };
    });
    
    setMockMetrics(updatedMetrics);
  };

  const generateMockMetrics = (vm) => {
    // Generate random but plausible values for monitoring metrics
    return {
      cpuUsage: 10 + Math.random() * 30,
      memoryUsage: 20 + Math.random() * 40,
      diskIo: Math.random() * 50,
      networkIo: Math.random() * 40,
      uptime: Math.floor(Math.random() * 100) + "h " + Math.floor(Math.random() * 60) + "m",
    };
  };

  const manualRefresh = () => {
    fetchUserVms();
    updateMockMetrics();
  };

  // Helper to render usage bar with color coding
  const UsageBar = ({ value, label }) => {
    let color = theme.palette.success.main;
    if (value > 70) color = theme.palette.error.main;
    else if (value > 50) color = theme.palette.warning.main;
    
    return (
      <Box sx={{ width: '100%', mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption">{label}</Typography>
          <Typography variant="caption" fontWeight="bold">{Math.round(value)}%</Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={value} 
          sx={{ 
            height: 8, 
            borderRadius: 1,
            bgcolor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              bgcolor: color
            }
          }} 
        />
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">VM Monitoring</Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          variant="outlined" 
          onClick={manualRefresh}
        >
          Refresh
        </Button>
      </Box>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Real-time monitoring of your virtual machines. Data refreshes automatically every 10 seconds.
        Last refreshed: {lastRefreshed.toLocaleTimeString()}
      </Typography>
      
      {loading && <LinearProgress sx={{ mb: 3 }} />}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={1}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.background.default }}>
                    <TableCell><strong>VM Name</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Resources</strong></TableCell>
                    <TableCell><strong>CPU</strong></TableCell>
                    <TableCell><strong>Memory</strong></TableCell>
                    <TableCell><strong>Disk I/O</strong></TableCell>
                    <TableCell><strong>Network</strong></TableCell>
                    <TableCell><strong>Uptime</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vms.length > 0 ? vms.map((vm) => {
                    const metrics = mockMetrics[vm.id] || generateMockMetrics(vm);
                    
                    return (
                      <TableRow key={vm.id} hover>
                        <TableCell>
                          <Typography fontWeight="medium">
                            {vm.disk_name.split('.')[0]}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            size="small"
                            label={vm.status || "Running"} 
                            color={vm.status === "stopped" ? "default" : "success"}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {vm.cpu_count} CPU / {vm.memory_mb/1024}GB RAM
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <UsageBar value={metrics.cpuUsage} label="CPU" />
                        </TableCell>
                        <TableCell>
                          <UsageBar value={metrics.memoryUsage} label="Memory" />
                        </TableCell>
                        <TableCell>
                          <UsageBar value={metrics.diskIo} label="Disk I/O" />
                        </TableCell>
                        <TableCell>
                          <UsageBar value={metrics.networkIo} label="Network" />
                        </TableCell>
                        <TableCell>
                          {metrics.uptime}
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">
                          No virtual machines found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Summary Cards */}
        {vms.length > 0 && (
          <React.Fragment>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>System Overview</Typography>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SpeedIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    <Typography variant="h6">CPU Usage</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={60} 
                      size={60} 
                      thickness={6} 
                      sx={{ mr: 2 }} 
                    />
                    <Box>
                      <Typography variant="h4">60%</Typography>
                      <Typography variant="body2" color="text.secondary">
                        System Average
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MemoryIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
                    <Typography variant="h6">Memory</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={45} 
                      size={60} 
                      thickness={6} 
                      sx={{ mr: 2, color: theme.palette.secondary.main }} 
                    />
                    <Box>
                      <Typography variant="h4">45%</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Used Memory
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <StorageIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
                    <Typography variant="h6">Disk</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={78} 
                      size={60} 
                      thickness={6} 
                      sx={{ mr: 2, color: theme.palette.warning.main }} 
                    />
                    <Box>
                      <Typography variant="h4">78%</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Disk Activity
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <NetworkCheckIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                    <Typography variant="h6">Network</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={32} 
                      size={60} 
                      thickness={6} 
                      sx={{ mr: 2, color: theme.palette.info.main }} 
                    />
                    <Box>
                      <Typography variant="h4">32%</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Network Bandwidth
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </React.Fragment>
        )}
      </Grid>
      
      {/* System information */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>System Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Hypervisor</Typography>
            <Typography variant="body2" color="text.secondary">QEMU version 7.2.0</Typography>
            <Typography variant="body2" color="text.secondary">VirtCloud Platform v1.0.0</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Host Resources</Typography>
            <Typography variant="body2" color="text.secondary">Total CPU: 16 cores</Typography>
            <Typography variant="body2" color="text.secondary">Total RAM: 64GB</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default VmMonitorPage;
