# Docker Management Guide for VirtCloud

This guide explains all Docker operations available in VirtCloud, including management of Dockerfiles, images, and containers.

## Table of Contents

- [Dockerfile Management](#dockerfile-management)
- [Docker Images](#docker-images)
- [Docker Containers](#docker-containers)
- [Troubleshooting](#troubleshooting)

## Dockerfile Management

Dockerfiles allow you to define custom Docker images with your specific requirements.

### Available Operations

| Operation | Description | Icon |
|-----------|-------------|------|
| Create Dockerfile | Create a new Dockerfile with custom content | Add (➕) |
| View Dockerfile | Examine the content of an existing Dockerfile | Info (ℹ️) |
| Edit Dockerfile | Modify an existing Dockerfile | Edit (✏️) |
| Build Image | Build a Docker image from a Dockerfile | Build (🔨) |
| Delete Dockerfile | Remove a Dockerfile from your system | Delete (🗑️) |

### Creating a Dockerfile

1. Navigate to the Dockerfiles tab
2. Click "Create Dockerfile" button
3. Enter a name for your Dockerfile (without extension)
4. Add an optional description
5. Enter the Dockerfile content using the code editor
6. Click "Create" to save

### Editing a Dockerfile

1. In the Dockerfiles list, find the Dockerfile you want to edit
2. Click the Edit icon (pencil)
3. Modify the content in the editor
4. Click "Save Changes" to update the Dockerfile
5. Note: Editing a Dockerfile doesn't automatically rebuild any associated images

### Building an Image from a Dockerfile

1. Find your Dockerfile in the list
2. Click the Build icon
3. Enter an image name and tag
4. Click "Build Image"
5. Monitor the build process in the logs

## Docker Images

Docker images are the building blocks for containers.

### Available Operations

| Operation | Description | Icon |
|-----------|-------------|------|
| List Images | View all Docker images on your system | - |
| Pull Image | Download an image from Docker Hub | Download (⬇️) |
| Search Images | Search for images locally or on Docker Hub | Search (🔍) |
| Run Container | Create and start a container from an image | Play (▶️) |
| View Details | See image information and layers | Info (ℹ️) |
| Delete Image | Remove an image from your system | Delete (🗑️) |

### Pulling an Image

1. In the Images tab, click "Pull Image"
2. Enter the image name (e.g., "nginx:latest")
3. Click "Pull Image"
4. Monitor the pull progress

### Searching for Images

1. Enter a search term in the search box
2. Click "Search Local" to find images on your system
3. Click "Search DockerHub" to find images online
4. Click the Pull icon to download found images

## Docker Containers

Containers are running instances of Docker images.

### Available Operations

| Operation | Description | Icon |
|-----------|-------------|------|
| List Containers | View all containers (running and stopped) | - |
| View Details | See container configuration and stats | Info (ℹ️) |
| Start Container | Start a stopped container | Play (▶️) |
| Stop Container | Stop a running container | Stop (⏹️) |
| Delete Container | Remove a stopped container | Delete (🗑️) |

### Creating and Running a Container

1. Find an image in the Images tab
2. Click the Run Container icon
3. Configure options:
   - Container name (optional)
   - Port mappings (e.g., 80:8080)
   - Environment variables
4. Click "Run Container"

### Container Management

1. In the Containers tab, find your container
2. For running containers:
   - Click Stop icon to stop the container
3. For stopped containers:
   - Click Play icon to start the container again
   - Click Delete icon to remove it

## Troubleshooting

If you encounter issues with Docker management:

1. **Docker Not Running**: Ensure Docker Desktop is running (check system tray)
2. **Permission Errors**: Ensure your user has permission to use Docker
3. **Connection Issues**: Try refreshing the Docker resources or restart Docker Desktop
4. **Build Failures**: Check Dockerfile syntax and build logs for errors
5. **Port Conflicts**: Ensure mapped ports aren't already in use by other services

### Docker Status Check

You can run the Docker status check script to diagnose issues:
```bash
python check_docker.py
```
