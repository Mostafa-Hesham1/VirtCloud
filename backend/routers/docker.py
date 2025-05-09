from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import docker
import os
import requests
import json
from datetime import datetime
import time
from database import db
from .auth import get_current_user
from bson.objectid import ObjectId

router = APIRouter()

# Initialize Docker client
try:
    docker_client = docker.from_env()
except Exception as e:
    print(f"Warning: Docker client initialization error: {str(e)}")
    docker_client = None

# Pydantic models for request validation
class DockerfileCreateRequest(BaseModel):
    content: str = Field(..., description="Content of the Dockerfile")
    name: str = Field(..., description="Name for the Dockerfile (without extension)")
    description: Optional[str] = Field(None, description="Optional description")

class DockerImageBuildRequest(BaseModel):
    dockerfile_name: str = Field(..., description="Name of the Dockerfile to use")
    image_name: str = Field(..., description="Name for the image (e.g., 'my-app')")
    tag: str = Field("latest", description="Tag for the image (e.g., 'latest', 'v1')")

class DockerContainerCreateRequest(BaseModel):
    image: str = Field(..., description="Image name to use (e.g., 'nginx:latest')")
    container_name: Optional[str] = Field(None, description="Name for the container")
    ports: Optional[Dict[str, str]] = Field(None, description="Port mappings (e.g., {'80/tcp': 8080})")
    environment: Optional[Dict[str, str]] = Field(None, description="Environment variables")
    volumes: Optional[Dict[str, Dict[str, str]]] = Field(None, description="Volume mappings")
    command: Optional[str] = Field(None, description="Command to run")
    detach: bool = Field(True, description="Run container in background")

class DockerContainerStopRequest(BaseModel):
    container_id: str = Field(..., description="ID or name of the container to stop")
    timeout: int = Field(10, description="Timeout in seconds before killing the container")

class DockerImageSearchRequest(BaseModel):
    term: str = Field(..., description="Search term")
    limit: int = Field(10, description="Maximum number of results to return")

class DockerImagePullRequest(BaseModel):
    image: str = Field(..., description="Image name to pull (e.g., 'nginx:latest')")

class DockerBuildLogEntry(BaseModel):
    log: str
    timestamp: datetime = datetime.utcnow()

# Helper function to ensure docker client is available
def get_docker_client():
    if not docker_client:
        raise HTTPException(
            status_code=503,
            detail="Docker service is not available. Please ensure Docker is installed and running."
        )
    return docker_client

# Helper function to get dockerfiles directory
def get_dockerfiles_dir():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    dockerfiles_dir = os.path.join(base_dir, "dockerfiles")
    os.makedirs(dockerfiles_dir, exist_ok=True)
    return dockerfiles_dir

# 1. Create Dockerfile
@router.post("/dockerfile/create", status_code=status.HTTP_201_CREATED)
async def create_dockerfile(
    req: DockerfileCreateRequest, 
    user=Depends(get_current_user)
):
    """Create a Dockerfile with the specified content"""
    try:
        # Sanitize filename to prevent directory traversal
        safe_filename = os.path.basename(req.name)
        if not safe_filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
            
        # Get the dockerfiles directory and ensure it exists
        dockerfiles_dir = get_dockerfiles_dir()
        
        # Create the full path for the Dockerfile
        dockerfile_path = os.path.join(dockerfiles_dir, f"{safe_filename}.Dockerfile")
        
        # Check if a file with this name already exists
        if os.path.exists(dockerfile_path):
            raise HTTPException(
                status_code=409,
                detail=f"A Dockerfile with the name '{safe_filename}' already exists"
            )
            
        # Write the Dockerfile content to disk
        with open(dockerfile_path, "w") as f:
            f.write(req.content)
        
        # Save the Dockerfile record in the database
        creation_time = datetime.utcnow()
        dockerfile_record = {
            "user_email": user["email"],
            "name": safe_filename,
            "path": dockerfile_path,
            "description": req.description,
            "content": req.content,
            "created_at": creation_time,
            "updated_at": creation_time
        }
        
        result = await db.dockerfiles.insert_one(dockerfile_record)
        
        return {
            "message": "Dockerfile created successfully",
            "id": str(result.inserted_id),
            "name": safe_filename,
            "path": dockerfile_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Dockerfile: {str(e)}"
        )

