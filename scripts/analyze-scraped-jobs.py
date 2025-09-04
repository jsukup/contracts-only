#!/usr/bin/env python3
"""
Analyze scraped job data to understand why jobs are being rejected
"""

import sys
import json
from jobspy import scrape_jobs

def analyze_scraped_jobs():
    """Scrape a few jobs and analyze their content for scoring improvement"""
    
    print("Analyzing scraped jobs for contract relevance...")
    
    # Scrape small sample
    jobs = scrape_jobs(
        site_name=["indeed"],
        search_term="contract developer",
        location="United States",
        results_wanted=5,
        hours_old=168,
        job_type="contract"
    )
    
    if len(jobs) == 0:
        print("No jobs found")
        return
    
    print(f"Found {len(jobs)} jobs to analyze")
    
    for i, job in jobs.iterrows():
        print(f"\n" + "="*60)
        print(f"JOB {i+1}: {job.get('title', 'N/A')}")
        print(f"Company: {job.get('company', 'N/A')}")
        print(f"Job Type: {job.get('job_type', 'N/A')}")
        print(f"Salary: ${job.get('min_amount', 'N/A')} - ${job.get('max_amount', 'N/A')} ({job.get('interval', 'N/A')})")
        print(f"URL: {job.get('job_url', 'N/A')}")
        
        # Analyze description for contract keywords
        description = job.get('description', '').lower()
        title = job.get('title', '').lower()
        
        contract_keywords = [
            'contract', 'contractor', 'contract-to-hire', 'c2h', 'independent contractor',
            'contract position', 'contract role', 'contracting', 'contract work'
        ]
        
        exclude_keywords = [
            'full-time', 'permanent', 'employee', 'w-2 only', 'salary', 'benefits package'
        ]
        
        print(f"\nCONTRACT ANALYSIS:")
        found_positive = []
        found_negative = []
        
        for keyword in contract_keywords:
            if keyword in description or keyword in title:
                found_positive.append(keyword)
        
        for keyword in exclude_keywords:
            if keyword in description or keyword in title:
                found_negative.append(keyword)
        
        print(f"Positive keywords found: {found_positive}")
        print(f"Negative keywords found: {found_negative}")
        
        # Rate analysis
        has_rate = job.get('min_amount') is not None or job.get('max_amount') is not None
        print(f"Has salary/rate info: {has_rate}")
        
        # Description preview
        desc_preview = (job.get('description', '')[:200] + '...') if len(job.get('description', '')) > 200 else job.get('description', '')
        print(f"\nDescription preview: {desc_preview}")

if __name__ == "__main__":
    analyze_scraped_jobs()