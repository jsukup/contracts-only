#!/usr/bin/env python3
"""
Analyze verification results and create manual review queue
"""

import json

# Load verification results
with open('/root/contracts-only/scripts/verification-parsed.json', 'r') as f:
    data = json.load(f)

summary = data['verification_summary']
results = data['results']

# Categorize results
accepted = [r for r in results if r['recommendation'] == 'ACCEPT']
rejected = [r for r in results if r['recommendation'] == 'REJECT']
manual_review = [r for r in results if r['recommendation'] == 'MANUAL_REVIEW']

print("=" * 60)
print("📊 FULL-SCALE JOB SCRAPING & VERIFICATION REPORT")
print("=" * 60)

print("\n🔍 SCRAPING METRICS:")
print(f"  Initial Jobs Scraped: 273")
print(f"  After Deduplication: 270")
print(f"  Passed Initial Filter (score ≥ 0.5): 65 (24.1%)")

print("\n✅ VERIFICATION METRICS:")
print(f"  Total Jobs Verified: {summary['total_jobs']}")
print(f"  Crawl4AI Success Rate: {summary['crawl4ai_verified']}/{summary['total_jobs']} ({summary['crawl4ai_verified']*100//summary['total_jobs']}%)")
print(f"  Accepted (High Confidence): {summary['accepted']} ({summary['accepted']*100//summary['total_jobs']}%)")
print(f"  Rejected (Definite Full-Time): {summary['rejected']} ({summary['rejected']*100//summary['total_jobs']}%)")
print(f"  Manual Review Required: {summary['manual_review']} ({summary['manual_review']*100//summary['total_jobs']}%)")

print("\n📈 PIPELINE EFFICIENCY:")
print(f"  Raw → Filtered: 273 → 65 (76% filtered out)")
print(f"  Filtered → Accepted: 65 → {summary['accepted']} ({100-summary['accepted']*100//65}% additional filtering)")
print(f"  Overall Success Rate: {summary['accepted']}/273 ({summary['accepted']*100//273}%)")

print("\n🔍 MANUAL REVIEW QUEUE:")
print(f"  Jobs Requiring Review: {len(manual_review)}")

# Create manual review file with key information
manual_review_data = []
for job in manual_review:
    manual_review_data.append({
        'url': job['url'],
        'initial_score': job['initial_score'],
        'crawl4ai_score': job['crawl4ai_score'],
        'final_score': job['final_score'],
        'confidence_level': job['confidence_level'],
        'job_type_found': job['job_type_found'],
        'contract_indicators': job['contract_indicators'],
        'full_time_indicators': job['full_time_indicators'],
        'hourly_rate': job['hourly_rate'],
        'duration': job['duration']
    })

# Save manual review queue
with open('/root/contracts-only/scripts/manual-review-queue.json', 'w') as f:
    json.dump(manual_review_data, f, indent=2)

print(f"  ✅ Manual review queue saved to: manual-review-queue.json")

# Show sample of manual review jobs
print("\n  Sample Jobs for Manual Review:")
for i, job in enumerate(manual_review_data[:3], 1):
    print(f"\n  {i}. URL: {job['url']}")
    print(f"     Scores: Initial={job['initial_score']:.2f}, Crawl4AI={job['crawl4ai_score']:.2f}, Final={job['final_score']:.2f}")
    print(f"     Job Type Found: {job['job_type_found']}")
    print(f"     Contract Indicators: {', '.join(job['contract_indicators'][:3]) if job['contract_indicators'] else 'None'}")
    print(f"     Full-Time Indicators: {', '.join(job['full_time_indicators'][:3]) if job['full_time_indicators'] else 'None'}")

print("\n" + "=" * 60)
print("✅ ANALYSIS COMPLETE")
print("=" * 60)