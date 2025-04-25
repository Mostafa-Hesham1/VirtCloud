import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem,
  Slider, Typography, Button, Alert, Snackbar, 
  // eslint-disable-next-line no-unused-vars
  Tooltip, // Keep but mark as intentionally unused
  Stepper, Step, StepLabel, Card, CardContent, Dialog,
  DialogTitle, DialogContent, DialogActions, Paper, Divider,
  CircularProgress
} from '@mui/material';
import { useUser } from '../context/UserContext';
import axios from 'axios';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import DescriptionIcon from '@mui/icons-material/Description';

// Plan limits mapping
const PLAN_LIMITS = {
  free: { maxCpu: 2, maxRam: 2, maxDisk: 20 },
  pro: { maxCpu: 4, maxRam: 8, maxDisk: 50 },
  unlimited: { maxCpu: 8, maxRam: 16, maxDisk: 200 },
  payg: { maxCpu: 8, maxRam: 16, maxDisk: 200 }
};

const CreateVmPage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  
  // redirect if not logged in
  useEffect(() => {
    if (!user.isAuthenticated) navigate('/login');
  }, [user, navigate]);

  // Check if first time visitor
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('vmCreationGuideShown');
    if (!hasSeenGuide) {
      setGuideOpen(true);
    }
  }, []);

  // Steps management
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Disk Creation', 'VM Resources', 'Review & Launch'];
  
  // Guide dialog
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  
  // Creating status
  const [isCreating, setIsCreating] = useState(false);
  const [createdDisk, setCreatedDisk] = useState(null);
  
  // form state - disk creation
  const [diskName, setDiskName] = useState('');
  const [diskSize, setDiskSize] = useState('10G');
  const [diskFormat, setDiskFormat] = useState('qcow2');
  
  // form state - VM creation
  const [cpu, setCpu] = useState(1);
  const [ram, setRam] = useState(1);
  const [iso, setIso] = useState('');
  const [displayType, setDisplayType] = useState('sdl');
  
  // notifications
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // cost constants
  const BASE = 0.5; const COST_CPU = 0.2; const COST_RAM = 0.1; const COST_DISK = 0.05;
  // compute costs
  const diskSizeGB = parseInt(diskSize.replace(/[^\d]/g, ''));
  const costPerHour = parseFloat((BASE + cpu * COST_CPU + ram * COST_RAM).toFixed(2));
  const diskCost = parseFloat((diskSizeGB * COST_DISK).toFixed(2));

  // validation
  const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;
  const violatesPlan = user.plan !== 'payg' &&
    (cpu > limits.maxCpu || ram > limits.maxRam || diskSizeGB > limits.maxDisk);
  const insufficientCredits = user.plan === 'payg' && user.credits < (diskCost);
  const canSubmit = diskName && !violatesPlan && !insufficientCredits;
  
  // Step navigation
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // Guide navigation
  const handleGuideNext = () => {
    if (guideStep < guideContent.length - 1) {
      setGuideStep(guideStep + 1);
    } else {
      handleCloseGuide();
    }
  };
  
  const handleGuideBack = () => {
    setGuideStep(Math.max(0, guideStep - 1));
  };
  
  const handleCloseGuide = () => {
    setGuideOpen(false);
    localStorage.setItem('vmCreationGuideShown', 'true');
  };
  
  const guideContent = [
    {
      title: "Welcome to VM Creation Wizard",
      content: (
        <Box>
          <Typography paragraph>
            Welcome to the VirtCloud VM Creation Wizard! This guide will help you understand the process of creating a virtual machine.
          </Typography>
          <Typography paragraph>
            A virtual machine (VM) is a software computer that runs an operating system and applications just like a physical computer.
          </Typography>
        </Box>
      )
    },
    {
      title: "The Two-Step Process",
      content: (
        <Box>
          <Typography paragraph>
            Creating a VM in VirtCloud is a two-step process:
          </Typography>
          <Typography paragraph sx={{ ml: 2 }}>
            <strong>1. Disk Creation:</strong> First, you'll create a virtual disk that will store your VM's operating system and files.
          </Typography>
          <Typography paragraph sx={{ ml: 2 }}>
            <strong>2. VM Configuration:</strong> Then, you'll set up the virtual hardware (CPU, RAM) and launch the VM.
          </Typography>
          <Typography>
            This wizard will guide you through both steps seamlessly.
          </Typography>
        </Box>
      )
    },
    {
      title: "Understanding Plans & Resource Limits",
      content: (
        <Box>
          <Typography variant="subtitle1" gutterBottom>Your current plan: <b>{user.plan}</b></Typography>
          <Typography paragraph>
            Each plan has different resource limits:
          </Typography>
          <Box sx={{ mb: 2 }}>
            {Object.entries(PLAN_LIMITS).map(([plan, limits]) => (
              <Typography key={plan} sx={{ ml: 2 }}>
                <b>{plan.charAt(0).toUpperCase() + plan.slice(1)}:</b> {limits.maxCpu} CPU, {limits.maxRam}GB RAM, {limits.maxDisk}GB Disk
              </Typography>
            ))}
          </Box>
          <Typography>
            Your current credits: <b>{user.credits}</b>
          </Typography>
        </Box>
      )
    },
    {
      title: "Cost & Credits System",
      content: (
        <Box>
          <Typography paragraph>
            VMs cost credits based on their resource usage:
          </Typography>
          <Typography sx={{ ml: 2 }}>• Base cost: {BASE} credits/hour</Typography>
          <Typography sx={{ ml: 2 }}>• CPU: {COST_CPU} credits per core/hour</Typography>
          <Typography sx={{ ml: 2 }}>• RAM: {COST_RAM} credits per GB/hour</Typography>
          <Typography sx={{ ml: 2 }}>• Disk: {COST_DISK} credits per GB (one-time)</Typography>
          
          <Typography variant="subtitle2" color="primary" mt={2}>
            Pay-as-you-go plans deduct credits in real time, while fixed plans have preset limits.
          </Typography>
        </Box>
      )
    }
  ];

  async function validateToken() {
    try {
      const res = await axios.get('http://localhost:8000/auth/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // ...existing success logic...
    } catch (err) {
      console.error('Token validation failed:', err);
      if (err.code === 'ECONNREFUSED') {
        setError('Cannot reach auth server – is the backend running?');
      } else if (err.response?.status === 404) {
        setError('Auth endpoint not found (/auth/me).');
      } else {
        setError('Token validation error. Please login again.');
      }
    }
  }

  const handleCreateDisk = async () => {
    setIsCreating(true);
    try {
      const payload = {
        name: diskName,
        size: diskSize,
        format: diskFormat
      };
      
      const resp = await axios.post('http://localhost:8000/vm/create-disk', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setCreatedDisk({
        name: `${diskName}.${diskFormat}`,
        path: resp.data.path,
        format: diskFormat
      });
      
      setSuccess('Disk created successfully! Now configure your VM.');
      handleNext();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create disk');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateVM = async () => {
    if (!createdDisk) {
      setError('Please create a disk first.');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        disk_name: createdDisk.name,
        iso_path: iso || undefined,
        memory_mb: ram * 1024,
        cpu_count: cpu,
        display: displayType
      };
      
      const resp = await axios.post('http://localhost:8000/vm/create-vm', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccess('VM launched successfully! (PID: ' + resp.data.pid + ')');
      
      // Reset form for future use
      setTimeout(() => {
        setActiveStep(0);
        setDiskName('');
        setCpu(1);
        setRam(1);
        setCreatedDisk(null);
      }, 3000);
      
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to launch VM');
    } finally {
      setIsCreating(false);
    }
  };
  
  const getStepContent = (step) => {
    switch (step) {
      case 0: // Disk Creation
        return (
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Virtual Disk Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                First, let's create a virtual disk that will store your operating system and data.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Disk Name"
                    fullWidth
                    value={diskName}
                    onChange={e => setDiskName(e.target.value)}
                    required
                    helperText="Name for your virtual disk (no extension needed)"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Disk Format</InputLabel>
                    <Select 
                      value={diskFormat} 
                      label="Disk Format" 
                      onChange={e => setDiskFormat(e.target.value)}
                    >
                      <MenuItem value="qcow2">QCOW2 (Recommended)</MenuItem>
                      <MenuItem value="raw">RAW</MenuItem>
                    </Select>
                    <Typography variant="caption" color="text.secondary">
                      QCOW2 supports snapshots and is more space-efficient
                    </Typography>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Disk Size</Typography>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <TextField
                            value={diskSize.replace('G', '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d+$/.test(value)) {
                                setDiskSize(`${value}G`);
                              }
                            }}
                            onBlur={() => {
                              // Parse the current value
                              let size = parseInt(diskSize);
                              if (isNaN(size)) {
                                setDiskSize('10G'); // Default to 10GB if invalid
                                return;
                              }
                              
                              // Apply minimum size (QEMU typically needs at least 1GB)
                              if (size < 1) {
                                setDiskSize('1G');
                              }
                              
                              // Enforce maximum size based on plan
                              const maxSize = user.plan === 'payg' ? 200 : limits.maxDisk;
                              if (size > maxSize) {
                                setDiskSize(`${maxSize}G`);
                              }
                            }}
                            label="Disk Size"
                            type="number"
                            fullWidth
                            InputProps={{
                              endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>GB</Typography>,
                              inputProps: {
                                min: 1,
                                max: user.plan === 'payg' ? 200 : limits.maxDisk
                              }
                            }}
                          />
                        </Box>

                        {/* Size slider with visible marks and better labeling */}
                        <Box sx={{ px: 1, mt: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            Drag to adjust size:
                          </Typography>
                          <Slider 
                            value={parseInt(diskSize) || 1}
                            min={1}
                            max={user.plan === 'payg' ? 200 : limits.maxDisk}
                            step={1}
                            marks={[
                              { value: 1, label: '1GB' },
                              { value: Math.round((user.plan === 'payg' ? 200 : limits.maxDisk) / 2), label: `${Math.round((user.plan === 'payg' ? 200 : limits.maxDisk) / 2)}GB` },
                              { value: user.plan === 'payg' ? 200 : limits.maxDisk, label: `${user.plan === 'payg' ? 200 : limits.maxDisk}GB` }
                            ]}
                            valueLabelDisplay="auto"
                            onChange={(e, v) => setDiskSize(`${v}G`)}
                            aria-label="Disk size slider"
                            sx={{ 
                              '& .MuiSlider-thumb': {
                                height: 24,
                                width: 24,
                              },
                              '& .MuiSlider-mark': {
                                height: 8,
                              }
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        You can allocate between 1GB and {user.plan === 'payg' ? 200 : limits.maxDisk}GB for your VM disk.
                      </Typography>
                      <Typography variant="body2">
                        Cost: <strong>{diskCost}</strong> credits
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
              
              {diskSizeGB > limits.maxDisk && user.plan !== 'payg' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  This disk size exceeds your plan limit of {limits.maxDisk}GB.
                </Alert>
              )}
            </CardContent>
            <CardContent sx={{ bgcolor: 'background.default', borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="body2">
                <strong>Cost estimate:</strong> {diskCost} credits (one-time charge)
              </Typography>
            </CardContent>
          </Card>
        );
        
      case 1: // VM Configuration
        return (
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Virtual Machine Resources
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Now configure the hardware resources for your virtual machine.
              </Typography>
              
              <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="body2" color="white">
                  <strong>Disk created:</strong> {createdDisk?.name}
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" gutterBottom>CPU Cores</Typography>
                    <FormControl fullWidth>
                      <Select 
                        value={cpu} 
                        onChange={e => setCpu(e.target.value)}
                        renderValue={(value) => `${value} CPU cores`}
                      >
                        {[...Array(8)].map((_,i)=>(
                          <MenuItem key={i+1} value={i+1}>
                            {i+1} core{i > 0 ? 's' : ''} 
                            {i+1 > limits.maxCpu && user.plan !== 'payg' && ' (Exceeds plan)'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary">
                      Plan limit: {limits.maxCpu} cores
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Cost: {(cpu * COST_CPU).toFixed(2)} credits/hour
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" gutterBottom>RAM Memory</Typography>
                    <Box sx={{ px: 1 }}>
                      <Slider 
                        value={ram} 
                        min={1} 
                        max={user.plan === 'payg' ? 16 : limits.maxRam} 
                        step={1}
                        valueLabelDisplay="auto"
                        onChange={(e,v) => setRam(v)} 
                        marks={[
                          { value: 1, label: '1GB' },
                          { value: limits.maxRam, label: `${limits.maxRam}GB` }
                        ]}
                      />
                    </Box>
                    <Typography variant="body2" align="center">
                      Selected: <strong>{ram} GB</strong> ({ram * 1024} MB)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Plan limit: {limits.maxRam} GB
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Cost: {(ram * COST_RAM).toFixed(2)} credits/hour
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Operating System</Typography>
                    <FormControl fullWidth>
                      <InputLabel>Select OS</InputLabel>
                      <Select 
                        value={iso} 
                        label="Select OS"
                        onChange={e => setIso(e.target.value)}
                      >
                        <MenuItem value="C:\\Mostafa\\cloud-Msa-course\\IsoFiles\\ubuntu-24.04.2-desktop-amd64.iso">Ubuntu</MenuItem>
                        <MenuItem value="C:\\Mostafa\\cloud-Msa-course\\IsoFiles\\lubuntu-24.04.2-desktop-amd64.iso">Lubuntu</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary">
                      The OS will be installed on your virtual disk
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Display Type</Typography>
                    <FormControl fullWidth>
                      <InputLabel>Display Type</InputLabel>
                      <Select 
                        value={displayType} 
                        label="Display Type"
                        onChange={e => setDisplayType(e.target.value)}
                      >
                        <MenuItem value="sdl">SDL (Desktop Window)</MenuItem>
                        <MenuItem value="vnc">VNC (Remote Access)</MenuItem>
                        <MenuItem value="none">Headless (No UI)</MenuItem>
                      </Select>
                    </FormControl>
                  </Paper>
                </Grid>
              </Grid>
              
              {violatesPlan && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  This configuration exceeds your plan limits (Max CPU {limits.maxCpu}, RAM {limits.maxRam} GB)
                </Alert>
              )}
            </CardContent>
            <CardContent sx={{ bgcolor: 'background.default', borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="body2">
                <strong>Cost estimate:</strong> {costPerHour} credits per hour
              </Typography>
            </CardContent>
          </Card>
        );
        
      case 2: // Review
        return (
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Review Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Please review your VM configuration before launching.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle1">Disk Configuration</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ ml: 1 }}>
                      <Typography><strong>Name:</strong> {createdDisk?.name || `${diskName}.${diskFormat}`}</Typography>
                      <Typography><strong>Format:</strong> {diskFormat}</Typography>
                      <Typography><strong>Size:</strong> {diskSize}</Typography>
                      <Typography sx={{ mt: 1 }}><strong>Cost:</strong> {diskCost} credits (one-time)</Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle1">VM Configuration</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ ml: 1 }}>
                      <Typography><strong>OS:</strong> {iso}</Typography>
                      <Typography><strong>CPU:</strong> {cpu} cores</Typography>
                      <Typography><strong>RAM:</strong> {ram} GB ({ram * 1024} MB)</Typography>
                      <Typography><strong>Display:</strong> {displayType}</Typography>
                      <Typography sx={{ mt: 1 }}><strong>Cost:</strong> {costPerHour} credits/hour</Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                <Typography variant="subtitle1">Total Cost Summary</Typography>
                <Typography>• Initial disk cost: {diskCost} credits</Typography>
                <Typography>• Running VM cost: {costPerHour} credits per hour</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography>Available credits: <strong>{user.credits}</strong></Typography>
              </Box>
              
              {violatesPlan && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  This configuration exceeds your plan limits. Please go back and adjust your settings.
                </Alert>
              )}
              
              {insufficientCredits && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  You don't have enough credits for this configuration.
                </Alert>
              )}
              
              {user.plan === 'payg' && !insufficientCredits && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Configuration is within your available credits ✅
                </Alert>
              )}
            </CardContent>
          </Card>
        );
        
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Create Virtual Machine</Typography>
        <Button 
          startIcon={<HelpOutlineIcon />} 
          onClick={() => setGuideOpen(true)}
          variant="outlined"
        >
          Guide
        </Button>
      </Box>
      
      {/* Steps indicator */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {/* Current step content */}
      {getStepContent(activeStep)}
      
      {/* Plan & Credits info card */}
      <Card variant="outlined" sx={{ mt: 3, mb: 2, bgcolor: 'background.default' }}>
        <CardContent>
          <Typography variant="subtitle1">Account Status</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
            <Typography><strong>Plan:</strong> {user.plan}</Typography>
            <Typography><strong>Credits:</strong> {user.credits}</Typography>
          </Box>
        </CardContent>
      </Card>
      
      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          disabled={activeStep === 0 || isCreating}
        >
          Back
        </Button>
        
        <Box>
          {activeStep === 0 && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleCreateDisk}
              disabled={!diskName || diskSizeGB > limits.maxDisk || isCreating}
              startIcon={isCreating ? <CircularProgress size={20} /> : null}
            >
              {isCreating ? 'Creating Disk...' : 'Create Disk & Continue'}
            </Button>
          )}
          
          {activeStep === 1 && (
            <Button 
              variant="contained" 
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              disabled={violatesPlan || isCreating}
            >
              Review Configuration
            </Button>
          )}
          
          {activeStep === 2 && (
            <Button 
              variant="contained" 
              color="success"
              onClick={handleCreateVM}
              disabled={!canSubmit || !createdDisk || isCreating}
              startIcon={isCreating ? <CircularProgress size={20} /> : null}
            >
              {isCreating ? 'Launching VM...' : 'Launch VM'}
            </Button>
          )}
        </Box>
      </Box>
      
      {/* First-time user guide dialog */}
      <Dialog 
        open={guideOpen} 
        onClose={handleCloseGuide}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {guideContent[guideStep].title}
        </DialogTitle>
        <DialogContent dividers>
          {guideContent[guideStep].content}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGuide}>Skip Guide</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button 
            disabled={guideStep === 0} 
            onClick={handleGuideBack}
          >
            Back
          </Button>
          <Button 
            variant="contained" 
            onClick={handleGuideNext}
          >
            {guideStep === guideContent.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notifications */}
      <Snackbar open={!!success} autoHideDuration={6000} onClose={()=>setSuccess('')}> 
        <Alert onClose={()=>setSuccess('')} severity="success">{success}</Alert> 
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={()=>setError('')}> 
        <Alert onClose={()=>setError('')} severity="error">{error}</Alert> 
      </Snackbar>
    </Box>
  );
};

export default CreateVmPage;
