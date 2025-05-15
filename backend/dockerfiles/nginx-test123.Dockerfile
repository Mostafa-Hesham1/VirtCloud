FROM nginx:latest

# Create a test index page (use echo with proper escaping)
RUN echo '<!DOCTYPE html>\
<html>\
<head><title>Port Mapping Test</title></head>\
<body>\
<h1>Port Mapping Success!</h1>\
<p>If you can see this page, your Docker port mapping is working correctly.</p>\
</body>\
</html>' > /usr/share/nginx/html/index.html

# Explicitly set permissions and ensure nginx can read the file
RUN chmod 644 /usr/share/nginx/html/index.html

# Make sure nginx is configured to listen on port 80
RUN echo 'server {\
    listen 80;\
    server_name localhost;\
    location / {\
        root /usr/share/nginx/html;\
        index index.html;\
    }\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]