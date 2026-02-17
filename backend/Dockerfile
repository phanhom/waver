FROM docker.xuanyuan.me/library/python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies using China mirror
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# Copy source code
COPY . .

# Expose port
EXPOSE 18021

# Start the application
CMD ["uvicorn", "app.main:sio_app", "--host", "0.0.0.0", "--port", "18021"]