# 2. Build Docker Image from Dockerfile
@router.post("/image/build")
async def build_docker_image(
    req: DockerImageBuildRequest, 
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user)
):
    """Build a Docker image from an existing Dockerfile"""
    try:
        # Get Docker client
        client = get_docker_client()
        
        # Get the dockerfiles directory
        dockerfiles_dir = get_dockerfiles_dir()
        dockerfile_path = os.path.join(dockerfiles_dir, f"{req.dockerfile_name}.Dockerfile")
        
        # Check if the Dockerfile exists
        if not os.path.exists(dockerfile_path):
            raise HTTPException(
                status_code=404,
                detail=f"Dockerfile '{req.dockerfile_name}' not found"
            )
            
        # Verify the user owns this Dockerfile
        dockerfile = await db.dockerfiles.find_one({
            "name": req.dockerfile_name,
            "user_email": user["email"]
        })
        
        if not dockerfile:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to use this Dockerfile"
            )
            
        # Create a build record in the database with status "building"
        build_id = str(ObjectId())
        image_tag = f"{req.image_name}:{req.tag}"
        build_record = {
            "_id": ObjectId(build_id),
            "user_email": user["email"],
            "dockerfile_id": str(dockerfile["_id"]),
            "dockerfile_name": req.dockerfile_name,
            "image_name": req.image_name,
            "tag": req.tag,
            "image_tag": image_tag,
            "status": "building",
            "logs": [],
            "started_at": datetime.utcnow(),
            "finished_at": None,
            "success": None
        }
        
        await db.docker_builds.insert_one(build_record)
        
        # Start the build process in the background
        background_tasks.add_task(
            build_image_task,
            build_id,
            dockerfile_path,
            image_tag,
            user["email"]
        )
        
        return {
            "message": "Docker image build started",
            "build_id": build_id,
            "image_tag": image_tag,
            "status": "building"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start image build: {str(e)}"
        )

# Background task to build Docker image
async def build_image_task(build_id, dockerfile_path, image_tag, user_email):
    client = docker.from_env()
    success = False
    logs = []
    
    try:
        # Build the Docker image
        build_logs = client.api.build(
            path=os.path.dirname(dockerfile_path),
            dockerfile=os.path.basename(dockerfile_path),
            tag=image_tag,
            rm=True,
            decode=True
        )
        
        # Process and save the build logs
        for log in build_logs:
            if 'stream' in log:
                log_text = log['stream'].strip()
                if log_text:
                    print(f"Build log: {log_text}")
                    logs.append({
                        "log": log_text,
                        "timestamp": datetime.utcnow()
                    })
                    # Update the build record in the database
                    await db.docker_builds.update_one(
                        {"_id": ObjectId(build_id)},
                        {"$push": {"logs": {"log": log_text, "timestamp": datetime.utcnow()}}}
                    )
                    
            if 'error' in log:
                error_msg = log['error'].strip()
                logs.append({
                    "log": f"ERROR: {error_msg}",
                    "timestamp": datetime.utcnow()
                })
                await db.docker_builds.update_one(
                    {"_id": ObjectId(build_id)},
                    {"$push": {"logs": {"log": f"ERROR: {error_msg}", "timestamp": datetime.utcnow()}}}
                )
                raise Exception(error_msg)
                
        # Build successful
        success = True
        
        # Add the image to the database
        image_info = client.images.get(image_tag)
        image_record = {
            "user_email": user_email,
            "name": image_tag.split(':')[0],
            "tag": image_tag.split(':')[1] if ':' in image_tag else "latest",
            "image_id": image_info.id,
            "created_at": datetime.utcnow(),
            "size": image_info.attrs['Size'],
            "build_id": build_id
        }
        
        await db.docker_images.insert_one(image_record)
        
    except Exception as e:
        # Build failed
        success = False
        error_message = str(e)
        logs.append({
            "log": f"Build failed: {error_message}",
            "timestamp": datetime.utcnow()
        })
        
    finally:
        # Update the build record with the final status
        await db.docker_builds.update_one(
            {"_id": ObjectId(build_id)},
            {
                "$set": {
                    "status": "completed" if success else "failed",
                    "finished_at": datetime.utcnow(),
                    "success": success
                }
            }
        )

