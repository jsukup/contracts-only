#!/bin/bash
# Cleanup temporary JSON files from job scraping process

echo "🧹 Cleaning up temporary job scraping files..."

# Remove temporary scraped data
if [ -f "temp-scraped-jobs.json" ]; then
    rm temp-scraped-jobs.json
    echo "✅ Removed temp-scraped-jobs.json"
fi

# Remove temporary verification files  
if [ -f "latest-verification.json" ]; then
    rm latest-verification.json
    echo "✅ Removed latest-verification.json"
fi

# Remove old accepted jobs (superseded by final-accepted-jobs.json)
if [ -f "accepted-jobs.json" ]; then
    rm accepted-jobs.json
    echo "✅ Removed accepted-jobs.json"
fi

# Remove old verification result files
for file in verification-clean.json verification-final.json verification-parsed.json verification-results.json; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "✅ Removed $file"
    fi
done

# Remove temporary manual review helper files
if [ -f "manual-review-list.json" ]; then
    rm manual-review-list.json
    echo "✅ Removed manual-review-list.json"
fi

# Remove test output files
if [ -f "test-jobspy-output.json" ]; then
    rm test-jobspy-output.json
    echo "✅ Removed test-jobspy-output.json"
fi

echo ""
echo "🎯 KEPT (important files):"
echo "   • final-accepted-jobs.json (35 verified jobs for import)"
echo "   • import-summary.json (process metadata)"
echo "   • manual-review-decisions.json (human review decisions)"
echo "   • manual-review-queue.json (historical reviews)"
echo "   • contract-keywords-test.json (test data)"
echo ""
echo "✅ Temporary file cleanup completed!"