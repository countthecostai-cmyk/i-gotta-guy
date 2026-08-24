-- Atomic, race-safe promo-code redemption. A plain read-then-write
-- increment from application code would let two concurrent redemptions of
-- the last available use both succeed; this does the check-and-increment
-- in a single UPDATE so only one wins.
create or replace function redeem_promotion(promo_id uuid) returns boolean as $$
declare
  did_redeem boolean;
begin
  update promotions
  set used_count = used_count + 1
  where id = promo_id
    and active
    and (max_uses is null or used_count < max_uses)
  returning true into did_redeem;

  return coalesce(did_redeem, false);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function redeem_promotion(uuid) from public;
grant execute on function redeem_promotion(uuid) to service_role;
