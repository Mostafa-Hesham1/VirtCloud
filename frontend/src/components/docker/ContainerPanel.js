import React, { useState, useCallback } from 'react';
import { 
  Box, Typography, Button, Paper, TableContainer, Table, 
  TableHead, TableBody, TableRow, TableCell, IconButton, 
  Tooltip, Chip, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, Alert, Card, CardContent,
  Accordion, AccordionSummary, AccordionDetails, Divider
} from '@mui/material';
import { useDocker } from '../../context/DockerContext';
import axios from 'axios'; // Add this import for HTTP requests

// Icons
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import TerminalIcon from '@mui/icons-material/Terminal';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const ContainerPanel = () => {
  const { containers, loading, errors, stopContainer, refreshDockerResources, createContainer, deleteContainer } = useDocker();
  
  // State for stop container dialog
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [isStopping, setIsStopping] = useState(false);
  const [stopError, setStopError] = useState(null);
  
  // State for start container dialog
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  
  // State for delete container dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  
  // State for container details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  
  // State for help guide visibility
  const [showGuide, setShowGuide] = useState(false);
  
  // Add the missing state variable for operation results
  const [operationResult, setOperationResult] = useState(null);
  
  // Add this near the top of the component if it doesn't exist
  const [actionLoadingState, setActionLoadingState] = useState({});

  // Add this if you need a refresh containers function
  const refreshContainers = useCallback(() => {
    console.log('Manually refreshing containers');
    refreshDockerResources();
  }, [refreshDockerResources]);
  
  // Handle stop dialog open
  const handleStopDialogOpen = (container) => {
    setSelectedContainer(container);
    setStopDialogOpen(true);
    setStopError(null);
  };
  
  // Handle stop dialog close
  const handleStopDialogClose = () => {
    setStopDialogOpen(false);
  };
  
  // Handle stop container
  const handleStopContainer = async (containerId, containerName) => {
    console.log(`Stopping container: ${containerName} (${containerId})`);
    
    // Set loading state for this specific container
    setActionLoadingState(prev => ({
      ...prev,
      [containerId]: { action: 'stop', loading: true }
    }));
    
    try {
      // Try the direct API call to stop container
      const stopEndpoint = `http://localhost:8000/docker/container/stop`;
      console.log(`Calling stop endpoint: ${stopEndpoint}`);
      
      const response = await axios.post(
        stopEndpoint,
        { 
          container_id: containerId, 
          timeout: 10 
        },
        { 
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log(`Container stop response:`, response.data);
      
      // Show success message
      setOperationResult({
        success: true,
        message: `Container ${containerName || containerId} stopped successfully`
      });
      
      // Refresh container list after a short delay
      setTimeout(() => refreshContainers(), 1000);
    } catch (error) {
      console.error(`Failed to stop container: ${containerId}`, error);
      
      // Log detailed error for debugging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      
      // If the first approach failed, try the alternative endpoint with the container ID directly in URL
      try {
        console.log(`First attempt failed, trying alternative endpoint with container ID`);
        const altEndpoint = `http://localhost:8000/docker/container/${containerId}/stop`;
        console.log(`Calling alternative endpoint: ${altEndpoint}`);
        
        const altResponse = await axios.post(
          altEndpoint,
          {},
          { 
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`Alternative container stop response:`, altResponse.data);
        
        // Show success message
        setOperationResult({
          success: true,
          message: `Container ${containerName || containerId} stopped successfully`
        });
        
        // Refresh container list after a short delay
        setTimeout(() => refreshContainers(), 1000);
      } catch (altError) {
        console.error(`Both stop attempts failed:`, altError);
        
        // Show error message
        setOperationResult({
          success: false,
          message: `Failed to stop container: ${error.response?.data?.detail || error.message}`
        });
      }
    } finally {
      // Clear loading state
      setActionLoadingState(prev => ({
        ...prev,
        [containerId]: { action: 'none', loading: false }
      }));
    }
  };

  // The existing handleStopContainer function can be removed (the one that takes the whole container)
  
  // Keep the dialog handlers like handleStopDialogOpen and handleStopDialogClose
  
  // Update the dialog's submit button to call the new handleStopContainer
  const handleStopFromDialog = () => {
    if (!selectedContainer) return;
    
    setIsStopping(true);
    setStopError(null);
    
    handleStopContainer(selectedContainer.id, selectedContainer.name)
      .then(() => {
        setStopDialogOpen(false);
      })
      .catch(error => {
        setStopError(error.message || "Failed to stop container");
      })
      .finally(() => {
        setIsStopping(false);
      });
  };

  // Handle start container dialog open
  const handleStartDialogOpen = (container) => {
    setSelectedContainer(container);
    setStartDialogOpen(true);
    setStartError(null);
  };
  
  // Handle start dialog close
  const handleStartDialogClose = () => {
    setStartDialogOpen(false);
  };
  
  // Update the handleStartContainer function with better error handling and logging
  const handleStartContainer = async (containerId, containerName) => {
    console.log(`Starting container: ${containerName} (${containerId})`);
    
    // Set loading state for this specific container
    setActionLoadingState(prev => ({
      ...prev,
      [containerId]: { action: 'start', loading: true }
    }));
    
    try {
      // Try the container start endpoint with the container ID
      const startEndpoint = `http://localhost:8000/docker/container/id/${containerId}/start`;
      console.log(`Calling start endpoint: ${startEndpoint}`);
      
      const response = await axios.post(
        startEndpoint,
        {}, // Empty body
        { 
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log(`Container start response:`, response.data);
      
      // Show success message
      setOperationResult({
        success: true,
        message: `Container ${containerName || containerId} started successfully`
      });
      
      // Refresh container list after a short delay
      setTimeout(() => refreshContainers(), 1000);
    } catch (error) {
      console.error(`Failed to start container: ${containerId}`, error);
      
      // Log detailed error for debugging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      
      // If the first approach failed, try the alternative endpoint with the container name
      try {
        console.log(`First attempt failed, trying alternative endpoint with container name`);
        const altEndpoint = `http://localhost:8000/docker/container/${containerName || containerId}/start`;
        console.log(`Calling alternative endpoint: ${altEndpoint}`);
        
        const altResponse = await axios.post(
          altEndpoint,
          {},
          { 
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`Alternative container start response:`, altResponse.data);
        
        // Show success message
        setOperationResult({
          success: true,
          message: `Container ${containerName || containerId} started successfully`
        });
        
        // Refresh container list after a short delay
        setTimeout(() => refreshContainers(), 1000);
      } catch (altError) {
        console.error(`Both start attempts failed:`, altError);
        
        // Show error message
        setOperationResult({
          success: false,
          message: `Failed to start container: ${error.response?.data?.detail || error.message}`
        });
      }
    } finally {
      // Clear loading state
      setActionLoadingState(prev => ({
        ...prev,
        [containerId]: { action: 'none', loading: false }
      }));
    }
  };

  // Create a helper function to handle starting a container from the dialog
  const handleStartFromDialog = () => {
    if (!selectedContainer) return;
    
    setIsStarting(true);
    setStartError(null);
    
    handleStartContainer(selectedContainer.id, selectedContainer.name)
      .then(() => {
        setStartDialogOpen(false);
      })
      .catch(error => {
        setStartError(error.message || "Failed to start container");
      })
      .finally(() => {
        setIsStarting(false);
      });
  };

  // Handle delete dialog open
  const handleDeleteDialogOpen = (container) => {
    setSelectedContainer(container);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };
  
  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };
  
  // Fix the delete container handler to work with ID and name directly
  const handleDeleteContainer = async (containerId, containerName) => {
    console.log(`Deleting container: ${containerName} (${containerId})`);
    
    // Set loading state
    setActionLoadingState(prev => ({
      ...prev,
      [containerId]: { action: 'delete', loading: true }
    }));
    
    try {
      // Call the deleteContainer function from context
      await deleteContainer(containerId, true);
      
      // Show success notification
      setOperationResult({
        success: true,
        message: `Container ${containerName || containerId} deleted successfully!`
      });
      
      // Refresh the container list
      refreshDockerResources();
    } catch (error) {
      console.error('Error deleting container:', error);
      
      setOperationResult({
        success: false,
        message: `Failed to delete container: ${error.response?.data?.detail || error.message}`
      });
    } finally {
      setActionLoadingState(prev => ({
        ...prev,
        [containerId]: { action: 'none', loading: false }
      }));
    }
  };

  // Update the Delete Container dialog handler to match the same pattern
  const handleDeleteFromDialog = () => {
    if (!selectedContainer) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    handleDeleteContainer(selectedContainer.id, selectedContainer.name)
      .then(() => {
        setDeleteDialogOpen(false);
      })
      .catch(error => {
        setDeleteError(error.message || "Failed to delete container");
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  // Handle details dialog open
  const handleDetailsDialogOpen = (container) => {
    setSelectedDetails(container);
    setDetailsDialogOpen(true);
  };
  
  // Handle details dialog close
  const handleDetailsDialogClose = () => {
    setDetailsDialogOpen(false);
  };
  
  // Format container creation time
  const formatContainerAge = (timestamp) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diff = Math.floor((now - created) / 1000); // difference in seconds
    
    if (diff < 60) {
      return `${diff} second${diff !== 1 ? 's' : ''} ago`;
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diff / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };
  
  // Format ports for display
  const formatPorts = (ports) => {
    if (!ports || Object.keys(ports).length === 0) {
      return <Typography variant="body2">None</Typography>;
    }
    
    return (
      <Box>
        {Object.entries(ports).map(([container_port, host_info]) => {
          const hostPort = Array.isArray(host_info) 
            ? host_info.map(h => h.HostPort).join(', ')
            : host_info;
            
          return (
            <Typography key={container_port} variant="body2">
              {container_port} → {hostPort || 'N/A'}
            </Typography>
          );
        })}
      </Box>
    );
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <TerminalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Docker Containers
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<HelpOutlineIcon />}
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? 'Hide' : 'Show'} Guide
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={refreshDockerResources}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Container Guide Section */}
      {showGuide && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>Docker Container Guide</Typography>
          
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography><strong>Understanding Container States</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                Containers can be in different states:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip label="running" color="success" />
                <Chip label="exited" />
                <Chip label="created" color="info" />
                <Chip label="paused" color="warning" />
              </Box>
              <Typography variant="body2" paragraph>
                <strong>running</strong> - Container is currently active and processes inside it are running
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>exited</strong> - Container has stopped. This happens when the main process inside the container has finished 
                or when you stop the container. You can restart exited containers or remove them.
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>created</strong> - Container is created but has not been started yet
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>paused</strong> - Container is paused (processes inside are temporarily suspended)
              </Typography>
            </AccordionDetails>
          </Accordion>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography><strong>Working with Exited Containers</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                When a container has exited (status: "exited"), you have several options:
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Start/Restart:</strong> Click the Play button to start the container again with the same configuration.
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  <strong>Delete:</strong> If you don't need the container anymore, you can remove it to clean up your environment.
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  <strong>View Details:</strong> Check the container's configuration, command, and other details.
                </Typography>
              </Box>
              
              <Alert severity="info">
                When you restart an exited container, a new container will be created with the same image and configuration.
                The old container remains until you explicitly delete it.
              </Alert>
            </AccordionDetails>
          </Accordion>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography><strong>Container Actions</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                Available actions depend on the container's current state:
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <InfoIcon color="info" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">View Details</Typography>
                    </Box>
                    <Typography variant="body2">
                      View container configuration, ports, and other details. Available for all containers.
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <StopIcon color="error" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">Stop Container</Typography>
                    </Box>
                    <Typography variant="body2">
                      Stop a running container. This will change its state to "exited".
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PlayArrowIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">Start Container</Typography>
                    </Box>
                    <Typography variant="body2">
                      Start an exited container. This creates a new container with the same configuration.
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DeleteIcon color="error" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">Delete Container</Typography>
                    </Box>
                    <Typography variant="body2">
                      Remove a container from your system. The container must be stopped first.
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {loading.containers ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : errors.containers ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors.containers}
        </Alert>
      ) : containers?.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" paragraph>
            No Docker containers found. Start by running a container from an image.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Image</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Ports</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {containers.map((container) => (
                <TableRow key={container.id} hover>
                  <TableCell>{container.name}</TableCell>
                  <TableCell>{typeof container.image === 'string' ? container.image : container.image.id.substring(0, 12)}</TableCell>
                  <TableCell>{formatContainerAge(container.created)}</TableCell>
                  <TableCell>
                    <Chip 
                      size="small" 
                      label={container.status} 
                      color={container.running ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    {formatPorts(container.ports)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="Container Details">
                        <IconButton 
                          size="small" 
                          color="info" 
                          onClick={() => handleDetailsDialogOpen(container)}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {/* Show Stop button for running containers */}
                      {container.running ? (
                        <Tooltip title="Stop Container">
                          <IconButton
                            color="error"
                            onClick={() => handleStopContainer(container.id, container.name)}
                            disabled={actionLoadingState[container.id]?.loading}
                          >
                            {actionLoadingState[container.id]?.action === 'stop' ? (
                              <CircularProgress size={24} color="error" />
                            ) : (
                              <StopIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Start Container">
                          <IconButton
                            color="success"
                            onClick={() => handleStartContainer(container.id, container.name)}
                            disabled={actionLoadingState[container.id]?.loading}
                          >
                            {actionLoadingState[container.id]?.action === 'start' ? (
                              <CircularProgress size={24} color="success" />
                            ) : (
                              <PlayArrowIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {/* Show Delete button for non-running containers */}
                      {!container.running && (
                        <Tooltip title="Delete Container">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteDialogOpen(container)} // Opens delete confirmation dialog
                            disabled={actionLoadingState[container.id]?.loading}
                          >
                            {actionLoadingState[container.id]?.action === 'delete' ? (
                              <CircularProgress size={16} color="error" />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Stop Container Dialog */}
      <Dialog 
        open={stopDialogOpen} 
        onClose={handleStopDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Stop Container</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to stop the container <strong>{selectedContainer?.name}</strong>?
          </Typography>
          
          <Typography variant="body2" paragraph color="text.secondary">
            Stopping a container will halt all processes running inside it.
            The container will remain on your system and can be started again later.
          </Typography>
          
          {stopError && (
            <Alert severity="error">
              {stopError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStopDialogClose}>Cancel</Button>
          <Button 
            onClick={handleStopFromDialog} 
            variant="contained" 
            color="error"
            disabled={isStopping}
          >
            {isStopping ? <CircularProgress size={24} /> : 'Stop Container'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Start Container Dialog */}
      <Dialog 
        open={startDialogOpen} 
        onClose={handleStartDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Start Container</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Do you want to start a new container based on <strong>{selectedContainer?.name}</strong>?
          </Typography>
          
          <Typography variant="body2" paragraph color="text.secondary">
            This will create a new container using the same image (<strong>{selectedContainer?.image}</strong>).
            The existing container will remain until you explicitly delete it.
          </Typography>
          
          {startError && (
            <Alert severity="error">
              {startError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStartDialogClose}>Cancel</Button>
          <Button 
            onClick={handleStartFromDialog} 
            variant="contained" 
            color="success"
            disabled={isStarting}
          >
            {isStarting ? <CircularProgress size={24} /> : 'Start Container'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Container Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleDeleteDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Container</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to delete the container <strong>{selectedContainer?.name}</strong>?
          </Typography>
          
          <Typography variant="body2" paragraph color="text.secondary">
            This will permanently remove the container from your system.
            The container image will still be available for creating new containers.
          </Typography>
          
          {/* Add container details to make confirmation more specific */}
          {selectedContainer && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2">Container Details:</Typography>
              <Typography variant="body2">
                <strong>ID:</strong> {selectedContainer.short_id || selectedContainer.id?.substring(0, 12)}
              </Typography>
              <Typography variant="body2">
                <strong>Image:</strong> {typeof selectedContainer.image === 'string' ? selectedContainer.image : selectedContainer.image?.id?.substring(0, 12)}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {selectedContainer.status}
              </Typography>
            </Box>
          )}
          
          {deleteError && (
            <Alert severity="error">
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteFromDialog} 
            variant="contained" 
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Delete Container'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Container Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={handleDetailsDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TerminalIcon sx={{ mr: 1 }} />
            Container Details
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDetails && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedDetails.name}
                <Chip 
                  size="small" 
                  label={selectedDetails.status} 
                  color={selectedDetails.running ? "success" : "default"}
                  sx={{ ml: 1 }}
                />
              </Typography>
              
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" width="30%"><strong>Container ID</strong></TableCell>
                      <TableCell>{selectedDetails.id}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th"><strong>Image</strong></TableCell>
                      <TableCell>{typeof selectedDetails.image === 'string' ? selectedDetails.image : selectedDetails.image.id}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th"><strong>Created</strong></TableCell>
                      <TableCell>{new Date(selectedDetails.created).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th"><strong>Command</strong></TableCell>
                      <TableCell>
                        <code>{Array.isArray(selectedDetails.command) ? selectedDetails.command.join(' ') : selectedDetails.command}</code>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th"><strong>Ports</strong></TableCell>
                      <TableCell>{formatPorts(selectedDetails.ports)}</TableCell>
                    </TableRow>
                    {selectedDetails.metadata && selectedDetails.metadata.environment && (
                      <TableRow>
                        <TableCell component="th"><strong>Environment</strong></TableCell>
                        <TableCell>
                          {Object.entries(selectedDetails.metadata.environment).map(([key, value]) => (
                            <Typography key={key} variant="body2">
                              <code>{key}={value}</code>
                            </Typography>
                          ))}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Action buttons appropriate for the container state */}
                {selectedDetails.running && (
                  <Button 
                    variant="contained" 
                    color="error" 
                    startIcon={<StopIcon />}
                    onClick={() => {
                      handleDetailsDialogClose();
                      handleStopDialogOpen(selectedDetails);
                    }}
                  >
                    Stop Container
                  </Button>
                )}
                
                {selectedDetails.status === "exited" && (
                  <Button 
                    variant="contained" 
                    color="success" 
                    startIcon={<PlayArrowIcon />}
                    onClick={() => {
                      handleDetailsDialogClose();
                      handleStartDialogOpen(selectedDetails);
                    }}
                  >
                    Start Container
                  </Button>
                )}
                
                {!selectedDetails.running && (
                  <Button 
                    variant="outlined" 
                    color="error" 
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      handleDetailsDialogClose();
                      handleDeleteDialogOpen(selectedDetails);
                    }}
                  >
                    Delete Container
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add this to display operation results if not already present */}
      {operationResult && (
        <Alert 
          severity={operationResult.success ? "success" : "error"}
          sx={{ mb: 2 }}
          onClose={() => setOperationResult(null)}
        >
          {operationResult.message}
        </Alert>
      )}
    </Box>
  );
};

export default ContainerPanel;
