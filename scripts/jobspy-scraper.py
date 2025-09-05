#!/usr/bin/env python3
import sys
import json
import time
import re
from jobspy import scrape_jobs
from datetime import datetime
import pandas as pd
import numpy as np

# Enhanced configuration for multi-source scraping
SCRAPING_CONFIG = {
    'indeed': {
        'enabled': True,
        'results_per_term': 50,
        'delay': 1,  # seconds between requests
        'search_terms': [
            "software contractor",
            "contract developer remote", 
            "contract programmer",
            "contract-to-hire developer",
            "independent contractor programming",
            "contract software engineer",
            "W2 contract developer",
            "1099 contractor developer"
        ]
    },
    'linkedin': {
        'enabled': True,
        'results_per_term': 25,  # Conservative due to rate limits
        'delay': 3,  # Longer delay for LinkedIn
        'search_terms': [
            "contract developer",
            "contractor software",
            "contract-to-hire",
            "independent contractor tech"
        ]
    },
    'zip_recruiter': {
        'enabled': True,
        'results_per_term': 40,
        'delay': 2,
        'search_terms': [
            "software contractor",
            "contract developer",
            "contract programmer",
            "freelance developer"
        ]
    }
}

CONTRACT_KEYWORDS = [
    'contract', 'contractor', 'contract-to-hire', 'c2h', 
    'independent contractor', 'contract position', 'contract role', 
    'contracting', 'contract work', 'freelance', 'consultant',
    'temp', 'temporary', '1099', 'w2 contract'
]

EXCLUDE_KEYWORDS = [
    'full-time', 'permanent', 'employee benefits', 'salary',
    'permanent position', 'staff position', 'direct hire'
]

def calculate_contract_score(description, title=""):
    """Calculate contract relevance score (0-1)"""
    if not description:
        return 0
    
    text = (description + " " + title).lower()
    
    # Positive indicators
    contract_matches = sum(1 for keyword in CONTRACT_KEYWORDS if keyword in text)
    
    # Negative indicators
    exclude_matches = sum(1 for keyword in EXCLUDE_KEYWORDS if keyword in text)
    
    # Hourly rate bonus
    hourly_bonus = 0.2 if re.search(r'\$\d+.*(?:hr|hour)', text) else 0
    
    # Duration mention bonus
    duration_bonus = 0.1 if re.search(r'\d+\s*(?:week|month|year)', text) else 0
    
    # Base score from contract keywords
    base_score = min(contract_matches * 0.2, 0.8)
    
    # Apply bonuses
    score = base_score + hourly_bonus + duration_bonus
    
    # Penalize for exclusion terms
    score = max(0, score - exclude_matches * 0.3)
    
    return min(score, 1.0)

def extract_rate_range(text):
    """Extract hourly rate range from text"""
    if not text:
        return None, None
    
    # Pattern for hourly rates
    rate_patterns = [
        r'\$(\d+(?:\.\d{2})?)\s*-\s*\$(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour)',
        r'\$(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour)',
        r'(\d+(?:\.\d{2})?)\s*-\s*(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour)',
        r'(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour)'
    ]
    
    for pattern in rate_patterns:
        matches = re.findall(pattern, text.lower())
        if matches:
            match = matches[0]
            if isinstance(match, tuple) and len(match) == 2:
                try:
                    return float(match[0]), float(match[1])
                except ValueError:
                    continue
            elif isinstance(match, str):
                try:
                    rate = float(match)
                    return rate, rate
                except ValueError:
                    continue
    
    return None, None

def scrape_jobs_from_source(source_name, config, limit_per_term):
    """Scrape jobs from a specific source"""
    print(f"\n📡 Scraping from {source_name.upper()}")
    
    if not config['enabled']:
        print(f"❌ {source_name} is disabled")
        return []
    
    all_jobs = []
    
    for term in config['search_terms']:
        print(f"  🔍 Searching: '{term}'")
        
        try:
            # Rate limiting
            if config['delay'] > 0:
                time.sleep(config['delay'])
            
            jobs = scrape_jobs(
                site_name=[source_name if source_name != 'zip_recruiter' else 'zip_recruiter'],
                search_term=term,
                location="United States",
                results_wanted=min(limit_per_term, config['results_per_term']),
                hours_old=168,  # Last week
                country_indeed='USA'
            )
            
            if len(jobs) > 0:
                jobs_dict = jobs.to_dict('records')
                
                # Add source information
                for job in jobs_dict:
                    job['source_platform'] = source_name
                    job['search_term'] = term
                    job['scraped_at'] = datetime.now().isoformat()
                
                all_jobs.extend(jobs_dict)
                print(f"    ✅ Found {len(jobs)} jobs")
            else:
                print(f"    ❌ No jobs found")
                
        except Exception as e:
            print(f"    ❌ Error scraping '{term}' from {source_name}: {e}")
            continue
    
    print(f"📊 Total from {source_name}: {len(all_jobs)} jobs")
    return all_jobs

