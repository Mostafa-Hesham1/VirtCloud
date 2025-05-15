FROM alpine:latest

# Create working directory
WORKDIR /app

# Copy example files into the image
COPY . .

# Create a sample file to demonstrate copy works
RUN echo "This is a test file created during build" > test.txt && \
    mkdir -p /app/data && \
    echo "Hello from Docker build!" > /app/data/hello.txt

# Set default command
CMD ["sh", "-c", "echo 'Container started'; cat test.txt; cat /app/data/hello.txt; tail -f /dev/null"]