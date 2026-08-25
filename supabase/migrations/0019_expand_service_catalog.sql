-- Round out the service catalog with the remaining everyday services, and
-- add a catch-all "Something Else" service so a customer whose job doesn't
-- fit any existing category can still describe it and get a real job
-- listing that Guys can see and offer on — no code change needed for
-- future custom requests, since the whole request/offer/job pipeline is
-- already fully data-driven off the `services` table.

-- Lawn & Yard
insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Tree Trimming', 'tree-trimming', 'Trim, shape, or remove branches', 'Trimming, shaping, and branch removal for trees and shrubs.', 'quote', 0, 8500, null,
  '[
    {"key":"tree_count","label":"How many trees/shrubs?","type":"number","required":true},
    {"key":"approx_height","label":"Approximate height","type":"select","options":["Under 15 ft","15–30 ft","Over 30 ft"],"required":true},
    {"key":"stump_removal","label":"Does this include stump removal?","type":"boolean","required":false}
  ]'::jsonb, 3
from service_categories where slug = 'lawn-yard';

-- Hauling & Moving
insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Hauling', 'hauling', 'Pickup, delivery, and loading help', 'A Guy and a truck to pick up, deliver, or load items — for anything that isn''t junk removal.', 'hourly', 5000, 7500, 'per hour',
  '[
    {"key":"item_description","label":"What needs to be hauled?","type":"textarea","required":true},
    {"key":"pickup_dropoff","label":"Pickup and drop-off details","type":"textarea","required":true},
    {"key":"estimated_hours","label":"Estimated hours needed","type":"number","required":true}
  ]'::jsonb, 3
from service_categories where slug = 'hauling-moving';

-- Handyman
insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Minor Maintenance', 'minor-maintenance', 'Small fixes and routine upkeep', 'Quick fixes and routine maintenance — filter changes, minor repairs, small installs, and more.', 'hourly', 5000, 5500, 'per hour',
  '[
    {"key":"job_description","label":"What needs attention?","type":"textarea","required":true},
    {"key":"estimated_hours","label":"Estimated hours needed","type":"number","required":true}
  ]'::jsonb, 3
from service_categories where slug = 'handyman';

-- Other — the catch-all. `icon` is intentionally a key with no entry in the
-- frontend icon maps; both fall back to a sensible generic icon by design
-- (see CategoryIcon components), so this needs no icon-map code change.
insert into service_categories (name, slug, description, icon, sort_order) values
  ('Other', 'other', 'Something else? Tell us what you need.', 'custom', 6);

insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Something Else', 'something-else', 'Don''t see it? Tell us what you need.', 'Describe the job and get an offer from a local Guy — for anything that doesn''t fit our other categories.', 'quote', 0, 5000, null,
  '[
    {"key":"job_title","label":"What do you need done?","type":"text","required":true}
  ]'::jsonb, 1
from service_categories where slug = 'other';
