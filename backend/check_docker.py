import subprocess
import docker
import time
import os

print("Checking Docker status...")

# Wait a bit for Docker to fully start if just launched
print("Allowing time for Docker to initialize...")
time.sleep(5)

# Check using command line
try:
    result = subprocess.run(["docker", "info"], capture_output=True, text=True)
    if result.returncode == 0:
        print("✅ Docker daemon is running! Command line check passed.")
    else:
        print("❌ Docker daemon is still not running.")
        print(f"  Error: {result.stderr.strip()}")
except Exception as e:
    print(f"❌ Error checking Docker: {str(e)}")
    
# Check using Python Docker SDK
try:
    client = docker.from_env()
    info = client.info()
    print(f"✅ Docker SDK connection successful!")
    print(f"  Docker version: {info.get('ServerVersion', 'unknown')}")
    print(f"  Containers: {info.get('Containers', 0)}")
    print(f"  Images: {info.get('Images', 0)}")
except Exception as e:
    print(f"❌ Failed to connect to Docker daemon via SDK: {str(e)}")

# Add more detailed diagnostics
print("\n=== Detailed Docker Connection Diagnostics ===")
try:
    # Check Docker socket file on Windows
    if os.name == 'nt':
        pipe_path = '//./pipe/docker_engine'
        if os.path.exists(pipe_path):
            print(f"✅ Docker named pipe exists at: {pipe_path}")
        else:
            print(f"❌ Docker named pipe NOT found at: {pipe_path}")
            print("   This indicates Docker Desktop is not running properly")
    
    # Attempt API call specifically for containers
    try:
        containers = client.containers.list(all=True)
        print(f"✅ Successfully listed {len(containers)} containers")
    except Exception as e:
        print(f"❌ Container listing failed: {str(e)}")
        
except Exception as e:
    print(f"❌ Diagnostic checks failed: {str(e)}")

print("\n=== Docker Desktop Startup Procedure ===")
print("1. Click on Docker Desktop icon in system tray/taskbar")
print("2. If not found, search for Docker Desktop in Start menu and launch it")
print("3. Wait for the whale icon to stop animating (can take 1-2 minutes)")
print("4. Run this check again to verify Docker is running properly")

print("\nIf Docker is still not running, try:")
print("1. Restart Docker Desktop")
print("2. Check for any Docker Desktop error messages")
print("3. Restart your computer and try again")
