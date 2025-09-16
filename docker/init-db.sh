#!/bin/bash

# Initialize PostgreSQL database
echo "Initializing PostgreSQL database..."

# Initialize PostgreSQL database
su-exec postgres /usr/bin/initdb -D /var/lib/postgresql/data

# Start PostgreSQL service
su-exec postgres /usr/bin/postgres -D /var/lib/postgresql/data &
POSTGRES_PID=$!

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
for i in {1..30}; do
    if pg_isready -h localhost -p 5432 -U postgres; then
        echo "PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "PostgreSQL failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
su-exec postgres createdb openai_realtime_db 2>/dev/null || echo "Database already exists"

# Run schema initialization
echo "Running database schema initialization..."
if [ -f /app/database/schema.sql ]; then
    su-exec postgres psql -d openai_realtime_db -f /app/database/schema.sql
    echo "Database schema initialized successfully"
else
    echo "Warning: schema.sql not found, skipping schema initialization"
fi

# Stop PostgreSQL (supervisor will restart it)
kill $POSTGRES_PID
wait $POSTGRES_PID

echo "Database initialization complete"
