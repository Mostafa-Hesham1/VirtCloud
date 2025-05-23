import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Tabs, Tab, Paper, Grid, Card, CardContent, 
  Avatar, 
  // eslint-disable-next-line no-unused-vars
  Divider, // Keep but mark as intentionally unused
  CircularProgress, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, FormControl, 
  InputLabel, Select, MenuItem, Alert, AlertTitle, Tooltip, LinearProgress,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import axios from 'axios';

// Icons
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import ComputerIcon from '@mui/icons-material/Computer';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InfoIcon from '@mui/icons-material/Info';
import ResizeIcon from '@mui/icons-material/AspectRatio';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete'; // Remove the eslint-disable comment
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';

// Import CreateVmPage for integration
import CreateVmPage from './CreateVmPage';
import { renameDisk as apiRenameDisk } from '../api/vm';

// Import Docker management
import DockerManagement from '../components/docker/DockerManagement';
import { DockerProvider } from '../context/DockerContext';

// Stable Rename Disk dialog component
function RenameDiskDialog({ open, currentName, value, onChange, onClose, onSubmit }) {
  return (
    <Dialog keepMounted disablePortal transitionDuration={0} open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EditIcon sx={{ mr: 1 }} />
          Rename Disk
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="New Name"
          value={value}
          onChange={onChange}
          margin="normal"
          autoFocus
        />
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Note</AlertTitle>
          Renaming '{currentName}' will update all references in the system.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} color="primary" variant="contained">Rename</Button>
      </DialogActions>
    </Dialog>
  );
}

