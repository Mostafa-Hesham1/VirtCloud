import axios from 'axios';

const API_URL = 'http://localhost:8000/docker';

/**
 * Docker API client for VirtCloud
 * Provides methods for interacting with the Docker backend API
 */

// Helper function to handle API errors consistently
const handleApiError = (error) => {
  console.error('Docker API Error:', error);
  const errorMessage = error.response?.data?.detail || 'An unexpected error occurred';
  throw new Error(errorMessage);
};

/**
 * Dockerfile Operations
 */

// Create a new Dockerfile
export const createDockerfile = async (token, content, name, description = '') => {
  try {
    const response = await axios.post(
      `${API_URL}/dockerfile/create`,
      { content, name, description },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating Dockerfile:', error);
    throw error.response?.data || error;
  }
};

// List all user's Dockerfiles
export const listDockerfiles = async (token) => {
  try {
    const response = await axios.get(
      `${API_URL}/dockerfiles`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.dockerfiles;
  } catch (error) {
    console.error('Error listing Dockerfiles:', error);
    throw error.response?.data || error;
  }
};

/**
 * Docker Image Operations
 */

// Build a Docker image from a Dockerfile
export const buildDockerImage = async (token, dockerfile_name, image_name, tag = 'latest') => {
  try {
    const response = await axios.post(
      `${API_URL}/image/build`,
      { dockerfile_name, image_name, tag },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error building Docker image:', error);
    throw error.response?.data || error;
  }
};

// Get build status and logs
export const getBuildStatus = async (token, buildId) => {
  try {
    const response = await axios.get(
      `${API_URL}/build/${buildId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting build status:', error);
    throw error.response?.data || error;
  }
};

// List all Docker images
export const listDockerImages = async (token) => {
  try {
    const response = await axios.get(
      `${API_URL}/images`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.images;
  } catch (error) {
    console.error('Error listing Docker images:', error);
    throw error.response?.data || error;
  }
};

// Search for Docker images locally
export const searchLocalImages = async (token, term) => {
  try {
    const response = await axios.get(
      `${API_URL}/image/search/local?term=${encodeURIComponent(term)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.matches;
  } catch (error) {
    console.error('Error searching local images:', error);
    throw error.response?.data || error;
  }
};

// Search for Docker images on DockerHub
export const searchDockerHubImages = async (token, term, limit = 25) => {
  try {
    const response = await axios.get(
      `${API_URL}/image/search/hub?term=${encodeURIComponent(term)}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.results;
  } catch (error) {
    console.error('Error searching DockerHub images:', error);
    throw error.response?.data || error;
  }
};

// Pull a Docker image from DockerHub
export const pullDockerImage = async (token, image) => {
  try {
    const response = await axios.post(
      `${API_URL}/image/pull`,
      { image },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error pulling Docker image:', error);
    throw error.response?.data || error;
  }
};

// Get the status of a pull operation
export const getPullStatus = async (token, pullId) => {
  try {
    const response = await axios.get(
      `${API_URL}/pull/${pullId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting pull status:', error);
    throw error.response?.data || error;
  }
};

/**
 * Container Operations
 */

// Create and run a container
export const createContainer = async (token, containerOptions) => {
  try {
    const response = await axios.post(
      `${API_URL}/container/create`,
      containerOptions,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating container:', error);
    throw error.response?.data || error;
  }
};

// List all containers
export const listContainers = async (token) => {
  try {
    const response = await axios.get(
      `${API_URL}/containers`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.containers;
  } catch (error) {
    console.error('Error listing containers:', error);
    throw error.response?.data || error;
  }
};

// Stop a container
export const stopContainer = async (token, container_id, timeout = 10) => {
  try {
    const response = await axios.post(
      `${API_URL}/container/stop`,
      { container_id, timeout },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error stopping container:', error);
    throw error.response?.data || error;
  }
};

export default {
  createDockerfile,
  listDockerfiles,
  buildDockerImage,
  getBuildStatus,
  listDockerImages,
  searchLocalImages,
  searchDockerHubImages,
  pullDockerImage,
  getPullStatus,
  createContainer,
  listContainers,
  stopContainer
};
