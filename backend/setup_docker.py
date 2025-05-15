import os
import sys
import subprocess
import time

def setup_docker_environment():
    """Set up the necessary directories and check Docker installation"""
    print("\n===== VirtCloud Docker Environment Setup =====\n")
    
    # Get the base directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create dockerfiles directory
    dockerfiles_dir = os.path.join(base_dir, "dockerfiles")
    os.makedirs(dockerfiles_dir, exist_ok=True)
    print(f"✅ Created dockerfiles directory at: {dockerfiles_dir}")
    
    # Check if Docker CLI is available
    try:
        result = subprocess.run(["docker", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Docker detected: {result.stdout.strip()}")
            
            # Check if Docker daemon is running
            daemon_check = subprocess.run(["docker", "info"], capture_output=True, text=True)
            if daemon_check.returncode == 0:
                print("✅ Docker daemon is running")
            else:
                print("❌ Docker daemon is not running! Please start Docker Desktop.")
                print(f"  Error: {daemon_check.stderr.strip()}")
                print("\n🔍 Attempting to start Docker Desktop...")
                
                # Try to start Docker Desktop (Windows)
                if os.name == 'nt':
                    try:
                        # Find Docker Desktop path
                        program_files = os.environ.get('ProgramFiles')
                        docker_desktop = os.path.join(program_files, "Docker", "Docker", "Docker Desktop.exe")
                        
                        if os.path.exists(docker_desktop):
                            subprocess.Popen([docker_desktop])
                            print("🚀 Docker Desktop launch initiated. Please wait for it to start...")
                            print("⏳ Waiting 30 seconds for Docker to start...")
                            
                            # Wait for Docker to start
                            for i in range(6):
                                time.sleep(5)
                                try:
                                    check = subprocess.run(["docker", "info"], 
                                                         capture_output=True, text=True, timeout=5)
                                    if check.returncode == 0:
                                        print("✅ Docker daemon is now running!")
                                        break
                                    else:
                                        print(".", end="", flush=True)
                                except:
                                    print(".", end="", flush=True)
                            print("\n")
                        else:
                            print(f"❌ Docker Desktop not found at: {docker_desktop}")
                    except Exception as e:
                        print(f"❌ Failed to start Docker Desktop: {str(e)}")
                
                # For non-Windows (Linux/Mac)
                else:
                    print("🔍 Please start Docker manually:")
                    print("   - For Linux: sudo systemctl start docker")
                    print("   - For Mac: open Docker Desktop application")
        else:
            print("❌ Docker command returned an error.")
            print(f"  Error: {result.stderr.strip()}")
    except FileNotFoundError:
        print("❌ Docker CLI not found. Make sure Docker is installed and in your PATH.")
        print("  Download Docker Desktop from: https://www.docker.com/products/docker-desktop")
    
    # Check for python docker module
    try:
        import docker
        print(f"✅ Python docker module found: {docker.__version__}")
        
        # Check connection to Docker daemon
        try:
            client = docker.from_env()
            client.ping()
            print("✅ Successfully connected to Docker daemon using Python SDK")
            
            # Show some basic Docker info
            info = client.info()
            print(f"  - Docker version: {info.get('ServerVersion', 'unknown')}")
            print(f"  - Total containers: {info.get('Containers', 0)}")
            print(f"  - Running containers: {info.get('ContainersRunning', 0)}")
            print(f"  - Total images: {info.get('Images', 0)}")
            
            # Check if we can create a test container
            print("\n🔍 Testing container creation...")
            try:
                container = client.containers.run("hello-world", remove=True, detach=False)
                print("✅ Successfully ran hello-world test container")
            except Exception as e:
                print(f"❌ Failed to run test container: {str(e)}")
                print("  This may indicate permission issues or resource constraints.")
            
        except Exception as e:
            print(f"❌ Failed to connect to Docker daemon: {e}")
            print("  Make sure Docker is running and accessible")
    except ImportError:
        print("❌ Python docker module not found")
        print("  Please install it with: pip install docker")
    
    print("\n==== Setup Summary ====")
    print("1. Make sure Docker Desktop is installed and running")
    print("2. Ensure Python docker module is installed (pip install docker)")
    print("3. Try running 'docker ps' in a terminal to verify Docker daemon access")
    print("\nTroubleshooting:")
    print("- If Docker daemon shows 'permission denied', restart Docker Desktop or check permissions")
    print("- On Windows, you may need to enable WSL2 for Docker Desktop")
    print("- For Linux users, ensure your user is in the 'docker' group: sudo usermod -aG docker $USER")
    print("- Create test Dockerfile in the 'dockerfiles' directory to verify functionality")
    print("- Check the API at: http://localhost:8000/docker/status for detailed diagnostic info\n")

if __name__ == "__main__":
    setup_docker_environment()
