FROM node:14-alpine
WORKDIR /app
# Create package.json and server.js directly
RUN echo '{"name":"docker-node-app","version":"1.0.0","main":"server.js"}' > package.json && \
    echo 'console.log("Server starting..."); \
    const http = require("http"); \
    const server = http.createServer((req, res) => { \
      res.writeHead(200, {"Content-Type": "text/plain"}); \
      res.end("Hello from Node.js container!"); \
    }); \
    server.listen(3000); \
    console.log("Server running at http://localhost:3000/");' > server.js
EXPOSE 3000
CMD ["node", "server.js"]