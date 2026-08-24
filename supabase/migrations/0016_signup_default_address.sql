-- Optional address collected at customer signup. `signUp()` on the client
-- passes address_* fields through auth metadata (raw_user_meta_data) when
-- present; this trigger materializes them into a real `addresses` row,
-- marked as the customer's default, in the same transaction that creates
-- their profile — so the very first time they land on a request form, a
-- default address is already there to confirm/change instead of typing it
-- in from scratch. Guys don't get one here (they set a service area
-- separately); a request whose role clamps to 'guy' is skipped entirely,
-- consistent with the existing role-clamping in this function.

create or replace function handle_new_user() returns trigger as $$
declare
  requested_role text;
  safe_role user_role;
  addr_line1 text;
begin
  requested_role := new.raw_user_meta_data->>'role';
  if requested_role = 'guy' then
    safe_role := 'guy';
  else
    safe_role := 'customer';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role
  );

  addr_line1 := nullif(trim(new.raw_user_meta_data->>'address_line1'), '');
  if safe_role = 'customer' and addr_line1 is not null then
    insert into public.addresses (user_id, label, line1, line2, city, state, postal_code, is_default)
    values (
      new.id,
      'Home',
      addr_line1,
      nullif(trim(new.raw_user_meta_data->>'address_line2'), ''),
      coalesce(trim(new.raw_user_meta_data->>'address_city'), ''),
      coalesce(trim(new.raw_user_meta_data->>'address_state'), ''),
      coalesce(trim(new.raw_user_meta_data->>'address_postal_code'), ''),
      true
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