def process_and_filter_jobs(all_jobs, min_contract_score=0.3):
    """Process and filter scraped jobs"""
    print(f"\n🔄 Processing {len(all_jobs)} raw jobs...")
    
    # Remove duplicates by job URL
    seen_urls = set()
    unique_jobs = []
    
    for job in all_jobs:
        job_url = job.get('job_url', '')
        if job_url and job_url not in seen_urls:
            seen_urls.add(job_url)
            unique_jobs.append(job)
    
    print(f"📋 After deduplication: {len(unique_jobs)} unique jobs")
    
    # Filter and score jobs
    filtered_jobs = []
    
    for job in unique_jobs:
        # Calculate contract score
        description = str(job.get('description', ''))
        title = str(job.get('title', ''))
        contract_score = calculate_contract_score(description, title)
        
        # Skip jobs with low contract relevance
        if contract_score < min_contract_score:
            continue
        
        # Extract rate information
        salary_text = str(job.get('compensation', '')) + " " + description
        min_rate, max_rate = extract_rate_range(salary_text)
        
        # Add computed fields
        job['contract_score'] = round(contract_score, 2)
        job['hourly_rate_min'] = min_rate
        job['hourly_rate_max'] = max_rate
        
        # Ensure required fields are present
        if not job.get('title'):
            continue
        if not job.get('company'):
            continue
            
        filtered_jobs.append(job)
    
    print(f"✅ After filtering: {len(filtered_jobs)} contract-relevant jobs")
    return filtered_jobs

def clean_job_data(job):
    """Clean job data for JSON serialization"""
    cleaned = {}
    for key, value in job.items():
        if pd.isna(value) or (isinstance(value, float) and np.isnan(value)):
            cleaned[key] = None
        elif isinstance(value, (pd.Timestamp, datetime)):
            cleaned[key] = value.isoformat() if hasattr(value, 'isoformat') else str(value)
        else:
            cleaned[key] = value
    return cleaned

def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    min_score = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
    
    print(f"🚀 Multi-Source Job Scraper Starting")
    print(f"📋 Target: {limit} jobs maximum")
    print(f"🎯 Min contract score: {min_score}")
    
    all_jobs = []
    
    # Calculate jobs per source
    sources = [name for name, config in SCRAPING_CONFIG.items() if config['enabled']]
    jobs_per_source = limit // len(sources) if sources else 0
    
    # Scrape from each enabled source
    for source_name, config in SCRAPING_CONFIG.items():
        source_jobs = scrape_jobs_from_source(source_name, config, jobs_per_source)
        all_jobs.extend(source_jobs)
    
    if not all_jobs:
        print("❌ No jobs scraped from any source")
        return
    
    # Process and filter jobs
    processed_jobs = process_and_filter_jobs(all_jobs, min_score)
    
    # Clean data for JSON serialization
    cleaned_jobs = [clean_job_data(job) for job in processed_jobs]
    
    # Save results
    output_file = '/root/contracts-only/scripts/temp-scraped-jobs.json'
    with open(output_file, 'w') as f:
        json.dump(cleaned_jobs, f, indent=2, default=str)
    
    # Generate summary
    source_stats = {}
    for job in cleaned_jobs:
        source = job.get('source_platform', 'unknown')
        source_stats[source] = source_stats.get(source, 0) + 1
    
    print(f"\n📊 SCRAPING SUMMARY")
    print(f"   Total jobs scraped: {len(all_jobs)}")
    print(f"   After processing: {len(cleaned_jobs)}")
    print(f"   Contract relevance: {len(cleaned_jobs)/len(all_jobs)*100:.1f}%")
    print(f"\n📋 BY SOURCE:")
    for source, count in source_stats.items():
        print(f"   {source}: {count} jobs")
    
    print(f"\n💾 Results saved to: {output_file}")
    print("✅ Scraping completed successfully")

if __name__ == "__main__":
    main()