# 3. List Docker images
@router.get("/images")
async def list_docker_images(user=Depends(get_current_user)):
    """List all Docker images available on the system"""
    try:
        client = get_docker_client()
        
        # Get all images from Docker
        images = client.images.list()
        
        # Enhance image data with database information
        result = []
        for image in images:
            # Format the base image info
            image_info = {
                "id": image.id,
                "short_id": image.short_id,
                "tags": image.tags,
                "size": image.attrs['Size'],
                "created": datetime.fromtimestamp(image.attrs['Created']),
                "docker_info": {
                    "architecture": image.attrs.get('Architecture'),
                    "os": image.attrs.get('Os'),
                    "author": image.attrs.get('Author', 'Unknown')
                }
            }
            
            # Look up database record for this image
            if image.tags:
                for tag in image.tags:
                    name = tag.split(':')[0]
                    tag_value = tag.split(':')[1] if ':' in tag else "latest"
                    
                    db_image = await db.docker_images.find_one({
                        "name": name,
                        "tag": tag_value,
                        "user_email": user["email"]
                    })
                    
                    if db_image:
                        image_info["owned"] = True
                        image_info["build_id"] = db_image.get("build_id")
                        break
                    else:
                        image_info["owned"] = False
            
            result.append(image_info)
            
        return {"images": result}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list Docker images: {str(e)}"
        )

# 4. List running containers
@router.get("/containers")
async def list_containers(user=Depends(get_current_user)):
    """List all Docker containers"""
    try:
        client = get_docker_client()
        
        # Get all containers (not just running ones)
        containers = client.containers.list(all=True)
        
        result = []
        for container in containers:
            # Format the base container info
            container_info = {
                "id": container.id,
                "short_id": container.short_id,
                "name": container.name,
                "image": container.image.tags[0] if container.image.tags else container.image.id,
                "status": container.status,
                "created": datetime.fromtimestamp(container.attrs['Created']),
                "ports": container.ports,
                "command": container.attrs['Config']['Cmd'],
                "running": container.status == "running"
            }
            
            # Lookup database record for this container
            db_container = await db.docker_containers.find_one({
                "container_id": container.id,
                "user_email": user["email"]
            })
            
            if db_container:
                container_info["owned"] = True
                container_info["metadata"] = db_container.get("metadata", {})
            else:
                container_info["owned"] = False
                
            result.append(container_info)
            
        return {"containers": result}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list containers: {str(e)}"
        )

# 5. Create and run a container
@router.post("/container/create")
async def create_container(
    req: DockerContainerCreateRequest,
    user=Depends(get_current_user)
):
    """Create and run a Docker container"""
    try:
        client = get_docker_client()
        
        # Check if the image exists
        try:
            client.images.get(req.image)
        except docker.errors.ImageNotFound:
            raise HTTPException(
                status_code=404,
                detail=f"Image '{req.image}' not found. Please pull it first."
            )
            
        # Prepare container options
        container_options = {
            "image": req.image,
            "detach": req.detach
        }
        
        if req.container_name:
            container_options["name"] = req.container_name
            
        if req.ports:
            container_options["ports"] = req.ports
            
        if req.environment:
            container_options["environment"] = req.environment
            
        if req.volumes:
            container_options["volumes"] = req.volumes
            
        if req.command:
            container_options["command"] = req.command
            
        # Create and start the container
        container = client.containers.run(**container_options)
        
        # Save container record in database
        container_record = {
            "user_email": user["email"],
            "container_id": container.id,
            "container_name": container.name,
            "image": req.image,
            "created_at": datetime.utcnow(),
            "status": "running",
            "metadata": {
                "ports": req.ports,
                "environment": req.environment,
                "volumes": req.volumes,
                "command": req.command
            }
        }
        
        await db.docker_containers.insert_one(container_record)
        
        return {
            "message": "Container created and started successfully",
            "container_id": container.id,
            "container_name": container.name,
            "status": "running"
        }
        
    except HTTPException:
        raise
    except docker.errors.APIError as e:
        if "Conflict" in str(e):
            raise HTTPException(
                status_code=409,
                detail=f"Container name conflict: {str(e)}"
            )
        raise HTTPException(
            status_code=500,
            detail=f"Docker API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create container: {str(e)}"
        )

