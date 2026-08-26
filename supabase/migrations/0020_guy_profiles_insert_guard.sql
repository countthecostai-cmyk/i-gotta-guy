-- Close a self-approval gap in guy_profiles found during passwordless-auth
-- E2E/security testing: 0010_security_hardening.sql locked down UPDATEs to
-- guy_profiles.status (guard_guy_profiles_trust_fields), but that trigger is
-- BEFORE UPDATE only. The original guy_profiles_insert_self policy
-- (0002_rls.sql) still allowed any authenticated user to INSERT a brand-new
-- guy_profiles row for themselves with an arbitrary status — including
-- 'approved' — via a direct REST/SDK call, with zero relationship to
-- whether their profiles.role was ever actually changed to 'guy'.
--
-- Concretely: a Customer could INSERT INTO guy_profiles (id, status) VALUES
-- (auth.uid(), 'approved') directly, giving themselves full Guy capability
-- (accepting jobs, submitting quotes, everything gated on
-- guy_profiles.status = 'approved') while their profiles.role stayed
-- 'customer' — a customer silently acting as a Guy, which requirement #5
-- explicitly prohibits, achieved through a path (raw insert) that never
-- goes through applyAsGuy()'s legitimate role-flip.
--
-- The legitimate self-service path (applyAsGuy() in src/lib/actions/guys.ts)
-- always updates profiles.role to 'guy' *before* upserting guy_profiles, so
-- requiring the caller's profile role already be 'guy' at insert time keeps
-- that flow working unchanged while closing the direct-insert bypass.
drop policy if exists "guy_profiles_insert_self" on guy_profiles;
create policy "guy_profiles_insert_self" on guy_profiles
  for insert with check (
    auth.uid() is null or is_admin()
    or (
      id = auth.uid()
      and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'guy')
    )
  );
