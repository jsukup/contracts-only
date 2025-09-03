# Phase 2: Context Discovery Questions

Based on the codebase analysis, I've identified that ContractsOnly has a well-developed notification infrastructure foundation (70% complete) with database schema, UI components, and email framework already built. The main gaps are in notification creation logic, email templates, and automated scheduling.

## Discovery Questions

### Q1: Should job alert notifications be sent immediately when matching jobs are posted?
**Context**: The job matching engine and email automation framework exist, but timing isn't configured.
**Default if unknown:** Yes (immediate notifications provide better user engagement)

### Q2: Should the weekly digest include job recommendations based on user skills and preferences?
**Context**: Current recruiter weekly digest is fully functional, but contractor weekly digest needs content definition.
**Default if unknown:** Yes (personalized job recommendations are standard for job boards)

### Q3: Should application update notifications be sent for every status change (viewed, shortlisted, rejected)?
**Context**: The notification preference exists in the database but no triggers are implemented.
**Default if unknown:** No (only for significant status changes to avoid spam)

### Q4: Should users receive in-app notifications in addition to email notifications?
**Context**: NotificationCenter component exists and is fully functional for displaying notifications.
**Default if unknown:** Yes (in-app notifications provide immediate feedback)

### Q5: Should the system include notification frequency controls (immediate, daily, weekly)?
**Context**: Current system only has on/off toggles, no frequency controls exist.
**Default if unknown:** No (current on/off system is simpler and already built)

## Next Steps
After answers are collected, I will proceed to Phase 3 (targeted context gathering) and then Phase 4 (expert requirements questions).