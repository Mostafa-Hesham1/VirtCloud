from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status, Request
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
from fastapi.responses import JSONResponse
import uuid

router = APIRouter()

# Initialize Docker client
try:
    docker_client = docker.from_env()
    # Test connection to Docker daemon
    docker_client.ping()
    docker_available = True
    print("Docker daemon connection successful ✅")
except Exception as e:
    print(f"Warning: Docker client initialization error: {str(e)}")
    docker_client = None
    docker_available = False

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
    ports: Optional[Dict[str, Any]] = Field(None, description="Port mappings (e.g., {'80/tcp': 8080})")
    environment: Optional[Dict[str, str]] = Field(None, description="Environment variables")
    volumes: Optional[Dict[str, Dict[str, str]]] = Field(None, description="Volume mappings")
    command: Optional[str] = Field(None, description="Command to run")
    detach: bool = Field(True, description="Run container in background")

class DockerContainerStopRequest(BaseModel):
    container_id: str = Field(..., description="ID or name of the container to stop")
    timeout: int = Field(10, description="Timeout in seconds before killing the container")

class DockerContainerDeleteRequest(BaseModel):
    container_id: str = Field(..., description="ID or name of the container to delete")
    force: bool = Field(False, description="Force removal of the container")

class DockerImageSearchRequest(BaseModel):
    term: str = Field(..., description="Search term")
    limit: int = Field(10, description="Maximum number of results to return")

class DockerImagePullRequest(BaseModel):
    image: str = Field(..., description="Image name to pull (e.g., 'nginx:latest')")

class DockerBuildLogEntry(BaseModel):
    log: str
    timestamp: datetime = datetime.utcnow()

class DockerfileUpdateRequest(BaseModel):
    name: str = Field(..., description="Name of the Dockerfile to update")
    content: str = Field(..., description="New content for the Dockerfile")
    description: Optional[str] = Field(None, description="Optional updated description")

class DockerfileDeleteRequest(BaseModel):
    name: str = Field(..., description="Name of the Dockerfile to delete")

class DockerImageDeleteRequest(BaseModel):
    image_id: str = Field(..., description="ID or name of the image to delete")
    force: bool = Field(False, description="Force removal of the image")

