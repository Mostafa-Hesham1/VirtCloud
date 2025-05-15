FROM nginx:latest

# Install debugging tools
RUN apt-get update && apt-get install -y curl procps net-tools && rm -rf /var/lib/apt/lists/*

# Create test page with distinctive content
RUN echo '<!DOCTYPE html><html><head><title>NGINX Debug Test</title></head><body style="background-color: #f0f0f0; font-family: Arial; text-align: center; padding-top: 50px;"><h1 style="color: green;">NGINX Test Page</h1><p>Container is working! Created at: '$(date)'</p></body></html>' > /usr/share/nginx/html/index.html

# Make logs accessible
RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# Add a test script to verify NGINX is working
RUN echo '#!/bin/bash\necho "NGINX STATUS:"\nnginx -t\necho "PROCESS CHECK:"\nps aux | grep nginx\necho "NETWORK CHECK:"\nnetstat -tulpn\necho "TRYING LOCALHOST:"\ncurl -v http://localhost/\n' > /check.sh && \
    chmod +x /check.sh

# Add a healthcheck that runs our verification script
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
