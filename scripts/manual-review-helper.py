#!/usr/bin/env python3
"""
Manual Review Helper for ContractsOnly Job Verification
This tool helps you review jobs flagged for manual verification.
"""

import json
import sys
import webbrowser
from datetime import datetime

def load_verification_results():
    """Load the latest verification results"""
    try:
        # Try to load from the verification output (if piped from enhanced-job-verifier.py)
        with open('/root/contracts-only/scripts/temp-scraped-jobs.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ No verification results found. Run enhanced-job-verifier.py first.")
        sys.exit(1)

def display_job_for_review(job_data, verification_result=None):
    """Display job information for manual review"""
    print("=" * 80)
    print(f"📋 JOB FOR MANUAL REVIEW")
    print("=" * 80)
    
    # Basic job info
    print(f"🏢 Company: {job_data.get('company', 'N/A')}")
    print(f"📝 Title: {job_data.get('title', 'N/A')}")
    print(f"📍 Location: {job_data.get('location', 'N/A')}")
    print(f"💰 Compensation: {job_data.get('compensation', 'N/A')}")
    print(f"🌐 URL: {job_data.get('job_url', 'N/A')}")
    
    if verification_result:
        print(f"\n📊 VERIFICATION SCORES:")
        print(f"   Initial Score: {verification_result.get('initial_score', 0):.2f}")
        print(f"   Crawl4AI Score: {verification_result.get('crawl4ai_score', 0):.2f}")
        print(f"   Final Score: {verification_result.get('final_score', 0):.2f}")
        print(f"   Confidence: {verification_result.get('confidence_level', 'N/A')}")
        
        print(f"\n✅ CONTRACT INDICATORS FOUND:")
        indicators = verification_result.get('contract_indicators', [])
        if indicators:
            for indicator in indicators:
                print(f"   • {indicator}")
        else:
            print("   • None found")
            
        print(f"\n❌ FULL-TIME INDICATORS FOUND:")
        ft_indicators = verification_result.get('full_time_indicators', [])
        if ft_indicators:
            for indicator in ft_indicators:
                print(f"   • {indicator}")
        else:
            print("   • None found")
            
        if verification_result.get('hourly_rate'):
            print(f"\n💵 HOURLY RATE: {verification_result['hourly_rate']}")
        if verification_result.get('duration'):
            print(f"⏱️  DURATION: {verification_result['duration']}")
    
    # Job description preview
    description = job_data.get('description', '')
    if description:
        print(f"\n📄 DESCRIPTION PREVIEW:")
        preview = description[:500] + '...' if len(description) > 500 else description
        print(f"   {preview}")
    
    print("\n" + "=" * 80)

def get_user_decision():
    """Get user decision for the job"""
    while True:
        print("\n🤔 MANUAL REVIEW DECISION:")
        print("   [A] Accept - This is a legitimate contract job")
        print("   [R] Reject - This is NOT a contract job")
        print("   [O] Open in browser to review job posting")
        print("   [S] Skip - Review later")
        
        choice = input("\nYour decision (A/R/O/S): ").upper().strip()
        
        if choice in ['A', 'R', 'S']:
            return choice
        elif choice == 'O':
            return 'O'
        else:
            print("❌ Invalid choice. Please enter A, R, O, or S.")

def save_manual_review_decision(job_url, decision, notes=""):
    """Save the manual review decision"""
    decision_record = {
        'url': job_url,
        'manual_decision': 'ACCEPT' if decision == 'A' else 'REJECT',
        'reviewed_by': 'human',
        'reviewed_at': datetime.now().isoformat(),
        'notes': notes
    }
    
    # Load existing manual decisions
    try:
        with open('/root/contracts-only/scripts/manual-review-decisions.json', 'r') as f:
            decisions = json.load(f)
    except FileNotFoundError:
        decisions = []
    
    # Add new decision
    decisions.append(decision_record)
    
    # Save updated decisions
    with open('/root/contracts-only/scripts/manual-review-decisions.json', 'w') as f:
        json.dump(decisions, indent=2, fp=f)
    
    print(f"✅ Decision saved: {decision_record['manual_decision']}")

def main():
    """Main manual review process"""
    print("🔍 CONTRACTSONLY MANUAL REVIEW HELPER")
    print("=" * 50)
    
    # Check if we have verification results as command line argument
    if len(sys.argv) > 1 and sys.argv[1].endswith('.json'):
        verification_file = sys.argv[1]
        try:
            with open(verification_file, 'r') as f:
                verification_data = json.load(f)
            
            if 'results' in verification_data:
                results = verification_data['results']
            else:
                # Assume it's the raw job data
                results = None
                jobs_data = verification_data
        except Exception as e:
            print(f"❌ Error loading verification file: {e}")
            sys.exit(1)
    else:
        print("❌ Usage: python3 manual-review-helper.py <verification_results.json>")
        print("   Or pipe the output from enhanced-job-verifier.py")
        sys.exit(1)
    
    if results:
        # Find jobs that need manual review
        manual_review_jobs = [r for r in results if r.get('recommendation') == 'MANUAL_REVIEW']
        
        if not manual_review_jobs:
            print("🎉 No jobs require manual review!")
            return
        
        print(f"📋 Found {len(manual_review_jobs)} jobs requiring manual review\n")
        
        # Load original job data for context
        try:
            with open('/root/contracts-only/scripts/temp-scraped-jobs.json', 'r') as f:
                jobs_data = json.load(f)
                job_lookup = {job['job_url']: job for job in jobs_data}
        except FileNotFoundError:
            job_lookup = {}
        
        # Review each job
        for i, result in enumerate(manual_review_jobs, 1):
            print(f"\n🔍 REVIEWING JOB {i} of {len(manual_review_jobs)}")
            
            job_url = result['url']
            job_data = job_lookup.get(job_url, {'job_url': job_url})
            
            display_job_for_review(job_data, result)
            
            decision = get_user_decision()
            
            if decision == 'O':
                try:
                    webbrowser.open(job_url)
                    print(f"🌐 Opened {job_url} in browser")
                    decision = get_user_decision()  # Ask again after they review
                except Exception as e:
                    print(f"❌ Could not open browser: {e}")
                    decision = get_user_decision()
            
            if decision == 'S':
                print("⏭️  Skipped - you can review this job later")
                continue
            
            # Get optional notes
            notes = input("📝 Add notes (optional): ").strip()
            
            # Save decision
            save_manual_review_decision(job_url, decision, notes)
            
            print(f"\n✅ Job {i} review completed")
    
    print(f"\n🎉 Manual review session completed!")
    print(f"📁 Decisions saved to: manual-review-decisions.json")

if __name__ == "__main__":
    main()