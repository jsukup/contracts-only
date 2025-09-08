#!/bin/bash
#
# ContractsOnly Manual Daily Update Shell Wrapper
#
# A user-friendly wrapper for the daily job management routine.
# Provides colored output, environment checks, and clear progress indicators.
#
# Usage:
#   ./scripts/manual-daily-update.sh [options]
#   ./scripts/manual-daily-update.sh --help
#

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/manual-update-$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji for better visual feedback
ROCKET="🚀"
CHECK="✅"
WARNING="⚠️"
ERROR="❌"
INFO="💡"
CLOCK="⏱️"

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

# Function to show help
show_help() {
    echo -e "${BLUE}ContractsOnly Manual Daily Update${NC}"
    echo "===================================="
    echo
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  --dry-run         Test mode - no database changes"
    echo "  --limit=N         Number of jobs to scrape (default: 100)"
    echo "  --skip-cleanup    Skip stale job cleanup step"
    echo "  --help, -h        Show this help message"
    echo
    echo "Examples:"
    echo "  $0                        # Normal daily run"
    echo "  $0 --dry-run              # Test run"
    echo "  $0 --limit=50             # Scrape 50 jobs"
    echo "  $0 --skip-cleanup         # Skip cleanup step"
    echo
    echo -e "${INFO} This script will:"
    echo "  1. Scrape new contract jobs from multiple sources"
    echo "  2. Clean up stale jobs (>30 days old)"
    echo "  3. Generate comprehensive daily reports"
    echo "  4. Provide summary and recommendations"
    echo
    echo -e "${CLOCK} Expected runtime: 5-10 minutes"
    echo
}

# Function to log messages with colors
log() {
    echo -e "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to show a progress spinner
show_spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "      \b\b\b\b\b\b"
}

# Parse command line arguments
ARGS=""
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --help|-h)
            show_help
            exit 0
            ;;
        --dry-run)
            ARGS="$ARGS --dry-run"
            DRY_RUN=true
            ;;
        --limit=*)
            ARGS="$ARGS $arg"
            ;;
        --skip-cleanup)
            ARGS="$ARGS --skip-cleanup"
            ;;
        *)
            log_warning "Unknown argument: $arg"
            ;;
    esac
done

# Header
echo
echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}   ${ROCKET} ContractsOnly Daily Update     ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"
echo

# Pre-flight checks
log_info "Starting pre-flight checks..."

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    log_error "Not in ContractsOnly project root directory"
    log_error "Please run this script from the project root: ./scripts/manual-daily-update.sh"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed or not in PATH"
    log_error "Please install Node.js to continue"
    exit 1
fi

# Check if the manual update script exists
MANUAL_SCRIPT="$SCRIPT_DIR/manual-daily-update.js"
if [ ! -f "$MANUAL_SCRIPT" ]; then
    log_error "Manual update script not found: $MANUAL_SCRIPT"
    exit 1
fi

# Check for .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    log_warning ".env file not found"
    log_warning "Make sure environment variables are set elsewhere"
fi

# Check Python environment (warn but don't fail)
PYTHON_VENV="$PROJECT_ROOT/job-scraper-env"
if [ ! -d "$PYTHON_VENV" ]; then
    log_warning "Python virtual environment not found at: $PYTHON_VENV"
    log_warning "Job scraping may fail. Set up with: python3 -m venv job-scraper-env"
    log_warning "Then activate and install: pip install python-jobspy pandas numpy"
fi

log_success "Pre-flight checks completed"
echo

# Change to project root
cd "$PROJECT_ROOT"

# Show run configuration
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}${WARNING} DRY RUN MODE - No changes will be made${NC}"
else
    echo -e "${GREEN}${ROCKET} LIVE MODE - Changes will be applied to database${NC}"
fi

echo -e "${INFO} Log file: $LOG_FILE"
echo -e "${CLOCK} Started at: $(date)"
echo

# Run the Node.js script
log_info "Executing daily update process..."
log_info "Command: node $MANUAL_SCRIPT $ARGS"
echo

START_TIME=$(date +%s)

# Run the script and capture its exit code
set +e  # Don't exit on error for this command
node "$MANUAL_SCRIPT" $ARGS 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=$?
set -e  # Re-enable exit on error

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

echo
echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}            Final Results             ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"

# Show results based on exit code
if [ $EXIT_CODE -eq 0 ]; then
    log_success "Daily update completed successfully! ${CHECK}"
    log_info "Total duration: ${DURATION_MIN}m ${DURATION_SEC}s"
    
    # Show quick access to reports
    REPORT_DATE=$(date +%Y-%m-%d)
    REPORT_MD="$PROJECT_ROOT/reports/daily-report-$REPORT_DATE.md"
    if [ -f "$REPORT_MD" ]; then
        echo
        log_info "Quick report preview:"
        echo -e "${CYAN}╭─────────────────────────────────────╮${NC}"
        head -n 10 "$REPORT_MD" | sed 's/^/│ /'
        echo -e "${CYAN}╰─────────────────────────────────────╯${NC}"
        echo -e "${INFO} Full report: reports/daily-report-$REPORT_DATE.md"
    fi
    
else
    log_error "Daily update failed with exit code: $EXIT_CODE ${ERROR}"
    log_info "Duration: ${DURATION_MIN}m ${DURATION_SEC}s"
    log_error "Check the log file for details: $LOG_FILE"
    
    echo
    echo -e "${YELLOW}${INFO} Troubleshooting tips:${NC}"
    echo "• Check internet connection"
    echo "• Verify Python environment setup"
    echo "• Review .env file configuration"
    echo "• Try running with --dry-run first"
fi

echo
log_info "Session log saved to: $LOG_FILE"

# Cleanup old log files (keep last 10)
find "$LOG_DIR" -name "manual-update-*.log" -type f | sort | head -n -10 | xargs -r rm

echo
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}${CHECK} All done! Thanks for keeping ContractsOnly fresh with new jobs!${NC}"
else
    echo -e "${YELLOW}${WARNING} Issues encountered. Please review the logs and try again.${NC}"
fi

echo

# Exit with the same code as the Node.js script
exit $EXIT_CODE