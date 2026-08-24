-- Seed the service catalog with real, launch-ready categories and services.
-- This is operational configuration data (the kind an admin would enter through
-- the admin dashboard), not fake demo/user data — the marketplace is unusable
-- without a catalog. Admins can edit/add to all of this via /admin/services.

insert into service_categories (name, slug, description, icon, sort_order) values
  ('Lawn & Yard', 'lawn-yard', 'Mowing, cleanup, and everyday yard work', 'trees', 1),
  ('Cleaning', 'cleaning', 'Vent cleaning, pressure washing, and more', 'sparkles', 2),
  ('Hauling & Moving', 'hauling-moving', 'Junk removal and moving help', 'truck', 3),
  ('Handyman', 'handyman', 'Repairs, assembly, and small home projects', 'wrench', 4),
  ('Painting', 'painting', 'Interior and exterior painting', 'paintbrush', 5);

-- Lawn & Yard
insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Lawn Mowing', 'lawn-mowing', 'Mow, edge, and clean up', 'A Guy shows up and mows, edges, and blows off your lawn.', 'sqft', 500, 4500, 'per 1,000 sq ft',
  '[
    {"key":"lawn_size_sqft","label":"Approximate lawn size (sq ft)","type":"number","required":true},
    {"key":"areas","label":"Which areas need mowing?","type":"multiselect","options":["Front yard","Back yard","Side yard"],"required":true},
    {"key":"overgrown","label":"Is the grass significantly overgrown?","type":"boolean","required":false},
    {"key":"notes","label":"Anything else your Guy should know?","type":"textarea","required":false}
  ]'::jsonb, 1
from service_categories where slug = 'lawn-yard';

insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Yard Cleanup', 'yard-cleanup', 'Leaves, debris, and overgrowth', 'Leaf removal, weed trimming, and general yard cleanup.', 'hourly', 4500, 6500, 'per hour',
  '[
    {"key":"job_type","label":"What kind of cleanup?","type":"multiselect","options":["Leaf removal","Weed trimming","Brush/debris removal","General cleanup"],"required":true},
    {"key":"estimated_hours","label":"Estimated hours needed","type":"number","required":true},
    {"key":"notes","label":"Anything else your Guy should know?","type":"textarea","required":false}
  ]'::jsonb, 2
from service_categories where slug = 'lawn-yard';

-- Cleaning
insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Dryer Vent Cleaning', 'dryer-vent-cleaning', 'Clear lint buildup, reduce fire risk', 'Full dryer vent cleaning from the dryer to the exterior exhaust.', 'flat', 12500, 12500, null,
  '[
    {"key":"vent_length_ft","label":"Approximate vent length (ft), if known","type":"number","required":false},
    {"key":"last_cleaned","label":"When was it last cleaned?","type":"text","required":false},
    {"key":"notes","label":"Anything else your Guy should know?","type":"textarea","required":false}
  ]'::jsonb, 1
from service_categories where slug = 'cleaning';

insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Air Vent Cleaning', 'air-vent-cleaning', 'Cleaner air, better airflow', 'Cleaning of air ducts and vents throughout your home.', 'quantity', 2500, 9500, 'per vent',
  '[
    {"key":"vent_count","label":"How many vents?","type":"number","required":true},
    {"key":"notes","label":"Anything else your Guy should know?","type":"textarea","required":false}
  ]'::jsonb, 2
from service_categories where slug = 'cleaning';

insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Pressure Washing', 'pressure-washing', 'Driveways, siding, patios', 'Pressure washing for driveways, walkways, siding, decks, and patios.', 'sqft', 15, 8500, 'per sq ft',
  '[
    {"key":"surface_type","label":"What needs washing?","type":"multiselect","options":["Driveway","Walkway","Siding","Deck/Patio","Fence"],"required":true},
    {"key":"approx_sqft","label":"Approximate area (sq ft)","type":"number","required":true},
    {"key":"notes","label":"Anything else your Guy should know?","type":"textarea","required":false}
  ]'::jsonb, 3
from service_categories where slug = 'cleaning';

-- Hauling & Moving
insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Junk Removal', 'junk-removal', 'Haul it away, no questions asked', 'Removal and disposal of furniture, appliances, and general junk.', 'quote', 0, 6500, null,
  '[
    {"key":"item_description","label":"What needs to be hauled away?","type":"textarea","required":true},
    {"key":"approx_load_size","label":"Approximate load size","type":"select","options":["A few items","Quarter truckload","Half truckload","Full truckload"],"required":true},
    {"key":"photos_note","label":"Photos help your Guy quote accurately","type":"textarea","required":false}
  ]'::jsonb, 1
from service_categories where slug = 'hauling-moving';

insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Moving Help', 'moving-help', 'Loading, unloading, heavy lifting', 'Extra hands for loading, unloading, and moving furniture.', 'hourly', 5500, 8500, 'per hour',
  '[
    {"key":"num_helpers","label":"How many helpers do you need?","type":"number","required":true},
    {"key":"estimated_hours","label":"Estimated hours needed","type":"number","required":true},
    {"key":"notes","label":"Anything else your Guy should know?","type":"textarea","required":false}
  ]'::jsonb, 2
from service_categories where slug = 'hauling-moving';

-- Handyman
insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Furniture Assembly', 'furniture-assembly', 'Flat-pack furniture, built right', 'Assembly of flat-pack and ready-to-assemble furniture.', 'quantity', 3500, 4500, 'per item',
  '[
    {"key":"item_count","label":"How many items?","type":"number","required":true},
    {"key":"item_types","label":"What are you assembling?","type":"textarea","required":true}
  ]'::jsonb, 1
from service_categories where slug = 'handyman';

insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'General Handyman', 'general-handyman', 'Small repairs and fixes', 'Minor home repairs — mounting, fixture swaps, small fixes.', 'hourly', 6000, 6000, 'per hour',
  '[
    {"key":"job_description","label":"What needs fixing?","type":"textarea","required":true},
    {"key":"estimated_hours","label":"Estimated hours needed","type":"number","required":true}
  ]'::jsonb, 2
from service_categories where slug = 'handyman';

-- Painting
insert into services (category_id, name, slug, short_description, description, pricing_model, base_price_cents, min_price_cents, unit_label, request_fields, sort_order)
select id, 'Interior Painting', 'interior-painting', 'Rooms refreshed, done right', 'Interior wall and trim painting.', 'quote', 0, 15000, null,
  '[
    {"key":"rooms","label":"Which rooms/areas?","type":"textarea","required":true},
    {"key":"approx_sqft","label":"Approximate square footage","type":"number","required":false},
    {"key":"paint_provided","label":"Will you provide the paint?","type":"boolean","required":false}
  ]'::jsonb, 1
from service_categories where slug = 'painting';

-- Default platform fee: 15% of service+addon amount, applied to every service.
insert into platform_fee_rules (service_id, fee_type, fee_value, min_fee_cents)
values (null, 'percent', 15.00, 300);
