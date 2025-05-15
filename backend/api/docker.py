from fastapi import APIRouter, Depends, HTTPException
from docker import DockerClient

router = APIRouter()
client = DockerClient()

# ...existing code...

# Add this new endpoint (or modify an existing one) to support command-style container creation
@router.post("/container/run")
async def run_container(
    container_data: dict, 
    current_user: str = Depends(get_current_user)
):
    """Run a container using command-style format (directly mimics CLI behavior)"""
    try:
        # Check if this is a command-style request
        if container_data.get("command_style"):
            # Extract the data we need
            image = container_data.get("image")
            name = container_data.get("name")
            ports = container_data.get("ports", [])
            
            port_bindings = {}
            exposed_ports = {}
            
            # Process port mappings
            for port_mapping in ports:
                if ":" in port_mapping:
                    host_port, container_port = port_mapping.split(":")
                    container_port = f"{container_port}/tcp"
                    port_bindings[container_port] = [{"HostPort": host_port}]
                    exposed_ports[container_port] = {}
            
            # Create container with Docker API directly (mimicking CLI behavior)
            container = client.containers.run(
                image=image,
                name=name,
                detach=True,
                ports=port_bindings,
                restart_policy={"Name": "unless-stopped"},
                tty=True,
                stdin_open=True
            )
            
            return {
                "status": "success",
                "message": f"Container {name} created and started",
                "id": container.id,
                "name": name
            }
        else:
            # Process regular container creation request
            # ...existing code...
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to run container: {str(e)}"
        )

# ...existing code...