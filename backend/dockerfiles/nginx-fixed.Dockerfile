FROM nginx:latest

# Add debugging tools
RUN apt-get update && apt-get install -y curl procps && rm -rf /var/lib/apt/lists/*

# Create test page
RUN echo '<html><body><h1>NGINX Test Page</h1><p>This page confirms NGINX is running correctly.</p></body></html>' > /usr/share/nginx/html/index.html

# Make sure logs are accessible - CORRECT paths
RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# Set proper permissions - CORRECT path
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Healthcheck to verify nginx is running
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Standard NGINX startup command
CMD ["nginx", "-g", "daemon off;"]
