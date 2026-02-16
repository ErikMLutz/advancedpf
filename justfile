# Finance Dashboard - Task Runner

# Serve the web app locally (use --generate-sample-data to generate fake data first)
[arg("generate-sample-data", long="generate-sample-data", value="true")]
serve generate-sample-data="false":
    #!/usr/bin/env bash
    if [ "{{generate-sample-data}}" = "true" ]; then
        node scripts/generate-fake-data.js || exit 1
        echo ""
    fi
    echo "Starting web server at http://localhost:8000"
    echo "Visit http://localhost:8000/web/"
    python3 -m http.server 8000

# Serve the simple Chart.js demo
serve-demo:
    @echo "Starting demo server at http://localhost:8001"
    @echo "Visit http://localhost:8001/demo/"
    python3 -m http.server 8001

# Run unit tests (use --generate-sample-data to generate fake data first)
[arg("generate-sample-data", long="generate-sample-data", value="true")]
test generate-sample-data="false":
    #!/usr/bin/env bash
    command -v npm >/dev/null 2>&1 || { echo "npm not found. Install Node.js to run tests."; exit 1; }
    if [ "{{generate-sample-data}}" = "true" ]; then
        node scripts/generate-fake-data.js || exit 1
        echo ""
    fi
    npm test

# Run end-to-end tests with Playwright
test-e2e:
    @command -v npm >/dev/null 2>&1 || { echo "npm not found. Install Node.js to run tests."; exit 1; }
    npm run test:e2e

# Run e2e tests with UI for debugging
test-e2e-ui:
    @command -v npm >/dev/null 2>&1 || { echo "npm not found. Install Node.js to run tests."; exit 1; }
    npm run test:e2e:ui

# Generate realistic fake data (prompts for confirmation if data/ exists)
generate-fake-data:
    node scripts/generate-fake-data.js

# Load real data from 1Password using op CLI
load-real-data:
    @echo "Loading real data from 1Password..."
    ./scripts/load-real-data.sh

# Save edited data back to 1Password
save-real-data:
    @echo "Saving data to 1Password..."
    ./scripts/save-real-data.sh

# Generate PDF without UI interaction
generate-pdf:
    @echo "Generating PDF..."
    @echo "Starting server in background..."
    @python3 -m http.server 8000 --directory web &
    @sleep 2
    @echo "Open http://localhost:8000?auto-export=true in your browser"
    @echo "The PDF will auto-download, then close the browser"
    @echo "Press Ctrl+C to stop the server when done"
