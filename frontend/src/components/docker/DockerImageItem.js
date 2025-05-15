import React, { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useDocker } from '../../context/DockerContext';

const DockerImageItem = ({ image }) => {
  const { createContainer } = useDocker();
  const [runContainerOpen, setRunContainerOpen] = useState(false);
  const [containerName, setContainerName] = useState('');
  const [portMapping, setPortMapping] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [runContainerLoading, setRunContainerLoading] = useState(false);

  // Fix the Run Container dialog functionality
  const handleRunContainer = async () => {
    // Add loading state to show feedback
    setRunContainerLoading(true);
    
    try {
      // Format ports properly
      let ports = null;
      if (portMapping) {
        const parts = portMapping.split(':');
        if (parts.length === 2) {
          // Format: hostPort:containerPort
          ports = { [`${parts[1]}/tcp`]: parseInt(parts[0]) };
        } else if (parts.length === 1) {
          // Format: just port - map to same port
          ports = { [`${parts[0]}/tcp`]: parseInt(parts[0]) };
        }
      }
      
      // Prepare the request data
      const containerData = {
        image: image.tags ? image.tags[0] : image.id,
        container_name: containerName || undefined,
        ports: ports,
        detach: true
      };
      
      console.log('Creating container with:', containerData);
      
      // Make the API call
      const response = await fetch('http://localhost:8000/docker/container/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(containerData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create container');
      }
      
      const data = await response.json();
      console.log('Container created successfully:', data);
      
      // Close dialog and show success message
      setRunContainerOpen(false);
      
      // Refresh containers list
      if (refreshContainers) {
        refreshContainers();
      }
      
      // Show success message
      if (setSnackbarMessage && setSnackbarOpen) {
        setSnackbarMessage('Container created successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error creating container:', error);
      if (setSnackbarMessage && setSnackbarOpen) {
        setSnackbarMessage(error.message || 'Failed to create container');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } finally {
      setRunContainerLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6">{image.tags ? image.tags[0] : image.id}</Typography>
      <Button variant="contained" color="primary" onClick={() => setRunContainerOpen(true)}>
        Run Container
      </Button>
      <Dialog open={runContainerOpen} onClose={() => setRunContainerOpen(false)}>
        <DialogTitle>Run Container</DialogTitle>
        <DialogContent>
          <TextField
            label="Container Name"
            value={containerName}
            onChange={(e) => setContainerName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Port Mapping (hostPort:containerPort)"
            value={portMapping}
            onChange={(e) => setPortMapping(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunContainerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRunContainer}
            disabled={runContainerLoading}
            fullWidth
          >
            {runContainerLoading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} /> 
                Creating...
              </>
            ) : (
              'Run Container'
            )}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DockerImageItem;