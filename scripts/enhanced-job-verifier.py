#!/usr/bin/env python3
"""
Enhanced Job Verification Pipeline

This script combines the improved contract scoring algorithm with Crawl4AI verification
to create a comprehensive job validation system for ContractsOnly.
"""

import asyncio
import json
import sys
import os
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

# Import the enhanced scoring algorithm from jobspy-scraper
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from crawl4ai import AsyncWebCrawler
except ImportError:
    print("❌ Error: crawl4ai not installed. Install with: pip install crawl4ai")
    sys.exit(1)

@dataclass
class EnhancedVerificationResult:
    url: str
    is_accessible: bool
    initial_score: float
    crawl4ai_score: float
    final_score: float
    is_contract_job: bool
    confidence_level: str  # 'HIGH', 'MEDIUM', 'LOW'
    recommendation: str    # 'ACCEPT', 'REJECT', 'MANUAL_REVIEW'
    job_type_found: Optional[str]
    contract_indicators: List[str]
    full_time_indicators: List[str]
    hourly_rate: Optional[str]
    duration: Optional[str]
    error_message: Optional[str]
    verification_method: str  # 'SCRAPING_ONLY', 'CRAWL4AI_VERIFIED', 'BOTH'

class EnhancedJobVerifier:
    def __init__(self):
        # Enhanced contract keywords with weights
        self.contract_keywords = {
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
        self.strong_exclude_keywords = {
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
        self.medium_exclude_keywords = {
            'full-time': 2,
            'permanent': 2,
            'salary': 1,
            'annual salary': 2,
            'base salary': 2,
            'benefits eligible': 1,
            'staff position': 2,
            'direct hire': 2
        }

    def calculate_initial_score(self, description: str, title: str = "") -> Tuple[float, List[str], List[str]]:
        """Calculate initial contract score from scraped data"""
        if not description:
            return 0.0, [], []
        
        text = (description + " " + title).lower()
        
        # Find contract indicators
        contract_indicators = []
        positive_score = 0
        for keyword, weight in self.contract_keywords.items():
            if keyword in text:
                contract_indicators.append(keyword)
                positive_score += weight * 0.1
        
        # Find exclusion indicators
        full_time_indicators = []
        strong_negative_score = 0
        for keyword, weight in self.strong_exclude_keywords.items():
            if keyword in text:
                full_time_indicators.append(keyword)
                strong_negative_score += weight * 0.15
        
        medium_negative_score = 0
        for keyword, weight in self.medium_exclude_keywords.items():
            if keyword in text:
                if keyword not in full_time_indicators:  # Avoid duplicates
                    full_time_indicators.append(keyword)
                medium_negative_score += weight * 0.05
        
        # Bonus for hourly rate mentions
        hourly_bonus = 0
        if re.search(r'\$\d+.*(?:/hr|/hour|per hour|hourly)', text):
            hourly_bonus = 0.3
        elif re.search(r'hourly.*rate|rate.*hourly', text):
            hourly_bonus = 0.2
        
        # Bonus for duration mentions
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
            final_score = min(final_score, 0.1)  # Cap at very low score
        
        # Normalize to 0-1 range
        return max(0.0, min(1.0, final_score)), contract_indicators, full_time_indicators

    async def verify_with_crawl4ai(self, url: str) -> Tuple[float, Optional[str], List[str], List[str], Optional[str], Optional[str]]:
        """Verify job using Crawl4AI to fetch original content"""
        try:
            async with AsyncWebCrawler(verbose=False) as crawler:
                result = await crawler.arun(
                    url=url,
                    word_count_threshold=10,
                    extraction_strategy="NoExtractionStrategy",
                    bypass_cache=True
                )
                
                if not result.success:
                    return 0.0, None, [], [], None, f"Failed to fetch: {result.status_code}"
                
                # Use markdown content if available, otherwise cleaned HTML
                content = result.markdown or result.cleaned_html or result.html or ""
                
                if not content:
                    return 0.0, None, [], [], None, "No content extracted"
                
                # Analyze the fetched content
                score, contract_indicators, full_time_indicators = self.calculate_initial_score(content)
                
                # Extract additional information
                job_type = self._extract_job_type(content.lower())
                hourly_rate = self._extract_hourly_rate(content.lower())
                duration = self._extract_duration(content.lower())
                
                return score, job_type, contract_indicators, full_time_indicators, hourly_rate, duration
                
        except Exception as e:
            return 0.0, None, [], [], None, str(e)

    def _extract_job_type(self, text: str) -> Optional[str]:
        """Extract explicitly mentioned job type"""
        job_type_patterns = [
            r'job\s*type\s*:?\s*([^,.\n]+)',
            r'employment\s*type\s*:?\s*([^,.\n]+)',
            r'position\s*type\s*:?\s*([^,.\n]+)',
            r'work\s*type\s*:?\s*([^,.\n]+)'
        ]
        
        for pattern in job_type_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_hourly_rate(self, text: str) -> Optional[str]:
        """Extract hourly rate information"""
        hourly_rate_patterns = [
            r'\$(\d+(?:\.\d{2})?)\s*-\s*\$(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour|hourly)',
            r'\$(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour|hourly)',
            r'(\d+(?:\.\d{2})?)\s*-\s*(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour|hourly)',
            r'(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour|hourly)'
        ]
        
        for pattern in hourly_rate_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        return None

    def _extract_duration(self, text: str) -> Optional[str]:
        """Extract contract duration information"""
        duration_patterns = [
            r'(\d+)\s*(month|months)',
            r'(\d+)\s*(week|weeks)',
            r'(\d+)\s*-\s*(\d+)\s*(month|months)',
            r'(short\s*term|long\s*term)',
            r'duration\s*:?\s*([^,.\n]+)'
        ]
        
        for pattern in duration_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        return None

    def determine_final_decision(self, initial_score: float, crawl4ai_score: float, 
                               has_crawl4ai_data: bool) -> Tuple[float, str, str, str]:
        """Determine final score, confidence, and recommendation"""
        
        if has_crawl4ai_data:
            # Weight Crawl4AI more heavily as it has original content
            final_score = (crawl4ai_score * 0.7) + (initial_score * 0.3)
            verification_method = "CRAWL4AI_VERIFIED"
        else:
            # Fall back to initial score only
            final_score = initial_score
            verification_method = "SCRAPING_ONLY"
        
        # Determine confidence level
        if has_crawl4ai_data:
            if final_score >= 0.7:
                confidence = "HIGH"
            elif final_score >= 0.4:
                confidence = "MEDIUM"
            else:
                confidence = "HIGH" if crawl4ai_score <= 0.2 else "LOW"
        else:
            confidence = "LOW"  # Without Crawl4AI verification, confidence is always low
        
        # Determine recommendation with stricter thresholds to reduce manual review
        if confidence == "HIGH":
            if final_score >= 0.6:
                recommendation = "ACCEPT"
            else:
                recommendation = "REJECT"
        elif confidence == "MEDIUM":
            if final_score >= 0.55:  # Lowered from 0.7 to reduce manual reviews
                recommendation = "ACCEPT"
            elif final_score <= 0.3:  # Clear rejects to avoid manual review
                recommendation = "REJECT"
            else:
                recommendation = "MANUAL_REVIEW"
        else:  # LOW confidence - be more decisive
            if final_score >= 0.7:  # Only very high scores get manual review
                recommendation = "MANUAL_REVIEW"
            else:
                recommendation = "REJECT"  # Most low confidence jobs are rejected
        
        return final_score, confidence, recommendation, verification_method

    async def verify_job(self, job_data: Dict) -> EnhancedVerificationResult:
        """Perform comprehensive job verification"""
        url = job_data.get('job_url', '')
        title = job_data.get('title', '')
        description = job_data.get('description', '')
        
        # Step 1: Check explicit job type first (avoid wasted Crawl4AI calls)
        job_type_field = job_data.get('job_type', '').lower().strip()
        if job_type_field in ['fulltime', 'full-time', 'full_time', 'permanent', 'employee', 'staff']:
            # Immediate rejection for explicit non-contract types
            return EnhancedVerificationResult(
                url=url,
                is_accessible=True,
                initial_score=0.0,
                crawl4ai_score=0.0,
                final_score=0.0,
                is_contract_job=False,
                confidence_level="HIGH",
                recommendation="REJECT",
                job_type_found=job_type_field,
                contract_indicators=[],
                full_time_indicators=[f"job_type: {job_type_field}"],
                hourly_rate=None,
                duration=None,
                error_message=None,
                verification_method="EXPLICIT_JOB_TYPE_REJECT"
            )
        
        # Step 2: Calculate initial score from scraped data
        initial_score, initial_contract_indicators, initial_full_time_indicators = self.calculate_initial_score(description, title)
        
        # Step 3: Verify with Crawl4AI
        crawl4ai_score, job_type, crawl4ai_contract_indicators, crawl4ai_full_time_indicators, hourly_rate, duration = await self.verify_with_crawl4ai(url)
        
        # Combine indicators from both sources
        all_contract_indicators = list(set(initial_contract_indicators + crawl4ai_contract_indicators))
        all_full_time_indicators = list(set(initial_full_time_indicators + crawl4ai_full_time_indicators))
        
        # Step 4: Determine final decision
        has_crawl4ai_data = crawl4ai_score > 0 and not job_type is None
        final_score, confidence, recommendation, verification_method = self.determine_final_decision(
            initial_score, crawl4ai_score, has_crawl4ai_data
        )
        
        is_contract_job = recommendation == "ACCEPT"
        
        return EnhancedVerificationResult(
            url=url,
            is_accessible=has_crawl4ai_data,
            initial_score=initial_score,
            crawl4ai_score=crawl4ai_score,
            final_score=final_score,
            is_contract_job=is_contract_job,
            confidence_level=confidence,
            recommendation=recommendation,
            job_type_found=job_type,
            contract_indicators=all_contract_indicators,
            full_time_indicators=all_full_time_indicators,
            hourly_rate=hourly_rate,
            duration=duration,
            error_message=None,
            verification_method=verification_method
        )

    async def verify_multiple_jobs(self, jobs_data: List[Dict]) -> List[EnhancedVerificationResult]:
        """Verify multiple jobs with rate limiting"""
        results = []
        
        # Process in batches to avoid overwhelming the target sites
        batch_size = 5
        for i in range(0, len(jobs_data), batch_size):
            batch = jobs_data[i:i + batch_size]
            
            # Process batch concurrently
            tasks = [self.verify_job(job) for job in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    # Create error result
                    error_result = EnhancedVerificationResult(
                        url=batch[j].get('job_url', ''),
                        is_accessible=False,
                        initial_score=0.0,
                        crawl4ai_score=0.0,
                        final_score=0.0,
                        is_contract_job=False,
                        confidence_level="LOW",
                        recommendation="REJECT",
                        job_type_found=None,
                        contract_indicators=[],
                        full_time_indicators=[],
                        hourly_rate=None,
                        duration=None,
                        error_message=str(result),
                        verification_method="ERROR"
                    )
                    results.append(error_result)
                else:
                    results.append(result)
            
            # Add delay between batches
            if i + batch_size < len(jobs_data):
                await asyncio.sleep(2)  # 2 second delay between batches
        
        return results

def format_verification_result(result: EnhancedVerificationResult) -> Dict:
    """Format verification result for JSON output"""
    return {
        "url": result.url,
        "is_accessible": result.is_accessible,
        "initial_score": round(result.initial_score, 3),
        "crawl4ai_score": round(result.crawl4ai_score, 3),
        "final_score": round(result.final_score, 3),
        "is_contract_job": result.is_contract_job,
        "confidence_level": result.confidence_level,
        "recommendation": result.recommendation,
        "job_type_found": result.job_type_found,
        "contract_indicators": result.contract_indicators,
        "full_time_indicators": result.full_time_indicators,
        "hourly_rate": result.hourly_rate,
        "duration": result.duration,
        "error_message": result.error_message,
        "verification_method": result.verification_method,
        "verified_at": datetime.now().isoformat()
    }

async def main():
    """Main function for CLI usage"""
    if len(sys.argv) < 2:
        print("Usage: python enhanced-job-verifier.py <scraped_jobs.json>")
        sys.exit(1)
    
    jobs_file = sys.argv[1]
    
    try:
        with open(jobs_file, 'r') as f:
            jobs_data = json.load(f)
    except Exception as e:
        print(f"Error loading jobs file: {e}")
        sys.exit(1)
    
    if not jobs_data:
        print("No jobs found in input file")
        sys.exit(1)
    
    verifier = EnhancedJobVerifier()
    
    print(f"🔍 Enhanced verification of {len(jobs_data)} job posting(s)...")
    
    results = await verifier.verify_multiple_jobs(jobs_data)
    
    # Analyze results
    accept_count = sum(1 for r in results if r.recommendation == "ACCEPT")
    reject_count = sum(1 for r in results if r.recommendation == "REJECT")
    manual_review_count = sum(1 for r in results if r.recommendation == "MANUAL_REVIEW")
    error_count = sum(1 for r in results if r.error_message)
    
    # Output results
    output = {
        "verification_summary": {
            "total_jobs": len(jobs_data),
            "accepted": accept_count,
            "rejected": reject_count,
            "manual_review": manual_review_count,
            "errors": error_count,
            "crawl4ai_verified": sum(1 for r in results if r.verification_method == "CRAWL4AI_VERIFIED"),
            "verified_at": datetime.now().isoformat()
        },
        "results": [format_verification_result(r) for r in results]
    }
    
    print(json.dumps(output, indent=2))
    
    # Summary
    print(f"\n📊 ENHANCED VERIFICATION SUMMARY:", file=sys.stderr)
    print(f"   Total Jobs: {len(jobs_data)}", file=sys.stderr)
    print(f"   ✅ Accept: {accept_count}", file=sys.stderr)
    print(f"   ❌ Reject: {reject_count}", file=sys.stderr)
    print(f"   🔍 Manual Review: {manual_review_count}", file=sys.stderr)
    print(f"   ⚠️  Errors: {error_count}", file=sys.stderr)
    print(f"   🌐 Crawl4AI Verified: {sum(1 for r in results if r.verification_method == 'CRAWL4AI_VERIFIED')}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(main())