import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Chip, 
  Alert, 
  LinearProgress, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import WarningIcon from '@mui/icons-material/Warning';
import EditIcon from '@mui/icons-material/Edit';

const BuildStatusDisplay = ({ build, onFixDockerfile }) => {
  if (!build) return null;
  
  const isCompleted = build.status === 'completed';
  const isFailed = build.status === 'failed' || (isCompleted && !build.success);
  const isInProgress = build.status === 'building';
  
  // Check for specific error types
  const hasMissingFileError = 
    (build.logs && build.logs.some(log => 
      log.log && (
        log.log.includes('COPY failed') || 
        log.log.includes('file not found') ||
        log.log.includes('does not exist')
      )
    ));
  
  // Extract missing filename if available
  let missingFilename = null;
  if (hasMissingFileError && build.logs) {
    const errorLog = build.logs.find(log => 
      log.log && (
        log.log.includes('COPY failed') || 
        log.log.includes('file not found')
      )
    );
    
    if (errorLog && errorLog.log) {
      const match = errorLog.log.match(/stat\s+(.*?):\s+file does not exist/);
      if (match && match[1]) {
        missingFilename = match[1];
      }
    }
  }
  
  return (
    <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid', borderColor: 
      isFailed ? 'error.main' : 
      isCompleted ? 'success.main' : 
      'info.main' 
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="h6">
          {build.image_tag || `${build.image_name}:${build.tag}`}
        </Typography>
        <Chip 
          label={
            isFailed ? "Failed" : 
            isCompleted ? "Success" : 
            "Building"
          }
          color={
            isFailed ? "error" : 
            isCompleted ? "success" : 
            "info"
          }
          icon={
            isFailed ? <ErrorOutlineIcon /> : 
            isCompleted ? <CheckCircleIcon /> : 
            <BuildIcon />
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
      
      {isInProgress && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress sx={{ height: 8, borderRadius: 1 }} />
        </Box>
      )}
      
      {isFailed && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {hasMissingFileError ? (
            <Box>
              <Typography variant="body1" fontWeight="bold">
                Build failed: Missing file in build context
              </Typography>
              {missingFilename && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  The file <strong>{missingFilename}</strong> was not found but is required by the Dockerfile.
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>
                You need to either:
                <ul>
                  <li>Create the missing file in the same directory as your Dockerfile, or</li>
                  <li>Modify your Dockerfile to remove or fix the COPY command</li>
                </ul>
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={() => onFixDockerfile && onFixDockerfile(build.dockerfile_name)}
                >
                  Edit Dockerfile
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography>Build failed. Check the logs for details.</Typography>
          )}
        </Alert>
      )}
      
      {build.logs && build.logs.length > 0 && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Build Logs</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Paper 
              variant="outlined" 
              sx={{ 
                maxHeight: 300, 
                overflow: 'auto',
                bgcolor: 'grey.900',
                p: 2
              }}
            >
              {build.logs.map((log, index) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    whiteSpace: 'pre-wrap',
                    color: log.log?.includes('ERROR') ? 'error.light' : 'common.white',
                    py: 0.5
                  }}
                >
                  {log.log || ''}
                </Typography>
              ))}
            </Paper>
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
};

export default BuildStatusDisplay;
