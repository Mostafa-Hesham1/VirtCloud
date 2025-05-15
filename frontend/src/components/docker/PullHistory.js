import React, { useState, useEffect } from 'react';
import { useDocker } from '../../context/DockerContext';
import RunContainerDialog from './RunContainerDialog';

const PullHistory = () => {
  const { pullStatus, fetchPullHistory } = useDocker();
  const [openRunDialog, setOpenRunDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPullImage, setSelectedPullImage] = useState(null);
  const [runContainerDialogOpen, setRunContainerDialogOpen] = useState(false);

  useEffect(() => {
    fetchPullHistory();
  }, [fetchPullHistory]);

  const handleRunContainer = (image) => {
    console.log("Opening run container dialog for pulled image:", image);
    // Clean up unused state variables
    setSelectedPullImage(image);
    setRunContainerDialogOpen(true);
    
    // Log more details about the image to diagnose any issues
    console.log("Image details for container dialog:", {
      type: typeof image,
      value: image,
      isString: typeof image === 'string'
    });
  };

  const handleCloseRunDialog = () => {
    setRunContainerDialogOpen(false);
    setSelectedPullImage(null);
  };

  return (
    <div>
      <h2>Pull History</h2>
      <ul>
        {Object.values(pullStatus).map((pull) => (
          <li key={pull._id}>
            <p>Image: {pull.image}</p>
            <p>Status: {pull.status}</p>
            <p>Started At: {pull.started_at}</p>
            <p>Finished At: {pull.finished_at}</p>
            <p>Success: {pull.success ? 'Yes' : 'No'}</p>
            {pull.success && (
              <button onClick={() => handleRunContainer(pull.image)}>Run Container</button>
            )}
          </li>
        ))}
      </ul>

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

export default PullHistory;