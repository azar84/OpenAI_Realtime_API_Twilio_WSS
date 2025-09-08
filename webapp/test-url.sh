#!/bin/bash

# Test script to verify URL extraction
echo "Testing ngrok URL extraction..."

# Start a temporary ngrok for testing
echo "Starting temporary ngrok..."
ngrok http 8081 &
NGROK_PID=$!
sleep 5

# Test URL extraction
echo "Testing URL extraction..."
URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('tunnels'):
        print(data['tunnels'][0]['public_url'])
except:
    pass
" 2>/dev/null)

echo "Extracted URL: '$URL'"
echo "URL length: ${#URL}"
echo "Starts with https: $(echo $URL | grep -q '^https://' && echo 'YES' || echo 'NO')"

# Test the update function
if [ ! -z "$URL" ] && [[ "$URL" == https://* ]]; then
    echo "✅ URL extraction successful"
    echo "Testing .env update..."
    
    # Test update
    echo "PUBLIC_URL=\"$URL\"" > test-env.txt
    echo "Generated line: $(cat test-env.txt)"
    rm -f test-env.txt
else
    echo "❌ URL extraction failed"
fi

# Cleanup
kill $NGROK_PID 2>/dev/null
echo "Test complete"
