#!/usr/bin/env python3
"""
Prepare accepted jobs for database import
"""

import json

# Load original scraped data
with open('/root/contracts-only/scripts/temp-scraped-jobs.json', 'r') as f:
    scraped_jobs = json.load(f)

# Create a mapping from URL to original job data
job_map = {job['job_url']: job for job in scraped_jobs}

# Load verification results
with open('/root/contracts-only/scripts/verification-parsed.json', 'r') as f:
    verification_data = json.load(f)

# Extract accepted jobs
accepted_jobs = []
for result in verification_data['results']:
    if result['recommendation'] == 'ACCEPT':
        url = result['url']
        if url in job_map:
            # Get original job data and add verification metadata
            job = job_map[url].copy()
            job['verification_score'] = result['final_score']
            job['verification_method'] = result['verification_method']
            job['verified_at'] = result['verified_at']
            accepted_jobs.append(job)

# Save accepted jobs for import
with open('/root/contracts-only/scripts/accepted-jobs.json', 'w') as f:
    json.dump(accepted_jobs, f, indent=2)

print("=" * 60)
print("📦 JOBS READY FOR DATABASE IMPORT")
print("=" * 60)
print(f"\n✅ Accepted Jobs: {len(accepted_jobs)}")
print(f"📁 File: accepted-jobs.json")
print(f"\n📊 Verification Methods:")

crawl4ai_count = sum(1 for j in accepted_jobs if j.get('verification_method') == 'CRAWL4AI_VERIFIED')
scraping_only_count = len(accepted_jobs) - crawl4ai_count

print(f"  - Crawl4AI Verified: {crawl4ai_count}")
print(f"  - Scraping Only: {scraping_only_count}")

print(f"\n📈 Score Distribution:")
scores = [j['verification_score'] for j in accepted_jobs]
if scores:
    print(f"  - Average Score: {sum(scores)/len(scores):.2f}")
    print(f"  - Min Score: {min(scores):.2f}")
    print(f"  - Max Score: {max(scores):.2f}")

print("\n💾 To import to database, run:")
print("   node scripts/job-seeder.js --import-verified accepted-jobs.json")
print("\n" + "=" * 60)