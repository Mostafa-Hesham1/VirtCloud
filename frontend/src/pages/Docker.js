// ...existing code...

import DockerResourcesLoader from '../components/docker/DockerResourcesLoader';

const DockerPage = () => {
  // ...existing code...

  return (
    <DockerProvider>
      <DockerResourcesLoader>
        {/* Your existing Docker UI */}
        <Container maxWidth="xl">
          <Grid container spacing={3}>
            {/* ...existing code... */}
          </Grid>
        </Container>
      </DockerResourcesLoader>
    </DockerProvider>
  );
};

export default DockerPage;