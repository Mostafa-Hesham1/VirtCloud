# <img src="frontend/public/Logo.png" alt="VirtCloud Logo" width="40"/> VirtCloud

> 🚀 A Web-Based Virtual Machine Management System

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Material UI](https://img.shields.io/badge/Material%20UI-007FFF?style=for-the-badge&logo=mui&logoColor=white)](https://mui.com/)
[![QEMU](https://img.shields.io/badge/QEMU-FF6600?style=for-the-badge&logo=qemu&logoColor=white)](https://www.qemu.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)


## 🎥 Project Demo

<div align="center">
  <video width="100%" controls>
    <source src="Project-Video/FInal_Cloud_Vid.mp4" type="video/mp4">
    Your browser does not support the video tag. You can <a href="Project-Video/FInal_Cloud_Vid.mp4">download the video</a> instead.
  </video>
</div>

*If the video doesn't play above, you can [download the full demo video](Project-Video/FInal_Cloud_Vid.mp4).*

## 📚 Documentation

- [**User Manual**](Docs/userManual.pdf) - Complete guide on how to use all VirtCloud features
- [**Project and Testing Report**](Docs/Project%20and%20Testing%20Report%20(3).pdf) - Technical documentation, architecture and test results

## ✨ Features

### 💽 Disk Management
- **Create Virtual Disks** in multiple formats (QCOW2, RAW, VHDX, VMDK, VDI)
- **Resize Disks** to accommodate growing storage needs
- **Convert Disks** between different formats while preserving data
- **View Detailed Information** about your disks including usage and format specifics
- **Rename Disks** to keep your workspace organized

### 🖥️ Virtual Machine Management
- **Launch Linux VMs** with ISO support for OS installation
- **Stop and Start VMs** on demand
- **Monitor VM Performance** and resource usage in real-time
- **Edit VM Resources** (CPU, RAM) when VMs are stopped
- **Delete VMs** when no longer needed

### 👤 User Management
- **Secure Authentication** using JWT tokens
- **User Dashboard** with overview of all resources
- **Plan Management** with ability to switch between different subscription tiers

### 💳 Billing & Credits
- **Dynamic Billing** via credit model with per-resource pricing
- **Usage Tracking** with detailed cost breakdowns
- **Plan Restrictions** based on user subscription level
- **Credit Deduction** in real-time as resources are used

### 🐳 Docker Management
- **Dockerfile Management**: Create, list, edit, and delete Dockerfiles
- **Image Building**: Build images from your Dockerfiles with real-time build logs
- **Container Management**: Create, start, stop, and delete containers
- **Image Management**: Search, pull, and manage Docker images
- **Status Monitoring**: Track build and pull operations

## 🧰 Tech Stack

### Frontend
- **React**: Component-based UI development
- **Material UI**: Modern, responsive component library
- **Axios**: HTTP client for API requests
- **Context API**: State management across components

### Backend
- **FastAPI**: Modern, high-performance Python web framework
- **JWT**: JSON Web Tokens for authentication
- **PyMongo**: MongoDB integration for Python
- **QEMU Command Wrappers**: Python interfaces to QEMU virtualization tools
- **Docker**: Container management

### Database
- **MongoDB**: NoSQL database for flexible, document-based storage

### Virtualization
- **QEMU/KVM**: Open-source machine emulator and virtualizer
- **Docker**: Container integration

## 💳 Plans & Credit System

VirtCloud operates on a credit-based billing system where different subscription plans offer varying resource limitations and benefits.

### Plan Tiers

| Plan | Price | Monthly Credits | CPU Limit | RAM Limit | Disk Limit |
|------|-------|----------------|-----------|-----------|------------|
| 🟢 **Free** | $0 | 15 credits | 2 cores | 2 GB | 20 GB |
| 🔵 **Pro** | $9 | 150 credits | 4 cores | 8 GB | 50 GB |
| 🟣 **Unlimited** | $29 | 600 credits | 8 cores | 16 GB | 200 GB |
| 🔥 **Pay-As-You-Go** | $0 base | 0 (pay per use) | 8 cores | 16 GB | 200 GB |

### Resource Pricing

- **Base Cost**: 0.5 credits/hour for each VM
- **CPU**: 0.2 credits/core/hour
- **RAM**: 0.1 credits/GB/hour
- **Disk**: 0.05 credits/GB (one-time creation cost)

### Credit System Details

- **Credit Value**: 1 credit = $0.50
- **Credit Deduction**: Automatically calculated and deducted while VMs are running
- **Plan Switching**: Users can upgrade or downgrade their plan at any time
- **Credit Purchase**: Pay-as-you-go users can purchase additional credits when needed

## 🚀 Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- MongoDB instance (local or Atlas)
- QEMU installed and configured
- Docker installed and running

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Mostafa-Hesham1/VirtCloud.git
   cd VirtCloud/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Linux/MacOS
   source venv/bin/activate
   ```

3. Install dependencies using the `requirements.txt` file:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with the following content:
   ```
   SECRET_KEY="your_secret_key_here"
   DB_URL="mongodb://localhost:27017" # or your MongoDB Atlas URL
   ```

5. Ensure QEMU is installed and available in your PATH:
   - On Windows: Install from [QEMU for Windows](https://www.qemu.org/download/#windows)
   - On Linux: `sudo apt install qemu-kvm qemu-utils`

6. Ensure Docker daemon is running:
   ```bash
   docker info
   ```

7. Verify the Python Docker SDK is installed:
   ```bash
   pip install docker
   ```

8. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   REACT_APP_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Access the application at http://localhost:3000

## 🔐 Authentication Guide

VirtCloud uses JWT (JSON Web Tokens) for secure authentication.

### Authentication Flow

1. **User Registration**:
   - Users register with email, username, and password
   - Passwords are securely hashed using bcrypt

2. **User Login**:
   - On successful login, a JWT token is generated and returned
   - Token includes user data such as email, plan, and role
   - Frontend stores token in localStorage

3. **Protected Endpoints**:
   - Protected API endpoints require valid JWT tokens
   - Token is sent in the Authorization header format: `Bearer <token>`

4. **Token Verification**:
   - Backend verifies token signature and expiration
   - Decoded user data is available in the request context

5. **Token Refresh**:
   - The `/auth/me` endpoint validates tokens and returns current user information
   - Frontend can use this to verify session validity

## 🧪 Testing & API Documentation

All backend endpoints are documented using Swagger UI and available at `/docs` when running the backend server.

### Example API Requests

#### Create a Disk
```json
POST /vm/create-disk
{
  "name": "ubuntu_disk",
  "size": "10G",
  "format": "qcow2"
}
```

#### Resize a Disk
```json
POST /vm/resize-disk
{
  "name": "ubuntu_disk.qcow2",
  "resize_by": "+5G"
}
```

#### Launch a VM
```json
POST /vm/create-vm
{
  "disk_name": "ubuntu_disk.qcow2",
  "iso_path": "C:\\path\\to\\ubuntu.iso",
  "memory_mb": 2048,
  "cpu_count": 2,
  "display": "sdl"
}
```

#### User Authentication
```json
POST /auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

## 🐳 Docker Management Features

VirtCloud provides comprehensive Docker management capabilities, allowing you to work with containers, images, and Dockerfiles through an intuitive UI.

### 🔍 Prerequisites for Docker Features

- **Docker Engine**: Must be installed and running on the host machine
- **Docker API**: The Docker daemon must be accessible to the backend service
- **Docker Python SDK**: Included in the requirements.txt

### 🔧 Docker Backend Configuration

The Docker functionality is implemented in `backend/routers/docker.py` and provides the following API endpoints:

- **Dockerfile Management**: Create, list, edit, and delete Dockerfiles
- **Image Building**: Build images from your Dockerfiles with real-time build logs
- **Container Management**: Create, start, stop, and delete containers
- **Image Management**: Search, pull, and manage Docker images
- **Status Monitoring**: Track build and pull operations

To ensure Docker features work correctly:

1. Make sure Docker daemon is running:
   ```bash
   docker info
   ```

2. Verify the Python Docker SDK is installed:
   ```bash
   pip install docker
   ```

3. If you're running in a restricted environment, you might need to add your user to the Docker group:
   ```bash
   sudo usermod -aG docker $USER
   ```

### 💻 Docker Frontend Components

The Docker UI is composed of several components:

- **DockerfilePanel**: Create and manage Dockerfiles, build images
- **ImagePanel**: View, search, pull, and manage Docker images
- **ContainerPanel**: Control Docker containers from a central interface

### 🚀 Using Docker Features

1. **Creating Dockerfiles**:
   - Navigate to the Dockerfiles tab
   - Click "Create Dockerfile"
   - Enter name, content, and optional description
   - Click Create

2. **Building Images**:
   - In the Dockerfiles tab, find your Dockerfile
   - Click the Build icon
   - Enter image name and tag
   - Click "Build Image"
   - Monitor build progress in the Build Status tab

3. **Managing Containers**:
   - In the Images tab, click "Run Container" on any image
   - Configure container settings (name, ports, etc.)
   - Click "Run Container"
   - Use the Containers tab to start, stop, or delete containers

4. **Pulling Images**:
   - In the Images tab, click "Pull Image"
   - Enter the image name (e.g., nginx:latest)
   - Click "Pull Image"
   - Monitor pull progress in the Pull Status tab

5. **Searching Images**:
   - Use the search box to find images locally or on Docker Hub
   - Toggle between local and Docker Hub search
   - Click the Pull icon to download found images

## 👤 Author & Acknowledgments

Developed as part of the Cloud Computing course at MSA University.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<p align="center">© 2025 VirtCloud - A Cloud Computing Course Project</p>
