import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Add this import statement
import { useUser } from './UserContext';
import * as dockerApi from '../api/docker';

const DockerContext = createContext();

export const useDocker = () => useContext(DockerContext);

export const DockerProvider = ({ children }) => {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  
  // State for Docker resources
  const [dockerfiles, setDockerfiles] = useState([]);
  const [images, setImages] = useState([]);
  const [containers, setContainers] = useState([]);
  // Add the missing state variables
  const [builds, setBuilds] = useState([]);
  const [dockerError, setDockerError] = useState(null);
  const [hubSearchResults, setHubSearchResults] = useState([]);
  
  const [loading, setLoading] = useState({
    dockerfiles: false,
    images: false,
    containers: false,
  });
  const [errors, setErrors] = useState({
    dockerfiles: null,
    images: null,
    containers: null,
  });
  
  // State for operations status
  const [buildStatus, setBuildStatus] = useState({});
  const [pullStatus, setPullStatus] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [pullPollingIntervals, setPullPollingIntervals] = useState({});

  // Add state for historical pull operations
  const [pullHistory, setPullHistory] = useState({});

  // Add state for error display delay
  const [showErrors, setShowErrors] = useState(false);

  // Function to refresh all Docker resources
  const refreshDockerResources = useCallback(() => {
    console.log('Triggering Docker resources refresh...');
    setRefreshTrigger(prev => prev + 1);
    // Don't call fetchDockerResources directly here
  }, []);

  // Check connection status on initial load
  useEffect(() => {
    const checkDockerConnection = async () => {
      if (!user.isAuthenticated || !token) {
        setConnectionStatus('not_authenticated');
        return;
      }
      
      try {
        setConnectionStatus('checking');
        console.log("Checking Docker API connection...");
        
        // Try a simple API call to check connection
        await dockerApi.listDockerfiles(token);
        setConnectionStatus('connected');
        console.log("Docker API connection established!");
      } catch (error) {
        console.error("Docker API connection failed:", error);
        if (error.response?.status === 404) {
          setConnectionStatus('not_implemented');
        } else if (error.response?.status === 500) {
          setConnectionStatus('server_error');
        } else {
          setConnectionStatus('connection_error');
        }
      }
    };
    
    checkDockerConnection();
  }, [user.isAuthenticated, token]);

  // Fetch dockerfiles
  const fetchDockerfiles = useCallback(async () => {
    if (!user.isAuthenticated || !token || connectionStatus !== 'connected') return;
    
    setLoading(prev => ({ ...prev, dockerfiles: true }));
    setErrors(prev => ({ ...prev, dockerfiles: null }));
    
    try {
      const files = await dockerApi.listDockerfiles(token);
      setDockerfiles(files || []);
    } catch (error) {
      console.error('Error fetching dockerfiles:', error);
      setErrors(prev => ({ ...prev, dockerfiles: error.message || "Failed to fetch Dockerfiles" }));
    } finally {
      setLoading(prev => ({ ...prev, dockerfiles: false }));
    }
  }, [user.isAuthenticated, token, connectionStatus]);

  // Fetch Docker images
  const fetchImages = async () => {
    if (!user.isAuthenticated || !token) return;
    
    console.log('Fetching Docker images - timestamp:', new Date().toISOString());
    setLoading(prev => ({ ...prev, images: true }));
    
    // Only clear errors if we don't already have images loaded
    // This prevents showing errors when refreshing and a timeout occurs but images are visible
    if (images.length === 0) {
      setErrors(prev => ({ ...prev, images: null }));
    }
    
    try {
      // Add cache-busting query parameter and timeout
      const response = await axios.get('http://localhost:8000/docker/images', {
        headers: { Authorization: `Bearer ${token}` },
        params: { _t: Date.now() }, // Cache-busting
        timeout: 10000 // 10 second timeout
      });
      
      console.log(`Images fetched: ${response.data.images?.length || 0} images returned`);
      
      // Log image details for debugging
      if (response.data.images && response.data.images.length > 0) {
        response.data.images.forEach(image => {
          console.log(`Image: ${image.tags?.join(',') || 'untagged'}, ID: ${image.short_id || image.id?.substring(0, 12)}`);
        });
      }
      
      // If we got images, clear any existing errors
      if (response.data.images && response.data.images.length > 0) {
        setErrors(prev => ({ ...prev, images: null }));
      }
      
      setImages(response.data.images || []);
      return response.data.images || [];
    } catch (error) {
      console.error('Error fetching images:', error);
      
      // Only set error if it's not a timeout OR we have no images already
      const isTimeout = error.code === 'ECONNABORTED' || 
                        error.message?.includes('timeout');
      
      // Don't show timeout errors if we already have images loaded
      if (!(isTimeout && images.length > 0)) {
        // Customize the error message based on the type of error
        const errorMessage = isTimeout 
          ? null // Don't show any error message for timeouts when images are present
          : (error.response?.data?.detail || 'Failed to fetch images');
        
        // Only update the error state if we have a message to show
        if (errorMessage) {
          setErrors(prev => ({ ...prev, images: errorMessage }));
        }
      }
      
      return images; // Return current images on error to prevent UI disruption
    } finally {
      setLoading(prev => ({ ...prev, images: false }));
    }
  };

  // Fetch containers
  const fetchContainers = useCallback(async () => {
    if (!user.isAuthenticated || !token || connectionStatus !== 'connected') return;
    
    setLoading(prev => ({ ...prev, containers: true }));
    setErrors(prev => ({ ...prev, containers: null }));
    
    try {
      const containersList = await dockerApi.listContainers(token);
      setContainers(containersList || []);
    } catch (error) {
      console.error('Error fetching containers:', error);
      setErrors(prev => ({ ...prev, containers: error.message || "Failed to fetch containers" }));
    } finally {
      setLoading(prev => ({ ...prev, containers: false }));
    }
  }, [user.isAuthenticated, token, connectionStatus]);

  // Create a new Dockerfile
  const createDockerfile = async (content, name, description = '') => {
    if (!user.isAuthenticated || !token) throw new Error('Not authenticated');
    
    try {
      const result = await dockerApi.createDockerfile(token, content, name, description);
      await fetchDockerfiles(); // Refresh the list
      return result;
    } catch (error) {
      console.error('Error creating Dockerfile:', error);
      throw error;
    }
  };

  // Enhance buildImage to better handle failed builds and display logs
  const buildImage = async (buildData) => {
    try {
      setLoading(true);
      
      // Debug logs for build request
      console.log('=== BUILD IMAGE REQUEST ===');
      console.log('Original build data:', JSON.stringify(buildData, null, 2));
      
      // Ensure image name and tags are lowercase
      const fixedBuildData = {
        ...buildData,
        image_name: buildData.image_name.toLowerCase(),
        tag: buildData.tag.toLowerCase()
      };
      
      console.log('Fixed build data:', JSON.stringify(fixedBuildData, null, 2));
      
      const response = await axios.post(
        'http://localhost:8000/docker/image/build',
        fixedBuildData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      // Debug logs for build response
      console.log('=== BUILD IMAGE RESPONSE ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', response.headers);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      const buildId = response.data.build_id;
      console.log('Build ID obtained:', buildId);
      
      // After starting the build, fetch logs after a short delay
      setTimeout(() => {
        fetchBuildLogs(buildId);
      }, 2000);
      
      // Poll for build status
      setTimeout(() => {
        pollBuildStatus(buildId);
      }, 2000);
      
      return response.data;
    } catch (error) {
      console.error('Error building image:', error);
      setDockerError(error.response?.data?.detail || 'Failed to build image');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fetch build logs
  const fetchBuildLogs = async (buildId) => {
    try {
      console.log(`Fetching logs for build ${buildId}...`);
      const response = await axios.get(`http://localhost:8000/docker/build/${buildId}/logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const logs = response.data.logs || [];
      console.log('Build logs:', logs);
      
      // Update build logs in state
      setBuilds(prev => prev.map(build => 
        build._id === buildId 
          ? { ...build, logs: logs }
          : build
      ));
      
      return logs;
    } catch (error) {
      console.log('Error fetching build logs:', error.response?.status, error.response?.data?.detail);
      return [];
    }
  };

  // Add the getBuildLogs function before it's used
  const getBuildLogs = async (buildId) => {
    if (!token) return null;
    
    console.log(`Fetching logs for build ${buildId}...`);
    try {
      const response = await axios.get(
        `http://localhost:8000/docker/build/${buildId}/logs`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 3000
        }
      );
      console.log('Build logs fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      // Handle 404 errors gracefully - the logs endpoint doesn't exist
      if (error.response && error.response.status === 404) {
        console.log('Build logs endpoint not found - using status logs instead');
        return null;
      }
      console.error('Error fetching build logs:', error);
      return null;
    }
  };

// Replace the existing pollBuildStatus function with this enhanced version
// Make sure there's only ONE definition of this function in the file
const pollBuildStatus = async (buildId) => {
  if (!token) return;
  
  try {
    console.log(`Polling build status for build ID: ${buildId}`);
    const status = await axios.get(
      `http://localhost:8000/docker/build/${buildId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const buildData = status.data;
    console.log(`Build ${buildId} status update:`, buildData);
    
    // Update the build status in our state
    setBuildStatus(prev => ({
      ...prev,
      [buildId]: buildData
    }));
    
    // If build is completed or failed, stop polling
    if (buildData.status === 'completed' || buildData.status === 'failed') {
      console.log(`Build ${buildId} finished with status=${buildData.status}, success=${buildData.success}`);
      
      // Check for build logs
      if (buildData.logs && buildData.logs.length > 0) {
        console.log('Build logs:', buildData.logs);
        
        // Check for build errors in logs
        const errorLogs = buildData.logs.filter(log => 
          log.log && (
            log.log.includes('ERROR') || 
            log.log.includes('failed') || 
            log.log.includes('not found')
          )
        );
        
        if (errorLogs.length > 0) {
          console.log('Build errors detected:', errorLogs);
          
          // Process specific error types for better user feedback
          const errorMessages = errorLogs.map(log => log.log).join('; ');
          let userFriendlyError = errorMessages;
          
          // Check for common errors and provide better messages
          if (errorMessages.includes('not found after build')) {
            userFriendlyError = 'Build failed: The image could not be created. ' +
              'This often happens when the Dockerfile has syntax errors or references ' +
              'files that don\'t exist in the build context.';
          }
          
          // Update build status with error details
          setBuildStatus(prev => ({
            ...prev,
            [buildId]: {
              ...buildData,
              errorDetail: userFriendlyError,
              rawError: errorMessages
            }
          }));
          
          // Set general error message
          setErrors(prev => ({
            ...prev,
            builds: userFriendlyError
          }));
        }
      }
      
      // Try to get additional logs (will handle 404 gracefully)
      await getBuildLogs(buildId);
      
      // Only refresh images if build succeeded
      if (buildData.success) {
        console.log('Build successful! Refreshing images list...');
        await fetchImages();
      } else {
        console.error('Build failed:', buildData.errorDetail || 'Unknown error');
      }
      
      return; // Stop polling
    }
    
    // Continue polling for in-progress builds
    setTimeout(() => pollBuildStatus(buildId), 2000);
  } catch (error) {
    console.error(`Error polling build status for ${buildId}:`, error);
  }
};

  // Pull a Docker image
  const pullImage = async (imageName) => {
    if (!user.isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }
    
    setLoading(prev => ({ ...prev, pull: true }));
    setErrors(prev => ({ ...prev, pull: null }));
    
    try {
      console.log(`Starting pull for image: ${imageName}`);
      
      const response = await axios.post(
        'http://localhost:8000/docker/image/pull',
        { image: imageName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Pull response:', response.data);
      
      // Immediately add a tracking entry to pullStatus with initial data
      const pullId = response.data.pull_id;
      setPullStatus(prev => ({
        ...prev,
        [pullId]: {
          image: imageName,
          status: 'pulling',
          started_at: new Date().toISOString(),
          finished_at: null,
          success: null
        }
      }));
      
      // Start polling for updates on this pull
      startPullStatusPolling(pullId);
      
      return response.data;
    } catch (error) {
      console.error('Pull error:', error);
      setErrors(prev => ({ ...prev, pull: error.message || 'Failed to pull image' }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, pull: false }));
    }
  };

  // Add a function to poll for pull status updates
  const startPullStatusPolling = (pullId) => {
    console.log(`Starting status polling for pull ID: ${pullId}`);
    
    // Poll every 2 seconds
    const intervalId = setInterval(async () => {
      try {
        if (!token) {
          console.log('No token available, stopping pull status polling');
          clearInterval(intervalId);
          return;
        }
        
        const response = await axios.get(
          `http://localhost:8000/docker/pull/${pullId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log(`Poll update for ${pullId}:`, response.data);
        
        // Update the pull status
        setPullStatus(prev => ({
          ...prev,
          [pullId]: response.data
        }));
        
        // If it's completed, stop polling
        if (response.data.status === 'completed') {
          console.log(`Pull ${pullId} completed, stopping poll`);
          clearInterval(intervalId);
          
          // IMPORTANT: Use setRefreshTrigger instead of calling fetchDockerResources directly
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (error) {
        console.error(`Error polling pull status for ${pullId}:`, error);
        // Stop polling on error
        clearInterval(intervalId);
      }
    }, 2000);
    
    // Store the interval ID to clean it up later if needed
    setPullPollingIntervals(prev => ({
      ...prev,
      [pullId]: intervalId
    }));
  };

  // Clean up polling intervals when component unmounts
  useEffect(() => {
    return () => {
      Object.values(pullPollingIntervals).forEach(intervalId => {
        clearInterval(intervalId);
      });
    };
  }, [pullPollingIntervals]);

  // Create and run a container with improved debugging
  const createContainer = async (containerData) => {
    try {
      console.log('Creating container with original data:', JSON.stringify(containerData, null, 2));
      setLoading(true);
      
      // The API seems to be very specific about the format. Let's try the simplest possible approach
      // Create a simplified request that only includes the essential fields in a clean format
      const simplifiedRequest = {
        image: containerData.image_id,
        name: containerData.container_name
      };
      
      // Handle port mapping in a very simple way
      if (containerData.port_mapping) {
        console.log('Original port mapping value:', containerData.port_mapping);
        
        // Just add it as a ports field without any complex formatting
        simplifiedRequest.ports = containerData.port_mapping;
        
        // If we have port_dict, try that as well under a different name
        if (containerData.port_dict) {
          simplifiedRequest.port_details = containerData.port_dict;
        }
      }
      
      console.log('Sending simplified Docker container request:', JSON.stringify(simplifiedRequest, null, 2));
      
      // Try with the simplified request
      try {
        const response = await axios.post(
          'http://localhost:8000/docker/container/create',
          simplifiedRequest,
          {
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Container creation response:', response.data);
        await fetchContainers();
        return { success: true, data: response.data };
      } catch (firstError) {
        console.error('First attempt failed:', firstError);
        console.log('Trying alternate endpoint...');
        
        // If the first approach fails, try an alternate endpoint
        // Some FastAPI implementations use singular vs plural endpoints
        const response = await axios.post(
          'http://localhost:8000/docker/containers/create',
          simplifiedRequest,
          {
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Container creation response (alternate):', response.data);
        await fetchContainers();
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('All container creation attempts failed:', error);
      
      // Log more detailed error information
      if (error.response) {
        console.error('Final error response status:', error.response.status);
        console.error('Final error response data:', error.response.data);
        
        // Show detailed validation errors if available
        if (error.response.data && error.response.data.detail) {
          try {
            // FastAPI often returns validation errors in a specific format
            if (Array.isArray(error.response.data.detail)) {
              error.response.data.detail.forEach(err => {
                console.error(`Validation error at ${err.loc.join('.')}: ${err.msg}`);
              });
            } else {
              console.error('API error message:', error.response.data.detail);
            }
          } catch (e) {
            console.error('Could not parse error details:', e);
          }
        }
      }
      
      const errorMessage = error.response?.data?.detail || 'Failed to create container';
      console.error('Container creation failed:', errorMessage);
      
      return { success: false, error: errorMessage, details: error.response?.data };
    } finally {
      setLoading(false);
    }
  };

  // Stop a container
  const stopContainer = async (containerId, timeout = 10) => {
    if (!user.isAuthenticated || !token) throw new Error('Not authenticated');
    
    try {
      const result = await dockerApi.stopContainer(token, containerId, timeout);
      await fetchContainers(); // Refresh the list
      return result;
    } catch (error) {
      console.error('Error stopping container:', error);
      throw error;
    }
  };

  // Delete a container
  const deleteContainer = async (containerId, force = false) => {
    if (!user.isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }
  
    setLoading(prev => ({ ...prev, containers: true }));
    
    try {
      const response = await axios.post(
        `http://localhost:8000/docker/container/delete`,
        { container_id: containerId, force: force },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state to remove the deleted container
      setContainers(prevContainers => 
        prevContainers.filter(container => container.id !== containerId)
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to delete container:', error);
      setErrors(prev => ({
        ...prev,
        containers: `Failed to delete container: ${error.response?.data?.detail || error.message}`
      }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, containers: false }));
    }
  };

  // Search for Docker images
  const searchImages = async (term, searchHub = false) => {
    if (!user.isAuthenticated || !token) throw new Error('Not authenticated');
    
    try {
      if (searchHub) {
        return await dockerApi.searchDockerHubImages(token, term);
      } else {
        return await dockerApi.searchLocalImages(token, term);
      }
    } catch (error) {
      console.error('Error searching images:', error);
      throw error;
    }
  };

  // Add deleteDockerfile function if it doesn't exist
  const deleteDockerfile = async (name) => {
    if (!user.isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }
  
    try {
      const response = await axios.post(
        `http://localhost:8000/docker/dockerfile/delete`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state to remove the deleted dockerfile
      setDockerfiles(prevDockerfiles => 
        prevDockerfiles.filter(dockerfile => dockerfile.name !== name)
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to delete dockerfile:', error);
      setErrors(prev => ({
        ...prev,
        dockerfiles: `Failed to delete dockerfile: ${error.response?.data?.detail || error.message}`
      }));
      throw error;
    }
  };
  
  // Add deleteImage function if it doesn't exist
  const deleteImage = async (imageId) => {
    if (!user.isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }
  
    try {
      const response = await axios.post(
        `http://localhost:8000/docker/image/delete`,
        { image_id: imageId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state to remove the deleted image
      setImages(prevImages => 
        prevImages.filter(image => image.id !== imageId)
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to delete image:', error);
      setErrors(prev => ({
        ...prev,
        images: `Failed to delete image: ${error.response?.data?.detail || error.message}`
      }));
      throw error;
    }
  };

  // Add updateDockerfile function
  const updateDockerfile = async (name, content, description = '') => {
    if (!user.isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await axios.post(
        'http://localhost:8000/docker/dockerfile/update',
        { name, content, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update Dockerfiles state to reflect the changes
      setDockerfiles(prev => prev.map(df => 
        df.name === name ? { ...df, content, description, updated_at: new Date() } : df
      ));
      
      return response.data;
    } catch (error) {
      console.error('Failed to update Dockerfile:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update Dockerfile');
    }
  };

  // Add this function definition before the context value
  const fetchDockerResources = async () => {
    // IMPORTANT: Don't call setRefreshTrigger here to avoid infinite loops
    console.log("Fetching Docker resources directly...");
    try {
      await fetchDockerfiles();
      await fetchDockerImages(); 
      await fetchContainers();
      await fetchPullHistory(); 
    } catch (error) {
      console.error("Error in fetchDockerResources:", error);
    }
  };

  // Make sure searchLocalImages is properly defined
  const searchLocalImages = async (term) => {
    if (!user.isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }
    
    setLoading(prev => ({ ...prev, localSearch: true }));
    setErrors(prev => ({ ...prev, localSearch: null }));
    
    try {
      console.log(`Searching local images for: ${term}`);
      const response = await axios.get(
        `http://localhost:8000/docker/image/search/local?term=${encodeURIComponent(term)}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            Accept: 'application/json' 
          },
          timeout: 10000
        }
      );
      
      console.log('Local search response:', response);
      
      // Verify we have a proper response with matches property
      if (!response.data || !Array.isArray(response.data.matches)) {
        console.error('Invalid response from local search:', response.data);
        throw new Error('Server returned invalid data structure');
      }
      
      return response.data.matches;
    } catch (error) {
      console.error('Failed to search local images:', error);
      let errorMessage = 'Failed to search local images';
      
      if (error.response) {
        errorMessage = error.response.data?.detail || errorMessage;
        console.error('Error response from server:', error.response.data);
      } else if (error.request) {
        errorMessage = 'No response from server. Check network connection.';
      }
      
      setErrors(prev => ({ ...prev, localSearch: errorMessage }));
      throw new Error(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, localSearch: false }));
    }
  };

  // Add the missing fetchDockerImages function
  const fetchDockerImages = async () => {
    if (!user.isAuthenticated || !token) return;
    
    setLoading(prev => ({ ...prev, images: true }));
    setErrors(prev => ({ ...prev, images: null }));
    
    try {
      const response = await axios.get('http://localhost:8000/docker/images', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setImages(response.data.images || []);
    } catch (error) {
      console.error('Failed to fetch Docker images:', error);
      setErrors(prev => ({
        ...prev,
        images: error.response?.data?.detail || 'Failed to fetch Docker images'
      }));
    } finally {
      setLoading(prev => ({ ...prev, images: false }));
    }
  };

  // Remove the first declaration of searchDockerHub and keep only this improved version
  const searchDockerHub = async (term) => {
    if (!user.isAuthenticated || !token) {
      throw new Error('Not authenticated');
    }
    
    setLoading(prev => ({ ...prev, hubSearch: true }));
    setErrors(prev => ({ ...prev, hubSearch: null }));
    
    try {
      console.log(`Searching Docker Hub for: ${term}`);
      
      // Add explicit content type check and request timeout
      const response = await axios.get(
        `http://localhost:8000/docker/image/search/hub?term=${encodeURIComponent(term)}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'  // Explicitly request JSON
          },
          timeout: 15000, // 15 second timeout
          validateStatus: (status) => {
            // Consider any status under 500 as not a server error
            // This helps us handle 4xx errors more gracefully
            return status < 500;
          }
        }
      );
      
      // Check response status
      if (response.status !== 200) {
        console.error('Non-200 response:', response);
        throw new Error(`Server returned status ${response.status}`);
      }
      
      // Check content type to detect HTML responses
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        console.error('Non-JSON response type:', contentType);
        console.error('Response data:', response.data);
        throw new Error('Server didn\'t return JSON. Check developer console for details.');
      }
      
      // Make sure we have results array in the response
      if (!response.data || !Array.isArray(response.data.results)) {
        console.error('Invalid response format:', response.data);
        throw new Error('Server returned invalid data format');
      }
      
      return response.data.results;
    } catch (error) {
      console.error('Docker Hub search error:', error);
      
      // Better error handling based on error type
      if (error.response) {
        // The server responded with a status code outside 2xx
        console.error('Error response:', error.response);
        throw new Error(error.response.data?.detail || 
                      `Server error: ${error.response.status}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        throw new Error('No response from server. The service may be unavailable.');
      } else {
        // Something else happened while setting up the request
        throw error; // Rethrow the error with its original message
      }
    } finally {
      setLoading(prev => ({ ...prev, hubSearch: false }));
    }
  };

  // Add function to fetch pull history
  const fetchPullHistory = async () => {
    if (!user.isAuthenticated || !token) {
      return;
    }
    
    try {
      console.log("Fetching pull history...");
      const response = await axios.get(
        'http://localhost:8000/docker/pulls/history',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && Array.isArray(response.data.pulls)) {
        // Convert array to object with pull_id as keys
        const pullHistoryMap = {};
        response.data.pulls.forEach(pull => {
          pullHistoryMap[pull._id] = pull;
        });
        
        console.log("Pull history loaded:", pullHistoryMap);
        setPullHistory(pullHistoryMap);
        
        // Merge with any active pulls in pullStatus
        setPullStatus(prevStatus => ({
          ...pullHistoryMap,
          ...prevStatus
        }));
      }
    } catch (error) {
      console.error("Error fetching pull history:", error);
    }
  };

  // Enhance the fetchBuilds function to automatically refresh images
  const fetchBuilds = async () => {
    try {
      setLoading(true);
      console.log('Fetching Docker builds...');
      
      const response = await axios.get('http://localhost:8000/docker/builds', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setBuilds(response.data || []);
      
      // Check for recent successful builds
      const recentBuilds = response.data.filter(build => 
        build.success === true && 
        new Date(build.finished_at) > new Date(Date.now() - 60000) // Within the last minute
      );
      
      if (recentBuilds.length > 0) {
        console.log('Found recent successful builds. Refreshing images list...');
        await fetchImages(); // Refresh images after recent successful build
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching builds:', error);
      setErrors(prev => ({ ...prev, builds: error.response?.data?.detail || 'Failed to fetch builds' }));
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch resources when authenticated or refresh triggered
  // Be careful with dependencies to avoid infinite loops
  useEffect(() => {
    if (user.isAuthenticated && token && connectionStatus === 'connected') {
      console.log("Fetching Docker resources due to refreshTrigger change:", refreshTrigger);
      
      // Reset showErrors state on refresh
      setShowErrors(false);
      
      fetchDockerfiles();
      fetchImages();
      fetchContainers();
      fetchPullHistory();
    }
  }, [
    refreshTrigger, 
    user.isAuthenticated, 
    token, 
    connectionStatus,
    fetchDockerfiles, 
    fetchContainers
    // IMPORTANT: Remove fetchImages as a dependency if it's not stable
    // And DON'T include fetchDockerResources here
  ]);

  // Context value
  const value = {
    dockerfiles,
    images,
    containers,
    builds, // Add builds to the context value
    hubSearchResults,
    loading,
    errors,
    showErrors, // Add this to the context value
    dockerError, // Add dockerError to the context value
    refreshDockerResources, // Use only this implementation
    createDockerfile,
    updateDockerfile,
    deleteDockerfile,
    buildImage,
    pullImage,
    deleteImage,
    searchLocalImages,
    searchDockerHub,
    createContainer,
    stopContainer,
    deleteContainer,
    pullStatus, // Include pullStatus in the context value
    fetchPullHistory, // Add this to the context value
    setPullStatus // Add this to allow consumer components to update pull status
  };
  
  return (
    <DockerContext.Provider value={value}>
      {children}
    </DockerContext.Provider>
  );
};

export default DockerProvider;
