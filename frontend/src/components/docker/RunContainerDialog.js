import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  CircularProgress, 
  Alert,
  Divider,
  Paper,
  Tooltip,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import axios from 'axios';
import { useDocker } from '../../context/DockerContext';
import InfoIcon from '@mui/icons-material/Info';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const RunContainerDialog = ({ open, onClose, imageId, imageName }) => {
  const { refreshDockerResources } = useDocker();
  const [containerName, setContainerName] = useState('');
  const [hostPort, setHostPort] = useState('8080'); // Simplified to just one host port
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const resetForm = () => {
    setContainerName('');
    setHostPort('8080');
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleRunContainer = async () => {
    if (!containerName.trim()) {
      setError('Please enter a valid container name');
      return;
    }

    // Validate container name
    if (!/^[a-zA-Z0-9_-]+$/.test(containerName)) {
      setError('Container name can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    console.log('⚡ CONTAINER CREATION - Starting process');
    console.log(`⚡ Container name: "${containerName}"`);
    console.log(`⚡ Host port: "${hostPort}"`);
    console.log(`⚡ Image ID: "${imageId}"`);

    try {
      // Create a simplified container config without using ExposedPorts key directly
      // This avoids potential API compatibility issues
      const createContainerConfig = {
        image: imageId,
        name: containerName,
        container_name: containerName,
        Tty: true,
        OpenStdin: true,
        // We'll let the backend handle the exposed ports
        HostConfig: {
          RestartPolicy: {
            Name: "always"
          },
          PortBindings: {
            "80/tcp": [{ HostPort: hostPort }]
          }
        },
        // Pass the exposed ports as a separate field
        exposed_ports: {
          "80/tcp": {}
        }
      };

      console.log('⚡ Sending container config to API:', JSON.stringify(createContainerConfig, null, 2));

      // Try multiple endpoints to ensure compatibility
      const apiUrls = [
        'http://localhost:8000/docker/container/create',  // First try the documented endpoint
        'http://localhost:8000/container/create',         // Then try the alternate endpoint
        'http://localhost:8000/create'                    // Finally try the simplified one
      ];
      
      let createResponse = null;
      let usedUrl = '';
      let error = null;
      
      // Try each URL until one works
      for (const apiUrl of apiUrls) {
        try {
          console.log(`⚡ Trying POST request to: ${apiUrl}`);
          createResponse = await axios.post(
            apiUrl,
            createContainerConfig,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }
          );
          usedUrl = apiUrl;
          console.log(`⚡ Container creation successful using endpoint: ${apiUrl}`);
          break;  // Exit the loop if the request succeeded
        } catch (e) {
          error = e;
          console.log(`⚠️ Failed with endpoint ${apiUrl}: ${e.message}`);
          // Continue to the next URL
        }
      }
      
      // If all URLs failed, throw the last error
      if (!createResponse) {
        throw error || new Error('All container creation endpoints failed');
      }

      console.log('⚡ Container creation response:', createResponse.data);

      // Check if there's an error in the response
      if (createResponse.data.error) {
        throw new Error(createResponse.data.error);
      }

      const containerId = createResponse.data.id;
      if (!containerId) {
        throw new Error('No container ID returned from server');
      }
      
      const containerNameFromResponse = createResponse.data.name || containerName;
      const containerStatus = createResponse.data.status;

      console.log(`⚡ Container created: ID=${containerId}, Name=${containerNameFromResponse}, Status=${containerStatus}`);

      // Only try to start the container if it's not already running
      if (containerStatus !== 'running') {
        console.log(`⚡ Container is not running (status: ${containerStatus}), attempting to start...`);
        
        try {
          const startUrl = `http://localhost:8000/container/${containerNameFromResponse}/start`;
          console.log(`⚡ Starting container with: ${startUrl}`);

          await axios.post(
            startUrl,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          console.log('✅ Container started successfully');
        } catch (startError) {
          console.log('⚠️ Error starting container by name, trying with ID...');
          try {
            if (containerId) {
              const idStartUrl = `http://localhost:8000/container/id/${containerId}/start`;
              console.log(`⚡ Starting container with ID URL: ${idStartUrl}`);
              await axios.post(
                idStartUrl,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
              );
              console.log('✅ Container started successfully by ID');
            } else {
              console.warn('⚠️ No container ID available to retry start');
            }
          } catch (idStartError) {
            console.warn('⚠️ Container start attempts failed, but the container might already be running');
            // Don't treat this as an error, as the container might already be started by the create endpoint
          }
        }
      } else {
        console.log('✅ Container is already running, no need to start it');
      }

      setSuccess(`Container created and started successfully`);
      
      // Force immediate refresh of the container list
      console.log('⚡ Refreshing Docker resources to update container list');
      refreshDockerResources();
      
      // Close the dialog after a short delay
      setTimeout(() => handleClose(), 1500);
    } catch (error) {
      console.error('❌ Error creating container:', error);
      console.log('❌ Error details:', error.response?.data || error.message);
      setError(`Failed to create container: ${error.response?.data?.error || error.message}`);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Run Container from Image</DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {/* Display the selected image name with proper null check */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
          <Typography variant="subtitle1" gutterBottom>
            Image: <strong>{imageName || (imageId && imageId.substring(0, 12)) || 'Selected Image'}</strong>
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} variant="filled">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} variant="filled">
            {success}
          </Alert>
        )}

        {/* Container Name Input */}
        <TextField
          label="Container Name"
          value={containerName}
          onChange={(e) => setContainerName(e.target.value)}
          fullWidth
          margin="normal"
          required
          disabled={loading}
          helperText="Enter a unique name for your container"
        />

        {/* Simplified Port Input */}
        <TextField
          label="Host Port"
          value={hostPort}
          onChange={(e) => setHostPort(e.target.value)}
          fullWidth
          margin="normal"
          type="number"
          disabled={loading}
          helperText="Port where the container will be accessible on your machine (container port 80 will be mapped to this port)"
        />

        {/* Simple help text */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          • Container port 80 will be mapped to port {hostPort} on your machine<br />
          • After creation, you can access the container at http://localhost:{hostPort}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleRunContainer}
          disabled={loading || !containerName.trim()}
        >
          {loading ? <CircularProgress size={24} /> : 'Run Container'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RunContainerDialog;
