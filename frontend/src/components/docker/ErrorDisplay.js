import React from 'react';
import { Alert, Typography } from '@mui/material';

/**
 * A component to safely display error messages, including those from FastAPI
 * which may come as objects with validation details
 */
const ErrorDisplay = ({ error, severity = 'error' }) => {
  if (!error) return null;
  
  let errorMessage = '';
  
  // Handle different error types
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (Array.isArray(error)) {
    // Handle array of errors
    errorMessage = error.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        // Handle FastAPI validation error format
        if (item.msg) return item.msg;
        return JSON.stringify(item);
      }
      return String(item);
    }).join('; ');
  } else if (error && typeof error === 'object') {
    // Handle FastAPI error detail objects
    if (error.detail) {
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        errorMessage = error.detail.map(item => {
          if (typeof item === 'string') return item;
          // Handle {type, loc, msg, input} format
          if (item && item.msg) {
            const location = item.loc ? ` at ${item.loc.join('.')}` : '';
            return `${item.msg}${location}`;
          }
          return JSON.stringify(item);
        }).join('; ');
      } else {
        errorMessage = JSON.stringify(error.detail);
      }
    } else {
      // Try to stringify the entire object
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = 'Unknown error occurred';
      }
    }
  } else {
    errorMessage = 'Unknown error occurred';
  }

  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      <Typography>{errorMessage}</Typography>
    </Alert>
  );
};

export default ErrorDisplay;
