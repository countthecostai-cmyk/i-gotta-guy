-- Let an eligible-but-not-yet-assigned Guy see a job's request-stage
-- photos while deciding whether to offer on it (before/after photos stay
-- restricted to the customer and the assigned Guy only).
drop policy if exists "job_photos_select" on job_photos;

create policy "job_photos_select" on job_photos
  for select using (
    is_admin() or exists (
      select 1 from jobs j where j.id = job_photos.job_id
      and (j.customer_id = auth.uid() or j.guy_id = auth.uid())
    )
    or (
      job_photos.stage = 'request' and exists (
        select 1 from jobs j
        where j.id = job_photos.job_id
        and j.status = 'MATCHING' and j.guy_id is null
        and is_approved_guy(auth.uid())
        and exists (
          select 1 from guy_services gs
          where gs.guy_id = auth.uid() and gs.service_id = j.service_id and gs.active
        )
      )
    )
  );
