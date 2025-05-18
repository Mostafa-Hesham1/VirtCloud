# VirtCloud Backend API

This is the backend service for VirtCloud - a comprehensive cloud infrastructure management platform with VM and Docker management capabilities.

## 🚀 Features

- **Authentication**: JWT-based secure authentication system
- **VM Management**: Create, start, stop, and delete virtual machines
- **Disk Management**: Create, resize, convert, and rename virtual disks
- **Docker Integration**: Full Docker management with containers, images, and Dockerfiles
- **Billing System**: Credit-based billing with different subscription plans
- **Usage Statistics**: Runtime statistics and resource monitoring

## 📋 Prerequisites

- Python 3.8+
- MongoDB instance (local or Atlas)
- QEMU installed and configured (for VM functionality)
- Docker installed and running (for container functionality)

## 🔧 Installation

1. Clone the repository
   ```bash
   git clone https://github.com/Mostafa-Hesham1/VirtCloud.git   
   cd VirtCloud/backend
   ```

2. Create and activate a virtual environment
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Linux/macOS
   source venv/bin/activate
   ```

3. Install the required dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with the following variables:
   ```
   # MongoDB connection string - required for database connection
   # Example: mongodb+srv://username:password@cluster.mongodb.net/database
   MONGO_URI="your_mongodb_connection_string"
   
   # Secret key for JWT token generation and validation
   # Must be a secure random string (generate with: openssl rand -hex 32)
   SECRET_KEY="your_secure_random_string"
   
   # JWT token algorithm (HS256 is recommended)
   ALGORITHM=HS256
   
   # JWT token expiration time in minutes
   ACCESS_TOKEN_EXPIRE_MINUTES=90
   ```

5. Start the FastAPI server
   ```bash
   uvicorn main:app --reload
   ```

The API will be available at http://localhost:8000.

## 📁 Directory Structure

- **routers/**: API endpoints organized by functionality
  - `auth.py`: Authentication endpoints
  - `billing.py`: Billing and plan management
  - `docker.py`: Docker management (containers, images, Dockerfiles)
  - `vm.py`: Main VM endpoints
  - `vm_disk.py`: VM disk management
  - `vm_management.py`: VM lifecycle operations
  - `vm_stats.py`: VM statistics and monitoring
- **dockerfiles/**: Storage for user-created Dockerfiles
- **store/**: Storage for VM disk images
- **utils/**: Helper utilities for authentication, Docker, and QEMU
- **models/**: Pydantic model definitions

## 🐳 Docker Management

### Setup

Run the Docker setup script to ensure all requirements are met:

```bash
python setup_docker.py
```

### Features

- **Dockerfile Management**: Create, list, edit, and delete Dockerfiles
- **Image Building**: Build Docker images from Dockerfiles
- **Container Management**: Create, start, stop, and delete containers
- **Image Management**: Search, pull, and manage Docker images
- **Status Monitoring**: Track build and pull operations

### Troubleshooting

If experiencing Docker issues:

1. Verify Docker daemon is running:
   ```bash
   python check_docker.py
   ```

2. For more detailed diagnostics:
   ```bash
   python check_docker_detailed.py
   ```

3. Fix Docker image listing issues:
   ```bash
   python fix_docker.py
   ```

## 💾 VM Management

### Prerequisites

- QEMU must be installed and available in your PATH
  - On Windows: Install from [QEMU for Windows](https://www.qemu.org/download/#windows)
  - On Linux: `sudo apt install qemu-kvm qemu-utils`

### Features

- **Disk Operations**: Create, resize, and convert disk images
- **VM Lifecycle**: Create, start, stop, and delete VMs
- **Resource Management**: Adjust CPU and memory allocation
- **Runtime Monitoring**: Track VM usage and calculate costs

## 💰 Billing System

VirtCloud uses a credit-based billing system with different subscription plans:

- **Free Plan**: 15 monthly credits, basic limits
- **Pro Plan**: 150 monthly credits, higher resource limits
- **Unlimited Plan**: 600 monthly credits, maximum resource access
- **Pay-as-you-Go**: 0 base credits, pay per use

Resource pricing:
- **Base Cost**: 0.5 credits/hour for each VM
- **CPU**: 0.2 credits/core/hour
- **RAM**: 0.1 credits/GB/hour
- **Disk**: 0.05 credits/GB (one-time creation cost)

## 🔒 Authentication

VirtCloud uses JWT (JSON Web Tokens) for secure authentication:

1. **User Registration**: `/auth/signup` (email, username, password)
2. **User Login**: `/auth/login` (returns JWT token)
3. **Protected Endpoints**: Include token in Authorization header (`Bearer <token>`)
4. **User Details**: `/auth/me` returns current user info and validates token

## 🔍 Monitoring & Diagnostics

- Use the `/vm/stats/runtime` endpoint to monitor VM usage and costs
- Docker build and pull status is tracked and can be monitored through the API
- Credit transactions are logged in the database for billing transparency

## ⚠️ Important Notes

1. Make sure the `store` and `dockerfiles` directories exist and have proper permissions
2. For Docker functionality, the Docker daemon must be running and accessible
3. For VM functionality, QEMU must be properly installed and configured
4. The MongoDB connection string in `.env` must point to a valid MongoDB instance

## 🛠️ Development

### API Documentation

When running the server, Swagger UI documentation is available at:
- http://localhost:8000/docs
- http://localhost:8000/redoc (alternative format)

### Adding New Features

1. Create new route handlers in the appropriate files under `routers/`
2. Update the `main.py` file to include any new routers
3. Add appropriate database models and schema validation
4. Implement proper authentication and error handling

## 🐞 Troubleshooting

- **MongoDB Connection Issues**: Verify your connection string and network connectivity
- **Docker API Errors**: Ensure Docker daemon is running with `docker info` command
- **QEMU Errors**: Check if QEMU is properly installed and in your PATH
- **JWT Errors**: Make sure SECRET_KEY is properly set in your `.env` file
- **Permission Issues**: Ensure the store and dockerfiles directories are writable

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For issues, questions, please open an issue on the GitHub repository.