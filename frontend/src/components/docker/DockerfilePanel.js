import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, TableContainer, Table, TableHead, TableBody, 
  TableRow, TableCell, IconButton, Tooltip, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, CircularProgress, Alert, Chip,
  TablePagination, Divider, Card, CardContent, Tabs, Tab, LinearProgress
} from '@mui/material';
import { useDocker } from '../../context/DockerContext';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/dockerfile/dockerfile';

// Icons
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';

// Import the BuildStatusDisplay component
import BuildStatusDisplay from './BuildStatusDisplay';

// Add TabPanel component definition if it's not imported from elsewhere
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DockerfilePanel = () => {
  const { 
    dockerfiles, 
    loading, 
    errors, 
    createDockerfile, 
    updateDockerfile, 
    buildImage, 
    refreshDockerResources, 
    deleteDockerfile 
  } = useDocker();
  
  // State for data management
  const [operationResult, setOperationResult] = useState(null);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [dockerfileContent, setDockerfileContent] = useState(`FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  
  // State for view/edit dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDockerfile, setSelectedDockerfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  
  // State for build dialog
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);
  const [imageName, setImageName] = useState('');
  const [imageTag, setImageTag] = useState('latest');
  const [isBuildLoading, setIsBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState(null);
  const [buildTag, setBuildTag] = useState('');
  const [buildLoading, setBuildLoading] = useState(false);
  
  // State for delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  
  // State for copy dialog
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState(null);
  
  // State for tab management
  const [tabValue, setTabValue] = useState(0);
  const [buildStatus, setBuildStatus] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // CodeMirror options
  const codeMirrorOptions = {
    mode: 'dockerfile',
    theme: 'material',
    lineNumbers: true,
    lineWrapping: true,
    viewportMargin: Infinity,
    indentWithTabs: false,
    tabSize: 2,
    indentUnit: 2,
    styleActiveLine: true
  };
  
  // Filter dockerfiles based on search query
  useEffect(() => {
    if (!dockerfiles) {
      setFilteredFiles([]);
      return;
    }
    
    if (!searchQuery) {
      setFilteredFiles(dockerfiles);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    setFilteredFiles(
      dockerfiles.filter(file => 
        file.name.toLowerCase().includes(lowerQuery) || 
        (file.description && file.description.toLowerCase().includes(lowerQuery))
      )
    );
  }, [dockerfiles, searchQuery]);
  
  // Handle pagination change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle create dialog open
  const handleCreateDialogOpen = () => {
    setFileName('');
    setFileDescription('');
    setDockerfileContent(`FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`);
    setCreateError(null);
    setCreateDialogOpen(true);
  };
  
  // Handle create dialog close
  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };
  
  // Handle create Dockerfile
  const handleCreateDockerfile = async () => {
    if (!fileName.trim()) {
      setCreateError('Filename is required');
      return;
    }
    
    setIsCreating(true);
    setCreateError(null);
    
    try {
      await createDockerfile(fileName, dockerfileContent, fileDescription);
      setCreateDialogOpen(false);
      setOperationResult({
        success: true,
        message: `Dockerfile "${fileName}" created successfully!`
      });
      refreshDockerResources();
    } catch (error) {
      setCreateError(error.message || 'Failed to create Dockerfile');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle view dialog open
  const handleViewDialogOpen = (dockerfile, edit = false) => {
    setSelectedDockerfile(dockerfile);
    setEditContent(dockerfile.content);
    setIsEditing(edit);
    setEditError(null);
    setViewDialogOpen(true);
  };
  
  // Handle view dialog close
  const handleViewDialogClose = () => {
    setViewDialogOpen(false);
  };
  
  // Handle toggle edit mode
  const handleToggleEditMode = () => {
    setIsEditing(!isEditing);
  };
  
  // Handle save edit
  const handleSaveEdit = async () => {
    setIsEditLoading(true);
    setEditError(null);
    
    try {
      await updateDockerfile(selectedDockerfile.name, editContent, selectedDockerfile.description);
      setViewDialogOpen(false);
      setOperationResult({
        success: true,
        message: `Dockerfile "${selectedDockerfile.name}" updated successfully!`
      });
      refreshDockerResources();
    } catch (error) {
      setEditError(error.message || 'Failed to update Dockerfile');
    } finally {
      setIsEditLoading(false);
    }
  };
  
  // Handle build dialog open
  const handleBuildDialogOpen = (dockerfile) => {
    setSelectedDockerfile(dockerfile);
    setImageName(dockerfile.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    setImageTag('latest');
    setBuildError(null);
    setBuildDialogOpen(true);
  };
  
  // Handle build dialog close
  const handleBuildDialogClose = () => {
    setBuildDialogOpen(false);
  };
  
  // Enhance the handleBuildImage function to detect common issues
  const handleBuildImage = async () => {
    if (!selectedDockerfile) return;
    
    // First check the Dockerfile content for common issues
    const content = selectedDockerfile.content || '';
    
    // Check for Node.js without package.json
    const isNodeImage = content.includes('FROM node:') || content.includes('FROM node.');
    const hasCopyAll = content.includes('COPY . .');
    const hasNpmInstall = content.includes('RUN npm install');
    
    if (isNodeImage && hasCopyAll && hasNpmInstall) {
      const createPackageJson = window.confirm(
        "This appears to be a Node.js Dockerfile that runs 'npm install', but no package.json file may exist in the build context.\n\n" +
        "Would you like to create a minimal package.json file before building?"
      );
      
      if (createPackageJson) {
        // Let's show a dialog or alert with instructions on how to create package.json
        alert(
          "To fix the build, you need to create a package.json file in the same directory as your Dockerfile.\n\n" +
          "Example content for package.json:\n" +
          "{\n" +
          '  "name": "docker-node-app",\n' +
          '  "version": "1.0.0",\n' +
          '  "description": "Simple Node.js app",\n' +
          '  "main": "index.js",\n' +
          '  "scripts": {\n' +
          '    "start": "node index.js"\n' +
          '  }\n' +
          "}\n\n" +
          "After creating this file, try building again."
        );
        return;
      }
    }
    
    // Continue with normal validation and build process
    if (!buildTag.trim()) {
      setBuildError('Tag is required');
      return;
    }
    
    if (!imageName.trim()) {
      setBuildError('Image name is required');
      return;
    }
    
    // Validate tag format to prevent invalid formats
    if (buildTag.includes(':')) {
      setBuildError('Tag should not contain colon (:) characters. Enter only the version part (e.g., "1.0" or "latest")');
      return;
    }
    
    setBuildLoading(true);
    setBuildError(null);
    
    try {
      console.log(`Building image from Dockerfile: ${selectedDockerfile.name}`);
      console.log(`Using name: ${imageName} and tag: ${buildTag}`);
      
      // Format the tag properly - don't include image name in the tag
      const formattedTag = buildTag.trim();
      
      // Include both image_name and tag (but not combined) in the build data
      const buildData = {
        dockerfile_name: selectedDockerfile.name,
        tag: formattedTag,
        image_name: imageName.trim()
      };
      
      const result = await buildImage(buildData);
      console.log('Build started:', result);
      
      // Store the build ID to check the status later
      const buildId = result.build_id;
      
      // Close dialog and show success message
      setBuildDialogOpen(false);
      setSelectedDockerfile(null);
      setBuildTag('');
      setImageName('');
      
      setOperationResult({
        success: true,
        message: `Image build started for ${imageName.trim()}:${formattedTag}`,
        // Add instructions to check the build tab
        details: `You can check the build status in the Builds tab. Build ID: ${buildId}`
      });
      
      // Automatically switch to the builds tab to show progress
      setTabValue(1); // Assuming tab index 1 is the Build Status tab
    } catch (err) {
      console.error('Error in handleBuildImage:', err);
      
      // Enhanced error handling for specific build errors
      let errorMessage = 'Failed to build image';
      
      if (err.message && err.message.includes('file not found')) {
        errorMessage = 'Build failed: Missing file in the build context. You need to ensure all files referenced in COPY commands exist.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setBuildError(errorMessage);
    } finally {
      setBuildLoading(false);
    }
  };

  // Add a function to format build logs for better display
  const formatBuildLog = (log) => {
    if (!log) return '';
    
    // Handle color codes in logs (replace ANSI color codes with CSS)
    let formattedLog = log;
    
    // Replace ANSI color codes for errors (red text)
    if (log.includes('\u001b[91m')) {
      formattedLog = formattedLog.replace(/\u001b\[91m/g, '<span style="color: red;">');
      formattedLog = formattedLog.replace(/\u001b\[0m/g, '</span>');
    }
    
    // Add extra formatting for warnings and errors
    if (log.includes('WARN') || log.includes('WARNING')) {
      formattedLog = `<span style="color: orange;">${formattedLog}</span>`;
    }
    if (log.includes('ERROR') || log.includes('failed')) {
      formattedLog = `<span style="color: red;">${formattedLog}</span>`;
    }
    
    return formattedLog;
  };

  // Handle delete dialog open
  const handleDeleteDialogOpen = (dockerfile) => {
    setSelectedDockerfile(dockerfile);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };
  
  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };
  
  // Handle delete Dockerfile
  const handleDeleteDockerfile = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await deleteDockerfile(selectedDockerfile.name);
      setDeleteDialogOpen(false);
      setOperationResult({
        success: true,
        message: `Dockerfile "${selectedDockerfile.name}" deleted successfully!`
      });
      refreshDockerResources();
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete Dockerfile');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle copy dialog open
  const handleCopyDialogOpen = (dockerfile) => {
    setSelectedDockerfile(dockerfile);
    setNewFileName(`${dockerfile.name}-copy`);
    setCopyError(null);
    setCopyDialogOpen(true);
  };
  
  // Handle copy dialog close
  const handleCopyDialogClose = () => {
    setCopyDialogOpen(false);
  };
  
  // Handle copy Dockerfile
  const handleCopyDockerfile = async () => {
    if (!newFileName.trim()) {
      setCopyError('New filename is required');
      return;
    }
    
    setIsCopying(true);
    setCopyError(null);
    
    try {
      await createDockerfile(
        newFileName, 
        selectedDockerfile.content, 
        `Copy of ${selectedDockerfile.description || selectedDockerfile.name}`
      );
      setCopyDialogOpen(false);
      setOperationResult({
        success: true,
        message: `Dockerfile copied successfully as "${newFileName}"!`
      });
      refreshDockerResources();
    } catch (error) {
      setCopyError(error.message || 'Failed to copy Dockerfile');
    } finally {
      setIsCopying(false);
    }
  };
  
  // Add a function to handle fixing Dockerfile issues
  const handleFixDockerfile = (dockerfileName) => {
    const dockerfile = dockerfiles.find(df => df.name === dockerfileName);
    if (dockerfile) {
      console.log(`Opening Dockerfile ${dockerfileName} for editing to fix build errors`);
      setSelectedDockerfile(dockerfile);
      setEditDialogOpen(true);
      
      // Suggest a fix by modifying the Dockerfile content
      const updatedContent = dockerfile.content
        .split('\n')
        .map(line => {
          // Comment out problematic COPY commands for index.html
          if (line.includes('COPY ./index.html')) {
            return `# ${line} \n# ERROR: This file doesn't exist in the build context\n# Either create this file or modify this line`;
          }
          return line;
        })
        .join('\n');
      
      // Set the modified content in the edit form
      setEditContent(updatedContent);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Dockerfiles
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={refreshDockerResources}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateDialogOpen}
          >
            Create Dockerfile
          </Button>
        </Box>
      </Box>
      
      {/* Search and Filter */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          label="Search Dockerfiles"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>🔍</Box>,
          }}
          placeholder="Filter by name or description..."
        />
      </Box>
      
      {/* Operation Result Alert */}
      {operationResult && (
        <Alert 
          severity={operationResult.success ? "success" : "error"}
          sx={{ mb: 3 }}
          onClose={() => setOperationResult(null)}
        >
          {operationResult.message}
        </Alert>
      )}

      {/* Loading, Error, or Empty States */}
      {loading.dockerfiles ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : errors.dockerfiles ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors.dockerfiles}
        </Alert>
      ) : filteredFiles.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" paragraph>
            {searchQuery ? "No Dockerfiles match your search." : "No Dockerfiles found. Click the \"Create Dockerfile\" button to get started."}
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateDialogOpen}
          >
            Create Dockerfile
          </Button>
        </Paper>
      ) : (
        // Dockerfiles Table
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell><strong>Updated</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFiles
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((dockerfile) => (
                    <TableRow key={dockerfile._id} hover>
                      <TableCell>{dockerfile.name}</TableCell>
                      <TableCell>{dockerfile.description || '-'}</TableCell>
                      <TableCell>{new Date(dockerfile.created_at).toLocaleString()}</TableCell>
                      <TableCell>{new Date(dockerfile.updated_at).toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Tooltip title="View Dockerfile">
                            <IconButton 
                              size="small" 
                              color="info" 
                              onClick={() => handleViewDialogOpen(dockerfile)}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Dockerfile">
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={() => handleViewDialogOpen(dockerfile, true)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Build Image">
                            <IconButton 
                              size="small" 
                              color="success" 
                              onClick={() => handleBuildDialogOpen(dockerfile)}
                            >
                              <BuildIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Duplicate Dockerfile">
                            <IconButton 
                              size="small" 
                              color="secondary" 
                              onClick={() => handleCopyDialogOpen(dockerfile)}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Dockerfile">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleDeleteDialogOpen(dockerfile)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <TablePagination
            component="div"
            count={filteredFiles.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </>
      )}

      {/* Create Dockerfile Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={handleCreateDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Dockerfile</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            margin="normal"
            helperText="Enter name without extension (e.g., 'nodejs-app')"
          />
          <TextField
            label="Description (Optional)"
            fullWidth
            value={fileDescription}
            onChange={(e) => setFileDescription(e.target.value)}
            margin="normal"
          />
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Dockerfile Content
          </Typography>
          <Paper variant="outlined" sx={{ height: 400 }}>
            <CodeMirror
              value={dockerfileContent}
              options={codeMirrorOptions}
              onBeforeChange={(editor, data, value) => {
                setDockerfileContent(value);
              }}
              editorDidMount={editor => {
                setTimeout(() => {
                  editor.refresh();
                }, 100);
              }}
            />
          </Paper>
          {createError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {createError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateDockerfile} 
            variant="contained" 
            color="primary"
            disabled={isCreating}
          >
            {isCreating ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View/Edit Dockerfile Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={handleViewDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>
              {isEditing ? 'Edit' : 'View'} Dockerfile: {selectedDockerfile?.name}
            </Typography>
            {!isEditing ? (
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={handleToggleEditMode}
              >
                Edit
              </Button>
            ) : (
              <Chip label="Editing Mode" color="primary" />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDockerfile && (
            <>
              {!isEditing && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Created: {new Date(selectedDockerfile.created_at).toLocaleString()}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Last Modified: {new Date(selectedDockerfile.updated_at).toLocaleString()}
                    </Typography>
                    {selectedDockerfile.description && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" color="text.secondary">
                          Description:
                        </Typography>
                        <Typography>{selectedDockerfile.description}</Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
              
              <Paper variant="outlined" sx={{ height: 500 }}>
                <CodeMirror
                  value={editContent}
                  options={{
                    ...codeMirrorOptions,
                    readOnly: !isEditing
                  }}
                  onBeforeChange={(editor, data, value) => {
                    if (isEditing) {
                      setEditContent(value);
                    }
                  }}
                  editorDidMount={editor => {
                    setTimeout(() => {
                      editor.refresh();
                    }, 100);
                  }}
                />
              </Paper>
              
              {editError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {editError}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleViewDialogClose}>
            {isEditing ? 'Cancel' : 'Close'}
          </Button>
          {isEditing && (
            <Button 
              onClick={handleSaveEdit} 
              variant="contained" 
              color="primary"
              disabled={isEditLoading}
            >
              {isEditLoading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Build Image Dialog */}
      {buildDialogOpen && selectedDockerfile && (
        <Dialog open={buildDialogOpen} onClose={handleBuildDialogClose}>
          <DialogTitle>Build Docker Image</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Dockerfile: {selectedDockerfile.name}
            </Typography>
            
            {/* Add image name field */}
            <TextField
              label="Image Name"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              fullWidth
              required
              margin="normal"
              placeholder="e.g., nginx, myapp"
              helperText="Name for the Docker image (required)"
              error={!!buildError && buildError.includes('name')}
              disabled={buildLoading}
            />
            
            {/* Keep the tag field */}
            <TextField
              label="Tag"
              value={buildTag}
              onChange={(e) => setBuildTag(e.target.value)}
              fullWidth
              required
              margin="normal"
              placeholder="e.g., latest, v1.0"
              helperText="Tag for the Docker image (required)"
              error={!!buildError && buildError.includes('tag')}
              disabled={buildLoading}
            />
            
            {buildError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {typeof buildError === 'string' ? buildError : 'An error occurred during the build process'}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBuildDialogClose} disabled={buildLoading}>Cancel</Button>
            <Button 
              onClick={handleBuildImage} 
              color="primary" 
              variant="contained"
              disabled={buildLoading || !buildTag.trim() || !imageName.trim()}
            >
              {buildLoading ? <CircularProgress size={24} /> : 'Build Image'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Delete Dockerfile Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleDeleteDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Dockerfile</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to delete the Dockerfile <strong>{selectedDockerfile?.name}</strong>?
          </Typography>
          <Typography color="error" variant="body2">
            This action cannot be undone. All build history will be preserved.
          </Typography>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteDockerfile} 
            variant="contained" 
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Copy Dockerfile Dialog */}
      <Dialog 
        open={copyDialogOpen} 
        onClose={handleCopyDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Duplicate Dockerfile</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Create a copy of <strong>{selectedDockerfile?.name}</strong>
          </Typography>
          <TextField
            label="New Dockerfile Name"
            fullWidth
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            margin="normal"
            helperText="Enter name for the copy (without extension)"
          />
          {copyError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {copyError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCopyDockerfile} 
            variant="contained" 
            color="primary"
            disabled={isCopying}
          >
            {isCopying ? <CircularProgress size={24} /> : 'Create Copy'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tabs for Dockerfiles and Build Status */}
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label="Dockerfiles" />
        <Tab label="Build Status" />
      </Tabs>
      
      <TabPanel value={tabValue} index={0}>
        {/* Dockerfiles tab content */}
        {/* ...existing code... */}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>Build Status</Typography>
        
        {Object.keys(buildStatus || {}).length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ p: 3 }}>
            No recent builds found
          </Typography>
        ) : (
          Object.entries(buildStatus || {}).map(([buildId, build]) => (
            <Paper key={buildId} sx={{ 
              p: 2, 
              mb: 2, 
              borderLeft: '4px solid',
              borderColor: build.success ? 'success.main' : 
                         build.success === false ? 'error.main' : 
                         'info.main'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">
                  {build.image_tag || `${build.image_name}:${build.tag}`}
                </Typography>
                <Chip 
                  label={
                    build.success === true ? "Success" : 
                    build.success === false ? "Failed" : 
                    "Building"
                  } 
                  color={
                    build.success === true ? "success" : 
                    build.success === false ? "error" : 
                    "info"
                  }
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Dockerfile:</strong> {build.dockerfile_name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                <strong>Started:</strong> {new Date(build.started_at).toLocaleString()}
              </Typography>
              
              {build.finished_at && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Finished:</strong> {new Date(build.finished_at).toLocaleString()}
                </Typography>
              )}
              
              {build.status === 'building' && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <LinearProgress />
                </Box>
              )}
              
              {/* Display common build errors with helpful messages */}
              {build.success === false && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle1">Build Failed</Typography>
                  
                  {/* Show specific error messages based on log patterns */}
                  {build.logs && build.logs.some(l => l.log && l.log.includes('ENOENT') && l.log.includes('package.json')) && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>Error:</strong> Missing package.json file. This Node.js Dockerfile requires a package.json file.
                      </Typography>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        size="small" 
                        sx={{ mt: 1 }}
                        onClick={() => {
                          // Find the Dockerfile
                          const dockerfile = dockerfiles.find(df => df.name === build.dockerfile_name);
                          if (dockerfile) {
                            // Open it in edit mode
                            setSelectedDockerfile(dockerfile);
                            setEditDialogOpen(true);
                            
                            // Provide a suggested fix
                            alert(
                              "To fix the build, you need to:\n\n" +
                              "1. Create a package.json file in the same directory as your Dockerfile, or\n" +
                              "2. Modify your Dockerfile to not rely on package.json\n\n" +
                              "Example package.json content:\n" +
                              "{\n" +
                              '  "name": "docker-node-app",\n' +
                              '  "version": "1.0.0",\n' +
                              '  "description": "Simple Node.js app",\n' +
                              '  "main": "index.js",\n' +
                              '  "scripts": {\n' +
                              '    "start": "node index.js"\n' +
                              '  }\n' +
                              "}\n"
                            );
                          }
                        }}
                      >
                        Fix Dockerfile
                      </Button>
                    </Box>
                  )}
                </Alert>
              )}
              
              {/* Show build logs in a collapsible panel */}
              {build.logs && build.logs.length > 0 && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Build Logs ({build.logs.length} entries)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box 
                      sx={{ 
                        maxHeight: 300, 
                        overflow: 'auto',
                        bgcolor: 'grey.900',
                        p: 2,
                        borderRadius: 1
                      }}
                    >
                      {build.logs.map((log, index) => (
                        <Typography 
                          key={index} 
                          variant="body2" 
                          component="div"
                          sx={{ 
                            fontFamily: 'monospace', 
                            whiteSpace: 'pre-wrap',
                            color: 'common.white',
                            my: 0.5,
                            fontSize: '0.875rem',
                            '& span': { display: 'inline' } // Ensure spans render properly
                          }}
                          dangerouslySetInnerHTML={{ 
                            __html: log.log ? formatBuildLog(log.log) : '' 
                          }}
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}
            </Paper>
          ))
        )}
      </TabPanel>
    </Box>
  );
};

export default DockerfilePanel;
