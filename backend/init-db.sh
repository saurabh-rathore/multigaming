#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Database Configuration ---
DB_NAME="multiplayer_gaming_db"
DB_USER="root"
DB_PASSWORD="password" # Replace with your MySQL root password

# --- Create Database ---
echo "Creating database: ${DB_NAME}..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"

# --- Create Tables ---
echo "Creating tables..."
for service_dir in */ ; do
    if [ -f "${service_dir}schema.sql" ]; then
        echo "Found schema for ${service_dir}"
        mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < "${service_dir}schema.sql"
    fi
done

echo "Database initialization complete."
