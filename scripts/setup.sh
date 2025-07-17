#!/bin/bash

# Install dependencies
npm install
npm install --prefix packages/frontend
npm install --prefix packages/backend

# Build the frontend
npm run build --prefix packages/frontend

# Set up the database
# (MySQL setup will be added here)

# Start the backend server
npm start --prefix packages/backend