# 6. Stop a container
@router.post("/container/stop")
async def stop_container(
    req: DockerContainerStopRequest,
    user=Depends(get_current_user)
):
    """Stop a running Docker container"""
    try:
        client = get_docker_client()
        
        # Check if container exists
        try:
            container = client.containers.get(req.container_id)
        except docker.errors.NotFound:
            raise HTTPException(
                status_code=404,
                detail=f"Container '{req.container_id}' not found"
            )
            
        # Check if the user owns this container
        db_container = await db.docker_containers.find_one({
            "container_id": container.id,
            "user_email": user["email"]
        })
        
        if not db_container:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to stop this container"
            )
            
        # Stop the container
        container.stop(timeout=req.timeout)
        
        # Update container status in database
        await db.docker_containers.update_one(
            {"container_id": container.id},
            {"$set": {"status": "stopped", "stopped_at": datetime.utcnow()}}
        )
        
        return {
            "message": "Container stopped successfully",
            "container_id": container.id,
            "container_name": container.name,
            "status": "stopped"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop container: {str(e)}"
        )

# 7. Search for local images
@router.get("/image/search/local")
async def search_local_images(
    term: str,
    user=Depends(get_current_user)
):
    """Search for Docker images on the local machine"""
    try:
        client = get_docker_client()
        
        # Get all images
        all_images = client.images.list()
        
        # Filter images by search term
        results = []
        for image in all_images:
            # Include images where the search term appears in any tag
            for tag in image.tags:
                if term.lower() in tag.lower():
                    # Format image info
                    image_info = {
                        "id": image.id,
                        "short_id": image.short_id,
                        "tags": image.tags,
                        "size": image.attrs['Size'],
                        "created": datetime.fromtimestamp(image.attrs['Created'])
                    }
                    
                    # Check if user owns this image
                    for tag in image.tags:
                        name_parts = tag.split(':')
                        name = name_parts[0]
                        tag_val = name_parts[1] if len(name_parts) > 1 else "latest"
                        
                        db_image = await db.docker_images.find_one({
                            "name": name,
                            "tag": tag_val,
                            "user_email": user["email"]
                        })
                        
                        if db_image:
                            image_info["owned"] = True
                            break
                    else:
                        image_info["owned"] = False
                        
                    results.append(image_info)
                    break  # Don't add the same image multiple times
                    
        return {"matches": results}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search local images: {str(e)}"
        )

# 8. Search for images on DockerHub
@router.get("/image/search/hub")
async def search_dockerhub_images(
    term: str,
    limit: int = 25,
    user=Depends(get_current_user)
):
    """Search for Docker images on DockerHub"""
    try:
        client = get_docker_client()
        
        # Use Docker SDK to search DockerHub
        results = client.images.search(term, limit=limit)
        
        # Add more information from the Docker Hub API for better results
        enhanced_results = []
        for result in results:
            enhanced_result = {
                "name": result["name"],
                "description": result["description"],
                "is_official": result["is_official"],
                "is_automated": result["is_automated"],
                "star_count": result["star_count"]
            }
            
            # Check if this image exists locally
            try:
                local_image = client.images.get(result["name"])
                enhanced_result["local"] = True
                enhanced_result["local_tags"] = local_image.tags
            except docker.errors.ImageNotFound:
                enhanced_result["local"] = False
                
            enhanced_results.append(enhanced_result)
            
        return {"results": enhanced_results}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search DockerHub: {str(e)}"
        )

