from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional
import os
import re
from datetime import datetime
from database import db
from ..auth import get_current_user
from .docker_common import get_dockerfiles_dir

router = APIRouter()

# Models specific to Dockerfile operations
class DockerfileCreateRequest(BaseModel):
    content: str = Field(..., description="Content of the Dockerfile")
    name: str = Field(..., description="Name for the Dockerfile (without extension)")
    description: Optional[str] = Field(None, description="Optional description")

class DockerfileUpdateRequest(BaseModel):
    name: str = Field(..., description="Name of the Dockerfile to update")
    content: str = Field(..., description="New content for the Dockerfile")
    description: Optional[str] = Field(None, description="Optional updated description")

class DockerfileDeleteRequest(BaseModel):
    name: str = Field(..., description="Name of the Dockerfile to delete")

# Create Dockerfile
@router.post("/dockerfile/create", status_code=status.HTTP_201_CREATED)
async def create_dockerfile(req: DockerfileCreateRequest, user=Depends(get_current_user)):
    """Create a Dockerfile with the specified content."""
    safe_filename = re.sub(r'[\\/*?:"<>|\r\n\t]', "_", req.name).strip()
    if not safe_filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    dockerfiles_dir = get_dockerfiles_dir()
    dockerfile_path = os.path.join(dockerfiles_dir, f"{safe_filename}.Dockerfile")
    if os.path.exists(dockerfile_path):
        raise HTTPException(status_code=409, detail=f"A Dockerfile with the name '{safe_filename}' already exists.")
    with open(dockerfile_path, "w", encoding="utf-8") as f:
        f.write(req.content)
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
    return {"message": "Dockerfile created successfully", "id": str(result.inserted_id)}

# Update Dockerfile
@router.post("/update")
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

# Delete Dockerfile
@router.post("/delete")
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

# Get a Dockerfile
@router.get("/{name}")
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

# Check if a Dockerfile exists
@router.get("/exists/{name}")
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

# List Dockerfiles
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