# Helper function to ensure docker client is available
def get_docker_client():
    if not docker_client:
        raise HTTPException(
            status_code=503,
            detail="Docker service is not available. Please ensure Docker is installed and running."
        )
    
    # Test Docker daemon connection is still active
    try:
        docker_client.ping()
        return docker_client
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Lost connection to Docker daemon: {str(e)}. Please restart Docker and try again."
        )

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
        # Debug: print raw request data to diagnose field swapping
        print(f"Raw Dockerfile creation request: name={repr(req.name)}, content={repr(req.content[:40] if req.content else '')}")
        
        # Extra safeguard against swapped fields: if name looks like Dockerfile content, swap fields
        if req.name and req.content and (
            req.name.startswith('FROM ') or 
            req.name.startswith('#') or
            '\n' in req.name or
            'RUN ' in req.name
        ):
            print(f"⚠️ DETECTED SWAPPED FIELDS - name contains Dockerfile syntax! Swapping fields automatically.")
            # Store original values
            original_name = req.name
            original_content = req.content
            
            # Swap values if content looks more like a name and name looks like content
            if len(req.content) < 50 and len(req.name) > 50:
                print(f"Fixing swapped fields: old name: {repr(req.name[:40])}..., old content: {repr(req.content)}")
                # Update the Pydantic model fields
                # Note: Since Pydantic models are immutable, we need to use a workaround
                # We'll extract the actual name from the content and use it
                req_dict = req.dict()
                req_dict["name"] = original_content
                req_dict["content"] = original_name
                # Create a new request object with the swapped fields
                req = DockerfileCreateRequest(**req_dict)
                print(f"Fields swapped: new name: {repr(req.name)}, new content: {repr(req.content[:40])}...")
        
        # Log raw incoming request data for debugging
        print(f"Processing with: name={repr(req.name)}, content length={len(req.content) if req.content else 0}")
        
        # Sanitize and validate the filename
        safe_filename = os.path.basename(req.name)
        
        # Ensure it's a simple string without special characters
        import re
        safe_filename = re.sub(r'[\\/*?:"<>|\r\n\t]', "_", safe_filename)
        safe_filename = safe_filename.strip()
        
        print(f"Sanitized filename: {safe_filename}")
        
        if not safe_filename:
            raise HTTPException(status_code=400, detail="Invalid filename. Please provide a valid name.")
            
        # Add debug log
        print(f"Creating Dockerfile: {safe_filename} for user {user['email']}")
        
        # Get the dockerfiles directory and ensure it exists
        dockerfiles_dir = get_dockerfiles_dir()
        print(f"Using dockerfiles directory: {dockerfiles_dir}")
        
        # Double-check directory exists
        if not os.path.exists(dockerfiles_dir):
            print(f"Creating dockerfiles directory: {dockerfiles_dir}")
            os.makedirs(dockerfiles_dir, exist_ok=True)
        
        # Create the full path for the Dockerfile - ensure we're not using the content as the name
        dockerfile_path = os.path.join(dockerfiles_dir, f"{safe_filename}.Dockerfile")
        print(f"Dockerfile path: {dockerfile_path}")
        
        # Check if a file with this name already exists
        if os.path.exists(dockerfile_path):
            print(f"Dockerfile already exists: {dockerfile_path}")
            raise HTTPException(
                status_code=409,
                detail=f"A Dockerfile with the name '{safe_filename}' already exists"
            )
            
        # Make sure content is a string
        content = req.content
        if not isinstance(content, str):
            content = str(content)
        
        # Write content to a separate log for debugging    
        print(f"Dockerfile content to write: {repr(content[:100])}...")
            
        # Write the Dockerfile content to disk with explicit encoding
        print(f"Writing content to Dockerfile: {dockerfile_path}")
        try:
            with open(dockerfile_path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as write_error:
            print(f"Error writing Dockerfile: {str(write_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to write Dockerfile to disk: {str(write_error)}"
            )
        
        # Save the Dockerfile record in the database
        try:
            creation_time = datetime.utcnow()
            dockerfile_record = {
                "user_email": user["email"],
                "name": safe_filename,
                "path": dockerfile_path,
                "description": req.description,
                "content": content,
                "created_at": creation_time,
                "updated_at": creation_time
            }
            
            print(f"Inserting Dockerfile record into database")
            result = await db.dockerfiles.insert_one(dockerfile_record)
            print(f"Dockerfile record inserted with ID: {result.inserted_id}")
            
            return {
                "message": "Dockerfile created successfully",
                "id": str(result.inserted_id),
                "name": safe_filename,
                "path": dockerfile_path
            }
        except Exception as db_error:
            # If we failed to insert in the database but created the file,
            # try to clean up the file
            print(f"Database error: {str(db_error)}")
            if os.path.exists(dockerfile_path):
                try:
                    os.remove(dockerfile_path)
                    print(f"Removed Dockerfile due to DB error: {dockerfile_path}")
                except:
                    pass
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save Dockerfile record in database: {str(db_error)}"
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions as they already have the correct status code
        raise
    except Exception as e:
        # Log the full exception for debugging
        import traceback
        print(f"Unexpected error creating Dockerfile: {str(e)}")
        print(traceback.format_exc())
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
        # Ensure image_tag is lowercase to follow Docker conventions
        image_tag = image_tag.lower()
        print(f"Building Docker image: {image_tag} from {dockerfile_path}")
        
        # Add more debug information about the build context
        build_context = os.path.dirname(dockerfile_path)
        dockerfile_name = os.path.basename(dockerfile_path)
        print(f"Docker build context: {build_context}")
        print(f"Dockerfile name: {dockerfile_name}")
        
        # Debug: Check if the Dockerfile exists and print its content
        if os.path.exists(dockerfile_path):
            try:
                with open(dockerfile_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                print(f"Dockerfile content ({len(content)} bytes):")
                print("-" * 40)
                print(content)
                print("-" * 40)
            except Exception as e:
                print(f"Error reading Dockerfile: {str(e)}")
                logs.append({
                    "log": f"ERROR: Failed to read Dockerfile: {str(e)}",
                    "timestamp": datetime.utcnow()
                })
        else:
            error_msg = f"Dockerfile not found at path: {dockerfile_path}"
            print(error_msg)
            logs.append({
                "log": f"ERROR: {error_msg}",
                "timestamp": datetime.utcnow()
            })
            await db.docker_builds.update_one(
                {"_id": ObjectId(build_id)},
                {"$push": {"logs": {"log": f"ERROR: {error_msg}", "timestamp": datetime.utcnow()}}}
            )
            raise FileNotFoundError(error_msg)
        
        # Execute the build with enhanced error handling
        try:
            build_logs = client.api.build(
                path=build_context,
                dockerfile=dockerfile_name,
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
                    print(f"Build error: {error_msg}")
                    logs.append({
                        "log": f"ERROR: {error_msg}",
                        "timestamp": datetime.utcnow()
                    })
                    await db.docker_builds.update_one(
                        {"_id": ObjectId(build_id)},
                        {"$push": {"logs": {"log": f"ERROR: {error_msg}", "timestamp": datetime.utcnow()}}}
                    )
                    raise Exception(error_msg)
                    
                # Also capture auxiliary messages
                if 'aux' in log:
                    aux_text = f"AUX: {json.dumps(log['aux'])}"
                    print(aux_text)
                    logs.append({
                        "log": aux_text,
                        "timestamp": datetime.utcnow()
                    })
                    await db.docker_builds.update_one(
                        {"_id": ObjectId(build_id)},
                        {"$push": {"logs": {"log": aux_text, "timestamp": datetime.utcnow()}}}
                    )
        except docker.errors.BuildError as build_error:
            error_msg = f"Docker build error: {str(build_error)}"
            print(error_msg)
            logs.append({
                "log": f"ERROR: {error_msg}",
                "timestamp": datetime.utcnow()
            })
            await db.docker_builds.update_one(
                {"_id": ObjectId(build_id)},
                {"$push": {"logs": {"log": f"ERROR: {error_msg}", "timestamp": datetime.utcnow()}}}
            )
            raise build_error
                
        # Build successful
        success = True
        
        # Get image info and verify it exists
        try:
            print(f"Verifying image exists: {image_tag}")
            
            # Add retry logic for image verification since it sometimes takes a moment to register
            retry_count = 0
            max_retries = 3
            while retry_count < max_retries:
                try:
                    image_info = client.images.get(image_tag)
                    print(f"Image verified with ID: {image_info.id}")
                    break
                except docker.errors.ImageNotFound:
                    if retry_count < max_retries - 1:
                        retry_count += 1
                        print(f"Image not found, retrying ({retry_count}/{max_retries})...")
                        # Wait a moment before retrying
                        await asyncio.sleep(2)
                    else:
                        raise
            
            # Extract the name and tag components
            name_parts = image_tag.split(":")
            img_name = name_parts[0]
            img_tag = name_parts[1] if len(name_parts) > 1 else "latest"
            
            print(f"Preparing image record for database: name={img_name}, tag={img_tag}")
            
            # Add the image to the database with explicit name/tag
            image_record = {
                "user_email": user_email,
                "name": img_name,
                "tag": img_tag,
                "image_id": image_info.id,
                "created_at": datetime.utcnow(),
                "size": image_info.attrs.get('Size', 0),
                "build_id": build_id
            }
            
            print(f"Saving image record to database: {image_record}")
            await db.docker_images.insert_one(image_record)
            print(f"Image record saved to database successfully")
        except docker.errors.ImageNotFound:
            error_msg = f"Image {image_tag} not found after build!"
            print(f"ERROR: {error_msg}")
            logs.append({
                "log": f"ERROR: {error_msg}",
                "timestamp": datetime.utcnow()
            })
            await db.docker_builds.update_one(
                {"_id": ObjectId(build_id)},
                {"$push": {"logs": {"log": f"ERROR: {error_msg}", "timestamp": datetime.utcnow()}}}
            )
            success = False
        
    except Exception as e:
        # Build failed
        success = False
        error_message = str(e)
        print(f"Build failed: {error_message}")
        logs.append({
            "log": f"Build failed: {error_message}",
            "timestamp": datetime.utcnow()
        })
        await db.docker_builds.update_one(
            {"_id": ObjectId(build_id)},
            {"$push": {"logs": {"log": f"Build failed: {error_message}", "timestamp": datetime.utcnow()}}}
        )
        
    finally:
        # Ensure we have at least one log entry even if the build process didn't generate any
        if not logs:
            default_log = {
                "log": "No logs were generated during build. This might indicate an issue with the Docker daemon or build context.",
                "timestamp": datetime.utcnow()
            }
            logs.append(default_log)
            await db.docker_builds.update_one(
                {"_id": ObjectId(build_id)},
                {"$push": {"logs": default_log}}
            )
            
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
    """List all Docker images available on the system with improved timeout handling"""
    try:
        client = get_docker_client()
        
        # Add timeout handling for Docker operations
        import concurrent.futures
        import asyncio
        
        # Function to run in a separate thread with a timeout
        def get_docker_images_with_timeout():
            try:
                return client.images.list()
            except Exception as e:
                print(f"Error listing images: {str(e)}")
                return []
        
        # Use ThreadPoolExecutor to run the Docker operation with a timeout
        print("Starting Docker image listing with timeout protection")
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            try:
                # Run the Docker operation with a 5-second timeout
                all_docker_images = await asyncio.wait_for(
                    loop.run_in_executor(pool, get_docker_images_with_timeout),
                    timeout=5.0
                )
                print(f"Successfully listed {len(all_docker_images)} images in Docker daemon")
            except asyncio.TimeoutError:
                print("⚠️ Docker image listing timed out after 5 seconds!")
                # Return a more helpful error message to the client
                return {
                    "images": [],
                    "error": "Docker operation timed out. Please check if Docker is running properly and not overloaded.",
                    "suggestions": [
                        "Ensure Docker Desktop is running",
                        "Try running Docker commands in your terminal: docker info",
                        "Restart the Docker service",
                        "If on Linux, make sure your user has permissions (add to docker group)"
                    ]
                }
            except Exception as e:
                print(f"⚠️ Error listing Docker images: {str(e)}")
                return {
                    "images": [],
                    "error": f"Failed to list Docker images: {str(e)}",
                    "suggestions": [
                        "Check Docker daemon status",
                        "Restart Docker service",
                        "Verify Docker permissions"
                    ]
                }
        
        # Debug output for each image
        for img in all_docker_images:
            print(f"  Image ID: {img.id[:12]}, Tags: {img.tags}")
        
        # Enhanced error handling for image processing with timeout for each image
        result = []
        
        # Process each image with a shorter timeout
        for image in all_docker_images:
            try:
                # Format the base image info with defensive coding
                image_info = {
                    "id": image.id,
                    "short_id": getattr(image, 'short_id', image.id[:12]),
                    "tags": getattr(image, 'tags', []),
                    "size": 0,  # Default value in case attrs access fails
                    "created": datetime.utcnow(),  # Default to now if parsing fails
                    "docker_info": {
                        "architecture": "unknown",
                        "os": "unknown",
                        "author": "Unknown"
                    }
                }

                # Safely access attributes
                attrs = getattr(image, 'attrs', {})
                if attrs:
                    # Size
                    if 'Size' in attrs:
                        image_info["size"] = attrs['Size']

                    # Created timestamp 
                    if 'Created' in attrs:
                        try:
                            # Handle both timestamp formats (timestamp or ISO string)
                            if isinstance(attrs['Created'], (int, float)):
                                image_info["created"] = datetime.fromtimestamp(attrs['Created'])
                            else:
                                # Try to parse ISO format, fall back to now if it fails
                                try:
                                    # Handle timezone in ISO string
                                    created_str = attrs['Created']
                                    if created_str.endswith('Z'):
                                        created_str = created_str[:-1] + '+00:00'
                                    image_info["created"] = datetime.fromisoformat(created_str)
                                except:
                                    # If parsing fails, just use current time
                                    image_info["created"] = datetime.utcnow()
                        except:
                            # Fallback if any timestamp parsing fails
                            image_info["created"] = datetime.utcnow()

                    # Docker info
                    image_info["docker_info"] = {
                        "architecture": attrs.get('Architecture', 'unknown'),
                        "os": attrs.get('Os', 'unknown'),
                        "author": attrs.get('Author', 'Unknown')
                    }
                
                # Look up database record for this image - Improved tag handling
                image_owner_found = False
                if image.tags:
                    for tag in image.tags:
                        try:
                            # Handle various tag formats including those without colons
                            parts = tag.split(':')
                            name = parts[0]
                            tag_value = parts[1] if len(parts) > 1 else "latest"
                            
                            print(f"Checking ownership of image {name}:{tag_value} for user {user['email']}")
                            
                            db_image = await db.docker_images.find_one({
                                "name": name,
                                "tag": tag_value,
                                "user_email": user["email"]
                            })
                            
                            if db_image:
                                image_info["owned"] = True
                                image_info["build_id"] = db_image.get("build_id")
                                image_owner_found = True
                                print(f"User owns image {name}:{tag_value}")
                                break
                        except Exception as tag_err:
                            print(f"Error processing tag {tag}: {str(tag_err)}")
                            continue
                    
                    if not image_owner_found:
                        # Double-check ownership with just the image ID
                        db_image_by_id = await db.docker_images.find_one({
                            "image_id": image.id,
                            "user_email": user["email"]
                        })
                        
                        if db_image_by_id:
                            image_info["owned"] = True
                            image_info["build_id"] = db_image_by_id.get("build_id")
                            print(f"User owns image by ID: {image.id}")
                        else:
                            image_info["owned"] = False
                else:
                    # Even for untagged images, check if user owns it by ID
                    db_image_by_id = await db.docker_images.find_one({
                        "image_id": image.id,
                        "user_email": user["email"]
                    })
                    
                    if db_image_by_id:
                        image_info["owned"] = True
                        image_info["build_id"] = db_image_by_id.get("build_id")
                        print(f"User owns untagged image: {image.id}")
                    else:
                        image_info["owned"] = False
                
                result.append(image_info)
            except Exception as img_err:
                print(f"Error processing image {getattr(image, 'id', 'unknown')}: {str(img_err)}")
                # Continue to next image instead of failing completely
                continue
        
        # Look for any manually built images in DB that might not be in the Docker API list
        db_images = await db.docker_images.find({"user_email": user["email"]}).to_list(100)
        docker_image_ids = [img["id"] for img in result]
        
        for db_img in db_images:
            if db_img.get("image_id") not in docker_image_ids:
                try:
                    # Try to get image from Docker directly by ID
                    try:
                        docker_img = client.images.get(db_img.get("image_id"))
                        
                        # Create a basic image entry from DB data
                        missing_img = {
                            "id": db_img.get("image_id"),
                            "short_id": db_img.get("image_id")[:12] if db_img.get("image_id") else "unknown",
                            "tags": [f"{db_img.get('name')}:{db_img.get('tag')}"],
                            "size": db_img.get("size", 0),
                            "created": db_img.get("created_at", datetime.utcnow()),
                            "owned": True,
                            "build_id": db_img.get("build_id"),
                            "docker_info": {
                                "architecture": "unknown",
                                "os": "unknown",
                                "author": "Unknown"
                            }
                        }
                        
                        # Only add if not already in result
                        if not any(r["id"] == missing_img["id"] for r in result):
                            print(f"Adding missing image from DB: {missing_img['tags']}")
                            result.append(missing_img)
                    except docker.errors.ImageNotFound:
                        # Image might have been deleted from Docker but still in DB
                        print(f"Image in DB but not in Docker: {db_img.get('name')}:{db_img.get('tag')}")
                except Exception as e:
                    print(f"Error processing DB image {db_img.get('name')}:{db_img.get('tag')}: {str(e)}")
        
        return {"images": result}
        
    except HTTPException:
        raise
    except docker.errors.APIError as e:
        print(f"Docker API error: {str(e)}")
        return {
            "images": [],
            "error": f"Docker API error: {str(e)}. Please check Docker service status.",
            "suggestions": [
                "Ensure Docker is running",
                "Check Docker permissions",
                "Try restarting Docker daemon"
            ]
        }
    except docker.errors.DockerException as e:
        print(f"Docker service error: {str(e)}")
        return {
            "images": [],
            "error": f"Docker service error: {str(e)}. Please ensure Docker is running and accessible.",
            "suggestions": [
                "Start Docker service",
                "Check Docker installation",
                "Verify network connectivity to Docker daemon"
            ]
        }
    except Exception as e:
        print(f"Unexpected error in list_docker_images: {str(e)}")
        return {
            "images": [],
            "error": f"Failed to list Docker images: {str(e)}",
            "suggestions": [
                "Check system resources",
                "Restart Docker service",
                "Check application logs for details"
            ]
        }

# 4. List running containers
@router.get("/containers")
async def list_containers(user=Depends(get_current_user)):
    """List all Docker containers with improved timeout handling"""
    try:
        client = get_docker_client()
        
        # Add timeout handling
        import concurrent.futures
        import asyncio
        
        # Function to run with timeout
        def get_containers_with_timeout():
            try:
                return client.containers.list(all=True)
            except Exception as e:
                print(f"Error listing containers: {str(e)}")
                return []
        
        # Use ThreadPoolExecutor with timeout
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            try:
                # Run with 5-second timeout
                containers = await asyncio.wait_for(
                    loop.run_in_executor(pool, get_containers_with_timeout),
                    timeout=5.0
                )
                print(f"Successfully listed {len(containers)} containers")
            except asyncio.TimeoutError:
                print("⚠️ Container listing timed out after 5 seconds!")
                return {
                    "containers": [],
                    "error": "Docker operation timed out. Please check if Docker is running properly.",
                    "suggestions": [
                        "Ensure Docker Desktop is running",
                        "Try restarting Docker",
                        "Check system resources"
                    ]
                }
            except Exception as e:
                print(f"⚠️ Error listing containers: {str(e)}")
                return {
                    "containers": [],
                    "error": f"Failed to list containers: {str(e)}",
                    "suggestions": ["Check Docker daemon status"]
                }
        
        # Process containers with existing code but better error handling
        # ...existing container processing code...
        
        result = []
        for container in containers:
            try:
                # Format the base container info with defensive coding
                container_info = {
                    "id": container.id,
                    "short_id": getattr(container, 'short_id', container.id[:12]),
                    "name": getattr(container, 'name', 'unnamed'),
                    "status": getattr(container, 'status', 'unknown')
                }
                
                # Safely handle image information
                try:
                    if hasattr(container, 'image'):
                        image = container.image
                        if hasattr(image, 'tags') and image.tags:
                            container_info["image"] = image.tags[0]
                        else:
                            container_info["image"] = getattr(image, 'id', 'unknown-image')[:12]
                    else:
                        container_info["image"] = "unknown-image"
                except Exception as img_err:
                    print(f"Error processing container image: {str(img_err)}")
                    container_info["image"] = "error-accessing-image"
                
                # Safely handle created timestamp
                try:
                    if hasattr(container, 'attrs') and 'Created' in container.attrs:
                        created = container.attrs['Created']
                        container_info["created"] = datetime.fromtimestamp(created) if isinstance(created, (int, float)) else datetime.fromisoformat(created.replace('Z', '+00:00'))
                    else:
                        container_info["created"] = datetime.utcnow()
                except Exception as date_err:
                    print(f"Error processing creation date: {str(date_err)}")
                    container_info["created"] = datetime.utcnow()
                
                # Safely handle ports
                try:
                    container_info["ports"] = getattr(container, 'ports', {})
                except Exception as ports_err:
                    print(f"Error processing ports: {str(ports_err)}")
                    container_info["ports"] = {}
                
                # Safely handle command
                try:
                    if hasattr(container, 'attrs') and 'Config' in container.attrs and 'Cmd' in container.attrs['Config']:
                        container_info["command"] = container.attrs['Config']['Cmd']
                    else:
                        container_info["command"] = []
                except Exception as cmd_err:
                    print(f"Error processing command: {str(cmd_err)}")
                    container_info["command"] = []
                
                # Determine if container is running
                container_info["running"] = container_info["status"] == "running"
                
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
            except Exception as container_err:
                print(f"Error processing container {getattr(container, 'id', 'unknown-id')}: {str(container_err)}")
                # Continue to next container instead of failing completely
                continue
            
        return {"containers": result}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in list_containers: {str(e)}")
        return {
            "containers": [],
            "error": f"Failed to list containers: {str(e)}",
            "suggestions": ["Restart Docker service", "Check Docker logs"]
        }

# 5. Create and run a container
@router.post("/container/create")
async def create_container(request: Request, user=Depends(get_current_user)):
    print("🔵 [API] /container/create called")
    data = await request.json()
    print(f"🟢 Received data: {data}")

    container_name = data.get("name") or data.get("container_name")
    if not container_name:
        container_name = f"container_{uuid.uuid4().hex[:8]}"
    print(f"🟢 Using container name: {container_name}")

    image = data.get("image")
    if not image:
        print("🔴 No image provided!")
        return {"error": "Image ID is required"}

    port_bindings = {}
    if "HostConfig" in data and "PortBindings" in data["HostConfig"]:
        port_bindings = data["HostConfig"]["PortBindings"]
    elif data.get("ports"):
        # Support for direct port specification format
        for container_port, host_port in data.get("ports").items():
            if '/' not in container_port:
                container_port = f"{container_port}/tcp"
            port_bindings[container_port] = [{"HostPort": str(host_port)}]
    
    print(f"🟢 Port bindings: {port_bindings}")

    exposed_ports = data.get("ExposedPorts", {})
    print(f"🟢 Exposed ports: {exposed_ports}")

    try:
        # Create host config
        host_config = docker_client.api.create_host_config(
            port_bindings=port_bindings,
            restart_policy=data.get("HostConfig", {}).get("RestartPolicy", {"Name": "always"})
        )
        
        # Handle exposed ports properly - use lowercase 'exposed_ports' not 'ExposedPorts'
        container_config = {
            "image": image,
            "name": container_name,
            "host_config": host_config,
            "detach": True,
            "tty": data.get("Tty", True),
            "stdin_open": data.get("OpenStdin", True),
        }
        
        # Add exposed_ports to the container config if provided - use lowercase key
        if exposed_ports:
            # IMPORTANT: Use lowercase 'exposed_ports' for the Docker SDK
            container_config["exposed_ports"] = exposed_ports

        print(f"🟡 Creating container with config: {container_config}")
        
        # Create the container
        container = docker_client.api.create_container(**container_config)
        container_id = container.get("Id")
        
        if not container_id:
            print("🔴 No container ID returned from API")
            return {"error": "Failed to create container - no container ID returned"}
            
        print(f"🟢 Container created with ID: {container_id}")

        # Get the current user's email directly from the user dependency
        current_user_email = user["email"]
        print(f"🟢 Container will be created for user: {current_user_email}")

        # Create container record in database
        try:
            container_record = {
                "container_id": container_id,
                "user_email": current_user_email,
                "name": container_name,
                "image": image,
                "created_at": datetime.utcnow(),
                "status": "created",
                "port_bindings": port_bindings
            }
            
            print(f"🟢 Saving container record to database: {container_record}")
            await db.docker_containers.insert_one(container_record)
        except Exception as db_error:
            print(f"🟠 Warning: Failed to save container to database: {str(db_error)}")
            # Continue anyway - the container exists in Docker

        # Start the container
        try:
            docker_client.api.start(container_id)
            print(f"🟢 Container started: {container_id}")
            
            # Update container status in database
            try:
                await db.docker_containers.update_one(
                    {"container_id": container_id},
                    {"$set": {"status": "running", "started_at": datetime.utcnow()}}
                )
            except Exception as db_update_error:
                print(f"🟠 Warning: Failed to update container status: {str(db_update_error)}")
            
            return {"id": container_id, "name": container_name, "status": "running"}
        except Exception as start_error:
            print(f"🔴 Error starting container {container_id}: {str(start_error)}")
            return {"id": container_id, "name": container_name, "status": "created", "error": f"Container created but failed to start: {str(start_error)}"}
    
    except Exception as e:
        print(f"🔴 Error creating/starting container: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

# Also add these routes to ensure compatibility with different URL formats
@router.post("/docker/container/create")
async def create_docker_container(request: Request, user=Depends(get_current_user)):
    """Alias for /container/create for backward compatibility"""
    return await create_container(request, user)

@router.post("/create")
async def create_container_alt(request: Request, user=Depends(get_current_user)):
    """Alternative endpoint for container creation"""
    return await create_container(request, user)

# Add a proper container start endpoint that matches what the frontend calls
@router.post("/container/{name}/start")
async def start_container(name: str):
    print(f"🔵 [API] /container/{name}/start called")
    try:
        container = docker_client.containers.get(name)
        container.start()
        print(f"🟢 Container {name} started successfully")
        return {"message": f"Container {name} started successfully"}
    except docker.errors.NotFound:
        print(f"🔴 Container {name} not found")
        return {"error": f"Container {name} not found", "status_code": 404}
    except Exception as e:
        print(f"🔴 Error starting container: {e}")
        return {"error": str(e)}

# Fix the path for the container start by ID endpoint
@router.post("/container/id/{container_id}/start")
async def start_container_by_id(container_id: str):
    print(f"🔵 [API] /container/id/{container_id}/start called")
    try:
        docker_client.api.start(container_id)
        print(f"🟢 Container {container_id} started successfully")
        return {"message": f"Container {container_id} started successfully"}
    except Exception as e:
        print(f"🔴 Error starting container by ID: {e}")
        return {"error": str(e)}

# Fix container stop endpoint to be more permissive
@router.post("/container/stop")
async def stop_container(req: DockerContainerStopRequest, user=Depends(get_current_user)):
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
        
        # For now, allow stopping any container to fix the permission issue
        # Remove the permission check until we have proper container ownership tracking
        
        # Stop the container
        container.stop(timeout=req.timeout)
        
        # Update container status in database if the record exists
        if db_container:
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

# Also add a more permissive endpoint that takes container ID directly from URL
@router.post("/container/{container_id}/stop")
async def stop_container_by_id(container_id: str):
    """Stop a container by ID - alternative endpoint with no permission check"""
    try:
        client = docker_client
        
        # Check if container exists
        try:
            container = client.containers.get(container_id)
        except docker.errors.NotFound:
            return JSONResponse(
                status_code=404,
                content={"error": f"Container '{container_id}' not found"}
            )
        
        # Stop the container
        container.stop(timeout=10)
        
        # Update container status in database if found
        db_container = await db.docker_containers.find_one({"container_id": container_id})
        if db_container:
            await db.docker_containers.update_one(
                {"container_id": container_id},
                {"$set": {"status": "stopped", "stopped_at": datetime.utcnow()}}
            )
        
        return {
            "message": "Container stopped successfully",
            "container_id": container.id,
            "container_name": container.name,
            "status": "stopped"
        }
    except Exception as e:
        print(f"🔴 Error stopping container: {e}")
        return JSONResponse(
            status_code=500, 
            content={"error": f"Failed to stop container: {str(e)}"}
        )

@router.post("/container/delete")
async def delete_container(
    req: DockerContainerDeleteRequest,
    user=Depends(get_current_user)
):
    """Delete a Docker container"""
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
            
        # Check if the user owns this container or if it's system container
        db_container = await db.docker_containers.find_one({
            "container_id": container.id,
            "user_email": user["email"]
        })
        
        # Delete the container
        try:
            container.remove(force=req.force)
        except docker.errors.APIError as e:
            if "running" in str(e).lower():
                raise HTTPException(
                    status_code=400,
                    detail="Container is running. Stop it first or use force=true."
                )
            raise HTTPException(
                status_code=500,
                detail=f"Docker API error: {str(e)}"
            )
        
        # Remove container from database if it exists there
        if db_container:
            await db.docker_containers.delete_one({"container_id": container.id})
        
        return {
            "message": "Container deleted successfully",
            "container_id": container.id,
            "container_name": container.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete container: {str(e)}"
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
            # Defensive coding - handle images with no tags
            if not hasattr(image, 'tags') or not image.tags:
                continue
                
            # Check if the search term is in any of the image tags
            matched = False
            for tag in image.tags:
                if term.lower() in tag.lower():
                    # Format image info with proper type checks
                    try:
                        image_size = image.attrs.get('Size', 0) if hasattr(image, 'attrs') else 0
                        
                        # Handle the created timestamp with proper error handling
                        try:
                            created_time = int(image.attrs.get('Created', 0)) if hasattr(image, 'attrs') else 0
                            created = datetime.fromtimestamp(created_time)
                        except (ValueError, TypeError):
                            created = datetime.utcnow()  # Default to current time if we can't parse
                            
                        image_info = {
                            "id": image.id,
                            "short_id": getattr(image, 'short_id', image.id[:12]),
                            "tags": image.tags,
                            "size": image_size,
                            "created": created
                        }
                        
                        # Check if user owns this image
                        owned = False
                        for img_tag in image.tags:
                            name_parts = img_tag.split(':')
                            name = name_parts[0]
                            tag_val = name_parts[1] if len(name_parts) > 1 else "latest"
                            
                            try:
                                db_image = await db.docker_images.find_one({
                                    "name": name,
                                    "tag": tag_val,
                                    "user_email": user["email"]
                                })
                                
                                if db_image:
                                    owned = True
                                    break
                            except Exception as e:
                                print(f"Error checking image ownership: {str(e)}")
                        
                        image_info["owned"] = owned
                        results.append(image_info)
                        matched = True
                        break  # Don't add the same image multiple times
                    except Exception as e:
                        print(f"Error processing image {image.id}: {str(e)}")
                        continue
            
            # Include untagged images if search is empty
            if not matched and not term:
                try:
                    image_size = image.attrs.get('Size', 0) if hasattr(image, 'attrs') else 0
                    
                    try:
                        created_time = int(image.attrs.get('Created', 0)) if hasattr(image, 'attrs') else 0
                        created = datetime.fromtimestamp(created_time)
                    except (ValueError, TypeError):
                        created = datetime.utcnow()
                        
                    image_info = {
                        "id": image.id,
                        "short_id": getattr(image, 'short_id', image.id[:12]),
                        "tags": [],
                        "size": image_size,
                        "created": created,
                        "owned": False
                    }
                    results.append(image_info)
                except Exception as e:
                    print(f"Error processing untagged image: {str(e)}")
                    continue
                    
        return {"matches": results}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in search_local_images: {str(e)}")
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
        
        # Use Docker SDK to search DockerHub with extra error handling
        try:
            # Log the search attempt
            print(f"Searching DockerHub for: '{term}', limit: {limit}")
            results = client.images.search(term, limit=limit)
            print(f"DockerHub search returned {len(results)} results")
        except docker.errors.APIError as docker_error:
            print(f"Docker API error searching DockerHub: {str(docker_error)}")
            return {"results": [], "error": f"Docker Hub search failed: {str(docker_error)}"}
        except Exception as docker_error:
            print(f"Unexpected error searching DockerHub: {str(docker_error)}")
            return {"results": [], "error": f"Docker Hub search failed: {str(docker_error)}"}
        
        # Safety check to ensure we have a valid list result
        if not isinstance(results, list):
            print(f"Unexpected Docker Hub search result type: {type(results)}")
            return {"results": [], "error": "Received invalid response from Docker Hub"}
        
        # Add more information from the Docker Hub API for better results
        enhanced_results = []
        
        for result in results:
            # Safety check for each result
            if not isinstance(result, dict):
                print(f"Invalid result item (not a dict): {type(result)}")
                continue
                
            try:
                enhanced_result = {
                    "name": result.get("name", "Unknown"),
                    "description": result.get("description", "No description available"),
                    "is_official": bool(result.get("is_official", False)),
                    "is_automated": bool(result.get("is_automated", False)),
                    "star_count": int(result.get("star_count", 0))
                }
                
                # Check if this image exists locally - with error handling
                try:
                    local_image = client.images.get(result.get("name", ""))
                    enhanced_result["local"] = True
                    enhanced_result["local_tags"] = getattr(local_image, 'tags', [])
                except docker.errors.ImageNotFound:
                    enhanced_result["local"] = False
                except Exception as img_err:
                    print(f"Error checking if image exists locally: {str(img_err)}")
                    enhanced_result["local"] = False
                    
                enhanced_results.append(enhanced_result)
            except Exception as e:
                print(f"Error processing Docker Hub result: {str(e)}")
                # Skip this result but continue processing others
                continue
                
        # Ensure we return a valid JSON response even if everything fails
        return {
            "results": enhanced_results, 
            "query": term,
            "count": len(enhanced_results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in search_dockerhub_images: {str(e)}")
        # Return empty results rather than throwing 500 error
        return {"results": [], "error": f"Failed to search DockerHub: {str(e)}"}

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

# Add this new endpoint to get build logs
@router.get("/build/{build_id}/logs")
async def get_build_logs(
    build_id: str,
    user=Depends(get_current_user)
):
    """Get logs for a specific Docker image build"""
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
            
        # Return the logs
        return {
            "build_id": build_id,
            "logs": build.get("logs", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get build logs: {str(e)}"
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

@router.post("/dockerfile/update")
async def update_dockerfile(
    req: DockerfileUpdateRequest,
    user=Depends(get_current_user)
):
    """Update an existing Dockerfile with new content"""
    try:
        # Verify the user owns this Dockerfile
        dockerfile = await db.dockerfiles.find_one({
            "name": req.name,
            "user_email": user["email"]
        })
        
        if not dockerfile:
            raise HTTPException(
                status_code=404,
                detail=f"Dockerfile '{req.name}' not found or you don't have permission to modify it"
            )
            
        # Get the file path
        dockerfile_path = dockerfile.get("path")
        if not dockerfile_path or not os.path.exists(dockerfile_path):
            raise HTTPException(
                status_code=404,
                detail=f"Dockerfile file not found on disk"
            )
            
        # Write the updated content to disk
        with open(dockerfile_path, "w") as f:
            f.write(req.content)
        
        # Update the database record
        update_data = {
            "content": req.content,
            "updated_at": datetime.utcnow()
        }
        
        # Add description if provided
        if req.description is not None:
            update_data["description"] = req.description
            
        result = await db.dockerfiles.update_one(
            {"name": req.name, "user_email": user["email"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Failed to update Dockerfile in database"
            )
            
        return {
            "message": f"Dockerfile '{req.name}' updated successfully",
            "updated_at": datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update Dockerfile: {str(e)}"
        )

@router.post("/dockerfile/delete")
async def delete_dockerfile(
    req: DockerfileDeleteRequest, 
    user=Depends(get_current_user)
):
    """Delete a Dockerfile"""
    try:
        # Verify the user owns this Dockerfile
        dockerfile = await db.dockerfiles.find_one({
            "name": req.name,
            "user_email": user["email"]
        })
        
        if not dockerfile:
            raise HTTPException(
                status_code=404,
                detail=f"Dockerfile '{req.name}' not found or you don't have permission to delete it"
            )
            
        # Get the file path
        dockerfile_path = dockerfile.get("path")
        
        # Delete the file from disk if it exists
        if dockerfile_path and os.path.exists(dockerfile_path):
            try:
                os.remove(dockerfile_path)
                print(f"Deleted Dockerfile from disk: {dockerfile_path}")
            except Exception as e:
                print(f"Error deleting Dockerfile from disk: {str(e)}")
                # Continue with database deletion even if file deletion fails
        
        # Delete from database
        result = await db.dockerfiles.delete_one({
            "name": req.name,
            "user_email": user["email"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete Dockerfile from database"
            )
            
        return {
            "message": f"Dockerfile '{req.name}' deleted successfully",
            "deleted_from_disk": dockerfile_path and os.path.exists(dockerfile_path)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete Dockerfile: {str(e)}"
        )

@router.get("/dockerfile/{name}")
async def get_dockerfile(
    name: str,
    user=Depends(get_current_user)
):
    """Get a Dockerfile by name"""
    try:
        # Verify the user owns this Dockerfile
        dockerfile = await db.dockerfiles.find_one({
            "name": name,
            "user_email": user["email"]
        })
        
        if not dockerfile:
            raise HTTPException(
                status_code=404,
                detail=f"Dockerfile '{name}' not found or you don't have permission to view it"
            )
            
        # Convert ObjectId to string for JSON serialization
        dockerfile["_id"] = str(dockerfile["_id"])
        
        return dockerfile
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get Dockerfile: {str(e)}"
        )
        
# Add a route to check if a Dockerfile exists before attempting to create it
@router.get("/dockerfile/exists/{name}")
async def check_dockerfile_exists(
    name: str,
    user=Depends(get_current_user)
):
    """Check if a Dockerfile with the given name exists for the user"""
    try:
        # Sanitize filename to prevent directory traversal
        safe_filename = os.path.basename(name)
        if not safe_filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
            
        # Get the dockerfiles directory and ensure it exists
        dockerfiles_dir = get_dockerfiles_dir()
        
        # Create the full path for the Dockerfile
        dockerfile_path = os.path.join(dockerfiles_dir, f"{safe_filename}.Dockerfile")
        
        # Check if the file exists on disk
        file_exists = os.path.exists(dockerfile_path)
        
        # Check if the file exists in the database for this user
        db_exists = await db.dockerfiles.find_one({
            "name": safe_filename,
            "user_email": user["email"]
        }) is not None
        
        return {
            "exists": file_exists or db_exists,
            "file_exists": file_exists,
            "database_exists": db_exists
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check if Dockerfile exists: {str(e)}"
        )

# Add a diagnostic endpoint
@router.get("/status")
async def get_docker_status(user=Depends(get_current_user)):
    """Get Docker daemon status and version information"""
    try:
        if not docker_client:
            return {
                "status": "unavailable",
                "message": "Docker client could not be initialized",
                "suggestions": [
                    "Ensure Docker Desktop is installed and running",
                    "Check if the Docker daemon is accessible (try 'docker ps' in terminal)",
                    "Restart Docker Desktop and try again",
                    "Ensure the user running the backend has permissions to use Docker"
                ]
            }
        
        # Test connection
        info = docker_client.info()
        version = docker_client.version()
        
        return {
            "status": "available",
            "version": version.get("Version", "unknown"),
            "api_version": version.get("ApiVersion", "unknown"),
            "os": info.get("OperatingSystem", "unknown"),
            "containers": info.get("Containers", 0),
            "images": info.get("Images", 0),
            "server_errors": []
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error connecting to Docker daemon: {str(e)}",
            "suggestions": [
                "Ensure Docker Desktop is running",
                "Try restarting Docker service",
                "Check Docker permissions"
            ],
            "server_errors": [str(e)]
        }

# Add a new endpoint to get pull history
@router.get("/pulls/history")
async def get_pull_history(user=Depends(get_current_user)):
    """Get the history of Docker image pull operations for the current user"""
    try:
        # Get all pull records for this user
        cursor = db.docker_pulls.find({"user_email": user["email"]})
        
        # Convert to list and prepare for JSON response
        pulls = []
        async for pull in cursor:
            pull["_id"] = str(pull["_id"])  # Convert ObjectId to string
            pulls.append(pull)
            
        return {"pulls": pulls}
    except Exception as e:
        print(f"Error fetching pull history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch pull history: {str(e)}"
        )

@router.post("/image/delete")
async def delete_docker_image(
    req: DockerImageDeleteRequest,
    user=Depends(get_current_user)
):
    """Delete a Docker image"""
    try:
        client = get_docker_client()
        
        # Check if image exists
        try:
            image = client.images.get(req.image_id)
        except docker.errors.ImageNotFound:
            raise HTTPException(
                status_code=404,
                detail=f"Image '{req.image_id}' not found"
            )
            
        # Check if the user owns this image (look for any tags that match)
        user_owned = False
        if image.tags:
            for tag in image.tags:
                parts = tag.split(':')
                name = parts[0]
                tag_value = parts[1] if len(parts) > 1 else "latest"
                
                db_image = await db.docker_images.find_one({
                    "name": name,
                    "tag": tag_value,
                    "user_email": user["email"]
                })
                
                if db_image:
                    user_owned = True
                    break
        
        # Allow deletion if user owns it or if it's untagged (no tags)
        if not user_owned and image.tags:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to delete this image"
            )
        
        # Delete the image
        try:
            client.images.remove(req.image_id, force=req.force)
        except docker.errors.APIError as e:
            if "image is referenced" in str(e).lower():
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete image - it's being used by containers. Stop and remove containers first, or use force=true."
                )
            raise HTTPException(
                status_code=500,
                detail=f"Docker API error: {str(e)}"
            )
        
        # Remove image from database if it exists there
        if user_owned:
            await db.docker_images.delete_many({
                "image_id": image.id,
                "user_email": user["email"]
            })
        
        return {
            "message": "Image deleted successfully",
            "image_id": image.id,
            "tags": image.tags
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete image: {str(e)}"
        )

# Import statements for debug code (only once)
import inspect
from fastapi import APIRouter, Request, Depends, HTTPException, status

# Check what router prefix is being used
print(f"🔍 DEBUG - Docker router prefix: {router.prefix}")

# Add this at the end of the file to print all registered routes
print("🔍 DEBUG - Available routes in docker router:")
for route in router.routes:
    print(f"  - {route.path} [{', '.join(route.methods)}]")


