FROM node:20-alpine

WORKDIR /app

# 设置npm镜像源为国内镜像
RUN npm config set registry https://registry.npmmirror.com

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 19000

# Start the application
CMD ["npm", "start"]
