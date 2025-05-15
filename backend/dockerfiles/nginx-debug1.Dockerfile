FROM nginx:latest

# Create a highly visible test page
RUN echo '<!DOCTYPE html>\
<html>\
<head>\
  <title>NGINX Test Page</title>\
  <style>\
    body { background-color: #f0f0f0; font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }\
    h1 { color: green; }\
    .container { background-color: white; max-width: 800px; margin: 0 auto; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }\
  </style>\
</head>\
<body>\
  <div class="container">\
    <h1>NGINX Container is Working!</h1>\
    <p>If you can see this page, your Docker port mapping is working correctly.</p>\
    <p>Server time: <strong>' $(date) '</strong></p>\
  </div>\
</body>\
</html>' > /usr/share/nginx/html/index.html

# Make NGINX log to stdout for easier debugging
RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# Explicitly configure NGINX to ensure it listens properly
RUN echo 'server {\
    listen 80;\
    listen [::]:80;\
    server_name localhost;\
    access_log /var/log/nginx/access.log;\
    error_log /var/log/nginx/error.log;\
    location / {\
        root /usr/share/nginx/html;\
        index index.html;\
    }\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

# Add a healthcheck to verify nginx is running
HEALTHCHECK --interval=5s --timeout=3s --retries=3 CMD curl -f http://localhost/ || exit 1

# Start Nginx with debug output
CMD ["nginx", "-g", "daemon off;"]
