FROM python:3.9-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir flask requests

# This line has a syntax error - COPY and echo are being combined incorrectly
# COPY . /buildcho "No files to copy, creating app in Dockerfile"
# Fix it by separating into two valid commands:
COPY . /app
RUN echo "No files to copy, creating app in Dockerfile"

# Create a simple app if no copy happened
RUN echo 'from flask import Flask, request\n\
import socket\n\
import os\n\
import datetime\n\
\n\
app = Flask(__name__)\n\
\n\
@app.route("/")\n\
def home():\n\
    host_name = socket.gethostname()\n\
    host_ip = socket.gethostbyname(host_name)\n\
    return f"""<html>\n\
<head>\n\
    <title>VirtCloud Test Container</title>\n\
    <style>\n\
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 30px; background: #f0f8ff; }}\n\
        .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}\n\
        h1 {{ color: #0066cc; }}\n\
        .info {{ background-color: #e6f3ff; padding: 15px; border-radius: 5px; margin-top: 20px; }}\n\
        .success {{ color: green; font-weight: bold; }}\n\
    </style>\n\
</head>\n\
<body>\n\
    <div class="container">\n\
        <h1>VirtCloud Test Container</h1>\n\
        <p class="success">✅ Container is running successfully!</p>\n\
        \n\
        <div class="info">\n\
            <h3>Container Information:</h3>\n\
            <p><strong>Hostname:</strong> {host_name}</p>\n\
            <p><strong>IP Address:</strong> {host_ip}</p>\n\
            <p><strong>Current Time:</strong> {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>\n\
            <p><strong>Python Version:</strong> {os.popen("python --version").read()}</p>\n\
        </div>\n\
        \n\
        <div class="info">\n\
            <h3>Request Headers:</h3>\n\
            <pre>{dict(request.headers)}</pre>\n\
        </div>\n\
    </div>\n\
</body>\n\
</html>"""\n\
\n\
if __name__ == "__main__":\n\
    app.run(debug=True, host="0.0.0.0", port=80)' > app.py

# Expose the port the app runs on
EXPOSE 83

CMD ["python", "app.py"]