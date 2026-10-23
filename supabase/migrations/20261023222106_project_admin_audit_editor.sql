ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS has_building_permit BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
    IF to_regclass('public.property_images') IS NOT NULL THEN
        UPDATE public.properties p
        SET images = image_rows.urls
        FROM (
            SELECT property_id, jsonb_agg(url ORDER BY is_main DESC, sort_order ASC) AS urls
            FROM public.property_images
            GROUP BY property_id
        ) image_rows
        WHERE p.id::TEXT = image_rows.property_id::TEXT
          AND p.images = '[]'::jsonb;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.project_admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('approved_published', 'deleted')),
    project_id TEXT NOT NULL,
    project_title TEXT NOT NULL,
    project_slug TEXT,
    project_identity JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_user_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_email TEXT,
    actor_role TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_admin_audit_project_time
    ON public.project_admin_audit (project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_admin_audit_time
    ON public.project_admin_audit (occurred_at DESC);

ALTER TABLE public.project_admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_admin_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.project_admin_audit TO service_role;

CREATE OR REPLACE FUNCTION public.admin_publish_project_with_audit(
    p_project_id UUID,
    p_actor_user_id TEXT,
    p_actor_name TEXT,
    p_actor_email TEXT,
    p_actor_role TEXT,
    p_notes TEXT DEFAULT NULL,
    p_target_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_project public.properties%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF p_target_status NOT IN ('active', 'published') THEN
        RAISE EXCEPTION 'Invalid publish status';
    END IF;

    UPDATE public.properties
    SET status = p_target_status::public.property_status_enum,
        approved_at = v_now,
        published_at = v_now,
        moderated_at = v_now,
        moderation_notes = p_notes,
        updated_at = v_now
    WHERE id = p_project_id
    RETURNING * INTO v_project;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project not found';
    END IF;

    INSERT INTO public.project_admin_audit (
        event_type, project_id, project_title, project_slug, project_identity,
        actor_user_id, actor_name, actor_email, actor_role, occurred_at
    ) VALUES (
        'approved_published',
        v_project.id::TEXT,
        v_project.title,
        v_project.slug,
        jsonb_build_object(
            'projectId', v_project.id,
            'title', v_project.title,
            'slug', v_project.slug,
            'isProject', v_project.is_project,
            'advertiserId', v_project.advertiser_id,
            'projectDetails', v_project.project_details
        ),
        p_actor_user_id,
        p_actor_name,
        p_actor_email,
        p_actor_role,
        v_now
    );

    RETURN to_jsonb(v_project);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_project_with_audit(
    p_project_id UUID,
    p_actor_user_id TEXT,
    p_actor_name TEXT,
    p_actor_email TEXT,
    p_actor_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_project public.properties%ROWTYPE;
    v_advertiser_id UUID;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT * INTO v_project
    FROM public.properties
    WHERE id = p_project_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project not found';
    END IF;

    v_advertiser_id := COALESCE(v_project.advertiser_id, v_project.user_id, v_project.owner_id);

    UPDATE public.inquiries
    SET property_title = v_project.title,
        advertiser_id = COALESCE(v_advertiser_id, advertiser_id)
    WHERE property_id = p_project_id;

    DELETE FROM public.property_images WHERE property_id = p_project_id;
    DELETE FROM public.properties WHERE id = p_project_id;

    INSERT INTO public.project_admin_audit (
        event_type, project_id, project_title, project_slug, project_identity,
        actor_user_id, actor_name, actor_email, actor_role, occurred_at
    ) VALUES (
        'deleted',
        v_project.id::TEXT,
        v_project.title,
        v_project.slug,
        jsonb_build_object(
            'projectId', v_project.id,
            'title', v_project.title,
            'slug', v_project.slug,
            'isProject', v_project.is_project,
            'advertiserId', v_project.advertiser_id,
            'projectDetails', v_project.project_details
        ),
        p_actor_user_id,
        p_actor_name,
        p_actor_email,
        p_actor_role,
        v_now
    );

    RETURN jsonb_build_object(
        'id', v_project.id,
        'title', v_project.title,
        'slug', v_project.slug
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_publish_project_with_audit(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_project_with_audit(UUID, TEXT, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_publish_project_with_audit(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_project_with_audit(UUID, TEXT, TEXT, TEXT, TEXT)
    TO service_role;