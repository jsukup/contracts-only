# Expert Requirements Answers

## Q1: Should job postings expire automatically after a certain period?
**Answer:** Yes - Jobs will expire after 30 days and require renewal/reposting

## Q2: Will the platform require employers to verify their company identity before posting jobs?
**Answer:** No - No business verification required initially (reduces friction)

## Q3: Should contractors be able to set their availability status?
**Answer:** Yes - Contractors can set availability (available now, available on date, not looking)

## Q4: Will the platform support bulk job imports via CSV/API?
**Answer:** Placeholder only - Add placeholder code for future implementation but not enabled in MVP

## Q5: Should the system automatically match and notify contractors?
**Answer:** Yes - Automatic email notifications for matching jobs based on skills and rate

## Technical Implementation Notes:

### Job Expiration System
- Implement `expires_at` field in jobs table
- Default expiration: 30 days from posting
- Cron job to mark expired jobs as inactive
- Email reminders before expiration (7 days, 1 day)
- One-click renewal option for employers

### Contractor Availability
- Enum field: `available_now`, `available_date`, `not_looking`
- If `available_date`, store specific date
- Display availability badge on profiles
- Filter jobs page by availability status

### Bulk Import (Future Feature)
- Create placeholder API endpoint `/api/jobs/bulk-import`
- Database schema supports bulk operations
- Comment code blocks for CSV parsing logic
- Feature flag: `ENABLE_BULK_IMPORT=false`

### Job Matching Algorithm
- Match based on:
  - Skills overlap (minimum 60% match)
  - Hourly rate within contractor's range
  - Location/remote preferences
  - Contract duration preferences
- Daily email digest option
- Instant notifications for urgent positions
- Unsubscribe management per notification type