#!/usr/bin/env python3
"""
Finalize job imports by combining automated accepts + manual review accepts
"""

import json
from datetime import datetime

def finalize_imports():
    print("📦 FINALIZING JOB IMPORTS")
    print("=" * 50)
    
    # Load verification results 
    try:
        # Run verification to get latest results
        import subprocess
        result = subprocess.run([
            'bash', '-c', 
            'source ../job-scraper-env/bin/activate && python3 enhanced-job-verifier.py temp-scraped-jobs.json'
        ], capture_output=True, text=True, timeout=300, cwd='/root/contracts-only/scripts')
        
        # Extract JSON from output
        output_lines = result.stdout.strip().split('\n')
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
        
        json_text = '\n'.join(output_lines[json_start:json_end+1])
        verification_data = json.loads(json_text)
        
    except Exception as e:
        print(f"❌ Error loading verification results: {e}")
        return
    
    # Load original job data
    try:
        with open('/root/contracts-only/scripts/temp-scraped-jobs.json', 'r') as f:
            jobs_data = json.load(f)
            job_lookup = {job['job_url']: job for job in jobs_data}
    except Exception as e:
        print(f"❌ Error loading job data: {e}")
        return
    
    # Load manual decisions
    try:
        with open('/root/contracts-only/scripts/manual-review-decisions.json', 'r') as f:
            manual_decisions = json.load(f)
            manual_accepts = {d['url'] for d in manual_decisions['decisions'] if d['manual_decision'] == 'ACCEPT'}
    except Exception as e:
        print("ℹ️ No manual decisions found")
        manual_accepts = set()
    
    # Collect all accepted jobs
    accepted_jobs = []
    auto_accepts = 0
    manual_review_accepts = 0
    
    for result in verification_data['results']:
        url = result['url']
        
        # Auto-accepted jobs
        if result['recommendation'] == 'ACCEPT':
            if url in job_lookup:
                job = job_lookup[url].copy()
                job['verification_score'] = result['final_score']
                job['verification_method'] = result['verification_method']
                job['confidence_level'] = result['confidence_level']
                job['contract_indicators'] = result['contract_indicators']
                job['verified_at'] = result['verified_at']
                accepted_jobs.append(job)
                auto_accepts += 1
        
        # Manual review jobs that were accepted
        elif result['recommendation'] == 'MANUAL_REVIEW' and url in manual_accepts:
            if url in job_lookup:
                job = job_lookup[url].copy()
                job['verification_score'] = result['final_score']
                job['verification_method'] = 'MANUAL_REVIEW_ACCEPTED'
                job['confidence_level'] = 'HUMAN_VERIFIED'
                job['contract_indicators'] = result['contract_indicators']
                job['verified_at'] = result['verified_at']
                accepted_jobs.append(job)
                manual_review_accepts += 1
    
    # Save final accepted jobs
    with open('/root/contracts-only/scripts/final-accepted-jobs.json', 'w') as f:
        json.dump(accepted_jobs, f, indent=2, default=str)
    
    # Generate summary
    summary = {
        'import_summary': {
            'total_jobs_processed': verification_data['verification_summary']['total_jobs'],
            'auto_accepted': auto_accepts,
            'manual_review_accepted': manual_review_accepts,
            'total_accepted': len(accepted_jobs),
            'acceptance_rate': f"{len(accepted_jobs)/verification_data['verification_summary']['total_jobs']*100:.1f}%",
            'manual_review_rate': f"{verification_data['verification_summary']['manual_review']/verification_data['verification_summary']['total_jobs']*100:.1f}%",
            'finalized_at': datetime.now().isoformat()
        },
        'source_breakdown': {},
        'next_steps': [
            "Review final-accepted-jobs.json",
            "Import to database using: node scripts/job-seeder.js --import-verified final-accepted-jobs.json",
            "Monitor for any import errors"
        ]
    }
    
    # Source breakdown
    for job in accepted_jobs:
        source = job.get('source_platform', 'unknown')
        summary['source_breakdown'][source] = summary['source_breakdown'].get(source, 0) + 1
    
    print("📊 FINAL IMPORT SUMMARY:")
    print("=" * 40)
    print(f"Total Jobs Processed: {summary['import_summary']['total_jobs_processed']}")
    print(f"✅ Auto-Accepted: {auto_accepts}")
    print(f"🔍 Manual Review Accepted: {manual_review_accepts}")
    print(f"📦 Total Ready for Import: {len(accepted_jobs)}")
    print(f"📈 Overall Acceptance Rate: {summary['import_summary']['acceptance_rate']}")
    print(f"🎯 Manual Review Rate: {summary['import_summary']['manual_review_rate']}")
    
    print(f"\n📋 BY SOURCE:")
    for source, count in summary['source_breakdown'].items():
        print(f"   {source}: {count} jobs")
    
    print(f"\n💾 Files Generated:")
    print(f"   📄 final-accepted-jobs.json ({len(accepted_jobs)} jobs)")
    print(f"   📊 import-summary.json (metadata)")
    
    print(f"\n🚀 NEXT STEPS:")
    for step in summary['next_steps']:
        print(f"   • {step}")
    
    # Save summary
    with open('/root/contracts-only/scripts/import-summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n✅ Job import preparation completed successfully!")

if __name__ == "__main__":
    finalize_imports()