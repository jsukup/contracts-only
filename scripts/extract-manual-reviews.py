#!/usr/bin/env python3
"""
Extract jobs that need manual review from the latest verification run
"""

import json
import sys

def extract_manual_reviews():
    # Run the verification and capture just the JSON output
    import subprocess
    import os
    
    # Change to the scripts directory
    os.chdir('/root/contracts-only/scripts')
    
    # Activate the environment and run verification
    cmd = ['bash', '-c', 'source ../job-scraper-env/bin/activate && python3 enhanced-job-verifier.py temp-scraped-jobs.json']
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        output_lines = result.stdout.strip().split('\n')
        
        # Find the JSON part (starts with '{' and ends with '}')
        json_start = -1
        json_end = -1
        brace_count = 0
        
        for i, line in enumerate(output_lines):
            if line.strip().startswith('{') and json_start == -1:
                json_start = i
                brace_count = 1
            elif json_start != -1:
                brace_count += line.count('{') - line.count('}')
                if brace_count == 0:
                    json_end = i
                    break
        
        if json_start != -1 and json_end != -1:
            json_text = '\n'.join(output_lines[json_start:json_end+1])
            verification_data = json.loads(json_text)
            
            # Find manual review jobs
            manual_review_jobs = []
            for result in verification_data.get('results', []):
                if result.get('recommendation') == 'MANUAL_REVIEW':
                    manual_review_jobs.append(result)
            
            return manual_review_jobs, verification_data.get('verification_summary', {})
        else:
            print("❌ Could not extract JSON from verification output")
            return [], {}
            
    except subprocess.TimeoutExpired:
        print("❌ Verification timeout - taking too long")
        return [], {}
    except Exception as e:
        print(f"❌ Error running verification: {e}")
        return [], {}

def display_manual_review_summary(manual_jobs, summary):
    """Display a summary of jobs needing manual review"""
    print("🔍 CONTRACTSONLY MANUAL REVIEW GUIDE")
    print("=" * 60)
    
    if not manual_jobs:
        print("🎉 No jobs require manual review!")
        print(f"✅ Accepted: {summary.get('accepted', 0)}")
        print(f"❌ Rejected: {summary.get('rejected', 0)}")
        return
    
    print(f"📊 VERIFICATION SUMMARY:")
    print(f"   Total Jobs: {summary.get('total_jobs', 0)}")
    print(f"   ✅ Accepted: {summary.get('accepted', 0)}")
    print(f"   ❌ Rejected: {summary.get('rejected', 0)}")
    print(f"   🔍 Manual Review: {summary.get('manual_review', 0)}")
    print(f"   ⚠️  Errors: {summary.get('errors', 0)}")
    
    print(f"\n🔍 {len(manual_jobs)} JOBS NEED MANUAL REVIEW:")
    print("=" * 60)
    
    # Load original job data for context
    try:
        with open('temp-scraped-jobs.json', 'r') as f:
            jobs_data = json.load(f)
            job_lookup = {job['job_url']: job for job in jobs_data}
    except:
        job_lookup = {}
    
    for i, job in enumerate(manual_jobs, 1):
        url = job['url']
        original_job = job_lookup.get(url, {})
        
        print(f"\n📋 JOB #{i}:")
        print(f"🏢 Company: {original_job.get('company', 'N/A')}")
        print(f"📝 Title: {original_job.get('title', 'N/A')}")
        print(f"💰 Compensation: {original_job.get('compensation', 'N/A')}")
        print(f"🌐 URL: {url}")
        
        print(f"\n📊 ANALYSIS:")
        print(f"   Final Score: {job.get('final_score', 0):.2f}")
        print(f"   Confidence: {job.get('confidence_level', 'N/A')}")
        
        # Show why it needs manual review
        contract_indicators = job.get('contract_indicators', [])
        ft_indicators = job.get('full_time_indicators', [])
        
        print(f"   Contract Indicators: {', '.join(contract_indicators) if contract_indicators else 'None'}")
        print(f"   Full-time Indicators: {', '.join(ft_indicators) if ft_indicators else 'None'}")
        
        if job.get('hourly_rate'):
            print(f"   💵 Hourly Rate: {job['hourly_rate']}")
        if job.get('duration'):
            print(f"   ⏱️  Duration: {job['duration']}")
        
        print(f"\n🤔 DECISION NEEDED:")
        print(f"   This job scored {job.get('final_score', 0):.2f} with {job.get('confidence_level', 'N/A')} confidence.")
        print(f"   The system is unsure if this is a legitimate contract position.")
        print(f"   Please visit: {url}")
        print(f"   Then decide: Is this a contract/freelance job (ACCEPT) or full-time job (REJECT)?")
        
        print("-" * 60)
    
    print(f"\n📝 MANUAL REVIEW PROCESS:")
    print(f"1. Visit each job URL above")
    print(f"2. Read the full job description")
    print(f"3. Look for clear indicators:")
    print(f"   ✅ Contract: 'contract', 'contractor', '1099', 'freelance', 'temp', hourly rate")
    print(f"   ❌ Full-time: 'permanent', 'employee', 'benefits', 'salary', 'W-2 only'")
    print(f"4. Make your decision based on the actual job posting content")
    
    # Save manual review list for reference
    with open('manual-review-list.json', 'w') as f:
        json.dump({
            'summary': summary,
            'manual_review_jobs': manual_jobs,
            'generated_at': summary.get('verified_at'),
            'instructions': {
                'accept_if': ['Contract position', 'Freelance work', '1099 contractor', 'Temporary assignment', 'Hourly rate mentioned'],
                'reject_if': ['Permanent employee', 'Full-time with benefits', 'W-2 only', 'Employee health insurance', 'Salary position']
            }
        }, f, indent=2)
    
    print(f"\n💾 Manual review list saved to: manual-review-list.json")

if __name__ == "__main__":
    manual_jobs, summary = extract_manual_reviews()
    display_manual_review_summary(manual_jobs, summary)