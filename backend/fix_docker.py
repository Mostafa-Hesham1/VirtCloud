from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import docker
import sys

# Create a test function to check image listing
def test_image_listing():
    try:
        # Initialize Docker client
        print("Connecting to Docker...")
        client = docker.from_env()
        
        # Test image listing
        print("Listing images...")
        images = client.images.list()
        print(f"Found {len(images)} images")
        
        # Process images as the router would
        processed_images = []
        for image in images:
            # Use a more defensive approach to access attributes
            image_info = {
                "id": image.id,
                "short_id": getattr(image, 'short_id', 'unknown'),
                "tags": getattr(image, 'tags', []),
            }
            
            # Safely access attributes dictionary
            attrs = getattr(image, 'attrs', {})
            if attrs:
                try:
                    image_info["size"] = attrs.get('Size', 0)
                except Exception as e:
                    print(f"Error accessing Size: {str(e)}")
                    image_info["size"] = 0
                
                try:
                    if 'Created' in attrs:
                        created = attrs['Created']
                        # Handle different date formats (string or timestamp)
                        if isinstance(created, (int, float)):
                            image_info["created"] = datetime.fromtimestamp(created)
                        else:
                            try:
                                image_info["created"] = datetime.fromisoformat(created.replace('Z', '+00:00'))
                            except:
                                image_info["created"] = datetime.now()
                    else:
                        image_info["created"] = datetime.now()
                except Exception as e:
                    print(f"Error processing Created: {str(e)}")
                    image_info["created"] = datetime.now()
                
                image_info["docker_info"] = {
                    "architecture": attrs.get('Architecture', 'unknown'),
                    "os": attrs.get('Os', 'unknown'),
                    "author": attrs.get('Author', 'Unknown')
                }
            
            processed_images.append(image_info)
            
        print(f"Successfully processed {len(processed_images)} images")
        for i, img in enumerate(processed_images[:2]):
            print(f"\nProcessed Image {i+1}:")
            for key, value in img.items():
                print(f"  {key}: {value}")
        
        return True
    except Exception as e:
        print(f"Error testing image listing: {str(e)}")
        return False

if __name__ == "__main__":
    print("Docker Images Fix Test")
    success = test_image_listing()
    sys.exit(0 if success else 1)
