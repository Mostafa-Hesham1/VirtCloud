import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, TableContainer, Table, 
  TableHead, TableBody, TableRow, TableCell, IconButton, 
  Tooltip, Chip, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, Alert, Card, CardContent,
  Accordion, AccordionSummary, AccordionDetails, Divider
} from '@mui/material';
import { useDocker } from '../../context/DockerContext';

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
  const handleStopContainer = async () => {
    if (!selectedContainer) return;
    
    setIsStopping(true);
    setStopError(null);
    
    try {
      await stopContainer(selectedContainer.id);
      setStopDialogOpen(false);
      refreshDockerResources();
    } catch (error) {
      setStopError(error.message);
    } finally {
      setIsStopping(false);
    }
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
  
  // Handle start container
  const handleStartContainer = async () => {
    if (!selectedContainer) return;
    
    setIsStarting(true);
    setStartError(null);
    
    try {
      // Reuse the same image and configuration
      await createContainer({
        image: selectedContainer.image,
        container_name: selectedContainer.name,
        detach: true
      });
      setStartDialogOpen(false);
      refreshDockerResources();
    } catch (error) {
      setStartError(error.message);
    } finally {
      setIsStarting(false);
    }
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
  
  // Handle delete container
  const handleDeleteContainer = async () => {
    if (!selectedContainer) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      // Call the deleteContainer function from context
      await deleteContainer(selectedContainer.id, true);
      setDeleteDialogOpen(false);
      refreshDockerResources();
      
      // Show success notification if needed
      setOperationResult({
        success: true,
        message: `Container ${selectedContainer.name || selectedContainer.id} deleted successfully!`
      });
    } catch (error) {
      console.error('Error deleting container:', error);
      setDeleteError(error.response?.data?.detail || 'Failed to delete container');
    } finally {
      setIsDeleting(false);
    }
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
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
                      {container.running && (
                        <Tooltip title="Stop Container">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleStopDialogOpen(container)}
                          >
                            <StopIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {/* Show Start button for exited containers */}
                      {container.status === "exited" && (
                        <Tooltip title="Start Container">
                          <IconButton 
                            size="small" 
                            color="success" 
                            onClick={() => handleStartDialogOpen(container)}
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {/* Show Delete button for non-running containers */}
                      {!container.running && (
                        <Tooltip title="Delete Container">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteDialogOpen(container)}
                          >
                            <DeleteIcon fontSize="small" />
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
            onClick={handleStopContainer} 
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
            onClick={handleStartContainer} 
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
          
          {deleteError && (
            <Alert severity="error">
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteContainer} 
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
    </Box>
  );
};

export default ContainerPanel;
