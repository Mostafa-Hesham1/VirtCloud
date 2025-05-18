# VirtCloud Frontend

![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react)
![Material UI](https://img.shields.io/badge/Material%20UI-7.0.2-007FFF?style=for-the-badge&logo=mui)
![axios](https://img.shields.io/badge/axios-1.8.4-5A29E4?style=for-the-badge)
![React Router](https://img.shields.io/badge/React%20Router-6.30.0-CA4245?style=for-the-badge&logo=react-router)

This repository contains the frontend application for VirtCloud - a comprehensive cloud infrastructure management platform with VM and Docker management capabilities.

## 🚀 Technologies

VirtCloud frontend leverages modern web technologies:

- **React** (v19.1.0): Core UI library for building component-based interfaces
- **Material UI** (v7.0.2): Complete design system with pre-built components
- **React Router** (v6.30.0): Client-side routing for single-page applications
- **Axios** (v1.8.4): Promise-based HTTP client for API requests
- **CodeMirror** (v5.65.2): Versatile text editor for the Dockerfile editor
- **React Context API**: State management across components
- **Testing Libraries**: Jest, React Testing Library for component testing

## 📂 Project Structure

The frontend is organized into the following structure:

```
frontend/
├── public/            # Static assets
├── src/
│   ├── api/           # API client modules
│   │   ├── auth.js    # Authentication API calls
│   │   ├── docker.js  # Docker management API calls
│   │   └── vm.js      # VM management API calls
│   ├── components/    # Reusable UI components
│   │   ├── docker/    # Docker management components
│   │   │   ├── BuildStatusDisplay.js   # Docker build status UI
│   │   │   ├── ContainerPanel.js       # Container management UI
│   │   │   ├── DockerfilePanel.js      # Dockerfile management UI
│   │   │   ├── ImagePanel.js           # Docker image management UI
│   │   │   └── RunContainerDialog.js   # Container creation dialog
│   │   ├── CreateDiskForm.js     # VM disk creation form
│   │   ├── CreateVMForm.js       # VM creation form
│   │   ├── LoginForm.js          # Authentication form
│   │   ├── Navbar.js             # Application navigation
│   │   └── PlanCard.js           # Subscription plan card
│   ├── context/        # React context providers
│   │   ├── DockerContext.js      # Docker state management
│   │   ├── ThemeContext.js       # Theme customization
│   │   └── UserContext.js        # User authentication state
│   ├── pages/          # Page components
│   │   ├── Dashboard.js          # Main dashboard
│   │   ├── Docker.js             # Docker management page
│   │   ├── LoginPage.js          # Login page
│   │   ├── CreateVmPage.jsx      # VM creation page
│   │   ├── HomePage.jsx          # Landing page
│   │   ├── PlansPage.js          # Subscription plans
│   │   ├── SignupPage.jsx        # Registration page
│   │   └── VmMonitorPage.jsx     # VM monitoring page
│   ├── services/       # Business logic services
│   │   ├── authService.js        # Authentication logic
│   │   └── billingService.js     # Billing operations
│   ├── styles/         # Global styles and theme configuration
│   │   └── theme.js              # Material UI theme customization
│   ├── App.js          # Application root component
│   └── index.js        # Entry point
└── package.json        # Dependencies and scripts
```

## 🔧 Installation & Setup

1. Clone the repository
   ```bash
   git clone https://github.com/Mostafa-Hesham1/virtcloud-frontend.git   
   cd virtcloud-frontend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory
   ```
   REACT_APP_API_URL=http://localhost:8000
   REACT_APP_AUTH_STORAGE_KEY=virt_cloud_token
   ```

4. Start the development server
   ```bash
   npm start
   ```

The application will be available at http://localhost:3000.

## 📜 Available Scripts

In the project directory, you can run:

- `npm start` - Runs the app in the development mode. Open http://localhost:3000 to view it in your browser. The page will reload when you make changes.

- `npm test` - Launches the test runner in the interactive watch mode. See the section about running tests for more information.

- `npm run build` - Builds the app for production to the build folder. It correctly bundles React in production mode and optimizes the build for the best performance. The build is minified and the filenames include the hashes.

## 🌈 Features

### 🔐 Authentication
- User registration and login
- JWT token-based authentication
- Protected routes for authenticated users

### 📊 Dashboard
- Overview of all cloud resources
- Usage statistics and billing information
- Quick access to VM and Docker management

### 💻 VM Management
- Create, start, stop, and delete virtual machines
- Disk management (create, resize, convert)
- Performance monitoring

### 🐳 Docker Management
- Dockerfile Management: Create, edit, and delete Dockerfiles
- Image Building: Build Docker images from Dockerfiles with live logs
- Container Management: Create, start, stop, and delete containers
- Image Management: Search, pull, and manage Docker images
- Status Monitoring: Track build and pull operations

### 💰 Subscription Plans
- View and manage subscription plans
- Credit usage monitoring
- Plan upgrade/downgrade options

## 🎨 UI Components

VirtCloud uses Material UI v7 components to create a consistent, responsive UI:

- MUI Components: AppBar, Drawer, Card, Button, TextField, Dialog, etc.
- Custom Components: Custom-styled MUI components for specialized functionality
- Layout Components: Responsive layouts for different screen sizes

Docker-specific Components:
- DockerfilePanel: Create and manage Dockerfiles
- ImagePanel: Browse, search, and pull Docker images
- ContainerPanel: Control running containers
- BuildStatusDisplay: Monitor Docker image build progress
- RunContainerDialog: Configure and launch Docker containers

## 🔌 API Integration

The frontend communicates with the backend via RESTful APIs:
- Axios is used for HTTP requests
- API calls are organized by domain (auth, docker, vm)
- JWT tokens are included in request headers for authentication
- Real-time updates for long-running operations


## 🔒 Environment Variables

The following environment variables can be configured:

| Variable | Description | Default |
|----------|-------------|---------|
| REACT_APP_API_URL | Backend API URL | http://localhost:8000 |
| REACT_APP_AUTH_STORAGE_KEY | LocalStorage key for auth token | virt_cloud_token |



## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
