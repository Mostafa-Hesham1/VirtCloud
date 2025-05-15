import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert } from '@mui/material';
import { useDocker } from '../../context/DockerContext';

const ImageBuildDialog = ({ open, onClose }) => {
  const { buildImage } = useDocker();
  const [imageName, setImageName] = useState('');
  const [dockerfileContent, setDockerfileContent] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBuildImage = async () => {
    setLoading(true);
    setError(null);

    try {
      await buildImage(imageName, dockerfileContent);
      onClose();
    } catch (error) {
      console.error('Error building image:', error);
      
      let errorMessage = 'Failed to build image';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => 
              `${err.loc ? err.loc.join('.') : ''}: ${err.msg}`
            ).join(', ');
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else {
          errorMessage = typeof errorData === 'string' 
            ? errorData 
            : JSON.stringify(errorData);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleBuild = async () => {
    if (!tag) {
      setError('Tag is required');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const buildData = {
        dockerfile_name: dockerfile.name,
        tag
      };
      
      const result = await buildImage(buildData);
      console.log('Build started:', result);
      
      onClose();
    } catch (error) {
      console.error('Failed to build image:', error);
      
      // Make sure error is a string
      let errorMessage = 'Failed to build image';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Unknown error occurred';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Build Docker Image</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Image Name"
          type="text"
          fullWidth
          value={imageName}
          onChange={(e) => setImageName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Dockerfile Content"
          type="text"
          fullWidth
          multiline
          rows={4}
          value={dockerfileContent}
          onChange={(e) => setDockerfileContent(e.target.value)}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {typeof error === 'string' ? error : 'An error occurred during the build process'}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {typeof error === 'string' ? error : 'An unknown error occurred'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleBuildImage} color="primary" disabled={loading}>
          {loading ? 'Building...' : 'Build'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageBuildDialog;