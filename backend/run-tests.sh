#!/bin/sh
set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/..")
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"
npm install

echo "${BLUE}Functional Testing: Running all functional tests...${NC}"
npm run test -- --verbose
echo "${GREEN}Functional Testing: All tests succeeded.${NC}"

echo "${BLUE}Architecture Testing: Running architecture validation...${NC}"
npm run arch:validate
echo "${GREEN}Architecture Testing: All tests succeeded.${NC}"