// Stable Convert Disk dialog component
function ConvertDiskDialog({ open, currentName = '', targetFormat, targetName, onFormatChange, onNameChange, onClose, onSubmit, operationResult, loading }) {
  // Derive extension safely
  const currentExt = currentName.split('.').pop() || '';
  return (
    <Dialog keepMounted disablePortal transitionDuration={0} open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SwapHorizIcon sx={{ mr: 1 }} />
          Convert Disk: {currentName}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography paragraph>
          Convert your disk to a different format. The original disk will remain unchanged.
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>Target Format</InputLabel>
          <Select value={targetFormat} onChange={onFormatChange} label="Target Format">
            <MenuItem value="qcow2">QCOW2 (Supports snapshots, efficient)</MenuItem>
            <MenuItem value="raw">RAW (Better performance, larger size)</MenuItem>
            <MenuItem value="vmdk">VMDK (Compatible with VMware tools and workflows)</MenuItem>
            <MenuItem value="vhdx">VHDX (Microsoft Hyper-V format, good for Windows VMs)</MenuItem>
            <MenuItem value="vdi">VDI (Best for VirtualBox migrations)</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Target Filename"
          fullWidth
          value={targetName}
          onChange={onNameChange}
          helperText="Enter name for the converted disk"
          margin="normal"
        />
        {operationResult && (
          <Alert severity={operationResult.success ? "success" : "error"} sx={{ mt: 2 }}>
            {operationResult.message}
          </Alert>
        )}
        {/* Prevent converting to same format */}
        {currentName && currentExt === targetFormat && (
          <Typography color="text.secondary" sx={{ mx: 3, mb: 1 }}>
            Disk is already in {targetFormat} format.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={onSubmit}
          disabled={loading || currentExt === targetFormat}
        >
          {loading
            ? <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Converting...
              </Box>
            : 'Convert Disk'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Stable Start VM dialog component
function StartVmDialogComp({ open, vm, includeIso, onIncludeChange, onClose, onSubmit, loading }) {
  const theme = useTheme();
  if (!vm) return null;
  const hasIso = Boolean(vm.iso_path);
  return (
    <Dialog keepMounted disablePortal transitionDuration={0} open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PlayArrowIcon sx={{ mr: 1, color: theme.palette.success.main }} />
          Start Virtual Machine
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
          {vm.disk_name.split('.')[0]}
        </Typography>
        {hasIso ? (
          <> {/* ISO selection UI */}
            {/* existing ISO selection JSX */}
            <Box sx={{ mt: 1 }}>
              <Button
                variant={!includeIso ? "contained" : "outlined"}
                color="primary"
                onClick={() => onIncludeChange(false)}
                sx={{ mr: 1 }}
              >
                Start without ISO
              </Button>
              <Button
                variant={includeIso ? "contained" : "outlined"}
                color="secondary"
                onClick={() => onIncludeChange(true)}
              >
                Include ISO
              </Button>
            </Box>
            <Alert severity="info" sx={{ mt: 3 }}>
              <AlertTitle>Tip</AlertTitle>
              If this is your first time booting, include the ISO to install the OS. Otherwise you can start without it.
            </Alert>
          </>
        ) : (
          <Typography>Are you sure you want to start this VM?</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="success" onClick={onSubmit} disabled={loading}>
          {loading ? <><CircularProgress size={20} sx={{ mr:1 }} />Starting...</> : 'Start VM'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Stable Resize Disk dialog component
const ResizeDiskDialogComp = React.memo(function ResizeDiskDialogComp({ open, selectedDisk, resizeAmount, setResizeAmount, operationResult, onClose, onSubmit }) {
  const theme = useTheme();
  return (
    <Dialog keepMounted disablePortal transitionDuration={0} open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ResizeIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
          Resize Disk: {selectedDisk}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography paragraph>
          Specify how much to increase the disk size. Use format like +5G (add 5GB) or +500M (add 500MB).
        </Typography>
        
        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'info.50' }}>
          <CardContent sx={{ py: 1 }}>
            <Typography variant="body2" color="info.main">
              <InfoIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
              You can only increase disk size, not decrease it. The VM must be stopped before resizing.
            </Typography>
          </CardContent>
        </Card>
        
        <FormControl variant="outlined" fullWidth>
          <InputLabel>Resize Amount</InputLabel>
          <Select
            value={resizeAmount}
            onChange={(e) => setResizeAmount(e.target.value)}
            label="Resize Amount"
          >
            <MenuItem value="+1G">+1 GB</MenuItem>
            <MenuItem value="+2G">+2 GB</MenuItem>
            <MenuItem value="+5G">+5 GB</MenuItem>
            <MenuItem value="+10G">+10 GB</MenuItem>
            <MenuItem value="+20G">+20 GB</MenuItem>
            <MenuItem value="+50G">+50 GB</MenuItem>
            <MenuItem value="custom">Custom Size...</MenuItem>
          </Select>
        </FormControl>
        
        {resizeAmount === 'custom' && (
          <TextField
            label="Custom Resize Amount"
            fullWidth
            placeholder="+5G"
            onChange={(e) => setResizeAmount(e.target.value)}
            helperText="Format: +5G adds 5 gigabytes, +500M adds 500 megabytes"
            margin="normal"
          />
        )}
        
        {operationResult && (
          <Alert 
            severity={operationResult.success ? "success" : "error"}
            sx={{ mt: 2 }}
          >
            {operationResult.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={onSubmit}
          disabled={!resizeAmount || (resizeAmount === 'custom' && !resizeAmount.match(/^\+[0-9]+[MG]$/))}
        >
          Resize Disk
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// Stable Edit Resources dialog component
const EditResourcesDialogComp = React.memo(function EditResourcesDialogComp({ open, selectedVmToEdit, newCpuCount, newRam, setNewCpuCount, setNewRam, checkPlanLimits, calculateResourceCosts, userPlan, planLimits, onClose, onSubmit }) {
  const theme = useTheme();
  if (!selectedVmToEdit) return null;
  return (
    <Dialog keepMounted disablePortal transitionDuration={0} open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MemoryIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          Edit VM Resources
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
          {selectedVmToEdit.disk_name.split('.')[0]}
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>CPU Cores</Typography>
              <FormControl fullWidth>
                <Select 
                  value={newCpuCount} 
                  onChange={e => setNewCpuCount(e.target.value)}
                  renderValue={(value) => `${value} CPU cores`}
                  error={checkPlanLimits().cpuExceeded}
                >
                  {[...Array(8)].map((_,i)=>(
                    <MenuItem key={i+1} value={i+1}>
                      {i+1} core{i > 0 ? 's' : ''} 
                      {i+1 > planLimits.maxCpu && userPlan !== 'payg' && 
                        <Typography component="span" color="error" sx={{ ml: 1 }}>
                          (Exceeds plan)
                        </Typography>
                      }
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Current: {selectedVmToEdit.cpu_count} cores | Plan limit: {planLimits.maxCpu} cores
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Cost: {(newCpuCount * 0.2).toFixed(2)} credits/hour
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>RAM (GB)</Typography>
              <FormControl fullWidth>
                <Select 
                  value={newRam} 
                  onChange={e => setNewRam(e.target.value)}
                  renderValue={(value) => `${value} GB RAM`}
                  error={checkPlanLimits().ramExceeded}
                >
                  {[...Array(17)].map((_,i)=>(
                    <MenuItem key={i+1} value={i+1}>
                      {i+1} GB 
                      {i+1 > planLimits.maxRam && userPlan !== 'payg' && 
                        <Typography component="span" color="error" sx={{ ml: 1 }}>
                          (Exceeds plan)
                        </Typography>
                      }
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Current: {selectedVmToEdit.memory_mb/1024} GB | Plan limit: {planLimits.maxRam} GB
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Cost: {(newRam * 0.1).toFixed(2)} credits/hour
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Cost Summary</Typography>
          <Typography variant="body2">
            New Hourly Rate: <strong>{calculateResourceCosts(newCpuCount, newRam).newRate} credits/hour</strong>
          </Typography>
          <Typography variant="body2">
            Difference: <strong>{calculateResourceCosts(newCpuCount, newRam).difference} credits/hour</strong> ({calculateResourceCosts(newCpuCount, newRam).percentChange}% change)
          </Typography>
        </Paper>
        
        {checkPlanLimits().violatesPlan && (
          <Alert severity="error" sx={{ mt: 2 }}>
            This configuration exceeds your plan limits (Max CPU {planLimits.maxCpu}, RAM {planLimits.maxRam} GB).
            Please upgrade your plan or choose a lower configuration.
          </Alert>
        )}
        
        {userPlan === 'payg' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            With your pay-as-you-go plan, these changes will affect your credit usage immediately when the VM is running.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={onSubmit}
          disabled={checkPlanLimits().violatesPlan || (newCpuCount === selectedVmToEdit.cpu_count && newRam === selectedVmToEdit.memory_mb/1024)}
        >
          Update Resources
        </Button>
      </DialogActions>
    </Dialog>
  );
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, refreshUser } = useUser(); // Add refreshUser from context
  const [authLoading, setAuthLoading] = useState(false); // Initialize to false instead of true
  const [error, setError] = useState(''); // Add error state
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Moved this line up to ensure it's initialized before use

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthLoading(true);
        // Check if refreshUser is a function before calling it
        if (typeof refreshUser === 'function') {
          const success = await refreshUser();
          if (!success) {
            console.log("Dashboard: Authentication failed, redirecting to login");
            navigate('/login');
          }
        } else {
          console.warn("Dashboard: refreshUser is not a function, checking token directly");
          // Fallback authentication check
          const token = localStorage.getItem('token');
          if (!token) {
            console.log("Dashboard: No token found, redirecting to login");
            navigate('/login');
          }
        }
      } catch (error) {
        console.error("Dashboard: Error during authentication check", error);
        setError("An error occurred while checking authentication. Please try again.");
      } finally {
        setAuthLoading(false);
      }
    };

    // Skip auth check if user is already authenticated
    if (user.isAuthenticated) {
      console.log("Dashboard: User already authenticated, skipping auth check");
      setAuthLoading(false);
      return;
    }

    // Add timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
      if (authLoading) {
        console.log("Dashboard: Auth check timed out, resetting loading state");
        setAuthLoading(false);
      }
    }, 5000); // 5 second timeout

    checkAuth();

    // Cleanup timeout on unmount
    return () => clearTimeout(authTimeout);
  }, [refreshUser, navigate, user.isAuthenticated]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setVmLoading(true);
        const token = localStorage.getItem('token');
        const [vmResponse, creditsResponse] = await Promise.all([
          axios.get('http://localhost:8000/vm/list', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:8000/user/credits', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setVms(vmResponse.data.vms || []);
        setDisplayedCredits(creditsResponse.data.credits || 0);
      } catch (error) {
        console.error("Dashboard: Error fetching data", error);
        setError("Failed to load data. Please try again later.");
      } finally {
        setVmLoading(false);
      }
    };

    if (user.isAuthenticated && !authLoading) {
      fetchData(); // Only fetch data if the user is authenticated and authLoading is false
    }
  }, [user.isAuthenticated, authLoading, refreshTrigger]);

  const [tabValue, setTabValue] = useState(0);
  const [vms, setVms] = useState([]);
  const [vmLoading, setVmLoading] = useState(true); // Renamed from 'loading' to avoid duplicate declaration
  // Track running VM timers (in seconds) and live cost/credits
  const [runningTimers, setRunningTimers] = useState({});
  const [liveCost, setLiveCost] = useState(0);
  const [displayedCredits, setDisplayedCredits] = useState(0); // Initialize to 0 instead of user.credits
  const [startLoading, setStartLoading] = useState(false);
  const [lastFetchedCredits, setLastFetchedCredits] = useState(0); // Add this to track server-fetched credits

  // Disk operation dialogs
  const [diskInfoDialog, setDiskInfoDialog] = useState(false);
  const [resizeDiskDialog, setResizeDiskDialog] = useState(false);
  const [convertDiskDialog, setConvertDiskDialog] = useState(false);
  const [renameDiskDialog, setRenameDiskDialog] = useState(false);
  const [selectedDisk, setSelectedDisk] = useState(null);
  const [diskInfo, setDiskInfo] = useState('');
  
  // Resize disk form
  const [resizeAmount, setResizeAmount] = useState('+5G');
  
  // Convert disk form
  const [targetFormat, setTargetFormat] = useState('raw');
  const [targetName, setTargetName] = useState('');
  
  // Add handler to synchronize targetName when format changes
  const handleFormatChange = (e) => {
    const newFmt = e.target.value;
    setTargetFormat(newFmt);
    if (selectedDisk) {
      const base = selectedDisk.split('.')[0];
      setTargetName(`${base}.${newFmt}`);
    }
  };

  // Rename disk form
  const [newDiskName, setNewDiskName] = useState('');
  
  // Results
  const [operationResult, setOperationResult] = useState(null);
  const [convertLoading, setConvertLoading] = useState(false);

  // Add state for VM actions
  const [processingVmId, setProcessingVmId] = useState(null);
  
  // Add state for VM deletion
  const [vmDeleteDialog, setVmDeleteDialog] = useState(false);
  const [selectedVmToDelete, setSelectedVmToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Add state for VM start dialog
  const [vmStartDialog, setVmStartDialog] = useState(false);
  const [selectedVmToStart, setSelectedVmToStart] = useState(null);
  const [includeIso, setIncludeIso] = useState(false);
  
  // Add state for resource editing
  const [editResourcesDialog, setEditResourcesDialog] = useState(false);
  const [selectedVmToEdit, setSelectedVmToEdit] = useState(null);
  const [newCpuCount, setNewCpuCount] = useState(1);
  const [newRam, setNewRam] = useState(1);
  
  // Cost constants (match with CreateVmPage)
  const BASE = 0.5;
  const COST_CPU = 0.2;
  const COST_RAM = 0.1;
  
  // Get plan limits
  const PLAN_LIMITS = {
    free: { maxCpu: 2, maxRam: 2, maxDisk: 20 },
    pro: { maxCpu: 4, maxRam: 8, maxDisk: 50 },
    unlimited: { maxCpu: 8, maxRam: 16, maxDisk: 200 },
    payg: { maxCpu: 8, maxRam: 16, maxDisk: 200 }
  };
  
  // Parse disk info function
  const parseDiskInfo = (rawInfo) => {
    if (!rawInfo) return null;
    
    try {
      // Extract key information using regex patterns
      const fileMatch = rawInfo.match(/file: (.+)/);
      const virtualSizeMatch = rawInfo.match(/virtual size: ([0-9.]+) ([KMG]iB)/);
      const diskSizeMatch = rawInfo.match(/disk size: ([0-9.]+) ([KMG])/);
      const formatMatch = rawInfo.match(/file format: (\w+)/);
      const clusterSizeMatch = rawInfo.match(/cluster_size: (\d+)/);
      const encryptedMatch = rawInfo.includes('encrypted: yes');
      const backingFileMatch = rawInfo.match(/backing file: (.+)/);
      
      return {
        file: fileMatch ? fileMatch[1] : 'Unknown',
        virtualSize: virtualSizeMatch ? `${virtualSizeMatch[1]} ${virtualSizeMatch[2]}` : 'Unknown',
        diskSize: diskSizeMatch ? `${diskSizeMatch[1]} ${diskSizeMatch[2]}` : 'Unknown',
        format: formatMatch ? formatMatch[1] : 'Unknown',
        clusterSize: clusterSizeMatch ? `${clusterSizeMatch[1]} bytes` : 'N/A',
        encrypted: encryptedMatch ? 'Yes' : 'No',
        backingFile: backingFileMatch ? backingFileMatch[1] : 'None',
        usagePercent: diskSizeMatch && virtualSizeMatch ? 
          Math.min(100, Math.round((parseFloat(diskSizeMatch[1]) * getMultiplier(diskSizeMatch[2])) / 
          (parseFloat(virtualSizeMatch[1]) * getMultiplier(virtualSizeMatch[2])) * 100)) : 0
      };
    } catch (e) {
      console.error("Error parsing disk info:", e);
      return null;
    }
  };

  // Helper to calculate size multipliers
  const getMultiplier = (unit) => {
    switch (unit) {
      case 'K': case 'KiB': return 1;
      case 'M': case 'MiB': return 1024;
      case 'G': case 'GiB': return 1024 * 1024;
      default: return 1;
    }
  };

  // Redirect if not logged in - with improved handling
  useEffect(() => {
    console.log("Dashboard auth check:", { 
      isAuthenticated: user.isAuthenticated, 
      loading: authLoading,
      email: user.email
    });
    
    // Only redirect if authentication check is complete AND user is not authenticated
    if (!authLoading && !user.isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      navigate('/login');
    } else if (!authLoading && user.isAuthenticated) {
      console.log("User is authenticated, staying on dashboard");
    }
  }, [user.isAuthenticated, user.email, navigate, authLoading]); // Added missing dependency

  // Fetch user's VMs when authenticated
  useEffect(() => {
    if (!authLoading && user.isAuthenticated) {
      console.log("Fetching VMs for authenticated user:", user.email);
      fetchUserVms();
    }
  }, [refreshTrigger, user.isAuthenticated, user.email, authLoading]); // Added missing dependency

  // Initialize and update timers for running VMs
  useEffect(() => {
    const interval = setInterval(() => {
      setRunningTimers(prev => {
        const next = {};
        let needsSync = false;
        
        Object.entries(prev).forEach(([id, sec]) => {
          const newSec = sec + 1;
          next[id] = newSec;
          
          // Accumulate deductions and apply them once per minute
          if (newSec % 60 === 0) {
            needsSync = true;
            const token = localStorage.getItem('token');
            const vm = vms.find(vm => vm.id === id);
            if (vm) {
              // Calculate cost for a full minute
              const deductAmount = (1/60) * (BASE + vm.cpu_count * COST_CPU + (vm.memory_mb/1024) * COST_RAM);
              
              // Add a small delay between requests to prevent race conditions
              setTimeout(() => {
                console.log(`Deducting credits: ${deductAmount.toFixed(4)} for VM ${vm.id} (${vm.disk_name})`);
                
                axios.post('http://localhost:8000/vm/deduct-credits',
                  { 
                    vm_id: id, 
                    amount: deductAmount,
                    deduction_period: "minute"
                  },
                  { headers: { Authorization: `Bearer ${token}` } }
                ).then(response => {
                  console.log("Credit deduction response:", response.data);
                  
                  // Use the new balance directly from the response
                  const newBalance = response.data.new_balance;
                  setLastFetchedCredits(newBalance);
                  
                  // Update displayed credits based on new balance minus running costs
                  const liveCredits = Math.max(0, newBalance - liveCost);
                  setDisplayedCredits(liveCredits);
                }).catch(err => {
                  console.error('Credit deduction error:', err);
                  // On error, force a sync with server
                  syncCreditsWithServer();
                });
              }, id.charCodeAt(0) % 5 * 100);
            }
          }
        });
        
        // If this is not a credit deduction interval, but we're at 10-sec mark, sync credits
        if (!needsSync && Object.keys(next).length > 0) {
          const firstVmSec = next[Object.keys(next)[0]];
          if (firstVmSec % 10 === 0) {
            syncCreditsWithServer();
          }
        }
        
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [vms, liveCost]);

  const fetchUserVms = async () => {
    setVmLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log("Using token for VM fetch:", token ? `${token.substring(0, 15)}...` : "No token!");
      
      const response = await axios.get('http://localhost:8000/vm/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("VM data received:", response.data);
      const loadedVms = response.data.vms || [];
      setVms(loadedVms);
      
      // Initialize running VM timers with proper timezone handling
      const timers = {};
      const now = new Date().getTime();
      
      loadedVms.forEach(vm => {
        if (vm.status === 'running' && vm.started_at) {
          // Convert the ISO string to UTC timestamp, then to local time
          const startTimeUTC = new Date(vm.started_at).getTime();
          const elapsedSeconds = Math.max(0, Math.floor((now - startTimeUTC) / 1000));
          
          console.log(`VM ${vm.id} - Start Time: ${vm.started_at}`);
          console.log(`    → Parsed as: ${new Date(vm.started_at).toISOString()}`);
          console.log(`    → Current time: ${new Date().toISOString()}`);
          console.log(`    → Elapsed seconds: ${elapsedSeconds}`);
          console.log(`    → Elapsed formatted: ${new Date(elapsedSeconds * 1000).toISOString().substr(11, 8)}`);
          
          timers[vm.id] = elapsedSeconds;
        }
      });
      
      setRunningTimers(timers);
    } catch (err) {
      console.error('Error fetching VMs:', err);
      // If unauthorized, this could indicate token expiration
      if (err.response?.status === 401) {
        console.log("Unauthorized - token may be invalid");
        setError('Your session has expired. Please login again.');
      } else {
        setError('Failed to load virtual machines. Please try again later.');
      }
    } finally {
      setVmLoading(false);
    }
  };

  // New function to fetch user credits from server
  const fetchUserCredits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/user/credits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Fetched user credits:", response.data.credits);
      
      const newCredits = response.data.credits;
      // Only update if the credits have actually changed
      if (newCredits !== lastFetchedCredits) {
        setDisplayedCredits(newCredits);
        setLastFetchedCredits(newCredits);
      }
      return newCredits;
    } catch (err) {
      console.error("Failed to fetch user credits:", err);
      return null;
    }
  };

  // Call fetchUserCredits when component mounts and after authentication
  useEffect(() => {
    if (!authLoading && user.isAuthenticated) {
      console.log("Fetching user credits after authentication");
      fetchUserCredits();
    }
  }, [authLoading, user.isAuthenticated]);

  // Also fetch credits after each refresh
  useEffect(() => {
    if (user.isAuthenticated) {
      fetchUserCredits();
    }
  }, [refreshTrigger]);

  // Add a useEffect to calculate live costs and update displayed credits accordingly
  useEffect(() => {
    // Calculate total cost for all running VMs
    let totalCost = 0;
    Object.entries(runningTimers).forEach(([id, seconds]) => {
      const vm = vms.find(vm => vm.id === id);
      if (vm) {
        const vmCost = (seconds / 3600) * (BASE + vm.cpu_count * COST_CPU + (vm.memory_mb/1024) * COST_RAM);
        totalCost += vmCost;
      }
    });
    
    // Round to 2 decimal places for consistency
    const roundedCost = parseFloat(totalCost.toFixed(2));
    
    // Only update if the cost has actually changed
    if (roundedCost !== liveCost) {
      setLiveCost(roundedCost);
      
      // Calculate and update displayed credits based on server balance minus current cost
      const liveCredits = Math.max(0, lastFetchedCredits - roundedCost);
      setDisplayedCredits(parseFloat(liveCredits.toFixed(2)));
      
      console.log("Credits calculation:", {
        serverCredits: lastFetchedCredits,
        liveCost: roundedCost,
        displayedCredits: liveCredits.toFixed(2)
      });
    }
  }, [runningTimers, vms, lastFetchedCredits]);

  // Add a new function for direct credit synchronization
  const syncCreditsWithServer = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/user/credits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Log credit update for debugging
      console.log(`Credit sync: ${lastFetchedCredits.toFixed(2)} → ${response.data.credits.toFixed(2)}`);
      
      // Update both displayed and last fetched credits immediately
      setDisplayedCredits(response.data.credits);
      setLastFetchedCredits(response.data.credits);
      
      return response.data.credits;
    } catch (err) {
      console.error("Failed to sync credits:", err);
      return null;
    }
  };

  // Add a useEffect to sync credits when stopping a VM
  useEffect(() => {
    // Check if we just stopped a VM
    if (processingVmId === null && operationResult && operationResult.success && 
        operationResult.message && operationResult.message.includes('stopped')) {
      // We just stopped a VM successfully, sync credits immediately
      console.log("VM was stopped - synchronizing credits with server");
      syncCreditsWithServer();
    }
  }, [processingVmId, operationResult]);

  // Show loading when authentication is in progress
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography ml={2}>Loading your dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column' }}>
        <Typography color="error" mb={2}>{error}</Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>Retry</Button>
      </Box>
    );
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
    // Check if refreshUser is a function before calling it
    if (typeof refreshUser === 'function') {
      refreshUser(); // Refresh user data globally
    } else {
      console.warn("Dashboard: refreshUser is not a function, skipping user refresh");
    }
  };

  // Disk operations
  const handleDiskInfo = async (diskName) => {
    setSelectedDisk(diskName);
    setDiskInfoDialog(true);
    
    try {
      const response = await axios.post('http://localhost:8000/vm/disk-info', 
        { name: diskName },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setDiskInfo(response.data.info);
    } catch (err) {
      setDiskInfo(`Error: ${err.response?.data?.detail || 'Failed to get disk info'}`);
    }
  };

  const handleResizeDiskOpen = (diskName) => {
    setSelectedDisk(diskName);
    setResizeDiskDialog(true);
  };

  const handleConvertDiskOpen = (diskName) => {
    setSelectedDisk(diskName);
    const parts = diskName.split('.');
    const ext = parts.pop();
    setTargetFormat(ext);
    setTargetName(diskName);
    setConvertDiskDialog(true);
  };

  const handleRenameDiskOpen = (diskName) => {
    setSelectedDisk(diskName);
    setNewDiskName(diskName.split('.')[0]); // Initialize with current name without extension
    setRenameDiskDialog(true);
  };

  const resizeDisk = async () => {
    setOperationResult(null);
    try {
      await axios.post('http://localhost:8000/vm/resize-disk', 
        { 
          name: selectedDisk,
          resize_by: resizeAmount
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setOperationResult({
        success: true,
        message: `Disk ${selectedDisk} resized successfully!`
      });
      refreshData();
    } catch (err) {
      setOperationResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to resize disk'
      });
    }
  };

  const convertDisk = async () => {
    setOperationResult(null);
    setConvertLoading(true);
    try {
      // Determine source format from filename
      const sourceFormat = selectedDisk.split('.').pop();
      
      await axios.post('http://localhost:8000/vm/convert-disk', 
        { 
          source_name: selectedDisk,
          source_format: sourceFormat,
          target_format: targetFormat,
          target_name: targetName
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setOperationResult({
        success: true,
        message: `Disk converted successfully to ${targetName}!`
      });
      refreshData();
    } catch (err) {
      setOperationResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to convert disk'
      });
    } finally {
      setConvertLoading(false);
    }
  };

  const handleRenameDisk = async () => {
    if (!selectedDisk || !newDiskName) return;

    setOperationResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await apiRenameDisk(token, selectedDisk, newDiskName);
      setOperationResult({
        success: true,
        message: response.data.message
      });

      // Refresh VM list to show new name
      refreshData();
      setRenameDiskDialog(false);
    } catch (err) {
      setOperationResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to rename disk'
      });
    }
  };

  // Function to handle VM stop
  const handleStopVm = async (vmId) => {
    setProcessingVmId(vmId);
    try {
      const response = await axios.post(`http://localhost:8000/vm/stop-vm`, 
        { vm_id: vmId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      
      console.log(`VM stop response:`, response.data);
      
      // Update VM status locally
      setVms(prevVms => prevVms.map(vm => 
        vm.id === vmId 
          ? { ...vm, status: 'stopped' }
          : vm
      ));
      
      // Run an immediate sync to get the new credit balance
      await syncCreditsWithServer();
      
      // Show success message
      setOperationResult({
        success: true,
        message: `VM stopped successfully`
      });
      
    } catch (err) {
      console.error(`Error stopping VM:`, err);
      setOperationResult({
        success: false,
        message: `Failed to stop VM: ${err.response?.data?.detail || 'Unknown error'}`
      });
    } finally {
      setProcessingVmId(null);
    }
  };

  // Function to open start VM dialog
  const handleStartVmClick = (vm) => {
    setSelectedVmToStart(vm);
    // Default to not including ISO if the VM has one
    setIncludeIso(false);
    setVmStartDialog(true);
  };

  // Function to handle VM start
  const handleStartVm = async () => {
    if (!selectedVmToStart) return;
    const vmId = selectedVmToStart.id;
    setProcessingVmId(vmId);
    setStartLoading(true);
    try {
      const response = await axios.post(`http://localhost:8000/vm/start-vm`, 
        { vm_id: vmId, include_iso: includeIso },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setVms(prev => prev.map(vm => vm.id === vmId ? { ...vm, status: 'running', started_at: new Date().toISOString() } : vm));
      setRunningTimers(prev => ({ ...prev, [vmId]: 0 }));
      setOperationResult({ success: true, message: `VM started successfully` });
      setVmStartDialog(false);
    } catch (err) {
      setOperationResult({ success: false, message: `Failed to start VM: ${err.response?.data?.detail || 'Unknown error'}` });
    } finally {
      setProcessingVmId(null);
      setSelectedVmToStart(null);
    }
  };

  // Function to open delete VM dialog
  const handleDeleteVmClick = (vm) => {
    setSelectedVmToDelete(vm);
    setVmDeleteDialog(true);
  };

  // Function to handle VM deletion
  const handleDeleteVm = async () => {
    if (!selectedVmToDelete) return;
    const vmId = selectedVmToDelete.id;
    setDeleteLoading(true);
    try {
      const response = await axios.post(`http://localhost:8000/vm/delete`, 
        { vm_id: vmId, delete_disk: true },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      
      console.log(`VM delete response:`, response.data);
      
      // Remove VM from local state
      setVms(prevVms => prevVms.filter(vm => vm.id !== vmId));
      
      // Show success message
      setOperationResult({
        success: true,
        message: `VM and disk deleted successfully`
      });
      
      setVmDeleteDialog(false);
    } catch (err) {
      console.error(`Error deleting VM:`, err);
      setOperationResult({
        success: false,
        message: `Failed to delete VM: ${err.response?.data?.detail || 'Unknown error'}`
      });
    } finally {
      setDeleteLoading(false);
      setSelectedVmToDelete(null);
    }
  };

  // Function to open edit resources dialog
  const handleEditResourcesClick = (vm) => {
    setSelectedVmToEdit(vm);
    setNewCpuCount(vm.cpu_count);
    setNewRam(Math.round(vm.memory_mb / 1024)); // Convert MB to GB
    setEditResourcesDialog(true);
  };
  
  // Function to update VM resources
  const handleUpdateResources = async () => {
    if (!selectedVmToEdit) return;
    
    const vmId = selectedVmToEdit.id;
    setProcessingVmId(vmId);
    setEditResourcesDialog(false);
    
    try {
      await axios.post(`http://localhost:8000/vm/update-resources`, 
        { 
          vm_id: vmId,
          cpu_count: newCpuCount,
          memory_mb: newRam * 1024 // Convert GB to MB
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      
      // Update VM data locally
      setVms(prevVms => prevVms.map(vm => 
        vm.id === vmId 
          ? { 
              ...vm, 
              cpu_count: newCpuCount, 
              memory_mb: newRam * 1024 
            }
          : vm
      ));
      
      // Show success message
      setOperationResult({
        success: true,
        message: `VM resources updated successfully`
      });
      
    } catch (err) {
      console.error(`Error updating VM resources:`, err);
      setOperationResult({
        success: false,
        message: `Failed to update resources: ${err.response?.data?.detail || 'Unknown error'}`
      });
    } finally {
      setProcessingVmId(null);
      setSelectedVmToEdit(null);
    }
  };
  
  // Calculate costs for changed resources
  const calculateResourceCosts = (cpu, ram) => {
    const hourlyRate = parseFloat((BASE + cpu * COST_CPU + ram * COST_RAM).toFixed(2));
    const originalHourlyRate = selectedVmToEdit ? 
      parseFloat((BASE + selectedVmToEdit.cpu_count * COST_CPU + (selectedVmToEdit.memory_mb/1024) * COST_RAM).toFixed(2)) : 0;
    
    return {
      newRate: hourlyRate,
      difference: (hourlyRate - originalHourlyRate).toFixed(2),
      percentChange: originalHourlyRate ? Math.round((hourlyRate - originalHourlyRate) / originalHourlyRate * 100) : 0
    };
  };
  
  // Check if selected resources violate the plan limits
  const checkPlanLimits = () => {
    if (!user) return { violatesPlan: false };
    
    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;
    return {
      violatesPlan: user.plan !== 'payg' && (newCpuCount > limits.maxCpu || newRam > limits.maxRam),
      cpuExceeded: newCpuCount > limits.maxCpu,
      ramExceeded: newRam > limits.maxRam
    };
  };

  // Dashboard Overview Component
  const DashboardOverview = () => {
    // Calculate summary statistics
    const totalVms = vms.length;
    const activeVms = vms.filter(vm => vm.status !== 'stopped').length;
    const totalCpus = vms.reduce((sum, vm) => sum + vm.cpu_count, 0);
    const totalMemory = vms.reduce((sum, vm) => sum + vm.memory_mb, 0);

    return (
      <Box>
        <Typography variant="h4" gutterBottom>Dashboard Overview</Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Welcome back, {user.displayName || user.email}! Here's your cloud infrastructure at a glance.
        </Typography>
        
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: theme.palette.primary.light, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>{totalVms}</Typography>
                    <Typography variant="subtitle2">Total VMs</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    <ComputerIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: theme.palette.success.light, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>{activeVms}</Typography>
                    <Typography variant="subtitle2">Active VMs</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                    <PlayArrowIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: theme.palette.info.light, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {totalCpus} / {totalMemory/1024} GB
                    </Typography>
                    <Typography variant="subtitle2">CPU / RAM</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                    <MemoryIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: theme.palette.warning.light, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {displayedCredits.toFixed(2)}
                    </Typography>
                    <Typography variant="subtitle2">Credits</Typography>
                    <Tooltip title="Server balance minus current VM usage costs" placement="bottom">
                      <Typography variant="caption">
                        Server: {lastFetchedCredits.toFixed(2)} | Running: -{liveCost.toFixed(2)}
                      </Typography>
                    </Tooltip>
                  </Box>
                  <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                    <AccountBalanceWalletIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Plan Status */}
        <Paper elevation={1} sx={{ p: 3, mb: 4, bgcolor: theme.palette.background.default }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Current Plan:</strong> {user.plan.toUpperCase()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.plan === 'payg'
                  ? 'Pay-as-you-go plan billed by usage'
                  : `Standard ${user.plan} plan with preset limits`}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Account Status:</strong> Active
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Next billing date: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => navigate('/billing')}
              >
                Manage Billing
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Quick Action Buttons */}
        <Typography variant="h6" gutterBottom>Quick Actions</Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item>
            <Button 
              variant="contained" 
              startIcon={<ComputerIcon />}
              onClick={() => setTabValue(1)}
            >
              Create New VM
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={<StorageIcon />}
              onClick={() => setTabValue(2)}
            >
              Manage VMs
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={refreshData}
            >
              Refresh Data
            </Button>
          </Grid>
        </Grid>
        
        {/* Recent VMs */}
        <Typography variant="h6" gutterBottom>Recent Virtual Machines</Typography>
        {vmLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : vms.length > 0 ? (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.background.default }}>
                  <TableCell><strong>VM Name</strong></TableCell>
                  <TableCell><strong>Disk</strong></TableCell>
                  <TableCell align="center"><strong>CPU/RAM</strong></TableCell>
                  <TableCell align="center"><strong>Created</strong></TableCell>
                  <TableCell align="center"><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vms.slice(0, 5).map((vm) => (
                  <TableRow key={vm.id} hover>
                    <TableCell>{vm.disk_name.split('.')[0]}</TableCell>
                    <TableCell>{vm.disk_name}</TableCell>
                    <TableCell align="center">{vm.cpu_count} CPU / {vm.memory_mb/1024} GB</TableCell>
                    <TableCell align="center">
                      {new Date(vm.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        size="small" 
                        label={vm.status || "Running"} 
                        color={vm.status === "stopped" ? "default" : "success"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No virtual machines found. Create your first VM to get started!
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={() => setTabValue(1)}
            >
              Create VM
            </Button>
          </Paper>
        )}
      </Box>
    );
  };

  // VM Management Component
  const VmManagement = () => {
    // Calculate total cost for all running VMs
    const totalRunningCost = Object.entries(runningTimers).reduce((sum, [id, sec]) => {
      const vm = vms.find(vm => vm.id === id);
      if (vm && vm.status === 'running') {
        return sum + (sec / 3600 * (BASE + vm.cpu_count * COST_CPU + (vm.memory_mb/1024) * COST_RAM));
      }
      return sum;
    }, 0);

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>VM Management</Typography>
          <Button 
            startIcon={<RefreshIcon />} 
            variant="outlined" 
            onClick={refreshData}
          >
            Refresh
          </Button>
        </Box>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Manage your virtual machines and disk operations.
        </Typography>

        {/* Add credit status section */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: theme.palette.background.default }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">
                <AccountBalanceWalletIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.warning.main }} />
                <strong>Current Credits:</strong> {displayedCredits.toFixed(2)}
                <Tooltip title="Credits in database minus current usage" placement="right">
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    (Server: {lastFetchedCredits.toFixed(2)})
                  </Typography>
                </Tooltip>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">
                <strong>Total Running Cost:</strong> {totalRunningCost.toFixed(2)} credits/hour
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {vmLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : vms.length > 0 ? (
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.background.default }}>
                  <TableCell><strong>VM Name</strong></TableCell>
                  <TableCell><strong>Disk</strong></TableCell>
                  <TableCell align="center"><strong>CPU</strong></TableCell>
                  <TableCell align="center"><strong>RAM</strong></TableCell>
                  <TableCell align="center"><strong>Created</strong></TableCell>
                  <TableCell align="center"><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                  <TableCell><strong>Elapsed</strong></TableCell>
                  <TableCell><strong>Cost</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vms.map((vm) => (
                  <TableRow key={vm.id} hover>
                    <TableCell>{vm.disk_name.split('.')[0]}</TableCell>
                    <TableCell>{vm.disk_name}</TableCell>
                    <TableCell align="center">{vm.cpu_count}</TableCell>
                    <TableCell align="center">{vm.memory_mb/1024} GB</TableCell>
                    <TableCell align="center">
                      {new Date(vm.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        size="small" 
                        label={vm.status || "Running"} 
                        color={vm.status === "stopped" ? "default" : "success"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="Disk Info">
                          <IconButton 
                            size="small" 
                            color="info" 
                            onClick={() => handleDiskInfo(vm.disk_name)}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Resize Disk">
                          <IconButton 
                            size="small" 
                            color="warning" 
                            onClick={() => handleResizeDiskOpen(vm.disk_name)}
                          >
                            <ResizeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Convert Disk">
                          <IconButton 
                            size="small" 
                            color="secondary" 
                            onClick={() => handleConvertDiskOpen(vm.disk_name)}
                          >
                            <SwapHorizIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rename Disk">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleRenameDiskOpen(vm.disk_name)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {/* VM action buttons with loading state */}
                        {vm.status !== "stopped" && (
                          <Tooltip title="Stop VM">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleStopVm(vm.id)}
                              disabled={processingVmId === vm.id}
                            >
                              {processingVmId === vm.id ? 
                                <CircularProgress size={16} color="error" /> : 
                                <StopIcon fontSize="small" />
                              }
                            </IconButton>
                          </Tooltip>
                        )}
                        {vm.status === "stopped" && (
                          <Tooltip title="Start VM">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleStartVmClick(vm)}
                              disabled={processingVmId === vm.id}
                            >
                              {processingVmId === vm.id ? 
                                <CircularProgress size={16} color="success" /> : 
                                <PlayArrowIcon fontSize="small" />
                              }
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* Add Resources Edit Button */}
                        {vm.status === "stopped" && (
                          <Tooltip title="Edit Resources">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEditResourcesClick(vm)}
                            >
                              <MemoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {vm.status === "stopped" && (
                          <Tooltip title="Delete VM">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteVmClick(vm)}
                              disabled={processingVmId === vm.id}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {vm.status === 'running' ? formatElapsedTime(runningTimers[vm.id] || 0) : '--'}
                    </TableCell>
                    <TableCell align="center">
                      {vm.status === 'running'
                        ? ((runningTimers[vm.id] || 0) / 3600 * (BASE + vm.cpu_count * COST_CPU + (vm.memory_mb/1024) * COST_RAM)).toFixed(2)
                        : '--'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No virtual machines found. Create your first VM to get started!
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={() => setTabValue(1)}
            >
              Create VM
            </Button>
          </Paper>
        )}
        
        {/* Disk Management Section */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Disk Operations Guide
        </Typography>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                <InfoIcon fontSize="small" sx={{ mr: 1, color: theme.palette.info.main }} />
                Disk Information
              </Typography>
              <Typography variant="body2" paragraph>
                View detailed information about your disk including format, size, and virtual size.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Uses qemu-img info command
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                <ResizeIcon fontSize="small" sx={{ mr: 1, color: theme.palette.warning.main }} />
                Resize Disk
              </Typography>
              <Typography variant="body2" paragraph>
                Increase your disk size to accommodate more data. Specify the amount to add.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Example: +5G adds 5 gigabytes to current size
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                <SwapHorizIcon fontSize="small" sx={{ mr: 1, color: theme.palette.secondary.main }} />
                Convert Disk Format
              </Typography>
              <Typography variant="body2" paragraph>
                Convert between disk formats (qcow2, raw) while preserving all data.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Creates a new disk with the converted format
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Dashboard" icon={<ComputerIcon />} iconPosition="start" />
          <Tab label="Create VM" icon={<StorageIcon />} iconPosition="start" />
          <Tab label="Manage VMs" icon={<MemoryIcon />} iconPosition="start" />
          {/* Add Docker tab */}
          <Tab label="Docker" icon={<StorageIcon />} iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <DashboardOverview />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <CreateVmPage />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <VmManagement />
      </TabPanel>
      
      {/* Docker management tab panel */}
      <TabPanel value={tabValue} index={3}>
        <DockerProvider>
          <DockerManagement />
        </DockerProvider>
      </TabPanel>
      
      {/* Dialogs */}
      <DiskInfoDialog
        open={diskInfoDialog}
        selectedDisk={selectedDisk}
        diskInfo={diskInfo}
        onClose={() => setDiskInfoDialog(false)}
        handleResizeDiskOpen={handleResizeDiskOpen}
        parseDiskInfo={parseDiskInfo}
      />
      <ResizeDiskDialogComp
        open={resizeDiskDialog}
        selectedDisk={selectedDisk}
        resizeAmount={resizeAmount}
        setResizeAmount={setResizeAmount}
        operationResult={operationResult}
        onClose={() => setResizeDiskDialog(false)}
        onSubmit={resizeDisk}
      />
      <ConvertDiskDialog
        open={convertDiskDialog}
        currentName={selectedDisk || ''}
        targetFormat={targetFormat}
        targetName={targetName}
        onFormatChange={handleFormatChange}
        onNameChange={e => setTargetName(e.target.value)}
        onClose={() => setConvertDiskDialog(false)}
        onSubmit={convertDisk}
        operationResult={operationResult}
        loading={convertLoading}
      />
      <RenameDiskDialog
        open={renameDiskDialog}
        currentName={selectedDisk}
        value={newDiskName}
        onChange={e => setNewDiskName(e.target.value)}
        onClose={() => setRenameDiskDialog(false)}
        onSubmit={handleRenameDisk}
      />
      <StartVmDialogComp
        open={vmStartDialog}
        vm={selectedVmToStart}
        includeIso={includeIso}
        onIncludeChange={setIncludeIso}
        onClose={() => setVmStartDialog(false)}
        onSubmit={handleStartVm}
        loading={startLoading}
      />
      <EditResourcesDialogComp
        open={editResourcesDialog}
        selectedVmToEdit={selectedVmToEdit}
        newCpuCount={newCpuCount}
        newRam={newRam}
        setNewCpuCount={setNewCpuCount}
        setNewRam={setNewRam}
        checkPlanLimits={checkPlanLimits}
        calculateResourceCosts={calculateResourceCosts}
        userPlan={user.plan}
        planLimits={PLAN_LIMITS[user.plan]}
        onClose={() => setEditResourcesDialog(false)}
        onSubmit={handleUpdateResources}
      />
      <DeleteVMDialog
        open={vmDeleteDialog}
        vm={selectedVmToDelete}
        onClose={() => setVmDeleteDialog(false)}
        onSubmit={handleDeleteVm}
        loading={deleteLoading}
      />
    </Box>
  );
};

// Memoized Disk Info Dialog to prevent flicker
const DiskInfoDialog = React.memo(function DiskInfoDialog({ open, selectedDisk, diskInfo, onClose, handleResizeDiskOpen, parseDiskInfo }) {
  const theme = useTheme();
  return (
    <Dialog keepMounted disablePortal transitionDuration={0} open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1 }} />
          Disk Information: {selectedDisk}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {!diskInfo ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <Box>
            {(() => {
              const parsedInfo = parseDiskInfo(diskInfo);
              
              return parsedInfo ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          General Information
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={5}>
                            <Typography variant="subtitle2">File Location:</Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                              {parsedInfo.file}
                            </Typography>
                          </Grid>
                          <Grid item xs={5}>
                            <Typography variant="subtitle2">Format:</Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Chip 
                              size="small" 
                              label={parsedInfo.format}
                              color={parsedInfo.format === 'qcow2' ? 'primary' : 'secondary'} 
                            />
                          </Grid>
                          <Grid item xs={5}>
                            <Typography variant="subtitle2">Encrypted:</Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2">
                              {parsedInfo.encrypted}
                            </Typography>
                          </Grid>
                          <Grid item xs={5}>
                            <Typography variant="subtitle2">Backing File:</Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2">
                              {parsedInfo.backingFile}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Size Information
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={5}>
                            <Typography variant="subtitle2">Virtual Size:</Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2" fontWeight="medium">
                              {parsedInfo.virtualSize}
                            </Typography>
                          </Grid>
                          <Grid item xs={5}>
                            <Typography variant="subtitle2">Actual Disk Size:</Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2">
                              {parsedInfo.diskSize}
                            </Typography>
                          </Grid>
                          <Grid item xs={5}>
                            <Typography variant="subtitle2">Cluster Size:</Typography>
                          </Grid>
                          <Grid item xs={7}>
                            <Typography variant="body2">
                              {parsedInfo.clusterSize}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        {/* Space usage visualization */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Disk Space Usage:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={parsedInfo.usagePercent} 
                                sx={{ 
                                  height: 10, 
                                  borderRadius: 5,
                                  bgcolor: theme.palette.grey[200],
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: parsedInfo.usagePercent > 90 
                                      ? theme.palette.error.main 
                                      : parsedInfo.usagePercent > 70 
                                        ? theme.palette.warning.main 
                                        : theme.palette.success.main
                                  }
                                }} 
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {parsedInfo.usagePercent}%
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {parsedInfo.format === 'qcow2' 
                              ? 'QCOW2 format uses space efficiently, allocating only what is needed'
                              : 'RAW format allocates all space immediately'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Advanced: Raw Command Output</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: theme.palette.grey[100], fontFamily: 'monospace' }}>
                          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                            {diskInfo}
                          </pre>
                        </Paper>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="warning">
                  Unable to parse disk information. See the raw output below:
                  <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: theme.palette.grey[100], fontFamily: 'monospace' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {diskInfo}
                    </pre>
                  </Paper>
                </Alert>
              );
            })()}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {diskInfo && parseDiskInfo(diskInfo) && (
          <Button
            startIcon={<ResizeIcon />}
            color="primary"
            onClick={() => {
              onClose();
              handleResizeDiskOpen(selectedDisk);
            }}
          >
            Resize Disk
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
});

// Add a helper function for time formatting at the component level (outside the component function)
const formatElapsedTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Add a new DeleteVMDialog component
const DeleteVMDialog = React.memo(function DeleteVMDialog({ open, vm, onClose, onSubmit, loading }) {
  const theme = useTheme();
  if (!vm) return null;
  return (
    <Dialog keepMounted disablePortal transitionDuration={0} open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DeleteIcon sx={{ mr: 1, color: theme.palette.error.main }} />
          Delete Virtual Machine
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom color="error">
          Warning: This action cannot be undone!
        </Typography>
        <Typography paragraph>
          Are you sure you want to delete the VM <strong>{vm.disk_name.split('.')[0]}</strong> and its associated disk?
        </Typography>
        <Alert severity="warning">
          <AlertTitle>Important</AlertTitle>
          <Typography variant="body2">
            This will permanently delete:
            <ul>
              <li>The VM configuration</li>
              <li>The disk file: <strong>{vm.disk_name}</strong></li>
              <li>All VM usage history</li>
            </ul>
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="error" 
          onClick={onSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
        >
          {loading ? "Deleting..." : "Delete VM"}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default Dashboard;