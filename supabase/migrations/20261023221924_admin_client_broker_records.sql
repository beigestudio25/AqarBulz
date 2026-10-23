CREATE TABLE public.admin_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
    phone TEXT NOT NULL CHECK (char_length(btrim(phone)) BETWEEN 8 AND 30),
    desired_property JSONB NOT NULL CHECK (jsonb_typeof(desired_property) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_brokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
    phone TEXT NOT NULL CHECK (char_length(btrim(phone)) BETWEEN 8 AND 30),
    available_offers JSONB NOT NULL CHECK (jsonb_typeof(available_offers) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_customers_created_at_idx ON public.admin_customers (created_at DESC);
CREATE INDEX admin_brokers_created_at_idx ON public.admin_brokers (created_at DESC);

ALTER TABLE public.admin_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_brokers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_customers, public.admin_brokers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_customers, public.admin_brokers TO service_role;
