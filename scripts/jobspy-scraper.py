#!/usr/bin/env python3
import sys
import json
from jobspy import scrape_jobs
from datetime import datetime
import pandas as pd

def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    jobs_per_search = min(50, limit // 8)
    
    search_terms = ["software contractor","contract developer remote","contract programmer","contract-to-hire developer","independent contractor programming","contract software engineer","W2 contract developer","1099 contractor developer"]
    all_jobs = []
    
    for term in search_terms:
        print(f"Searching for: {term}")
        try:
            jobs = scrape_jobs(
                site_name=["indeed"],
                search_term=term,
                location="United States",
                results_wanted=jobs_per_search,
                hours_old=168  # Last week
                # Note: job_type="contract" filter removed as it's not reliable
            )
            
            if len(jobs) > 0:
                jobs_dict = jobs.to_dict('records')
                all_jobs.extend(jobs_dict)
                print(f"Found {len(jobs)} jobs for '{term}'")
            
        except Exception as e:
            print(f"Error scraping '{term}': {e}")
    
    # Remove duplicates by job_url
    seen_urls = set()
    unique_jobs = []
    for job in all_jobs:
        if job.get('job_url') not in seen_urls:
            seen_urls.add(job.get('job_url'))
            unique_jobs.append(job)
    
    print(f"Total unique jobs: {len(unique_jobs)}")
    
    # Clean up NaN values and save to temp file
    import numpy as np
    
    def clean_job_data(job):
        """Replace NaN values with None for JSON compatibility"""
        cleaned = {}
        for key, value in job.items():
            if pd.isna(value) or (isinstance(value, float) and np.isnan(value)):
                cleaned[key] = None
            else:
                cleaned[key] = value
        return cleaned
    
    unique_jobs_cleaned = [clean_job_data(job) for job in unique_jobs]
    
    with open('/root/contracts-only/scripts/temp-scraped-jobs.json', 'w') as f:
        json.dump(unique_jobs_cleaned, f, indent=2, default=str)
    
    print("Scraping completed successfully")

if __name__ == "__main__":
    main()
