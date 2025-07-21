SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/..")
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"
npm install
npm run test -- --verbose
