#!/bin/bash

# Add runtime configuration to all API routes
find app/api -name "route.js" -type f | while read file; do
    if ! grep -q "export const runtime" "$file"; then
        # Create a temporary file with the runtime config
        echo "export const runtime = 'nodejs';" > temp_file
        echo "export const dynamic = 'force-dynamic';" >> temp_file
        echo "" >> temp_file
        cat "$file" >> temp_file
        mv temp_file "$file"
        echo "Added runtime config to $file"
    fi
done 