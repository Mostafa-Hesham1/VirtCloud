import React, { useState, useEffect } from 'react';
import { useDocker } from '../../context/DockerContext';
import RunContainerDialog from './RunContainerDialog';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';

const DockerBuildDialog = ({ open, onClose, dockerfile, onBuildComplete }) => {
  const { buildImage } = useDocker();
  const [tag, setTag] = useState('');
  const [imageName, setImageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && dockerfile) {
      // Pre-fill the image name with dockerfile name as a suggestion
      setImageName(dockerfile.name || '');
      setTag('latest');  // Suggest 'latest' as default tag
      setError(null);
      setSuccess(false);
    }
  }, [open, dockerfile]);

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleBuild = async () => {
    if (!tag) {
      setError('Tag is required');
      return;
    }

    if (!imageName) {
      setError('Image name is required');
      return;
    }

    // Validate tag format
    if (tag.includes(':')) {
      setError('Tag should not contain colon (:) characters. Enter only the version part (e.g., "1.0" or "latest")');
      return;
    }

    setError(null);
    setLoading(true);
    
    try {
      const buildData = {
        dockerfile_name: dockerfile.name,
        tag: tag.trim(),
        image_name: imageName.trim()
      };
      
      console.log('Building image with data:', buildData);
      
      const result = await buildImage(buildData);
      console.log('Build started:', result);
      
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        if (onBuildComplete) onBuildComplete(result);
      }, 2000);
    } catch (error) {
      console.error('Failed to build image:', error);
      
      let errorMessage = 'Failed to build image';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Build Docker Image</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Dockerfile: {dockerfile?.name}
          </Typography>
        </Box>

        <TextField
          label="Image Name"
          value={imageName}
          onChange={(e) => setImageName(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
          fullWidth
          required
          margin="normal"
          placeholder="e.g., nginx, myapp"
          helperText="Name for the Docker image (lowercase letters, numbers, dashes, underscores only)"
          error={!!error && error.includes('name')}
          disabled={loading || success}
        />

        <TextField
          label="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
          fullWidth
          required
          margin="normal"
          placeholder="e.g., latest, v1.0"
          helperText="Tag must be lowercase letters, numbers, dashes, underscores only (Docker standard)"
          error={!!error && error.includes('tag')}
          disabled={loading || success}
        />

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Docker naming conventions:</strong>
            <ul>
              <li>Image names and tags must be lowercase</li>
              <li>Valid characters: a-z, 0-9, periods, underscores, and hyphens</li>
              <li>Examples: nginx:latest, myapp:v1.0, my-service:1.3.5</li>
            </ul>
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Build started successfully! You can check build status in the Build Status tab.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleBuild}
            disabled={loading || !tag.trim() || !imageName.trim()}
          >
            {loading ? <CircularProgress size={24} sx={{ mr: 1 }} /> : 'Build Image'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DockerBuildDialog;