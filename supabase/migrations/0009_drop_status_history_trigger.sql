-- The app now logs every job_status_history row explicitly (with real
-- changed_by/note metadata) in src/lib/actions/jobs.ts. The DB trigger was
-- firing in addition to that app-code logging, producing duplicate rows
-- with changed_by/note hardcoded to null. Removing the trigger + its
-- function leaves the richer app-code logging as the single source of truth.
drop trigger if exists job_status_change_trigger on jobs;
drop function if exists log_job_status_change();
