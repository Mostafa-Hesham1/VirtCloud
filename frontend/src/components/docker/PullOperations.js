import React, { useState } from 'react';
import RunContainerDialog from './RunContainerDialog'; // Import our standard dialog

const PullOperations = () => {
  // Add state for the container dialog
  const [selectedPullImage, setSelectedPullImage] = useState(null);
  const [runContainerDialogOpen, setRunContainerDialogOpen] = useState(false);
  
  // Add handlers for the dialog
  const handleRunContainer = (image) => {
    console.log("Opening run container dialog for pulled image:", image);
    setSelectedPullImage(image);
    setRunContainerDialogOpen(true);
  };
  
  const handleCloseRunDialog = () => {
    setRunContainerDialogOpen(false);
    setSelectedPullImage(null);
  };
  
  return (
    <div>
      {/* Update any "Run Container" buttons to use our new handler */}
      {/* <Button onClick={() => handleRunContainer(image)}>Run Container</Button> */}
      
      {/* Add our standardized RunContainerDialog component */}
      {selectedPullImage && (
        <RunContainerDialog
          open={runContainerDialogOpen}
          onClose={handleCloseRunDialog}
          imageId={selectedPullImage.id || selectedPullImage.image_id || selectedPullImage}
          imageName={selectedPullImage.tags?.[0] || 'Unnamed Image'}
        />
      )}
    </div>
  );
};

export default PullOperations;