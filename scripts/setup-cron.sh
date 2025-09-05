#!/bin/bash
#
# ContractsOnly Cron Setup Script
#
# This script helps set up automated daily job updates using cron
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRON_SCRIPT="$SCRIPT_DIR/daily-job-update.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ContractsOnly Cron Setup${NC}"
echo "=========================="

# Check if running as root (not recommended for production)
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Consider using a dedicated user for production.${NC}"
fi

# Check if the daily update script exists
if [ ! -f "$CRON_SCRIPT" ]; then
    echo -e "${RED}Error: Daily update script not found at: $CRON_SCRIPT${NC}"
    exit 1
fi

# Make sure the script is executable
chmod +x "$CRON_SCRIPT"

# Get current crontab
TEMP_CRON=$(mktemp)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# Check if our cron job already exists
if grep -q "daily-job-update.sh" "$TEMP_CRON"; then
    echo -e "${YELLOW}Cron job already exists. Current crontab:${NC}"
    echo
    crontab -l | grep -A2 -B2 "daily-job-update"
    echo
    
    read -p "Do you want to replace the existing cron job? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Aborted."
        rm -f "$TEMP_CRON"
        exit 0
    fi
    
    # Remove existing entries
    grep -v "daily-job-update" "$TEMP_CRON" > "$TEMP_CRON.tmp" || true
    mv "$TEMP_CRON.tmp" "$TEMP_CRON"
fi

# Show schedule options
echo
echo "Choose a schedule for daily job updates:"
echo "1) Daily at 2:00 AM (recommended)"
echo "2) Daily at 6:00 AM"
echo "3) Daily at 10:00 PM"
echo "4) Custom time"
echo "5) Dry run mode (daily at 1:00 AM for testing)"

read -p "Select option (1-5): " choice

case $choice in
    1)
        CRON_TIME="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
    2)
        CRON_TIME="0 6 * * *"
        DESCRIPTION="Daily at 6:00 AM"
        ;;
    3)
        CRON_TIME="0 22 * * *"
        DESCRIPTION="Daily at 10:00 PM"
        ;;
    4)
        echo "Enter cron time format (minute hour day month weekday):"
        echo "Examples:"
        echo "  0 3 * * *     = Daily at 3:00 AM"
        echo "  30 14 * * 1   = Mondays at 2:30 PM"
        echo "  0 */6 * * *   = Every 6 hours"
        read -p "Cron time: " CRON_TIME
        DESCRIPTION="Custom: $CRON_TIME"
        ;;
    5)
        CRON_TIME="0 1 * * *"
        CRON_SCRIPT="$CRON_SCRIPT --dry-run"
        DESCRIPTION="Daily at 1:00 AM (DRY RUN)"
        ;;
    *)
        echo "Invalid choice"
        rm -f "$TEMP_CRON"
        exit 1
        ;;
esac

# Add the new cron job
echo "" >> "$TEMP_CRON"
echo "# ContractsOnly Daily Job Update" >> "$TEMP_CRON"
echo "# $DESCRIPTION" >> "$TEMP_CRON"
echo "$CRON_TIME cd $PROJECT_ROOT && $CRON_SCRIPT >/dev/null 2>&1" >> "$TEMP_CRON"

# Install the new crontab
crontab "$TEMP_CRON"
rm -f "$TEMP_CRON"

echo
echo -e "${GREEN}✅ Cron job installed successfully!${NC}"
echo
echo "Schedule: $DESCRIPTION"
echo "Command: $CRON_SCRIPT"
echo
echo "Current crontab:"
crontab -l | tail -3

echo
echo -e "${BLUE}Additional Setup Notes:${NC}"
echo "• Make sure your Python virtual environment is set up: job-scraper-env/"
echo "• Verify your .env file contains all required environment variables"
echo "• Check logs in: $PROJECT_ROOT/logs/"
echo "• To view logs: tail -f $PROJECT_ROOT/logs/daily-update-*.log"
echo "• To remove this cron job: crontab -e (then delete the ContractsOnly lines)"

# Optional: Test the cron environment
echo
read -p "Do you want to test the cron job environment now? (y/N): " test_confirm
if [[ $test_confirm =~ ^[Yy]$ ]]; then
    echo
    echo "Testing cron environment (dry run)..."
    cd "$PROJECT_ROOT"
    
    # Run in a subshell with minimal environment (similar to cron)
    (
        export PATH="/usr/local/bin:/usr/bin:/bin"
        export HOME="$HOME"
        "$CRON_SCRIPT" --dry-run --skip-scraping
    )
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Cron environment test passed!${NC}"
    else
        echo -e "${RED}❌ Cron environment test failed. Check the error messages above.${NC}"
        echo "You may need to:"
        echo "• Add PATH variables to your crontab"
        echo "• Set up environment variables in the script"
        echo "• Check file permissions"
    fi
fi

echo
echo -e "${GREEN}Setup complete!${NC}"