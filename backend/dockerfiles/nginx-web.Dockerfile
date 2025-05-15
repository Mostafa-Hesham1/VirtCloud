FROM nginx:latest
# Create the HTML file directly in the Dockerfile with RUN echo
RUN echo "<html><body><h1>Hello from VirtCloud</h1></body></html>" > /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]