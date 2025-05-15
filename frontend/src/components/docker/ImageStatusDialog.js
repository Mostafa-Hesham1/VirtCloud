import React, { useState, useEffect } from 'react';
import RunContainerDialog from './RunContainerDialog'; // Make sure this is imported

const ImageStatusDialog = ({ open, onClose, image, status }) => {
  const [openRunDialog, setOpenRunDialog] = useState(false);

  const handleRunContainerClick = () => {
    setOpenRunDialog(true);
  };

  const handleCloseRunDialog = () => {
    setOpenRunDialog(false);
  };

  return (
    <div>
      <Button
        onClick={handleRunContainerClick}
        variant="contained" 
        color="primary"
      >
        Run Container
      </Button>

      <RunContainerDialog
        open={openRunDialog}
        onClose={handleCloseRunDialog}
        imageId={image?.id || image?.image_id || ''}
        imageName={image?.tags?.[0] || image?.name || 'Unnamed Image'}
      />
    </div>
  );
};

export default ImageStatusDialog;