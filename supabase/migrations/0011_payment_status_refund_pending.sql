-- Adds an intermediate 'refund_pending' payment_status value used by
-- cancelJob()'s atomic claim-then-refund pattern: the payment is flipped
-- to refund_pending in the same conditional update that claims it for
-- refunding, so a concurrent/duplicate cancel call can't double-refund.
alter type payment_status add value if not exists 'refund_pending';
