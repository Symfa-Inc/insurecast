#!/bin/sh
set -e

# Replace API base URL in built .js and .html if API_URL is set
if [ -n "$API_URL" ]; then
  # Escape & for sed replacement (safe with | delimiter for slashes)
  ESCAPED=$(echo "$API_URL" | sed 's/&/\\&/g')
  find /app -type f \( -name "*.js" -o -name "*.html" \) -exec sed -i "s|http://localhost:8000|$ESCAPED|g" {} \;
fi

exec "$@"
