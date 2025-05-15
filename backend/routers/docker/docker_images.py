from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional
import docker
from datetime import datetime
from database import db
from ..auth import get_current_user
from bson.objectid import ObjectId
from .docker_common import get_docker_client, get_dockerfiles_dir, handle_docker_error

router = APIRouter()

# Models specific to Docker images
class DockerImageBuildRequest(BaseModel):
    dockerfile_name: str = Field(..., description="Name of the Dockerfile to use")
    image_name: str = Field(..., description="Name for the image (e.g., 'my-app')")
    tag: str = Field("latest", description="Tag for the image (e.g., 'latest', 'v1')")

class DockerImageSearchRequest(BaseModel):
    term: str = Field(..., description="Search term")
    limit: int = Field(10, description="Maximum number of results to return")

class DockerImagePullRequest(BaseModel):
    image: str = Field(..., description="Image name to pull (e.g., 'nginx:latest')")

# Build Docker Image from Dockerfile
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
    import os
    
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

# List Docker images
@router.get("/list")
async def list_docker_images(user=Depends(get_current_user)):
    """List all Docker images available on the system"""
    try:
        client = get_docker_client()
        
        # Get all images from Docker
        images = client.images.list()
        
        # Enhanced error handling for image processing
        result = []
        for image in images:
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
                    # Get additional image details
                    if 'Size' in attrs:
                        image_info["size"] = attrs['Size']

                    if 'Created' in attrs:
                        try:
                            # Handle both timestamp formats
                            if isinstance(attrs['Created'], (int, float)):
                                image_info["created"] = datetime.fromtimestamp(attrs['Created'])
                            else:
                                # Try to parse ISO format
                                created_str = attrs['Created']
                                if created_str.endswith('Z'):
                                    created_str = created_str[:-1] + '+00:00'
                                image_info["created"] = datetime.fromisoformat(created_str)
                        except:
                            # Fallback to current time
                            image_info["created"] = datetime.utcnow()

                    # Docker info
                    image_info["docker_info"] = {
                        "architecture": attrs.get('Architecture', 'unknown'),
                        "os": attrs.get('Os', 'unknown'),
                        "author": attrs.get('Author', 'Unknown')
                    }
                
                # Check if user owns this image
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
                            image_info["owned"] = True
                            image_info["build_id"] = db_image.get("build_id")
                            break
                    else:
                        image_info["owned"] = False
                else:
                    image_info["owned"] = False
                
                result.append(image_info)
            except Exception as img_err:
                print(f"Error processing image {getattr(image, 'id', 'unknown')}: {str(img_err)}")
                # Continue to next image instead of failing
                continue
            
        return {"images": result}
        
    except HTTPException:
        raise
    except docker.errors.APIError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Docker API error: {str(e)}. Please check Docker service status."
        )
    except docker.errors.DockerException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Docker service error: {str(e)}. Please ensure Docker is running and accessible."
        )
    except Exception as e:
        print(f"Unexpected error in list_docker_images: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list Docker images: {str(e)}"
        )

# Search for local images
@router.get("/search/local")
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
            # Skip images with no tags
            if not hasattr(image, 'tags') or not image.tags:
                continue
                
            # Check if the search term is in any of the image tags
            matched = False
            for tag in image.tags:
                if term.lower() in tag.lower():
                    try:
                        # Get basic image info
                        image_size = image.attrs.get('Size', 0) if hasattr(image, 'attrs') else 0
                        
                        # Handle the created timestamp
                        try:
                            created_time = int(image.attrs.get('Created', 0)) if hasattr(image, 'attrs') else 0
                            created = datetime.fromtimestamp(created_time)
                        except (ValueError, TypeError):
                            created = datetime.utcnow()
                            
                        image_info = {
                            "id": image.id,
                            "short_id": getattr(image, 'short_id', image.id[:12]),
                            "tags": image.tags,
                            "size": image_size,
                            "created": created
                        }
                        
                        # Check ownership
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
                    # Process untagged image
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

# Search for images on DockerHub
@router.get("/search/hub")
async def search_dockerhub_images(
    term: str,
    limit: int = 25,
    user=Depends(get_current_user)
):
    """Search for Docker images on DockerHub"""
    try:
        client = get_docker_client()
        
        # Use Docker SDK to search DockerHub
        try:
            print(f"Searching DockerHub for: '{term}', limit: {limit}")
            results = client.images.search(term, limit=limit)
            print(f"DockerHub search returned {len(results)} results")
        except docker.errors.APIError as docker_error:
            print(f"Docker API error searching DockerHub: {str(docker_error)}")
            return {"results": [], "error": f"Docker Hub search failed: {str(docker_error)}"}
        except Exception as docker_error:
            print(f"Unexpected error searching DockerHub: {str(docker_error)}")
            return {"results": [], "error": f"Docker Hub search failed: {str(docker_error)}"}
        
        # Safety check for valid response
        if not isinstance(results, list):
            print(f"Unexpected Docker Hub search result type: {type(results)}")
            return {"results": [], "error": "Received invalid response from Docker Hub"}
        
        # Add more information from the Docker Hub API
        enhanced_results = []
        
        for result in results:
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
                
                # Check if this image exists locally
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
                continue
                
        return {
            "results": enhanced_results, 
            "query": term,
            "count": len(enhanced_results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in search_dockerhub_images: {str(e)}")
        return {"results": [], "error": f"Failed to search DockerHub: {str(e)}"}

# Pull an image from DockerHub
@router.post("/pull")
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

# Get build status and logs
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

# Get pull status
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

# Get pull history
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
