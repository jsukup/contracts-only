# Phase 4: Expert Requirements Questions

Based on deep codebase analysis, I need to clarify specific system behaviors for implementation:

## Expert Questions

### Q6: Should job alert notifications use the existing JobMatchingEngine minimum score threshold of 50?
**Context**: The existing matching engine in `src/lib/matching.ts` has configurable score thresholds. Current default is 50, but job alerts might need a higher threshold to avoid spam.
**Default if unknown:** No (use 70 for higher quality matches in notifications)

### Q7: Should application status notifications include the recruiter's contact information or feedback message?
**Context**: The existing application API can store recruiter feedback. Including this in notifications would provide more value but requires additional data handling.
**Default if unknown:** No (keep notifications simple, users can view details in dashboard)

### Q8: Should the weekly digest for contractors include market insights (average rates, trending skills)?
**Context**: The system has access to job posting data that could generate market analytics. This would add significant value but requires data analysis implementation.
**Default if unknown:** Yes (market insights provide valuable context for contractors)

### Q9: Should recruiter job performance summaries include application-to-hire conversion rates?
**Context**: The system tracks application statuses through the full lifecycle. Conversion rate analytics would require calculating ratios across application statuses.
**Default if unknown:** Yes (conversion rates are key recruiting metrics)

### Q10: Should the system batch job alert notifications to send at most one email per user per hour?
**Context**: Multiple matching jobs could be posted rapidly. Batching prevents email spam but may delay important notifications. The existing email queue system supports batching.
**Default if unknown:** Yes (batching improves user experience and reduces email costs)

## Next Steps
After answers are collected, I will generate the comprehensive requirements specification and implementation plan.