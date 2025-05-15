import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Tabs, Tab, Paper, CircularProgress, Alert, Chip, Tooltip, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DockerfilePanel from './DockerfilePanel';
import ImagePanel from './ImagePanel';
import ContainerPanel from './ContainerPanel';
import DockerGuide from './DockerGuide';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import { useDocker } from '../../context/DockerContext';
import axios from 'axios';
// Add missing icon imports
import BuildIcon from '@mui/icons-material/Build';
import DeleteIcon from '@mui/icons-material/Delete';

// Import the improved RunContainerDialog
import RunContainerDialog from './RunContainerDialog';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`docker-tabpanel-${index}`}
      aria-labelledby={`docker-tab-${index}`}
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

const DockerManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dockerStatus, setDockerStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const { 
    refreshDockerResources,
    loading: { dockerfiles, images, containers },
    errors: { dockerfiles: dockerfilesError, images: imagesError, containers: containersError },
    connectionStatus,
    showErrors // Get the new showErrors state
  } = useDocker();

  // Add these state variables for the RunContainerDialog
  const [selectedImage, setSelectedImage] = useState(null);
  const [openRunDialog, setOpenRunDialog] = useState(false);

  // Make sure these state variables exist for the pull image dialog
  const [selectedPullImage, setSelectedPullImage] = useState(null);
  const [runContainerDialogOpen, setRunContainerDialogOpen] = useState(false);

  // Check Docker status on component mount
  useEffect(() => {
    const checkDockerStatus = async () => {
      try {
        setStatusLoading(true);
        const token = localStorage.getItem('token');
        
        // Get Docker status
        const response = await axios.get('http://localhost:8000/docker/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setDockerStatus(response.data);
      } catch (error) {
        console.error("Error checking Docker status:", error);
        setDockerStatus({
          status: "error",
          message: error.response?.data?.detail || "Failed to connect to Docker service"
        });
      } finally {
        setStatusLoading(false);
      }
    };

    checkDockerStatus();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Add missing handler functions
  const handleViewDockerfile = (dockerfile) => {
    // Forward to the DockerfilePanel's view function
    if (tabValue === 0) {
      // Only pass if we're on the dockerfiles tab
      console.log("View dockerfile:", dockerfile);
      // We can use a ref or context to communicate with child component
      // This is a temporary implementation
    }
  };

  const handleEditDockerfile = (dockerfile) => {
    if (tabValue === 0) {
      console.log("Edit dockerfile:", dockerfile);
      // This is a temporary implementation
    }
  };

  const handleBuildDockerfile = (dockerfile) => {
    if (tabValue === 0) {
      console.log("Build dockerfile:", dockerfile);
      // This is a temporary implementation
    }
  };

  const handleDeleteDockerfile = (dockerfile) => {
    if (tabValue === 0) {
      console.log("Delete dockerfile:", dockerfile);
      // This is a temporary implementation
    }
  };

  // Add these handler functions for the RunContainerDialog
  const handleRunContainerClick = (image) => {
    console.log("Run container clicked for image:", image);
    setSelectedImage(image);
    setOpenRunDialog(true);
  };

  const handleCloseRunDialog = () => {
    setOpenRunDialog(false);
    setSelectedImage(null);
  };

  // Add this handler specifically for images from pull operations
  const handleRunPulledContainer = (image) => {
    console.log("Opening run container dialog for pulled image:", image);
    setSelectedPullImage(image);
    setRunContainerDialogOpen(true);
  };
  
  const handleCloseRunPulledDialog = () => {
    setRunContainerDialogOpen(false);
    setSelectedPullImage(null);
  };

  // Show Docker service status and troubleshooting information
  if (statusLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6">Checking Docker service status...</Typography>
      </Box>
    );
  }

  // Show error if Docker is unavailable
  if (dockerStatus?.status === "unavailable" || dockerStatus?.status === "error") {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Docker Service Unavailable</Typography>
          <Typography>
            {dockerStatus?.message || "Docker service is not available. Please ensure Docker is installed and running."}
          </Typography>
        </Alert>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Troubleshooting Steps
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>Please try the following:</Typography>
          <ol>
            <li>
              <Typography paragraph>
                Make sure Docker Desktop is installed and running
                <ul>
                  <li>Check your taskbar/system tray for the Docker icon</li>
                  <li>If Docker is installed but not running, start Docker Desktop</li>
                </ul>
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Check if Docker daemon is accessible
                <ul>
                  <li>Open a terminal and run: <code>docker ps</code></li>
                  <li>If this returns an error, Docker is not running properly</li>
                </ul>
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Restart Docker service
                <ul>
                  <li>Right-click the Docker icon in system tray and select "Restart"</li>
                  <li>Wait for it to fully start (check icon status)</li>
                </ul>
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                Restart VirtCloud backend service
                <ul>
                  <li>After Docker is running, restart the backend</li>
                </ul>
              </Typography>
            </li>
          </ol>
          
          {dockerStatus?.suggestions && (
            <Box mt={2}>
              <Typography variant="subtitle1">Additional Suggestions:</Typography>
              <ul>
                {dockerStatus.suggestions.map((suggestion, index) => (
                  <li key={index}>
                    <Typography>{suggestion}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}
          
          <Box mt={3}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => window.location.reload()}
              startIcon={<RefreshIcon />}
            >
              Refresh Page
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
  
  // Display connection errors
  if (connectionStatus === 'checking') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6">Connecting to Docker services...</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This may take a moment while we verify Docker is running
        </Typography>
      </Box>
    );
  }

  if (connectionStatus === 'not_implemented') {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6">Docker API Not Yet Implemented</Typography>
          <Typography>
            The Docker management functionality is not fully implemented on the server.
            Please make sure the Docker router is added to main.py and Docker is properly installed.
          </Typography>
        </Alert>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Docker Implementation Checklist
          </Typography>
          <ul>
            <li>Ensure Docker is installed on the server</li>
            <li>Add Docker router to main.py</li>
            <li>Check MongoDB collections are properly set up</li>
            <li>Create required directories for Dockerfiles</li>
          </ul>
        </Paper>
      </Box>
    );
  }

  if (connectionStatus === 'server_error') {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Docker Server Error</Typography>
          <Typography>
            The Docker service encountered an error on the server. 
            This might be because Docker daemon is not running or not accessible.
          </Typography>
        </Alert>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Docker Troubleshooting Steps:</Typography>
          <ol>
            <li>Make sure Docker Desktop is installed and running</li>
            <li>Try restarting Docker service or Docker Desktop</li>
            <li>Check if the Docker daemon is accessible by running <code>docker ps</code> in a terminal</li>
            <li>Verify the user running the backend has permissions to use Docker</li>
          </ol>
          <Button 
            variant="contained" 
            color="primary"
            onClick={refreshDockerResources}
            startIcon={<RefreshIcon />}
            sx={{ mt: 2 }}
          >
            Retry Connection
          </Button>
        </Paper>
      </Box>
    );
  }

  if (connectionStatus === 'connection_error') {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Connection Error</Typography>
          <Typography>
            Could not connect to the Docker API. Please check your network connection
            and verify the backend server is running.
          </Typography>
        </Alert>
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={refreshDockerResources}
            startIcon={<RefreshIcon />}
          >
            Retry Connection
          </Button>
        </Box>
      </Box>
    );
  }

  const isLoading = dockerfiles || images || containers;
  const hasErrors = dockerfilesError || imagesError || containersError;

  const renderDockerfileActions = (dockerfile) => {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="View Dockerfile">
          <IconButton color="info" size="small" onClick={() => handleViewDockerfile(dockerfile)}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit Dockerfile">
          <IconButton color="primary" size="small" onClick={() => handleEditDockerfile(dockerfile)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Build Image">
          <IconButton color="success" size="small" onClick={() => handleBuildDockerfile(dockerfile)}>
            <BuildIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete Dockerfile">
          <IconButton color="error" size="small" onClick={() => handleDeleteDockerfile(dockerfile)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>Docker Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {dockerStatus?.status === "available" && (
            <Chip 
              icon={<CheckCircleIcon />}
              label={`Docker ${dockerStatus.version}`}
              color="success"
              variant="outlined"
            />
          )}
          <Button 
            startIcon={<RefreshIcon />} 
            variant="outlined" 
            onClick={refreshDockerResources}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<InfoIcon />}
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? 'Hide Guide' : 'Show Guide'}
          </Button>
        </Box>
      </Box>
      
      {showGuide && <DockerGuide />}

      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Manage Docker containers, images, and build custom Dockerfiles.
      </Typography>

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography>Loading Docker resources...</Typography>
        </Box>
      )}

      {/* Error messages - only show if showErrors is true and we have actual errors */}
      {showErrors && hasErrors && images.length === 0 && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: 'error.lighter', // Use a lighter color to be less alarming
            color: 'error.dark',      // Dark text for better contrast
            borderLeft: '4px solid',  // Add a border for a less invasive UI
            borderColor: 'error.main'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="medium">Docker Resource Loading Issues</Typography>
            <Button 
              size="small" 
              onClick={refreshDockerResources}
              startIcon={<RefreshIcon />}
              color="error"
              variant="outlined"
              sx={{ ml: 2 }}
            >
              Retry
            </Button>
          </Box>
          
          {/* Show errors in a more compact format */}
          <Box sx={{ mt: 1 }}>
            {dockerfilesError && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                • Dockerfiles: {dockerfilesError}
              </Typography>
            )}
            {imagesError && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                • Images: {imagesError}
              </Typography>
            )}
            {containersError && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                • Containers: {containersError}
              </Typography>
            )}
          </Box>
          
          <Button 
            size="small" 
            sx={{ mt: 1 }} 
            onClick={() => window.open('https://docs.docker.com/config/daemon/', '_blank')}
          >
            Docker Docs
          </Button>
        </Paper>
      )}

      {/* Docker management tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Dockerfiles" />
          <Tab label="Images" />
          <Tab label="Containers" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <DockerfilePanel />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <ImagePanel />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <ContainerPanel />
      </TabPanel>

      {/* Replace any inline RunContainer dialog implementation */}
      {selectedImage && (
        <RunContainerDialog
          open={openRunDialog}
          onClose={handleCloseRunDialog}
          imageId={selectedImage.id}
          imageName={selectedImage.tags?.[0] || 'Unnamed Image'}
        />
      )}

      {/* Add this dialog for running containers from pulled images */}
      {selectedPullImage && (
        <RunContainerDialog
          open={runContainerDialogOpen}
          onClose={handleCloseRunPulledDialog}
          imageId={selectedPullImage.id || selectedPullImage.image_id || selectedPullImage}
          imageName={selectedPullImage.tags?.[0] || 'Unnamed Image'}
        />
      )}
    </Box>
  );
};

export default DockerManagement;
