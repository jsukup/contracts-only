#!/usr/bin/env python3
"""
Crawl4AI Job Verification Tool

This script uses Crawl4AI to fetch and verify job postings from external URLs
to ensure they are truly contract positions.
"""

import asyncio
import json
import sys
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

try:
    from crawl4ai import AsyncWebCrawler
except ImportError:
    print("❌ Error: crawl4ai not installed. Install with: pip install crawl4ai")
    sys.exit(1)

@dataclass
class JobVerificationResult:
    url: str
    is_accessible: bool
    is_contract_job: bool
    confidence_score: float
    job_type_found: Optional[str]
    contract_indicators: List[str]
    full_time_indicators: List[str]
    hourly_rate: Optional[str]
    duration: Optional[str]
    error_message: Optional[str]
    content_preview: str

class Crawl4AIJobVerifier:
    def __init__(self):
        self.contract_keywords = [
            'contract', 'contractor', 'contract-to-hire', 'c2h', 
            'independent contractor', 'contract position', 'contract role', 
            'contracting', 'contract work', 'freelance', 'consultant',
            'temporary', 'temp', '1099', 'w2 contract', 'project-based'
        ]
        
        self.full_time_keywords = [
            'full-time', 'full time', 'permanent position', 'permanent employee',
            'employee benefits', 'health insurance', '401k', 'pto', 'paid time off',
            'vacation days', 'sick leave', 'parental leave', 'dental insurance',
            'vision insurance', 'life insurance', 'disability insurance'
        ]
        
        self.job_type_patterns = [
            r'job\s*type\s*:?\s*([^,.\n]+)',
            r'employment\s*type\s*:?\s*([^,.\n]+)',
            r'position\s*type\s*:?\s*([^,.\n]+)',
            r'work\s*type\s*:?\s*([^,.\n]+)'
        ]
        
        self.hourly_rate_patterns = [
            r'\$(\d+(?:\.\d{2})?)\s*-\s*\$(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour|hourly)',
            r'\$(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour|hourly)',
            r'(\d+(?:\.\d{2})?)\s*-\s*(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour|hourly)',
            r'(\d+(?:\.\d{2})?)\s*(?:/|\s)*(?:hr|hour|hourly)'
        ]

    async def verify_job_url(self, url: str) -> JobVerificationResult:
        """Verify if a job URL contains a contract position"""
        try:
            async with AsyncWebCrawler(verbose=False) as crawler:
                result = await crawler.arun(
                    url=url,
                    word_count_threshold=10,
                    extraction_strategy="NoExtractionStrategy",
                    bypass_cache=True
                )
                
                if not result.success:
                    return JobVerificationResult(
                        url=url,
                        is_accessible=False,
                        is_contract_job=False,
                        confidence_score=0.0,
                        job_type_found=None,
                        contract_indicators=[],
                        full_time_indicators=[],
                        hourly_rate=None,
                        duration=None,
                        error_message=f"Failed to fetch: {result.status_code}",
                        content_preview=""
                    )
                
                # Analyze the content
                content = result.cleaned_html or result.html or ""
                markdown_content = result.markdown or ""
                
                # Use markdown if available, otherwise use cleaned HTML
                text_content = markdown_content if markdown_content else content
                
                return self._analyze_content(url, text_content)
                
        except Exception as e:
            return JobVerificationResult(
                url=url,
                is_accessible=False,
                is_contract_job=False,
                confidence_score=0.0,
                job_type_found=None,
                contract_indicators=[],
                full_time_indicators=[],
                hourly_rate=None,
                duration=None,
                error_message=str(e),
                content_preview=""
            )

    def _analyze_content(self, url: str, content: str) -> JobVerificationResult:
        """Analyze job content to determine if it's a contract position"""
        if not content:
            return JobVerificationResult(
                url=url,
                is_accessible=True,
                is_contract_job=False,
                confidence_score=0.0,
                job_type_found=None,
                contract_indicators=[],
                full_time_indicators=[],
                hourly_rate=None,
                duration=None,
                error_message="No content extracted",
                content_preview=""
            )
        
        text = content.lower()
        
        # Find contract indicators
        contract_indicators = [kw for kw in self.contract_keywords if kw in text]
        
        # Find full-time indicators
        full_time_indicators = [kw for kw in self.full_time_keywords if kw in text]
        
        # Extract job type if explicitly mentioned
        job_type_found = self._extract_job_type(text)
        
        # Extract hourly rate
        hourly_rate = self._extract_hourly_rate(text)
        
        # Extract duration
        duration = self._extract_duration(text)
        
        # Calculate confidence score
        confidence_score = self._calculate_confidence_score(
            contract_indicators, full_time_indicators, job_type_found, hourly_rate, duration
        )
        
        # Determine if it's a contract job
        is_contract_job = confidence_score > 0.5
        
        # Create content preview (first 200 chars)
        content_preview = content[:200] + "..." if len(content) > 200 else content
        
        return JobVerificationResult(
            url=url,
            is_accessible=True,
            is_contract_job=is_contract_job,
            confidence_score=confidence_score,
            job_type_found=job_type_found,
            contract_indicators=contract_indicators,
            full_time_indicators=full_time_indicators,
            hourly_rate=hourly_rate,
            duration=duration,
            error_message=None,
            content_preview=content_preview
        )

    def _extract_job_type(self, text: str) -> Optional[str]:
        """Extract explicitly mentioned job type"""
        for pattern in self.job_type_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_hourly_rate(self, text: str) -> Optional[str]:
        """Extract hourly rate information"""
        for pattern in self.hourly_rate_patterns:
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

    def _calculate_confidence_score(self, contract_indicators: List[str], 
                                  full_time_indicators: List[str],
                                  job_type_found: Optional[str],
                                  hourly_rate: Optional[str],
                                  duration: Optional[str]) -> float:
        """Calculate confidence score for contract job classification"""
        score = 0.0
        
        # Contract keywords boost
        score += len(contract_indicators) * 0.2
        
        # Full-time keywords penalty
        score -= len(full_time_indicators) * 0.15
        
        # Job type explicit mention
        if job_type_found:
            job_type_lower = job_type_found.lower()
            if any(kw in job_type_lower for kw in ['contract', 'temporary', 'freelance']):
                score += 0.4
            elif any(kw in job_type_lower for kw in ['full-time', 'permanent']):
                score -= 0.4
        
        # Hourly rate indication
        if hourly_rate:
            score += 0.2
        
        # Duration indication
        if duration:
            score += 0.1
        
        # Normalize to 0-1 range
        return max(0.0, min(1.0, score))

    async def verify_multiple_jobs(self, urls: List[str]) -> List[JobVerificationResult]:
        """Verify multiple job URLs concurrently"""
        tasks = [self.verify_job_url(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        verified_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                verified_results.append(JobVerificationResult(
                    url=urls[i],
                    is_accessible=False,
                    is_contract_job=False,
                    confidence_score=0.0,
                    job_type_found=None,
                    contract_indicators=[],
                    full_time_indicators=[],
                    hourly_rate=None,
                    duration=None,
                    error_message=str(result),
                    content_preview=""
                ))
            else:
                verified_results.append(result)
        
        return verified_results

def format_verification_result(result: JobVerificationResult) -> Dict:
    """Format verification result for JSON output"""
    return {
        "url": result.url,
        "is_accessible": result.is_accessible,
        "is_contract_job": result.is_contract_job,
        "confidence_score": round(result.confidence_score, 3),
        "job_type_found": result.job_type_found,
        "contract_indicators": result.contract_indicators,
        "full_time_indicators": result.full_time_indicators,
        "hourly_rate": result.hourly_rate,
        "duration": result.duration,
        "error_message": result.error_message,
        "verified_at": datetime.now().isoformat()
    }

async def main():
    """Main function for CLI usage"""
    if len(sys.argv) < 2:
        print("Usage: python crawl4ai-job-verifier.py <job_url> [job_url2] [job_url3] ...")
        print("   or: python crawl4ai-job-verifier.py --json-file urls.json")
        sys.exit(1)
    
    verifier = Crawl4AIJobVerifier()
    
    if sys.argv[1] == '--json-file':
        # Load URLs from JSON file
        if len(sys.argv) < 3:
            print("Error: JSON file path required")
            sys.exit(1)
        
        try:
            with open(sys.argv[2], 'r') as f:
                data = json.load(f)
                urls = data if isinstance(data, list) else data.get('urls', [])
        except Exception as e:
            print(f"Error loading JSON file: {e}")
            sys.exit(1)
    else:
        # URLs from command line arguments
        urls = sys.argv[1:]
    
    if not urls:
        print("Error: No URLs provided")
        sys.exit(1)
    
    print(f"🔍 Verifying {len(urls)} job posting(s)...")
    
    results = await verifier.verify_multiple_jobs(urls)
    
    # Output results
    output = {
        "verification_summary": {
            "total_urls": len(urls),
            "accessible": sum(1 for r in results if r.is_accessible),
            "contract_jobs": sum(1 for r in results if r.is_contract_job),
            "non_contract_jobs": sum(1 for r in results if r.is_accessible and not r.is_contract_job),
            "errors": sum(1 for r in results if not r.is_accessible),
            "verified_at": datetime.now().isoformat()
        },
        "results": [format_verification_result(r) for r in results]
    }
    
    print(json.dumps(output, indent=2))
    
    # Summary
    print(f"\n📊 VERIFICATION SUMMARY:", file=sys.stderr)
    print(f"   Total URLs: {output['verification_summary']['total_urls']}", file=sys.stderr)
    print(f"   Accessible: {output['verification_summary']['accessible']}", file=sys.stderr)
    print(f"   Contract Jobs: {output['verification_summary']['contract_jobs']}", file=sys.stderr)
    print(f"   Non-Contract: {output['verification_summary']['non_contract_jobs']}", file=sys.stderr)
    print(f"   Errors: {output['verification_summary']['errors']}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(main())