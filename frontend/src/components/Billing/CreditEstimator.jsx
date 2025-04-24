import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  Grid,
  TextField,
  Tooltip,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const CreditEstimator = ({ onCostChange }) => {
  const [specs, setSpecs] = useState({
    ram: 2,
    cpu: 1,
    disk: 10,
    hours: 8
  });

  // Credit costs
  const COST_VM_BASE = 0.5;
  const COST_RAM_PER_GB = 0.1;
  const COST_CPU_PER_CORE = 0.2;
  const COST_DISK_PER_GB = 0.05;

  // Calculate total cost
  const calculateCost = () => {
    const vmBaseCost = COST_VM_BASE;
    const ramCost = specs.ram * COST_RAM_PER_GB;
    const cpuCost = specs.cpu * COST_CPU_PER_CORE;
    const diskCost = specs.disk * COST_DISK_PER_GB; // One-time cost
    
    // Cost per hour (excluding disk)
    const costPerHour = vmBaseCost + ramCost + cpuCost;
    
    // Total cost for the specified hours
    const runningCost = costPerHour * specs.hours;
    
    // Total cost including disk
    const totalCost = runningCost + diskCost;
    
    return {
      costPerHour: parseFloat(costPerHour.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      diskCost: parseFloat(diskCost.toFixed(2)),
      runningCost: parseFloat(runningCost.toFixed(2))
    };
  };

  const costs = calculateCost();

  useEffect(() => {
    onCostChange && onCostChange(costs);
  }, [specs, onCostChange, costs]);

  const handleChange = (prop) => (event, newValue) => {
    const value = newValue !== undefined ? newValue : parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0) {
      setSpecs({ ...specs, [prop]: value });
    }
  };

  const tooltips = {
    ram: "RAM affects how much memory your applications can use",
    cpu: "More CPU cores allow better multi-tasking and faster processing",
    disk: "Storage space for your VM's operating system and files",
    hours: "Estimated VM runtime per month"
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
        Estimate Credit Usage
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2">RAM (GB)</Typography>
            <Tooltip title={tooltips.ram} arrow>
              <IconButton size="small">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <Slider
                value={specs.ram}
                min={1}
                max={16}
                step={1}
                onChange={handleChange('ram')}
                aria-labelledby="ram-slider"
                marks={[{ value: 1, label: '1' }, { value: 16, label: '16' }]}
              />
            </Grid>
            <Grid item>
              <TextField
                value={specs.ram}
                onChange={(e) => handleChange('ram')(e)}
                inputProps={{ 
                  step: 1, 
                  min: 1, 
                  max: 16, 
                  type: 'number'
                }}
                size="small"
                sx={{ width: '70px' }}
              />
            </Grid>
          </Grid>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2">CPU Cores</Typography>
            <Tooltip title={tooltips.cpu} arrow>
              <IconButton size="small">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <Slider
                value={specs.cpu}
                min={1}
                max={8}
                step={1}
                onChange={handleChange('cpu')}
                aria-labelledby="cpu-slider"
                marks={[{ value: 1, label: '1' }, { value: 8, label: '8' }]}
              />
            </Grid>
            <Grid item>
              <TextField
                value={specs.cpu}
                onChange={(e) => handleChange('cpu')(e)}
                inputProps={{ 
                  step: 1, 
                  min: 1, 
                  max: 8, 
                  type: 'number' 
                }}
                size="small"
                sx={{ width: '70px' }}
              />
            </Grid>
          </Grid>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2">Disk (GB)</Typography>
            <Tooltip title={tooltips.disk} arrow>
              <IconButton size="small">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <Slider
                value={specs.disk}
                min={5}
                max={100}
                step={5}
                onChange={handleChange('disk')}
                aria-labelledby="disk-slider"
                marks={[{ value: 5, label: '5' }, { value: 100, label: '100' }]}
              />
            </Grid>
            <Grid item>
              <TextField
                value={specs.disk}
                onChange={(e) => handleChange('disk')(e)}
                inputProps={{ 
                  step: 5, 
                  min: 5, 
                  max: 100, 
                  type: 'number' 
                }}
                size="small"
                sx={{ width: '70px' }}
              />
            </Grid>
          </Grid>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2">Hours (per month)</Typography>
            <Tooltip title={tooltips.hours} arrow>
              <IconButton size="small">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <Slider
                value={specs.hours}
                min={1}
                max={720}
                step={1}
                onChange={handleChange('hours')}
                aria-labelledby="hours-slider"
                marks={[
                  { value: 1, label: '1' },
                  { value: 720, label: '720' }
                ]}
              />
            </Grid>
            <Grid item>
              <TextField
                value={specs.hours}
                onChange={(e) => handleChange('hours')(e)}
                inputProps={{ 
                  step: 1, 
                  min: 1, 
                  max: 720, 
                  type: 'number' 
                }}
                size="small"
                sx={{ width: '70px' }}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 2 }} />
      
      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Estimated Cost
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Base VM:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">{COST_VM_BASE} credits/hour</Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">RAM ({specs.ram} GB):</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">{(specs.ram * COST_RAM_PER_GB).toFixed(2)} credits/hour</Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">CPU ({specs.cpu} cores):</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">{(specs.cpu * COST_CPU_PER_CORE).toFixed(2)} credits/hour</Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Disk ({specs.disk} GB):</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">{costs.diskCost} credits (one-time)</Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Hourly Cost:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" fontWeight="bold">{costs.costPerHour} credits/hour</Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Monthly Estimate:</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" fontWeight="bold">{costs.totalCost} credits</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default CreditEstimator;