# 9. Pull an image from DockerHub
@router.post("/image/pull")
async def pull_docker_image(
    req: DockerImagePullRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user)
):
    """Pull a Docker image from DockerHub"""
    try:
        client = get_docker_client()
        
        # Create a pull record in the database
        pull_id = str(ObjectId())
        pull_record = {
            "_id": ObjectId(pull_id),
            "user_email": user["email"],
            "image": req.image,
            "status": "pulling",
            "started_at": datetime.utcnow(),
            "finished_at": None,
            "success": None
        }
        
        await db.docker_pulls.insert_one(pull_record)
        
        # Start the pull operation in background
        background_tasks.add_task(
            pull_image_task,
            pull_id,
            req.image,
            user["email"]
        )
        
        return {
            "message": f"Started pulling image '{req.image}'",
            "pull_id": pull_id,
            "status": "pulling"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start image pull: {str(e)}"
        )

# Background task to pull Docker image
async def pull_image_task(pull_id, image, user_email):
    client = docker.from_env()
    success = False
    
    try:
        # Pull the image
        image_obj = client.images.pull(image)
        
        # Pull successful
        success = True
        
        # Add the image to the database
        image_parts = image.split(':')
        image_name = image_parts[0]
        image_tag = image_parts[1] if len(image_parts) > 1 else "latest"
        
        image_record = {
            "user_email": user_email,
            "name": image_name,
            "tag": image_tag,
            "image_id": image_obj.id,
            "created_at": datetime.utcnow(),
            "size": image_obj.attrs['Size'],
            "pull_id": pull_id
        }
        
        await db.docker_images.insert_one(image_record)
        
    except Exception as e:
        # Pull failed
        success = False
        error_message = str(e)
        await db.docker_pulls.update_one(
            {"_id": ObjectId(pull_id)},
            {"$set": {"error": error_message}}
        )
        
    finally:
        # Update the pull record with the final status
        await db.docker_pulls.update_one(
            {"_id": ObjectId(pull_id)},
            {
                "$set": {
                    "status": "completed" if success else "failed",
                    "finished_at": datetime.utcnow(),
                    "success": success
                }
            }
        )

# 10. Get build status and logs
@router.get("/build/{build_id}")
async def get_build_status(
    build_id: str,
    user=Depends(get_current_user)
):
    """Get the status and logs of a Docker image build"""
    try:
        # Get the build record from the database
        build = await db.docker_builds.find_one({
            "_id": ObjectId(build_id),
            "user_email": user["email"]
        })
        
        if not build:
            raise HTTPException(
                status_code=404,
                detail=f"Build '{build_id}' not found or you don't have permission to view it"
            )
            
        # Convert ObjectId to string for JSON serialization
        build["_id"] = str(build["_id"])
        
        return build
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get build status: {str(e)}"
        )

# 11. Get pull status
@router.get("/pull/{pull_id}")
async def get_pull_status(
    pull_id: str,
    user=Depends(get_current_user)
):
    """Get the status of a Docker image pull operation"""
    try:
        # Get the pull record from the database
        pull = await db.docker_pulls.find_one({
            "_id": ObjectId(pull_id),
            "user_email": user["email"]
        })
        
        if not pull:
            raise HTTPException(
                status_code=404,
                detail=f"Pull operation '{pull_id}' not found or you don't have permission to view it"
            )
            
        # Convert ObjectId to string for JSON serialization
        pull["_id"] = str(pull["_id"])
        
        return pull
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get pull status: {str(e)}"
        )

# 12. List user's Dockerfiles
@router.get("/dockerfiles")
async def list_dockerfiles(user=Depends(get_current_user)):
    """List all Dockerfiles created by the user"""
    try:
        cursor = db.dockerfiles.find({"user_email": user["email"]})
        dockerfiles = []
        
        async for dockerfile in cursor:
            # Convert ObjectId to string for JSON serialization
            dockerfile["_id"] = str(dockerfile["_id"])
            
            # Check if the file still exists on disk
            if os.path.exists(dockerfile["path"]):
                dockerfile["exists"] = True
            else:
                dockerfile["exists"] = False
                
            dockerfiles.append(dockerfile)
            
        return {"dockerfiles": dockerfiles}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list Dockerfiles: {str(e)}"
        )
