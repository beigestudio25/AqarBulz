import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { propertyService } from "@/lib/services/propertyService";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";
import { applyApprovedPublisherRole } from "@/lib/services/publisher-role";
import { ADMIN_PROJECT_FIELD_COLUMNS, validateAdminProjectFields } from "@/lib/services/admin-project-fields";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (!hasAdminPermission(user, "projects.review") && !hasAdminPermission(user, "projects.delete")) {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const transactionType = searchParams.get("transactionType");
    const category = searchParams.get("category");
    const cityId = searchParams.get("cityId");
    const districtId = searchParams.get("districtId");
    const advertiserId = searchParams.get("advertiserId");
    const search = searchParams.get("search")?.toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "20", 10)));

    const authHeader = req.headers.get("authorization");
    const authToken = authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.substring(7).trim()
      : undefined;

    const rawAllProperties = await propertyService.getAllPropertiesForAdmin(authToken);
    const allUsers = dbStore.getAllUsersForAdmin();
    const officialNotices = dbStore.getOfficialNoticesForAdmin();
    const deletionRequests = officialNotices.filter((n) => n.type === "deletion_request" && n.status === "unread");

    const metrics = {
      pendingCount: rawAllProperties.filter(
        (p) => (p.status as string) === "pending_review" || (p.status as string) === "pending" || (p.status as string) === "under_review"
      ).length,
      publishedCount: rawAllProperties.filter(
        (p) => (p.status as string) === "published" || (p.status as string) === "active"
      ).length,
      soldCount: rawAllProperties.filter((p) => p.status === "sold").length,
      rejectedCount: rawAllProperties.filter((p) => p.status === "rejected").length,
      suspendedCount: rawAllProperties.filter((p) => p.status === "suspended").length,
      allCount: rawAllProperties.length,
      deletionRequestsCount: deletionRequests.length,
    };

    let properties = rawAllProperties;

    // Filters
    if (status && status !== "all") {
      if (status === "pending" || status === "pending_review" || status === "under_review") {
        properties = properties.filter(
          (p) => (p.status as string) === "pending" || (p.status as string) === "pending_review" || (p.status as string) === "under_review"
        );
      } else if (status === "published" || status === "active") {
        properties = properties.filter((p) => (p.status as string) === "published" || (p.status as string) === "active");
      } else {
        properties = properties.filter((p) => p.status === status);
      }
    }
    if (transactionType && transactionType !== "all") {
      properties = properties.filter((p) => p.transactionType === transactionType);
    }
    if (category && category !== "all") {
      properties = properties.filter((p) => p.category === category);
    }
    if (cityId && cityId !== "all") {
      properties = properties.filter((p) => p.cityId === cityId);
    }
    if (districtId && districtId !== "all") {
      properties = properties.filter((p) => p.districtId === districtId);
    }
    if (advertiserId && advertiserId !== "all") {
      properties = properties.filter((p) => p.advertiserId === advertiserId || (p as any).userId === advertiserId);
    }
    if (search) {
      properties = properties.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.addressDetails.toLowerCase().includes(search) ||
          p.id.toLowerCase().includes(search)
      );
    }

    const total = properties.length;
    const startIndex = (page - 1) * limit;
    const paginated = properties.slice(startIndex, startIndex + limit);

    // Enrich with advertiser, potential duplicate warnings, and any pending deletion requests
    const enriched = paginated.map((p) => {
      const adv = allUsers.find((u) => u.id === p.advertiserId);
      const dup = dbStore.checkPotentialDuplicates(p);
      const delReq = deletionRequests.find((d) => d.propertyId === p.id);
      return {
        ...p,
        advertiserName: p.projectDetails?.contactName || adv?.name,
        advertiserPhone: p.projectDetails?.contactPhone || adv?.phone,
        advertiser: adv
          ? {
              id: adv.id,
              name: adv.name,
              email: adv.email,
              phone: adv.phone,
              role: adv.role,
              isVerified: adv.isVerified,
              isSuspended: adv.isSuspended,
            }
          : undefined,
        potentialDuplicate: dup.hasPotentialDuplicate ? dup : null,
        deletionRequest: delReq
          ? {
              id: delReq.id,
              message: delReq.message,
              createdAt: delReq.createdAt,
              senderName: delReq.senderName,
            }
          : null,
      };
    });

    return NextResponse.json({
      properties: enriched,
      metrics,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب قائمة عقارات الإدارة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (!hasAdminPermission(user, "projects.review")) {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const body = await req.json();
    const { propertyId, status, featured, moderationNotes } = body;

    if (typeof propertyId !== "string" || !propertyId.trim()) {
      return NextResponse.json({ error: "معرف العقار مطلوب" }, { status: 400 });
    }
    if (status !== undefined && ![
      "draft", "pending", "pending_review", "under_review", "active", "published",
      "rejected", "suspended", "paused", "sold", "rented", "archived",
    ].includes(status)) {
      return NextResponse.json({ error: "حالة المشروع غير صالحة" }, { status: 400 });
    }
    if (featured !== undefined && typeof featured !== "boolean") {
      return NextResponse.json({ error: "قيمة التمييز غير صالحة" }, { status: 400 });
    }
    if (moderationNotes !== undefined && moderationNotes !== null &&
        (typeof moderationNotes !== "string" || moderationNotes.length > 5000)) {
      return NextResponse.json({ error: "ملاحظات الإشراف غير صالحة" }, { status: 400 });
    }

    const projectEdit = validateAdminProjectFields(body);
    if (projectEdit.error) {
      return NextResponse.json({ error: projectEdit.error }, { status: 400 });
    }
    const editFields = projectEdit.updates;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
    const { createClient: createSupabaseServerClient } = await import("@/utils/supabase/server");
    const supabase = createSupabaseServerClient();
    const localProperty = dbStore.getRawPropertyById(propertyId);
    const nowIso = new Date().toISOString();

    const updates: Record<string, any> = {
      updated_at: nowIso,
    };

    if (typeof featured === "boolean") {
      updates.featured = featured;
    }
    if (status) {
      if (status !== "active" && status !== "published") updates.status = status;
      if (status === "active" || status === "published") {
        updates.approved_at = nowIso;
        updates.published_at = nowIso;
        updates.moderated_at = nowIso;
      }
    }
    if (moderationNotes !== undefined) {
      updates.moderation_notes = moderationNotes;
    }
    for (const [field, column] of Object.entries(ADMIN_PROJECT_FIELD_COLUMNS)) {
      if (!Object.prototype.hasOwnProperty.call(editFields, field)) continue;
      const value = (editFields as Record<string, unknown>)[field];
      updates[column] = value;
      if (field === "lat") updates.latitude = value;
      if (field === "lng") updates.longitude = value;
    }

    let cloudUpdated = null;
    if (isUuid) {
      const isPublishing = status === "active" || status === "published";
      const nonStatusUpdates = { ...updates };
      if (isPublishing) {
        delete nonStatusUpdates.approved_at;
        delete nonStatusUpdates.published_at;
        delete nonStatusUpdates.moderated_at;
      }
      const { data, error } = await supabase
        .from("properties")
        .update(nonStatusUpdates)
        .eq("id", propertyId)
        .select()
        .single();

      if (!error && data) {
        cloudUpdated = data;
      } else {
        return NextResponse.json({ error: `تعذر تحديث المشروع: ${error?.message || "المشروع غير موجود"}` }, { status: 500 });
      }

      if (isPublishing) {
        const { createAdminClient } = await import("@/utils/supabase/server");
        const adminClient = createAdminClient();
        const { data: published, error: publishError } = await adminClient.rpc(
          "admin_publish_project_with_audit",
          {
            p_project_id: propertyId,
            p_actor_user_id: user.id,
            p_actor_name: user.name,
            p_actor_email: user.email ?? null,
            p_actor_role: user.adminRole ?? user.role,
            p_notes: moderationNotes ?? null,
          }
        );
        if (publishError || !published) {
          return NextResponse.json({
            error: `تعذر حفظ اعتماد المشروع في سجل التدقيق: ${publishError?.message || "المشروع غير موجود"}`,
          }, { status: 500 });
        }
        cloudUpdated = published;
      }
    }

    // Update in-memory / override cache
    propertyService.recordModerationOverride(propertyId, {
      ...(status ? { status } : {}),
      ...(typeof featured === "boolean" ? { featured } : {}),
    });

    try {
      if (Object.keys(editFields).length > 0) {
        dbStore.updateProperty(propertyId, editFields, user);
      }
      if (status) {
        const localUpdated = dbStore.updatePropertyStatus(propertyId, status, user, moderationNotes);
        if (status === "active" || status === "published") {
          dbStore.recordAuditEvent(user.id, "ADMIN_PROJECT_APPROVED_PUBLISHED", "property", propertyId, {
            projectId: localUpdated.id,
            projectTitle: localUpdated.title,
            projectSlug: localUpdated.slug,
            actorName: user.name,
            actorEmail: user.email,
          });
        }
      }
    } catch {
      // Local store may not have this cloud ID
    }

    if (status === "active" || status === "published") {
      const advertiserId = cloudUpdated?.advertiser_id || cloudUpdated?.user_id || localProperty?.advertiserId;
      const advertiserType = cloudUpdated?.advertiser_type || localProperty?.advertiserType;
      if (advertiserId && (advertiserType === "owner" || advertiserType === "broker")) {
        try {
          await applyApprovedPublisherRole(advertiserId, advertiserType, user, Boolean(cloudUpdated));
        } catch (error) {
          return NextResponse.json(
            { error: `تم تحديث المشروع، لكن تعذر تحديث صفة المعلن: ${error instanceof Error ? error.message : "خطأ غير معروف"}` },
            { status: 500 }
          );
        }
      }
    }

    dbStore.recordAuditEvent(user.id, "ADMIN_UPDATE_PROPERTY", "property", propertyId, {
      updates,
      adminEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      property: cloudUpdated,
      message: "تم تحديث بيانات وحالة العقار بنجاح",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء تحديث العقار";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
