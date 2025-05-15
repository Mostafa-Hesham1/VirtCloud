FROM nginx:latest
# Replace COPY with RUN to create the file directly
RUN echo '<html><body><h1>NGINX Test Page</h1><p>This page is created within the Dockerfile.</p></body></html>' > /usr/share/nginx/html/index.html
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]