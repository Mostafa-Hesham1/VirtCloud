import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, TableContainer, Table, TableHead, TableBody, 
  TableRow, TableCell, IconButton, Tooltip, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, CircularProgress, Alert, Chip, Switch,
  FormControlLabel, Grid, InputAdornment, Tabs, Tab, Card, CardContent, 
  CardActions, Divider, LinearProgress 
} from '@mui/material';
import { useDocker } from '../../context/DockerContext';
import axios from 'axios';
import RunContainerDialog from './RunContainerDialog';
import ErrorDisplay from './ErrorDisplay';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Add this TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <div>{children}</div>}
    </div>
  );
}

const ImagePanel = () => {
  const { 
    images, 
    loading, 
    errors, 
    pullImage, 
    refreshDockerResources, 
    deleteImage, 
    searchLocalImages,
    searchDockerHub,
    pullStatus,
    fetchPullHistory,
    fetchBuilds,  // Add this if available in the context
    setPullStatus  // Add the setter function from context
  } = useDocker();
  
  // State variables 
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('local');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hubSearchResults, setHubSearchResults] = useState([]);
  
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [imageToPull, setImageToPull] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullingImage, setPullingImage] = useState(null);
  const [pullError, setPullError] = useState(null);
  
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [containerName, setContainerName] = useState('');
  const [portMapping, setPortMapping] = useState('');
  const [envVars, setEnvVars] = useState('');
  const [isCreatingContainer, setIsCreatingContainer] = useState(false);
  const [createContainerError, setCreateContainerError] = useState(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImageToDelete, setSelectedImageToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [operationResult, setOperationResult] = useState(null);
  
  // FIX: Add a debug state to log null/undefined objects
  const [debugInfo, setDebugInfo] = useState({});
  
  // FIX: Safe accessor function for Object.keys
  const safeObjectKeys = (obj) => {
    if (!obj) {
      console.warn("Attempted to call Object.keys on null/undefined object");
      return [];
    }
    return Object.keys(obj);
  };

  // FIX: Safe parsing functions with explicit null checks
  const parsePortMappings = (portsString) => {
    if (!portsString || typeof portsString !== 'string') {
      console.log("Invalid port mapping input:", portsString);
      return {};
    }
    
    const mappings = {};
    try {
      const pairs = portsString.split(',');
      
      pairs.forEach(pair => {
        if (!pair || !pair.trim()) return;
        
        const [containerPort, hostPort] = pair.trim().split(':');
        if (containerPort && hostPort) {
          mappings[`${containerPort}/tcp`] = parseInt(hostPort, 10);
        }
      });
    } catch (error) {
      console.error("Error parsing port mappings:", error);
    }
    
    return mappings;
  };
  
  const parseEnvVars = (envString) => {
    if (!envString || typeof envString !== 'string') {
      console.log("Invalid environment variables input:", envString);
      return {};
    }
    
    const envVars = {};
    try {
      const pairs = envString.split(',');
      
      pairs.forEach(pair => {
        if (!pair || !pair.trim()) return;
        
        const [key, value] = pair.trim().split('=');
        if (key && value) {
          envVars[key] = value;
        }
      });
    } catch (error) {
      console.error("Error parsing environment variables:", error);
    }
    
    return envVars;
  };
  
  // FIX: Add diagnostic effect to log state objects
  useEffect(() => {
    // Capture key state for debugging
    setDebugInfo({
      hasRunningTimers: !!runningTimers,
      hasImages: !!images,
      imageCount: images ? images.length : 0,
      hasSearchResults: !!searchResults,
      searchResultCount: searchResults ? searchResults.length : 0,
      hasHubResults: !!hubSearchResults,
      hubResultCount: hubSearchResults ? hubSearchResults.length : 0
    });
    
    console.log("ImagePanel rendering with state:", {
      images: images ? `Array(${images.length})` : 'undefined/null',
      searchResults: searchResults ? `Array(${searchResults.length})` : 'undefined/null',
      hubSearchResults: hubSearchResults ? `Array(${hubSearchResults.length})` : 'undefined/null',
      runningTimers: runningTimers ? `Object(${safeObjectKeys(runningTimers).length} keys)` : 'undefined/null'
    });
  }, [images, searchResults, hubSearchResults]);

  // FIX: Initialize runningTimers state safely
  const [runningTimers, setRunningTimers] = useState({});
  
  // FIX: Safe search handlers
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      return;
    }
    
    if (searchType === 'local') {
      setLocalSearching(true);
      setLocalSearchError(null);
      
      try {
        console.log(`Searching local images for: ${searchTerm}`);
        const results = await searchLocalImages(searchTerm.trim());
        console.log("Local search results:", results);
        setLocalSearchResults(results || []);
        setTabValue(1); // Switch to local search results tab
      } catch (error) {
        console.error('Local search error:', error);
        setLocalSearchError(error.message || "Failed to search local images");
        setLocalSearchResults([]);
      } finally {
        setLocalSearching(false);
      }
    } else {
      setHubSearching(true);
      setHubSearchError(null);
      
      try {
        console.log(`Searching Docker Hub for: ${searchTerm}`);
        const results = await searchDockerHub(searchTerm.trim());
        console.log("Docker Hub search results:", results);
        setHubSearchResults(results || []);
        setTabValue(2); // Switch to Docker Hub results tab
      } catch (error) {
        console.error('Docker Hub search error:', error);
        setHubSearchError(error.message || "Failed to search Docker Hub");
        setHubSearchResults([]);
      } finally {
        setHubSearching(false);
      }
    }
  };

  // FIX: Safe render functions with explicit null handling
  const renderSearchResults = () => {
    if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
      return (
        <Typography color="text.secondary" align="center">
          No matching images found. Try a different search term.
        </Typography>
      );
    }
    
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Image</strong></TableCell>
              <TableCell><strong>Tags</strong></TableCell>
              <TableCell align="right"><strong>Size</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {searchResults.map((image, index) => {
              if (!image) return null;
              return (
                <TableRow key={image.id || `unknown-${index}`} hover>
                  <TableCell>{image.short_id || 'Unknown'}</TableCell>
                  <TableCell>
                    <Typography>
                      No images found. Try a different search term.
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  // Fix the renderHubSearchResults function with the mismatched tags
  const renderHubSearchResults = () => {
    if (hubSearchError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {hubSearchError}
        </Alert>
      );
    }
    
    if (!hubSearchResults || hubSearchResults.length === 0) {
      return (
        <Typography color="text.secondary" align="center">
          No images found. Try a different search term.
        </Typography>
      );
    }
  
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Image</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell align="center"><strong>Stars</strong></TableCell>
              <TableCell align="center"><strong>Type</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(hubSearchResults || []).map((image, index) => {
              // Add null check to prevent errors
              if (!image) return null;
              
              // Safely extract display values with fallbacks
              const imageName = image.name || 'Unknown';
              const displayDescription = image.description 
                ? (image.description.length > 100 
                    ? `${image.description.substring(0, 100)}...` 
                    : image.description)
                : 'No description';
              
              return (
                <TableRow key={`${imageName}-${index}`} hover>
                  <TableCell>{imageName}</TableCell>
                  <TableCell>{displayDescription}</TableCell>
                  <TableCell align="center">{image.star_count || 0}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      size="small" 
                      color={image.is_official ? "primary" : "default"} 
                      label={image.is_official ? "Official" : "Community"} 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={image.local ? "Already pulled" : "Pull Image"}>
                      <span>
                        <IconButton
                          color="primary"
                          onClick={() => handlePullImage(imageName)}
                          disabled={image.local || isPulling}
                        >
                          {isPulling && pullingImage === imageName ? (
                            <CircularProgress size={24} />
                          ) : (
                            <CloudDownloadIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  // Add state variables
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [buildStatus, setBuildStatus] = useState({});
  const [pullImageName, setPullImageName] = useState('');
  const [pullId, setPullId] = useState('');
  const [containerDialogOpen, setContainerDialogOpen] = useState(false);
  const [containerPorts, setContainerPorts] = useState([]);
  const [containerError, setContainerError] = useState(null);
  
  // Add missing functions
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Refresh data based on the selected tab
    if (newValue === 0) {
      console.log('Switching to All Images tab, refreshing images...');
      handleRefreshImages();
    } else if (newValue === 4) {
      console.log('Switching to Pull Status tab, refreshing pull history...');
      if (typeof fetchPullHistory === 'function') {
        fetchPullHistory();
      }
    } else if (newValue === 3) {
      console.log('Switching to Build Status tab, refreshing builds...');
      // Only call fetchBuilds if it's available in the context
      if (typeof fetchBuilds === 'function') {
        fetchBuilds();
      } else {
        console.log('fetchBuilds function is not available');
        // Fallback to general refresh if fetchBuilds is not available
        refreshDockerResources();
      }
    }
  };
  
  const handlePullDialogOpen = () => {
    setPullImageName('');
    setPullId(null);
    setPullError(null);
    setPullDialogOpen(true);
  };
  
  const handlePullDialogClose = () => {
    setPullDialogOpen(false);
  };
  
  const handlePullImage = async (imageName) => {
    if (!imageName) return;
    
    setPullingImage(imageName);
    setIsPulling(true);
    setPullError(null);
    
    try {
      console.log(`Pulling image: ${imageName}`);
      const result = await pullImage(imageName);
      console.log("Pull result:", result);
      
      setPullId(result.pull_id);
      refreshDockerResources(); // Refresh to show the new image
      
      // Show success message
      setOperationResult({
        success: true,
        message: `Started pulling image: ${imageName}`
      });
      
      // Switch to pull status tab
      setTabValue(4);
    } catch (error) {
      console.error("Pull error:", error);
      setPullError(error.message || "Failed to pull image");
      setOperationResult({
        success: false,
        message: `Failed to pull image: ${error.message || "Unknown error"}`
      });
    } finally {
      setIsPulling(false);
      setPullingImage(null);
    }
  };

  // Fix the pull from dialog function to properly track pull operations
  const handlePullFromDialog = async () => {
    if (!pullImageName.trim()) return;
    
    setIsPulling(true);
    setPullError(null);
    
    try {
      console.log(`Pulling image from dialog: ${pullImageName}`);
      const result = await pullImage(pullImageName);
      console.log("Pull result:", result);
      
      // Store the pull ID and show success message
      setPullId(result.pull_id);
      
      // Show success message
      setOperationResult({
        success: true,
        message: `Started pulling image: ${pullImageName}. Pull ID: ${result.pull_id}`
      });
      
      // Close dialog and switch to pull status tab after a brief delay
      setTimeout(() => {
        setPullDialogOpen(false);
        setTabValue(4); // Switch to pull status tab
      }, 1500);
    } catch (error) {
      console.error("Pull error:", error);
      setPullError(error.message || "Failed to pull image");
    } finally {
      setIsPulling(false);
    }
  };

  const handleContainerDialogOpen = (image) => {
    console.log('Opening container dialog for image:', image);
    // Use the RunContainerDialog instead of the old dialog
    setSelectedImage(image);
    setRunContainerOpen(true);
    // Don't use the old dialog anymore
    // setContainerError(null);
    // setContainerDialogOpen(false);
  };
  
  const handleContainerDialogClose = () => {
    setContainerDialogOpen(false);
  };
  
  // Remove the old handleCreateContainer as it's not needed anymore
  // The RunContainerDialog handles container creation internally
  
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Update the function to search Docker Hub with better error handling
  const handleSearchDockerHub = async () => {
    if (!searchTerm.trim()) {
      setHubSearchError("Please enter a search term");
      return;
    }
    
    setHubSearching(true);
    setHubSearchError(null);
    
    try {
      console.log('Starting Docker Hub search...');
      const results = await searchDockerHub(searchTerm.trim());
      console.log(`Search returned ${results.length} results`);
      setHubSearchResults(results);
    } catch (error) {
      console.error('Error in handleSearchDockerHub:', error);
      setHubSearchError(error.message || "Failed to search Docker Hub");
      setHubSearchResults([]);
    } finally {
      setHubSearching(false);
    }
  };

  // Add state for search results and error handling
  const [localSearchResults, setLocalSearchResults] = useState([]);
  const [localSearching, setLocalSearching] = useState(false);
  const [localSearchError, setLocalSearchError] = useState(null);
  const [hubSearching, setHubSearching] = useState(false);  // Added missing state
  const [hubSearchError, setHubSearchError] = useState(null);  // Added missing state

  // Update or add these search handler functions
  const handleSearchLocal = async () => {
    if (!searchTerm.trim()) {
      setLocalSearchError("Please enter a search term");
      return;
    }
    
    setLocalSearching(true);
    setLocalSearchError(null);
    
    try {
      console.log('Starting local search for:', searchTerm);
      const results = await searchLocalImages(searchTerm.trim());
      console.log(`Local search returned ${results.length} results`);
      setLocalSearchResults(results);
    } catch (error) {
      console.error('Local search error:', error);
      setLocalSearchError(error.message || "Failed to search local images");
      setLocalSearchResults([]);
    } finally {
      setLocalSearching(false);
    }
  };

  // Update or add these render functions for search results
  const renderLocalSearchResults = () => {
    if (localSearchError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {localSearchError}
        </Alert>
      );
    }
    
    if (!localSearchResults || localSearchResults.length === 0) {
      return (
        <Typography color="text.secondary" align="center">
          No matching images found locally. Try a different search term.
        </Typography>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Repository</strong></TableCell>
              <TableCell><strong>Tag</strong></TableCell>
              <TableCell><strong>Image ID</strong></TableCell>
              <TableCell><strong>Size</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localSearchResults.map((image, index) => {
              if (!image) return null;
              
              // Safely extract image information with fallbacks
              const imageId = image.short_id || (image.id ? image.id.substring(0, 12) : `unknown-${index}`);
              const tags = Array.isArray(image.tags) ? image.tags : [];
              const mainTag = tags.length > 0 ? tags[0] : '';
              const repository = mainTag.split(':')[0] || '<unnamed>';
              const tag = mainTag.includes(':') ? mainTag.split(':').slice(1).join(':') : 'latest';
              
              return (
                <TableRow key={imageId} hover>
                  <TableCell>{repository}</TableCell>
                  <TableCell>{tag}</TableCell>
                  <TableCell>{imageId}</TableCell>
                  <TableCell>{image.size ? formatBytes(image.size) : 'Unknown'}</TableCell>
                  <TableCell>
                    {image.created 
                      ? new Date(image.created).toLocaleString()
                      : 'Unknown'
                    }
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="Run Container">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleContainerDialogOpen(image)}
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Image Information">
                        <IconButton 
                          size="small" 
                          color="info"
                          onClick={() => handleImageInfoClick(image)}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Image">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteImageClick(image)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  useEffect(() => {
    console.log("Current pull status:", pullStatus);
  }, [pullStatus]);

  // Add a function to fetch pull status if empty
  const checkPullStatus = async () => {
    if (tabValue === 4) {
      console.log("Switch to pull status tab - refreshing pull data");
      try {
        await fetchPullHistory();
        await refreshDockerResources();
      } catch (error) {
        console.error("Error refreshing pull status:", error);
      }
    }
  };

  // Also check pull status when component mounts
  useEffect(() => {
    fetchPullHistory();
  }, []);

  // Create a local fallback function in case it's not provided by the context
  const handleRemoveFromHistory = (pullId) => {
    if (typeof setPullStatus === 'function') {
      // Use the context function if available
      setPullStatus(prev => {
        const newStatus = {...prev};
        delete newStatus[pullId];
        return newStatus;
      });
    } else {
      // If not available from context, use a different approach
      console.warn("setPullStatus not available from context, using local approach");
      // Just update the UI by refreshing the data
      fetchPullHistory();
      refreshDockerResources();
    }
    
    setOperationResult({
      success: true,
      message: "Pull record removed from history"
    });
  };

  // Add a new state for the image info dialog
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedImageForInfo, setSelectedImageForInfo] = useState(null);

  // Add a new state for the delete confirmation dialog
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);

  // Handler for the info button click
  const handleImageInfoClick = (image) => {
    setSelectedImageForInfo(image);
    setInfoDialogOpen(true);
  };

  // Handler for the delete button click
  const handleDeleteImageClick = (image) => {
    setImageToDelete(image);
    setDeleteImageDialogOpen(true);
  };

  // Handler for confirming image deletion
  const handleConfirmImageDelete = async () => {
    if (!imageToDelete) return;
    
    setDeletingImage(true);
    const imageName = imageToDelete.tags?.[0] || imageToDelete.id;
    
    try {
      await deleteImage(imageName);
      setOperationResult({
        success: true,
        message: `Image ${imageName} deleted successfully`
      });
      refreshDockerResources();
    } catch (err) {
      setOperationResult({
        success: false,
        message: `Failed to delete image: ${err.message || "Unknown error"}`
      });
    } finally {
      setDeletingImage(false);
      setDeleteImageDialogOpen(false);
      setImageToDelete(null);
    }
  };

  // Add state for run container dialog
  const [runContainerOpen, setRunContainerOpen] = useState(false);
  
  // Add function to handle opening the run container dialog
  const handleRunContainerOpen = (image) => {
    setSelectedImage(image);
    setRunContainerOpen(true);
  };
  
  // Add function to handle closing the run container dialog
  const handleRunContainerClose = () => {
    setRunContainerOpen(false);
    setSelectedImage(null);
  };

  // Find any place where you might be handling build errors and make sure they're properly formatted:
  const handleBuildImage = async (buildData) => {
    // ...existing code...
    
    try {
      // ...existing code...
    } catch (error) {
      console.error('Error building image:', error);
      
      // Parse the error properly
      let errorMessage = 'Failed to build image';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map(err => 
            `${err.loc ? err.loc.join('.') : ''}: ${err.msg}`
          ).join(', ');
        } else {
          errorMessage = JSON.stringify(detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Set the error as a string
      setOperationResult({
        success: false,
        message: errorMessage
      });
    }
  };

  // Add/update the useEffect hook to automatically refresh images when the tab changes to images
  useEffect(() => {
    if (tabValue === 0) { // 0 is the index for the "All Images" tab
      console.log('Images tab selected, refreshing images...');
      refreshDockerResources();
    }
  }, [tabValue, refreshDockerResources]);

  // Add a state to track the last refresh time
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  
  // Remove the automatic refresh interval and keep only manual refresh
  useEffect(() => {
    console.log('ImagePanel mounted - loading images once...');
    refreshDockerResources();
    
    // No automatic refresh timer anymore
  }, [refreshDockerResources]); // Dependency array keeps the original dependency

  // Enhanced manual refresh function with more logging
  const handleRefreshImages = () => {
    console.log('Manually refreshing images at', new Date().toISOString());
    refreshDockerResources();
    setLastRefreshTime(Date.now());
    setOperationResult({
      success: true,
      message: 'Images refreshed'
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Docker Images
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshImages}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<CloudDownloadIcon />}
            onClick={() => handlePullDialogOpen('')}
          >
            Pull Image
          </Button>
        </Box>
      </Box>

      {/* Search Box */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              label="Search for Docker images"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={searchType === 'hub'}
                  onChange={(e) => setSearchType(e.target.checked ? 'hub' : 'local')}
                  color="primary"
                />
              }
              label={searchType === 'hub' ? 'Docker Hub' : 'Local'}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button 
              variant="contained" 
              onClick={handleSearch}
              disabled={localSearching || hubSearching || !searchTerm.trim()}
              fullWidth
            >
              {localSearching || hubSearching ? (
                <CircularProgress size={24} sx={{ mr: 1 }} />
              ) : (
                <>
                  <SearchIcon sx={{ mr: 1 }} />
                  Search {searchType === 'hub' ? 'Docker Hub' : 'Local'}
                </>
              )}
            </Button>
          </Grid>
        </Grid>
        
        {/* Show search errors */}
        {localSearchError && searchType === 'local' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {localSearchError}
          </Alert>
        )}
        {hubSearchError && searchType === 'hub' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {hubSearchError}
          </Alert>
        )}
        
        {/* Show operation results */}
        {operationResult && (
          <Alert 
            severity={operationResult.success ? "success" : "error"} 
            sx={{ mt: 2 }}
            onClose={() => setOperationResult(null)}
          >
            {operationResult.message}
          </Alert>
        )}
      </Paper>

      {/* Tabs for Images */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Images" />
          <Tab label="Local Search Results" />
          <Tab label="DockerHub Results" />
          <Tab label="Build Status" />
          <Tab label="Pull Status" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {loading.images ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : images?.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" paragraph>
              No Docker images found. Pull an image or build one from a Dockerfile.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<CloudDownloadIcon />}
              onClick={() => handlePullDialogOpen('')}
              sx={{ mx: 1 }}
            >
              Pull Image
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Repository</strong></TableCell>
                  <TableCell><strong>Tag</strong></TableCell>
                  <TableCell><strong>Image ID</strong></TableCell>
                  <TableCell><strong>Size</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell><strong>Ownership</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {images.map((image) => (
                  <TableRow key={image.id} hover>
                    <TableCell>
                      {image.tags?.length > 0 
                        ? image.tags[0].split(':')[0] 
                        : <em>unnamed</em>}
                    </TableCell>
                    <TableCell>
                      {image.tags?.length > 0 
                        ? (image.tags[0].split(':').slice(1).join(':') || 'latest')
                        : <em>none</em>}
                    </TableCell>
                    <TableCell>{image.short_id || image.id.substring(0, 12)}</TableCell>
                    <TableCell>{formatBytes(image.size)}</TableCell>
                    <TableCell>
                      {new Date(image.created).toLocaleDateString()}{' '}
                      {new Date(image.created).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={image.owned ? "My Image" : "System"}
                        color={image.owned ? "primary" : "default"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="Run Container">
                          <IconButton 
                            size="small" 
                            color="success" 
                            onClick={() => handleRunContainerOpen(image)}
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Image Information">
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => handleImageInfoClick(image)}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Image">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteImageClick(image)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {errors.images && <ErrorDisplay error={errors.images} />}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Local Search Results */}
        {localSearching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
            <Typography ml={2}>Searching local images...</Typography>
          </Box>
        ) : localSearchError ? (
          <Alert severity="error">{localSearchError}</Alert>
        ) : !localSearchResults || localSearchResults.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No matching images found locally. Try searching DockerHub instead.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                setSearchType('hub');
                handleSearch();
              }}
              sx={{ mt: 2 }}
            >
              Search DockerHub
            </Button>
          </Paper>
        ) : (
          renderLocalSearchResults()
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* DockerHub Search Results */}
        {hubSearching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
            <Typography ml={2}>Searching Docker Hub...</Typography>
          </Box>
        ) : hubSearchError ? (
          <Alert severity="error">{hubSearchError}</Alert>
        ) : !hubSearchResults || hubSearchResults.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No matching images found on Docker Hub. Try a different search term.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Image</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell align="center"><strong>Stars</strong></TableCell>
                  <TableCell align="center"><strong>Type</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(hubSearchResults || []).map((image, index) => {
                  if (!image) return null;
                  
                  const imageName = image.name || 'Unknown';
                  const displayDescription = image.description 
                    ? (image.description.length > 100 
                        ? `${image.description.substring(0, 100)}...` 
                        : image.description)
                    : 'No description';
                  
                  return (
                    <TableRow key={`${imageName}-${index}`} hover>
                      <TableCell>{imageName}</TableCell>
                      <TableCell>{displayDescription}</TableCell>
                      <TableCell align="center">{image.star_count || 0}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          size="small" 
                          color={image.is_official ? "primary" : "default"} 
                          label={image.is_official ? "Official" : "Community"} 
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={image.local ? "Already pulled" : "Pull Image"}>
                          <span>
                            <IconButton
                              color="primary"
                              onClick={() => handlePullImage(imageName)}
                              disabled={image.local || isPulling}
                            >
                              {isPulling && pullingImage === imageName ? (
                                <CircularProgress size={24} />
                              ) : (
                                <CloudDownloadIcon />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Build Status */}
        {safeObjectKeys(buildStatus).length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No image builds in progress or completed.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {safeObjectKeys(buildStatus).map((buildId) => (
              <Grid item xs={12} key={buildId}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6">
                      {buildStatus[buildId].image_tag || `${buildStatus[buildId].image_name || 'unnamed'}:${buildStatus[buildId].tag || 'latest'}`}
                      {buildStatus[buildId].status === 'building' && (
                        <Chip 
                          size="small" 
                          label="Building" 
                          color="warning" 
                          sx={{ ml: 1 }}
                        />
                      )}
                      {buildStatus[buildId].status === 'completed' && 
                        (buildStatus[buildId].success || buildStatus[buildId].overrideSuccess) && (
                        <Chip 
                          size="small" 
                          label="Success" 
                          color="success" 
                          sx={{ ml: 1 }}
                        />
                      )}
                      {buildStatus[buildId].status === 'completed' && 
                        !buildStatus[buildId].success && 
                        !buildStatus[buildId].overrideSuccess && (
                        <Chip 
                          size="small" 
                          label={buildStatus[buildId].syntaxError ? "Syntax Error" : "Failed"} 
                          color="error" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Build ID: {buildId}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2">
                    <strong>From:</strong> {buildStatus[buildId].dockerfile_name}
                  </Typography>
                  
                  {buildStatus[buildId].expected_full_tag && 
                    buildStatus[buildId].expected_full_tag !== buildStatus[buildId].image_tag && (
                    <Typography variant="body2" color="primary">
                      <strong>Expected Tag:</strong> {buildStatus[buildId].expected_full_tag}
                    </Typography>
                  )}
                  
                  {buildStatus[buildId].actualImageTag && (
                    <Typography variant="body2" color="success.main">
                      <strong>Actual Tag:</strong> {buildStatus[buildId].actualImageTag}
                    </Typography>
                  )}
                  
                  <Typography variant="body2">
                    <strong>Started:</strong> {new Date(buildStatus[buildId].started_at).toLocaleString()}
                  </Typography>
                  
                  {buildStatus[buildId].finished_at && (
                    <Typography variant="body2">
                      <strong>Finished:</strong> {new Date(buildStatus[buildId].finished_at).toLocaleString()}
                    </Typography>
                  )}
                  
                  {buildStatus[buildId].status === 'building' && (
                    <CircularProgress size={24} sx={{ mt: 1 }} />
                  )}
                  
                  {/* Show syntax error message with better formatting */}
                  {buildStatus[buildId].syntaxError && (
                    <Alert 
                      severity="error" 
                      sx={{ mt: 2, mb: 2 }}
                      action={
                        <Button 
                          color="inherit" 
                          size="small"
                          onClick={() => {
                            // Navigate to the Dockerfile editor
                            // For now just show message - you can implement actual navigation
                            setOperationResult({
                              success: false,
                              message: "Please fix your Dockerfile syntax and try again."
                            });
                          }}
                        >
                          Edit Dockerfile
                        </Button>
                      }
                    >
                      <Typography variant="subtitle2">Dockerfile Syntax Error</Typography>
                      <Typography variant="body2">
                        {buildStatus[buildId].errorDetail || "There's a syntax error in your Dockerfile that's preventing the build."}
                      </Typography>
                    </Alert>
                  )}
                  
                  {/* Show last few log entries */}
                  {buildStatus[buildId].logs && buildStatus[buildId].logs.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Recent Logs:</Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          mt: 1, 
                          p: 1, 
                          maxHeight: 200, 
                          overflow: 'auto',
                          bgcolor: 'grey.900'
                        }}
                      >
                        {buildStatus[buildId].logs.slice(-10).map((log, index) => (
                          <Typography 
                            key={index} 
                            variant="caption" 
                            component="div"
                            sx={{ 
                              fontFamily: 'monospace', 
                              whiteSpace: 'pre-wrap',
                              color: log.log && (log.log.includes('ERROR') || log.log.includes('error') || log.log.includes('failed')) 
                                ? 'error.light' 
                                : log.log && (log.log.includes('Successfully built') || log.log.includes('Successfully tagged')) 
                                ? 'success.light' 
                                : 'common.white'
                            }}
                          >
                            {log.log}
                          </Typography>
                        ))}
                      </Paper>
                    </Box>
                  )}
                  
                  {/* Show override success message */}
                  {buildStatus[buildId].overrideSuccess && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Build reported as failed, but the image was successfully created.
                    </Alert>
                  )}
                  
                  {/* Show error details if build failed (and is not a syntax error) */}
                  {buildStatus[buildId].status === 'completed' && 
                    !buildStatus[buildId].success && 
                    !buildStatus[buildId].overrideSuccess &&
                    !buildStatus[buildId].syntaxError &&
                    buildStatus[buildId].errorDetail && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {buildStatus[buildId].errorDetail}
                    </Alert>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {/* Pull Status */}
        {safeObjectKeys(pullStatus).length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No image pulls in progress or completed.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handlePullDialogOpen()}
              startIcon={<CloudDownloadIcon />}
              sx={{ mt: 2 }}
            >
              Pull an Image
            </Button>
          </Paper>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Pull Operations</Typography>
              <Button 
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchPullHistory}
              >
                Refresh History
              </Button>
            </Box>
            
            {/* Group pulls by status for better organization */}
            {(() => {
              // Separate pulls into categories
              const activePulls = [];
              const successfulPulls = [];
              const failedPulls = [];
              
              safeObjectKeys(pullStatus).forEach((pullId) => {
                const pull = pullStatus[pullId];
                if (!pull || !pull.image) return;
                
                if (pull.status === 'pulling') {
                  activePulls.push({ id: pullId, ...pull });
                } else if (pull.status === 'completed' && pull.success) {
                  successfulPulls.push({ id: pullId, ...pull });
                } else if (pull.status === 'completed' && !pull.success) {
                  failedPulls.push({ id: pullId, ...pull });
                }
              });
              
              return (
                <>
                  {/* Active Pulls Section */}
                  {activePulls.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Active Pulls
                      </Typography>
                      <Grid container spacing={3}>
                        {activePulls.map(pull => (
                          <Grid item xs={12} sm={6} key={pull.id}>
                            <Card sx={{ 
                              position: 'relative',
                              borderLeft: '4px solid',
                              borderColor: 'info.main',
                              boxShadow: 3
                            }}>
                              <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
                              <CardContent sx={{ pt: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
                                    {pull.image}
                                  </Typography>
                                  <Chip 
                                    label="Pulling" 
                                    color="info" 
                                    size="small"
                                    icon={<CircularProgress size={16} />} 
                                  />
                                </Box>
                                
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  Started: {new Date(pull.started_at).toLocaleString()}
                                </Typography>
                                
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Pull ID: {pull.id}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                  
                  {/* Successful Pulls Section */}
                  {successfulPulls.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                        Successful Pulls
                      </Typography>
                      <Grid container spacing={3}>
                        {successfulPulls.map(pull => (
                          <Grid item xs={12} sm={6} key={pull.id}>
                            <Card sx={{ 
                              borderLeft: '4px solid',
                              borderColor: 'success.main',
                              boxShadow: 2
                            }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Typography variant="h6" gutterBottom component="div">
                                    {pull.image}
                                  </Typography>
                                  <Chip 
                                    label="Success" 
                                    color="success" 
                                    size="small"
                                    icon={<CheckCircleIcon />} 
                                  />
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Started: {new Date(pull.started_at).toLocaleString()}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Finished: {new Date(pull.finished_at).toLocaleString()}
                                  </Typography>
                                  {pull.started_at && pull.finished_at && (
                                    <Typography variant="body2" color="text.secondary">
                                      Duration: {Math.round((new Date(pull.finished_at) - new Date(pull.started_at)) / 1000)} seconds
                                    </Typography>
                                  )}
                                </Box>
                                
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Pull ID: {pull.id}
                                </Typography>
                              </CardContent>
                              <CardActions sx={{ justifyContent: 'space-between' }}>
                                <Box>
                                  <Button 
                                    size="small" 
                                    color="primary" 
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => handleContainerDialogOpen({
                                      tags: [pull.image],
                                      id: pull.image
                                    })}
                                  >
                                    Run Container
                                  </Button>
                                  <Tooltip title="Image Information">
                                    <IconButton 
                                      size="small" 
                                      color="info"
                                      onClick={() => {
                                        // Find image in images array by name
                                        const image = images.find(img => 
                                          img.tags && img.tags.some(tag => tag.includes(pull.image))
                                        );
                                        // Show info dialog or details for the image
                                        if (image) {
                                          // You can implement an image info dialog here
                                          console.log("Show info for image:", image);
                                          // For now, just show a success message
                                          setOperationResult({
                                            success: true,
                                            message: `Image ID: ${image.short_id || image.id?.substring(0, 12)}`
                                          });
                                        } else {
                                          setOperationResult({
                                            success: false,
                                            message: "Image information not available"
                                          });
                                        }
                                      }}
                                    >
                                      <InfoIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                                <Tooltip title="Delete Image">
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => {
                                      // Call the delete image function
                                      if (window.confirm(`Are you sure you want to delete image ${pull.image}?`)) {
                                        deleteImage(pull.image)
                                          .then(() => {
                                            setOperationResult({
                                              success: true,
                                              message: `Image ${pull.image} deleted successfully`
                                            });
                                            refreshDockerResources();
                                          })
                                          .catch(err => {
                                            setOperationResult({
                                              success: false,
                                              message: `Failed to delete image: ${err.message}`
                                            });
                                          });
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                  
                  {/* Failed Pulls Section */}
                  {failedPulls.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        <ErrorIcon color="error" sx={{ mr: 1 }} />
                        Failed Pulls
                      </Typography>
                      <Grid container spacing={3}>
                        {failedPulls.map(pull => (
                          <Grid item xs={12} sm={6} key={pull.id}>
                            <Card sx={{ 
                              borderLeft: '4px solid',
                              borderColor: 'error.main',
                              boxShadow: 2
                            }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Typography variant="h6" gutterBottom component="div">
                                    {pull.image}
                                  </Typography>
                                  <Chip 
                                    label="Failed" 
                                    color="error" 
                                    size="small"
                                    icon={<ErrorIcon />} 
                                  />
                                </Box>
                                
                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Started: {new Date(pull.started_at).toLocaleString()}
                                  </Typography>
                                  {pull.finished_at && (
                                    <Typography variant="body2" color="text.secondary">
                                      Failed at: {new Date(pull.finished_at).toLocaleString()}
                                    </Typography>
                                  )}
                                </Box>
                                
                                {pull.error && (
                                  <Alert severity="error" sx={{ mt: 1, mb: 1 }} variant="outlined">
                                    {pull.error}
                                  </Alert>
                                )}
                                
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Pull ID: {pull.id}
                                </Typography>
                              </CardContent>
                              <CardActions sx={{ justifyContent: 'space-between' }}>
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  color="primary" 
                                  onClick={() => {
                                    setPullImageName(pull.image);
                                    handlePullDialogOpen();
                                  }}
                                >
                                  Try Again
                                </Button>
                                <Tooltip title="Remove from History">
                                  <IconButton 
                                    size="small" 
                                    color="default"
                                    onClick={() => {
                                      // Implement a function to remove this pull from history
                                      if (window.confirm("Remove this failed pull from history?")) {
                                        // Use the handler function instead of direct state manipulation
                                        handleRemoveFromHistory(pull.id);
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </CardActions>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                  
                  {/* Show message if filtering removed all pulls */}
                  {activePulls.length === 0 && successfulPulls.length === 0 && failedPulls.length === 0 && (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary">
                        No valid pull operations found.
                      </Typography>
                    </Paper>
                  )}
                </>
              );
            })()}
          </>
        )}
      </TabPanel>

      {/* Pull Image Dialog */}
      <Dialog 
        open={pullDialogOpen} 
        onClose={handlePullDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Pull Docker Image</DialogTitle>
        <DialogContent>
          <TextField
            label="Image Name"
            value={pullImageName}
            onChange={(e) => setPullImageName(e.target.value)}
            fullWidth
            margin="normal"
            required
            helperText="Format: name:tag (e.g., nginx:latest, ubuntu:20.04)"
          />
          
          {pullError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {pullError}
            </Alert>
          )}
          
          {pullId && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Pull operation started successfully! Pull ID: {pullId}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePullDialogClose}>Cancel</Button>
          <Button 
            onClick={handlePullFromDialog} 
            variant="contained" 
            color="primary"
            disabled={isPulling || !pullImageName.trim() || pullId !== null}
          >
            {isPulling ? <CircularProgress size={24} /> : 'Pull Image'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add the Image Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1 }} />
            Image Information
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedImageForInfo && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                  <Typography variant="body2"><strong>ID:</strong> {selectedImageForInfo.short_id || selectedImageForInfo.id?.substring(0, 12)}</Typography>
                  <Typography variant="body2"><strong>Created:</strong> {new Date(selectedImageForInfo.created).toLocaleString()}</Typography>
                  <Typography variant="body2"><strong>Size:</strong> {formatBytes(selectedImageForInfo.size)}</Typography>
                  <Typography variant="body2">
                    <strong>Repository:</strong> {selectedImageForInfo.tags?.length > 0 
                      ? selectedImageForInfo.tags[0].split(':')[0] 
                      : '<unnamed>'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tag:</strong> {selectedImageForInfo.tags?.length > 0 
                      ? (selectedImageForInfo.tags[0].split(':').slice(1).join(':') || 'latest')
                      : '<none>'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Tags</Typography>
                  {selectedImageForInfo.tags?.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedImageForInfo.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No tags</Typography>
                  )}
                  
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Container Config</Typography>
                  {selectedImageForInfo.container_config ? (
                    <>
                      {selectedImageForInfo.container_config.Cmd && (
                        <Typography variant="body2">
                          <strong>Command:</strong> {selectedImageForInfo.container_config.Cmd.join(' ')}
                        </Typography>
                      )}
                      {selectedImageForInfo.container_config.ExposedPorts && (
                        <Typography variant="body2">
                          <strong>Exposed Ports:</strong> {Object.keys(selectedImageForInfo.container_config.ExposedPorts).join(', ')}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No container configuration available</Typography>
                  )}
                </Paper>
              </Grid>

              {selectedImageForInfo.history && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>History</Typography>
                    <TableContainer sx={{ maxHeight: 200 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Layer</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Created By</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedImageForInfo.history.map((layer, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{new Date(layer.created).toLocaleString()}</TableCell>
                              <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {layer.created_by}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>Close</Button>
          {selectedImageForInfo && (
            <Button 
              color="primary" 
              startIcon={<PlayArrowIcon />}
              onClick={() => {
                setInfoDialogOpen(false);
                handleContainerDialogOpen(selectedImageForInfo);
              }}
            >
              Run Container
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Add the Delete Image Confirmation Dialog */}
      <Dialog
        open={deleteImageDialogOpen}
        onClose={() => setDeleteImageDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DeleteIcon color="error" sx={{ mr: 1 }} />
            Delete Image
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this image?
          </Typography>
          {imageToDelete && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Image:</strong> {imageToDelete.tags?.[0] || imageToDelete.id}
              </Typography>
              <Typography variant="body2">
                <strong>ID:</strong> {imageToDelete.short_id || imageToDelete.id?.substring(0, 12)}
              </Typography>
              <Typography variant="body2">
                <strong>Size:</strong> {formatBytes(imageToDelete.size)}
              </Typography>
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This action cannot be undone. Any containers using this image will not be affected,
            but you won't be able to create new containers from this image after deletion.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteImageDialogOpen(false)}
            disabled={deletingImage}
          >
            Cancel
          </Button>
          <Button 
            color="error" 
            variant="contained"
            disabled={deletingImage}
            onClick={handleConfirmImageDelete}
            startIcon={deletingImage ? <CircularProgress size={24} /> : <DeleteIcon />}
          >
            {deletingImage ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add the RunContainerDialog component */}
      <RunContainerDialog
        open={runContainerOpen}
        onClose={handleRunContainerClose}
        imageId={selectedImage?.id}
        imageName={selectedImage?.name || selectedImage?.tag}
      />
    </Box>
  );
};

export default ImagePanel;