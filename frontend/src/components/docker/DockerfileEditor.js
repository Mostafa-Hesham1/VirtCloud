import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert, InputAdornment, Tooltip } from '@mui/material';
import axios from 'axios';
import InfoIcon from '@mui/icons-material/Info';

const DockerfileEditor = ({ refreshDockerResources }) => {
  const [dockerfileName, setDockerfileName] = useState('');
  const [dockerfile, setDockerfile] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sanitizedPreview, setSanitizedPreview] = useState('');

  // Update the sanitized preview whenever the dockerfile name changes
  useEffect(() => {
    const sanitized = dockerfileName.trim().replace(/[\\/*?:"<>|\r\n\t]/g, "_");
    setSanitizedPreview(sanitized);
  }, [dockerfileName]);

  const resetForm = () => {
    setDockerfileName('');
    setDockerfile('');
    setDescription('');
    setError('');
    setSuccess('');
  };

  const handleCreateDockerfile = async () => {
    if (!dockerfileName.trim()) {
      setError('Please enter a valid Dockerfile name');
      return;
    }
    
    // Enhanced sanitization to prevent special characters that could cause filename issues
    const sanitizedName = dockerfileName.trim().replace(/[\\/*?:"<>|\r\n\t]/g, "_");
    
    // Extra validation - don't allow the name to be too long or just whitespace
    if (!sanitizedName || sanitizedName.length > 50) {
      setError('Please enter a valid Dockerfile name between 1-50 characters');
      return;
    }
    
    // Log the actual request data for debugging
    console.log("Preparing to send request with data:", {
      name: sanitizedName,
      content: dockerfile,
      description: description
    });
    
    try {
      setLoading(true);
      
      // Explicitly create the request data object to ensure correct field order
      const requestData = {
        name: sanitizedName,
        content: dockerfile,
        description: description
      };
      
      console.log("Sending request with data:", JSON.stringify(requestData));
      
      const response = await axios.post(
        'http://localhost:8000/docker/dockerfile/create',
        requestData,
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setSuccess(`Dockerfile '${sanitizedName}' created successfully`);
      resetForm();
      refreshDockerResources(); // Refresh to show new dockerfile
    } catch (error) {
      console.error('Error creating Dockerfile:', error);
      setError(error.response?.data?.detail || 'Failed to create Dockerfile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Create Dockerfile
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <TextField
        label="Dockerfile Name"
        value={dockerfileName}
        onChange={(e) => setDockerfileName(e.target.value)}
        fullWidth
        margin="normal"
        required
        helperText={
          sanitizedPreview !== dockerfileName && dockerfileName 
            ? `Will be saved as: ${sanitizedPreview}` 
            : "Name for your Dockerfile (without extension)"
        }
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Only use alphanumeric characters, dashes, and underscores for best compatibility">
                <InfoIcon color="info" fontSize="small" />
              </Tooltip>
            </InputAdornment>
          ),
        }}
        error={dockerfileName && !sanitizedPreview}
      />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Dockerfile Content"
        value={dockerfile}
        onChange={(e) => setDockerfile(e.target.value)}
        fullWidth
        multiline
        rows={10}
        margin="normal"
        placeholder="FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD [\"npm\", \"start\"]"
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateDockerfile}
          disabled={loading || !dockerfileName.trim() || !dockerfile.trim()}
        >
          {loading ? <CircularProgress size={24} /> : 'Create Dockerfile'}
        </Button>
      </Box>
    </Box>
  );
};

export default DockerfileEditor;