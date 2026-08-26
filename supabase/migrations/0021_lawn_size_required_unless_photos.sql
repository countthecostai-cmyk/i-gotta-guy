-- Lawn Mowing's "Approximate lawn size (sq ft)" field no longer blocks
-- submission on its own — a customer who attaches photos instead can skip
-- it. The application layer (needsPhotoQuoteFallback in
-- src/lib/domain/request-fields.ts, used by both the request form and
-- createJobRequest) treats a job submitted this way like a quote-priced
-- service: the Guy sends a real price after seeing the photos, instead of
-- being charged a placeholder amount computed from a missing quantity.
update services
set request_fields = (
  select jsonb_agg(
    case
      when field ->> 'key' = 'lawn_size_sqft'
        then (field - 'required') || jsonb_build_object('requiredUnlessPhotos', true)
      else field
    end
  )
  from jsonb_array_elements(request_fields) as field
)
where slug = 'lawn-mowing';
