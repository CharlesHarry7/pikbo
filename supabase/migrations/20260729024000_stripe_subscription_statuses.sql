-- Stripe lifecycle values must be committed before later migrations use them
-- in partial-index predicates or function casts.

alter type public.subscription_status add value if not exists 'paused';
