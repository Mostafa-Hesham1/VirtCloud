import subprocess
import docker
import time
import json

print("==== Docker Detailed Diagnostics ====")

# Check Docker CLI
try:
    result = subprocess.run(["docker", "version", "--format", "json"], capture_output=True, text=True)
    if result.returncode == 0:
        version_info = json.loads(result.stdout)
        print(f"✅ Docker CLI Version: {version_info.get('Client', {}).get('Version', 'unknown')}")
    else:
        print(f"❌ Docker CLI error: {result.stderr.strip()}")
except Exception as e:
    print(f"❌ Docker CLI check failed: {str(e)}")

# Check Docker daemon
try:
    client = docker.from_env()
    info = client.info()
    version = client.version()
    
    print("\n=== Docker Daemon Info ===")
    print(f"✅ Docker Engine: {version.get('Version', 'unknown')}")
    print(f"✅ API Version: {version.get('ApiVersion', 'unknown')}")
    print(f"✅ OS/Arch: {info.get('OperatingSystem', 'unknown')}/{info.get('Architecture', 'unknown')}")
    print(f"✅ Kernel: {info.get('KernelVersion', 'unknown')}")
    
    # Test image listing specifically
    print("\n=== Testing Image Listing ===")
    try:
        images = client.images.list()
        print(f"✅ Found {len(images)} images")
        for img in images[:3]:  # Show first 3 images only
            print(f"  - {img.id[:12]} (Tags: {img.tags})")
    except Exception as e:
        print(f"❌ Image listing failed: {str(e)}")
    
    # Test other Docker operations
    print("\n=== Testing Container Listing ===")
    try:
        containers = client.containers.list(all=True)
        print(f"✅ Found {len(containers)} containers")
    except Exception as e:
        print(f"❌ Container listing failed: {str(e)}")
        
except Exception as e:
    print(f"❌ Docker SDK connection failed: {str(e)}")

print("\n==== End of Diagnostics ====")
