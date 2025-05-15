"""Run this script to debug Docker image listing issues"""
import docker
import sys

def debug_docker_images():
    try:
        # Initialize Docker client
        print("Connecting to Docker...")
        client = docker.from_env()
        
        # Check basic connection
        print("\nTesting Docker API connection:")
        info = client.info()
        print(f"✅ Docker version: {info.get('ServerVersion')}")
        
        # Test image listing specifically
        print("\nTesting image listing:")
        try:
            images = client.images.list()
            print(f"✅ Found {len(images)} images")
            
            # Test attributes we access in the router
            for i, img in enumerate(images[:3]):  # First 3 images only
                print(f"\nImage {i+1}:")
                print(f"  ID: {img.id}")
                print(f"  Short ID: {img.short_id}")
                print(f"  Tags: {img.tags}")
                
                # These are the potentially problematic attributes
                try:
                    print(f"  Size: {img.attrs['Size']}")
                except Exception as e:
                    print(f"  ❌ Error accessing Size: {str(e)}")
                
                try:
                    print(f"  Created: {img.attrs['Created']}")
                except Exception as e:
                    print(f"  ❌ Error accessing Created: {str(e)}")
                
                try:
                    print(f"  Architecture: {img.attrs.get('Architecture')}")
                except Exception as e:
                    print(f"  ❌ Error accessing Architecture: {str(e)}")
                
                print("  Attributes structure:")
                for key in img.attrs.keys():
                    print(f"    - {key}")
                    
        except Exception as e:
            print(f"❌ Image listing failed: {str(e)}")
            raise
    
    except Exception as e:
        print(f"❌ Docker connection failed: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    print("Docker Image Debug Utility")
    success = debug_docker_images()
    sys.exit(0 if success else 1)
