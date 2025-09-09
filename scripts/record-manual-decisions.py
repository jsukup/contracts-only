#!/usr/bin/env python3
"""
Record manual review decisions for the 2 jobs that need human verification
"""

import json
from datetime import datetime

def record_decisions():
    # The 2 jobs that need manual review
    jobs_to_review = [
        {
            'url': 'https://www.indeed.com/viewjob?jk=4c83e7b993238674',
            'company': 'Genisis Technology Solutions',
            'title': 'Salesforce Architect (w2)',
            'analysis': 'Mixed signals: has contract/temp/1099 terms but also health insurance/salary/full-time terms'
        },
        {
            'url': 'https://www.indeed.com/viewjob?jk=de3046d0d6b2fa4c', 
            'company': 'infolabs inc',
            'title': 'Programmer – Advanced (Mainframe / COBOL / IDMS)',
            'analysis': 'Mixed signals: has w2 contract/long-term contract terms but also health insurance/salary/full-time terms, 12 month duration'
        }
    ]
    
    print("📋 MANUAL REVIEW DECISION RECORDER")
    print("=" * 50)
    print("Visit each URL and make your decision based on the actual job posting:")
    print()
    
    decisions = []
    
    for i, job in enumerate(jobs_to_review, 1):
        print(f"🔍 JOB #{i}:")
        print(f"   Company: {job['company']}")
        print(f"   Title: {job['title']}")
        print(f"   URL: {job['url']}")
        print(f"   Analysis: {job['analysis']}")
        print()
        
        while True:
            decision = input(f"Decision for Job #{i} (ACCEPT/REJECT): ").upper().strip()
            if decision in ['ACCEPT', 'REJECT']:
                break
            print("❌ Please enter ACCEPT or REJECT")
        
        notes = input("Notes (optional): ").strip()
        
        decisions.append({
            'url': job['url'],
            'company': job['company'],
            'title': job['title'],
            'manual_decision': decision,
            'notes': notes,
            'reviewed_at': datetime.now().isoformat(),
            'reviewed_by': 'human'
        })
        
        print(f"✅ Decision recorded: {decision}")
        print("-" * 40)
    
    # Save decisions
    with open('manual-review-decisions.json', 'w') as f:
        json.dump({
            'decisions': decisions,
            'total_reviewed': len(decisions),
            'session_completed_at': datetime.now().isoformat()
        }, f, indent=2)
    
    print(f"💾 All decisions saved to: manual-review-decisions.json")
    
    # Summary
    accepts = sum(1 for d in decisions if d['manual_decision'] == 'ACCEPT')
    rejects = sum(1 for d in decisions if d['manual_decision'] == 'REJECT')
    
    print(f"\n📊 MANUAL REVIEW SUMMARY:")
    print(f"   ✅ Accepted: {accepts}")
    print(f"   ❌ Rejected: {rejects}")
    print(f"   Total Reviewed: {len(decisions)}")

if __name__ == "__main__":
    record_decisions()