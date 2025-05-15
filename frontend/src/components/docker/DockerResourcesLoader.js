import React, { useState, useEffect } from 'react';
import { useDocker } from '../../contexts/DockerContext';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

const DockerResourcesLoader = ({ children }) => {
  const { 
    loadingImages, 
    loadingContainers, 
    loadingDockerfiles,
    error,
    fetchImages, 
    fetchContainers,
    fetchDockerfiles
  } = useDocker();
  
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  
  // Initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      // After 5 seconds, hide the splash screen regardless of loading state
      setShowSplash(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Track loading state
  useEffect(() => {
    // Show loading if anything is loading
    setLoading(loadingImages || loadingContainers || loadingDockerfiles);
    
    // If everything has been attempted to load (success or fail), we'll soon hide the splash
    if (!loadingImages && !loadingContainers && !loadingDockerfiles) {
      // Give a slight delay before hiding splash
      setTimeout(() => setShowSplash(false), 500);
    }
  }, [loadingImages, loadingContainers, loadingDockerfiles]);
  
  // Auto-retry if there was an error
  useEffect(() => {
    if (error) {
      const retryTimer = setTimeout(() => {
        console.log("Auto-retrying Docker resource loading...");
        if (error.images) fetchImages();
        if (error.containers) fetchContainers();
        if (error.dockerfiles) fetchDockerfiles();
      }, 3000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [error, fetchImages, fetchContainers, fetchDockerfiles]);
  
  // If splash is hidden, show the main content
  if (!showSplash) {
    return children;
  }
  
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="80vh"
      width="100%"
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          maxWidth: '600px'
        }}
      >
        <Typography variant="h5" gutterBottom>
          Loading Docker Resources
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 3 }}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            {loading 
              ? "Connecting to Docker..." 
              : "Proceeding to dashboard..."}
          </Typography>
        </Box>
        
        {!loading && (
          <Typography variant="caption" color="textSecondary" align="center">
            Some Docker resources may load in the background. 
            Don't worry if not everything appears immediately.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default DockerResourcesLoader;
