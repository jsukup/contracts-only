#!/usr/bin/env python3
"""
Test script for JobSpy functionality
Tests contract job scraping from Indeed with small sample
"""

import sys
import json
from jobspy import scrape_jobs

def test_jobspy_contract_search():
    """Test JobSpy with contract-specific search"""
    print("Testing JobSpy contract job search...")
    
    try:
        # Test with small sample from Indeed
        jobs = scrape_jobs(
            site_name=["indeed"],
            search_term="software contractor",
            location="United States",
            results_wanted=5,  # Small test batch
            hours_old=168,  # Last week
            job_type="contract"
        )
        
        print(f"Found {len(jobs)} jobs")
        
        if len(jobs) > 0:
            # Print first job details
            first_job = jobs.iloc[0]
            print("\nSample job details:")
            print(f"Title: {first_job.get('title', 'N/A')}")
            print(f"Company: {first_job.get('company', 'N/A')}")
            print(f"Location: {first_job.get('location', 'N/A')}")
            print(f"Job URL: {first_job.get('job_url', 'N/A')}")
            print(f"Salary: {first_job.get('salary', 'N/A')}")
            print(f"Date Posted: {first_job.get('date_posted', 'N/A')}")
            
            # Convert to JSON for Node.js integration
            jobs_dict = jobs.to_dict('records')
            
            # Save test results
            with open('/root/contracts-only/scripts/test-jobspy-output.json', 'w') as f:
                json.dump(jobs_dict, f, indent=2, default=str)
            
            print(f"\nTest results saved to test-jobspy-output.json")
            return True
        else:
            print("No jobs found in test search")
            return False
            
    except Exception as e:
        print(f"Error testing JobSpy: {e}")
        return False

def test_contract_keywords():
    """Test multiple contract-related search terms"""
    search_terms = [
        "software contractor",
        "contract developer", 
        "contract-to-hire",
        "independent contractor programming"
    ]
    
    all_results = []
    
    for term in search_terms:
        print(f"\nTesting search term: '{term}'")
        try:
            jobs = scrape_jobs(
                site_name=["indeed"],
                search_term=term,
                location="United States", 
                results_wanted=3,  # Very small test
                hours_old=168,
                job_type="contract"
            )
            
            print(f"Found {len(jobs)} jobs for '{term}'")
            if len(jobs) > 0:
                jobs_dict = jobs.to_dict('records')
                all_results.extend(jobs_dict)
                
        except Exception as e:
            print(f"Error with search term '{term}': {e}")
    
    print(f"\nTotal test jobs found: {len(all_results)}")
    
    # Save combined results
    if all_results:
        with open('/root/contracts-only/scripts/contract-keywords-test.json', 'w') as f:
            json.dump(all_results, f, indent=2, default=str)
        print("Combined test results saved to contract-keywords-test.json")
    
    return len(all_results) > 0

if __name__ == "__main__":
    print("JobSpy Contract Job Testing")
    print("=" * 40)
    
    # Test basic functionality
    basic_test = test_jobspy_contract_search()
    
    print("\n" + "=" * 40)
    
    # Test multiple keywords
    keyword_test = test_contract_keywords()
    
    print("\n" + "=" * 40)
    print("Test Summary:")
    print(f"Basic JobSpy test: {'PASSED' if basic_test else 'FAILED'}")
    print(f"Contract keywords test: {'PASSED' if keyword_test else 'FAILED'}")
    
    if basic_test and keyword_test:
        print("\nJobSpy is ready for integration!")
        sys.exit(0)
    else:
        print("\nJobSpy tests failed - check configuration")
        sys.exit(1)