import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogTitle, DialogContent } from '@material-ui/core';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import RunContainerDialog from './RunContainerDialog';

const PullStatusPage = () => {
  const [openRunDialog, setOpenRunDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPullImage, setSelectedPullImage] = useState(null);
  const [runContainerDialogOpen, setRunContainerDialogOpen] = useState(false);

  const handleRunContainerClick = (image) => {
    console.log('Opening run container dialog for image:', image);
    setSelectedImage(image);
    setOpenRunDialog(true);
  };

  const handleRunContainer = (image) => {
    console.log("Opening run container dialog for pulled image:", image);
    setSelectedPullImage(image);
    setRunContainerDialogOpen(true);
  };

  const handleCloseRunDialog = () => {
    setOpenRunDialog(false);
    setSelectedImage(null);
    setRunContainerDialogOpen(false);
    setSelectedPullImage(null);
  };

  return (
    <div>
      {/* ...existing code... */}
      {selectedImage && (
        <RunContainerDialog
          open={openRunDialog}
          onClose={handleCloseRunDialog}
          imageId={selectedImage.id || selectedImage.image_id || selectedImage}
          imageName={selectedImage.tags?.[0] || selectedImage.name || 'Unnamed Image'}
        />
      )}
      {/* ...existing code... */}
      <Button 
        onClick={() => handleRunContainerClick(image)}
        startIcon={<PlayArrowIcon />}
        variant="contained"
        color="primary"
        size="small"
      >
        Run Container
      </Button>
      {/* ...existing code... */}
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

export default PullStatusPage;