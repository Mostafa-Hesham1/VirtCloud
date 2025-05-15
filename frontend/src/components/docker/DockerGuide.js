import React from 'react';
import { 
  Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, List, ListItem, ListItemIcon, ListItemText, Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Icons
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SearchIcon from '@mui/icons-material/Search';

const DockerGuide = () => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Docker Management Guide</Typography>
      <Typography color="text.secondary" paragraph>
        This guide explains all Docker operations available in VirtCloud.
      </Typography>
      
      {/* Dockerfile Management */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Dockerfile Management</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Dockerfiles allow you to define custom Docker images with your specific requirements.
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>Available Operations</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell><strong>Operation</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Icon</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Create Dockerfile</TableCell>
                  <TableCell>Create a new Dockerfile with custom content</TableCell>
                  <TableCell><AddIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>View Dockerfile</TableCell>
                  <TableCell>Examine the content of an existing Dockerfile</TableCell>
                  <TableCell><InfoIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Build Image</TableCell>
                  <TableCell>Build a Docker image from a Dockerfile</TableCell>
                  <TableCell><BuildIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Delete Dockerfile</TableCell>
                  <TableCell>Remove a Dockerfile from your system</TableCell>
                  <TableCell><DeleteIcon fontSize="small" /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="subtitle1" gutterBottom>Creating a Dockerfile</Typography>
          <List dense>
            <ListItem>1. Navigate to the Dockerfiles tab</ListItem>
            <ListItem>2. Click "Create Dockerfile" button</ListItem>
            <ListItem>3. Enter a name for your Dockerfile (without extension)</ListItem>
            <ListItem>4. Add an optional description</ListItem>
            <ListItem>5. Enter the Dockerfile content using the code editor</ListItem>
            <ListItem>6. Click "Create" to save</ListItem>
          </List>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Building an Image</Typography>
          <List dense>
            <ListItem>1. Find your Dockerfile in the list</ListItem>
            <ListItem>2. Click the Build icon</ListItem>
            <ListItem>3. Enter an image name and tag</ListItem>
            <ListItem>4. Click "Build Image"</ListItem>
            <ListItem>5. Monitor the build process in the logs</ListItem>
          </List>
        </AccordionDetails>
      </Accordion>
      
      {/* Docker Images */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Docker Images</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Docker images are the building blocks for containers.
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>Available Operations</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell><strong>Operation</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Icon</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>List Images</TableCell>
                  <TableCell>View all Docker images on your system</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pull Image</TableCell>
                  <TableCell>Download an image from Docker Hub</TableCell>
                  <TableCell><CloudDownloadIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Search Images</TableCell>
                  <TableCell>Search for images locally or on Docker Hub</TableCell>
                  <TableCell><SearchIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Run Container</TableCell>
                  <TableCell>Create and start a container from an image</TableCell>
                  <TableCell><PlayArrowIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Delete Image</TableCell>
                  <TableCell>Remove an image from your system</TableCell>
                  <TableCell><DeleteIcon fontSize="small" /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="subtitle1" gutterBottom>Pulling an Image</Typography>
          <List dense>
            <ListItem>1. In the Images tab, click "Pull Image"</ListItem>
            <ListItem>2. Enter the image name (e.g., "nginx:latest")</ListItem>
            <ListItem>3. Click "Pull Image"</ListItem>
            <ListItem>4. Monitor the pull progress</ListItem>
          </List>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Searching for Images</Typography>
          <List dense>
            <ListItem>1. Enter a search term in the search box</ListItem>
            <ListItem>2. Click "Search Local" to find images on your system</ListItem>
            <ListItem>3. Click "Search DockerHub" to find images online</ListItem>
            <ListItem>4. Click the Pull icon to download found images</ListItem>
          </List>
        </AccordionDetails>
      </Accordion>
      
      {/* Docker Containers */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Docker Containers</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Containers are running instances of Docker images.
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>Available Operations</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell><strong>Operation</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Icon</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>List Containers</TableCell>
                  <TableCell>View all containers (running and stopped)</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>View Details</TableCell>
                  <TableCell>See container configuration and stats</TableCell>
                  <TableCell><InfoIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Start Container</TableCell>
                  <TableCell>Start a stopped container</TableCell>
                  <TableCell><PlayArrowIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Stop Container</TableCell>
                  <TableCell>Stop a running container</TableCell>
                  <TableCell><StopIcon fontSize="small" /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Delete Container</TableCell>
                  <TableCell>Remove a stopped container</TableCell>
                  <TableCell><DeleteIcon fontSize="small" /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="subtitle1" gutterBottom>Creating and Running a Container</Typography>
          <List dense>
            <ListItem>1. Find an image in the Images tab</ListItem>
            <ListItem>2. Click the Run Container icon</ListItem>
            <ListItem>3. Configure options:</ListItem>
            <List dense sx={{ pl: 4 }}>
              <ListItem>- Container name (optional)</ListItem>
              <ListItem>- Port mappings (e.g., 80:8080)</ListItem>
              <ListItem>- Environment variables</ListItem>
            </List>
            <ListItem>4. Click "Run Container"</ListItem>
          </List>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Container Management</Typography>
          <List dense>
            <ListItem>1. In the Containers tab, find your container</ListItem>
            <ListItem>2. For running containers:</ListItem>
            <List dense sx={{ pl: 4 }}>
              <ListItem>- Click Stop icon to stop the container</ListItem>
            </List>
            <ListItem>3. For stopped containers:</ListItem>
            <List dense sx={{ pl: 4 }}>
              <ListItem>- Click Play icon to start the container again</ListItem>
              <ListItem>- Click Delete icon to remove it</ListItem>
            </List>
          </List>
        </AccordionDetails>
      </Accordion>
      
      {/* Troubleshooting */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Troubleshooting</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            If you encounter issues with Docker management:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon><InfoIcon color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Docker Not Running" 
                secondary="Ensure Docker Desktop is running (check system tray)" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Permission Errors" 
                secondary="Ensure your user has permission to use Docker" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Connection Issues" 
                secondary="Try refreshing the Docker resources or restart Docker Desktop" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Build Failures" 
                secondary="Check Dockerfile syntax and build logs for errors" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Port Conflicts" 
                secondary="Ensure mapped ports aren't already in use by other services" 
              />
            </ListItem>
          </List>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Docker Status Check</Typography>
            <Typography variant="body2">
              You can run the Docker status check script to diagnose issues:
              <Box component="pre" sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                python check_docker.py
              </Box>
            </Typography>
          </Alert>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default DockerGuide;
