FROM node:20-bookworm-slim

# Install Python 3, pip, and required system tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Set up a Python virtual environment and install Python dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir pandas openpyxl

# Set up the Node.js application
WORKDIR /app

# Install dependencies (using npm since it's universally available)
COPY package.json ./
RUN npm install

# Copy application source code
COPY . .

# Build the frontend and backend
RUN npm run build

# Expose the production port
EXPOSE 5000

# Start the application in production mode
CMD ["npm", "run", "start"]
