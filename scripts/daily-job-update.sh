#!/bin/bash
#
# ContractsOnly Daily Job Update Shell Script
#
# This script provides a convenient way to run the daily job update process
# with proper logging and error handling.
#
# Usage:
#   ./scripts/daily-job-update.sh [dry-run] [skip-scraping] [skip-cleanup]
#

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/daily-update-$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

# Function to log messages
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to log errors
log_error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log success
log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log info
log_info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log warning
log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Trap to handle script interruption
cleanup() {
    log_warning "Script interrupted. Cleaning up..."
    # Kill any background processes if needed
    exit 1
}

trap cleanup INT TERM

# Start logging
log_info "ContractsOnly Daily Job Update Starting"
log_info "Script: $0"
log_info "Arguments: $*"
log_info "Log file: $LOG_FILE"
log_info "Working directory: $PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    log_error "Not in ContractsOnly project root directory"
    log_error "Please run this script from the project root"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed or not in PATH"
    exit 1
fi

# Check if the daily update script exists
DAILY_UPDATE_SCRIPT="$SCRIPT_DIR/daily-job-update.js"
if [ ! -f "$DAILY_UPDATE_SCRIPT" ]; then
    log_error "Daily update script not found: $DAILY_UPDATE_SCRIPT"
    exit 1
fi

# Parse arguments
NODE_ARGS=""
MODE="LIVE"

for arg in "$@"; do
    case $arg in
        dry-run|--dry-run)
            NODE_ARGS="$NODE_ARGS --dry-run"
            MODE="DRY RUN"
            ;;
        skip-scraping|--skip-scraping)
            NODE_ARGS="$NODE_ARGS --skip-scraping"
            ;;
        skip-cleanup|--skip-cleanup)
            NODE_ARGS="$NODE_ARGS --skip-cleanup"
            ;;
        *)
            log_warning "Unknown argument: $arg"
            ;;
    esac
done

log_info "Mode: $MODE"
log_info "Node arguments: $NODE_ARGS"

# Change to project root
cd "$PROJECT_ROOT"

# Check for required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    log_warning "NEXT_PUBLIC_SUPABASE_URL not set, checking .env file..."
    if [ ! -f ".env" ]; then
        log_error "No .env file found and NEXT_PUBLIC_SUPABASE_URL not set"
        exit 1
    fi
fi

# Check if Python virtual environment exists (for job scraping)
PYTHON_VENV="$PROJECT_ROOT/job-scraper-env"
if [ ! -d "$PYTHON_VENV" ]; then
    log_warning "Python virtual environment not found at: $PYTHON_VENV"
    log_info "Job scraping may fail. Please ensure the Python environment is set up."
fi

# Run the daily update script
log_info "Starting daily job update process..."
log_info "Command: node $DAILY_UPDATE_SCRIPT $NODE_ARGS"

START_TIME=$(date +%s)

# Run the Node.js script and capture its exit code
set +e  # Don't exit on error for this command
node "$DAILY_UPDATE_SCRIPT" $NODE_ARGS 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=$?
set -e  # Re-enable exit on error

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

# Log results
if [ $EXIT_CODE -eq 0 ]; then
    log_success "Daily job update completed successfully!"
    log_info "Duration: ${DURATION_MIN}m ${DURATION_SEC}s"
else
    log_error "Daily job update failed with exit code: $EXIT_CODE"
    log_info "Duration: ${DURATION_MIN}m ${DURATION_SEC}s"
    log_error "Check the log file for details: $LOG_FILE"
fi

# Show log file location
log_info "Full log saved to: $LOG_FILE"

# If this is a cron job, we might want to keep only the last N log files
# Uncomment the following lines to keep only the last 7 days of logs
# log_info "Cleaning up old log files (keeping last 7 days)..."
# find "$LOG_DIR" -name "daily-update-*.log" -type f -mtime +7 -delete 2>/dev/null || true

# Exit with the same code as the Node.js script
exit $EXIT_CODE