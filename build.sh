#!/usr/bin/env bash
# exit on error
set -o errexit

# Build Frontend
cd frontend
npm install
npm run build
cd ..

# Install Backend Dependencies
pip install -r backend/requirements.txt
