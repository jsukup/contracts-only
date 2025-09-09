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
        'results_per_term': 40,
        'delay': 1,  # seconds between requests
        'search_terms': [
            "independent contractor software",
            "contract-to-hire developer remote",
            "1099 contract developer", 
            "W2 contract programmer",
            "contract software engineer remote",
            "contractor programming remote",
            "freelance developer contract",
            "temporary software contractor"
        ]
    },
    'linkedin': {
        'enabled': True,
        'results_per_term': 20,  # Conservative due to rate limits
        'delay': 3,  # Longer delay for LinkedIn
        'search_terms': [
            "independent contractor developer",
            "contract-to-hire software",
            "contractor remote programming",
            "freelance software engineer"
        ]
    },
    'glassdoor': {
        'enabled': False,  # Disabled due to consistent 400 errors
        'results_per_term': 30,
        'delay': 2,
        'search_terms': [
            "independent contractor programming",
            "contract-to-hire developer",
            "contractor software remote",
            "freelance programming contract"
        ]
    }
}

# Enhanced contract keywords with weights
CONTRACT_KEYWORDS = {
    # High confidence contract indicators
    'independent contractor': 3,
    'contract-to-hire': 3,
    'c2h': 3,
    '1099 contractor': 3,
    'w2 contract': 3,
    'contract position': 3,
    'contract role': 3,
    
    # Medium confidence indicators
    'contractor': 2,
    'contract': 2,
    'freelance': 2,
    'contracting': 2,
    'contract work': 2,
    'consultant': 2,
    'temp': 2,
    'temporary': 2,
    '1099': 2,
    
    # Lower confidence indicators
    'project-based': 1,
    'short-term': 1,
    'long-term contract': 2
}

# Strong exclusion keywords (definitive full-time indicators)
STRONG_EXCLUDE_KEYWORDS = {
    'full-time employee': 5,
    'permanent position': 5,
    'employee benefits': 4,
    'comprehensive benefits': 4,
    'health insurance': 3,
    'dental insurance': 3,
    'vision insurance': 3,
    '401k': 3,
    'paid time off': 3,
    'pto': 3,
    'vacation days': 3,
    'sick leave': 3,
    'parental leave': 3,
    'no contractors': 5,
    'employees only': 5,
    'w-2 only': 4
}

# Medium exclusion keywords (potential full-time indicators)
MEDIUM_EXCLUDE_KEYWORDS = {
    'full-time': 2,
    'permanent': 2,
    'salary': 1,
    'annual salary': 2,
    'base salary': 2,
    'benefits eligible': 1,
    'staff position': 2,
    'direct hire': 2
}

def calculate_contract_score(description, title=""):
    """Calculate enhanced contract relevance score (0-1) with weighted keywords"""
    if not description:
        return 0
    
    text = (description + " " + title).lower()
    
    # Calculate positive score from contract indicators
    positive_score = 0
    for keyword, weight in CONTRACT_KEYWORDS.items():
        if keyword in text:
            positive_score += weight * 0.1  # Scale weights to reasonable values
    
    # Calculate negative score from strong exclusion terms
    strong_negative_score = 0
    for keyword, weight in STRONG_EXCLUDE_KEYWORDS.items():
        if keyword in text:
            strong_negative_score += weight * 0.15  # Higher penalty for strong indicators
    
    # Calculate negative score from medium exclusion terms
    medium_negative_score = 0
    for keyword, weight in MEDIUM_EXCLUDE_KEYWORDS.items():
        if keyword in text:
            medium_negative_score += weight * 0.05  # Lower penalty for medium indicators
    
    # Bonus for hourly rate mentions (strong contract indicator)
    hourly_bonus = 0
    if re.search(r'\$\d+.*(?:/hr|/hour|per hour|hourly)', text):
        hourly_bonus = 0.3
    elif re.search(r'hourly.*rate|rate.*hourly', text):
        hourly_bonus = 0.2
    
    # Bonus for duration mentions (contracts have specific durations)
    duration_bonus = 0
    if re.search(r'\d+\s*(?:month|week|months|weeks)\s*(?:contract|project|assignment)', text):
        duration_bonus = 0.2
    elif re.search(r'\d+\s*(?:month|week|months|weeks)', text):
        duration_bonus = 0.1
    
    # Check for explicit job type mentions
    job_type_penalty = 0
    if re.search(r'job\s*type\s*:?\s*full[-\s]*time', text) or re.search(r'employment\s*type\s*:?\s*full[-\s]*time', text):
        job_type_penalty = 0.5
    elif re.search(r'job\s*type\s*:?\s*permanent', text) or re.search(r'employment\s*type\s*:?\s*permanent', text):
        job_type_penalty = 0.4
    
    job_type_bonus = 0
    if re.search(r'job\s*type\s*:?\s*contract', text) or re.search(r'employment\s*type\s*:?\s*contract', text):
        job_type_bonus = 0.4
    elif re.search(r'job\s*type\s*:?\s*(?:temp|temporary|freelance)', text):
        job_type_bonus = 0.3
    
    # Calculate final score
    total_score = positive_score + hourly_bonus + duration_bonus + job_type_bonus
    total_penalty = strong_negative_score + medium_negative_score + job_type_penalty
    
    final_score = total_score - total_penalty
    
    # Additional logic: if strong exclusion terms are present with no contract terms, score should be very low
    if strong_negative_score > 0.4 and positive_score < 0.2:
        final_score = max(final_score, 0.1)  # Cap at very low score
    
    # Normalize to 0-1 range
    return max(0.0, min(1.0, final_score))

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
                site_name=[source_name],
                search_term=term,
                location="United States",
                results_wanted=min(limit_per_term, config['results_per_term']),
                hours_old=168,  # Last week
                country_indeed='USA',
                job_type='contract'  # Force contract jobs only
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
    explicit_rejects = 0
    
    for job in unique_jobs:
        # EXPLICIT JOB TYPE REJECTION - Check job_type field first
        job_type = str(job.get('job_type', '')).lower().strip()
        if job_type in ['fulltime', 'full-time', 'full_time', 'permanent', 'employee', 'staff']:
            explicit_rejects += 1
            continue
            
        # EXPLICIT JOB TYPE ACCEPTANCE - Skip scoring if already confirmed contract
        explicit_contract = job_type in ['contract', 'contractor', 'freelance', 'temp', 'temporary', 'consultant']
        
        if explicit_contract:
            # Skip keyword scoring for explicitly marked contract jobs
            contract_score = 0.8  # High confidence for explicit contract jobs
        else:
            # Calculate contract score for unclear job types
            description = str(job.get('description', ''))
            title = str(job.get('title', ''))
            contract_score = calculate_contract_score(description, title)
        
        # Skip jobs with low contract relevance (only applies to keyword-scored jobs)
        if not explicit_contract and contract_score < min_contract_score:
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
    
    print(f"🚫 Explicit job type rejections: {explicit_rejects}")
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
