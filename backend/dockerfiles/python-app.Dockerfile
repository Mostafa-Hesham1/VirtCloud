FROM python:3.9-slim
WORKDIR /app
# Create Python file directly in the container
RUN echo 'print("Hello from Python Container")' > app.py
CMD ["python", "app.py"]