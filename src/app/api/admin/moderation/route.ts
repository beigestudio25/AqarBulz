import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { PropertyStatus } from "@/lib/db/types";
import { propertyService, mapSupabaseRowToProperty, isSupabaseDirect } from "@/lib/services/propertyService";
import {
  createAdminClient,
  createClient as createSupabaseServerClient,
} from "@/utils/supabase/server";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";
import { applyApprovedPublisherRole } from "@/lib/services/publisher-role";
import { buildProjectAdminAuditEntry } from "@/lib/services/admin-project-fields";

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
    const statusFilter = searchParams.get("status") as PropertyStatus | null;
    const propertyId = searchParams.get("propertyId");

    if (propertyId) {
      let prop = dbStore.getRawPropertyById(propertyId);
      if (!prop) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
        if (isUuid) {
          try {
            const supabase = createSupabaseServerClient();
            const { data: cloudRow } = await supabase
              .from("properties")
              .select(`*, property_images (url, alt, is_main, sort_order)`)
              .eq("id", propertyId)
              .single();
            if (cloudRow) {
              prop = mapSupabaseRowToProperty(cloudRow);
            }
          } catch (e) {
            console.warn("Failed to fetch cloud property for moderation:", e);
          }
        }
      }
      if (!prop) {
        return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });
      }
      const duplicateWarning = dbStore.checkPotentialDuplicates(prop);
      const history = dbStore.getPropertyModerationHistory(propertyId);
      return NextResponse.json({ property: prop, duplicateWarning, history });
    }

    const authorization = req.headers.get("authorization");
    const authToken = authorization?.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : undefined;
    const allProps = await propertyService.getAllPropertiesForAdmin(authToken);
    let filtered = allProps;

    if (statusFilter) {
      filtered = statusFilter === "pending" || statusFilter === "pending_review" || statusFilter === "under_review"
        ? allProps.filter((p) => p.status === "pending_review" || p.status === "pending" || p.status === "under_review")
        : allProps.filter((p) => p.status === statusFilter);
    } else {
      filtered = allProps.filter(
        (p) => p.status === "pending_review" || p.status === "pending" || p.status === "under_review"
      );
    }

    // Attach duplicate check results to items
    const propertiesWithAnalysis = filtered.map((p) => {
      const dup = dbStore.checkPotentialDuplicates(p);
      return {
        ...p,
        potentialDuplicate: dup.hasPotentialDuplicate ? dup : null,
      };
    });

    return NextResponse.json({ properties: propertiesWithAnalysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء جلب قائمة المراجعة";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    const body = await req.json();
    const { propertyId, decision, reason } = body;

    if (!propertyId || !decision) {
      return NextResponse.json({ error: "معرف العقار والقرار مطلوبان" }, { status: 400 });
    }

    const requiredPermission = decision === "delete" ? "projects.delete" : "projects.review";
    if (!hasAdminPermission(user, requiredPermission)) {
      return NextResponse.json({ error: "غير مصرح، لا تملك الصلاحية المطلوبة لهذا الإجراء" }, { status: 403 });
    }

    if (decision === "delete") {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
      const localProject = dbStore.getRawPropertyById(propertyId);
      let deletedProject: any = localProject;
      if (isUuid && isSupabaseDirect()) {
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin.rpc("admin_delete_project_with_audit", {
          p_project_id: propertyId,
          p_actor_user_id: user.id,
          p_actor_name: user.name,
          p_actor_email: user.email ?? null,
          p_actor_role: user.adminRole ?? user.role,
        });
        if (error || !data) {
          return NextResponse.json({
            error: `تعذر حذف المشروع أو تسجيل العملية: ${error?.message || "المشروع غير موجود"}`,
          }, { status: 500 });
        }
        deletedProject = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          isProject: localProject?.isProject,
          advertiserId: localProject?.advertiserId,
          projectDetails: localProject?.projectDetails,
        };
      }
      propertyService.recordModerationOverride(propertyId, { deleted: true });
      try {
        dbStore.deleteProperty(propertyId, user);
      } catch {}
      dbStore.recordAuditEvent(user.id, "ADMIN_DELETE_PROPERTY", "property", propertyId, { reason, adminEmail: user.email });
      if (deletedProject?.id && deletedProject?.title) {
        const auditEntry = buildProjectAdminAuditEntry("deleted", deletedProject, user);
        dbStore.recordAuditEvent(user.id, "ADMIN_PROJECT_DELETED", "property", propertyId, auditEntry);
      }
      return NextResponse.json({ success: true, message: "تم حذف المنشور من قبل الإدارة بنجاح" });
    }

    let targetStatus: PropertyStatus;
    switch (decision) {
      case "approve":
        targetStatus = "active";
        break;
      case "reject":
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: "سبب الرفض إلزامي" }, { status: 400 });
        }
        targetStatus = "rejected";
        break;
      case "suspend":
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: "سبب تعليق الإعلان إلزامي" }, { status: 400 });
        }
        targetStatus = "suspended";
        break;
      case "restore":
        targetStatus = "pending_review";
        break;
      default:
        return NextResponse.json({ error: "قرار مراجعة غير صالح" }, { status: 400 });
    }

    // Enforce separation of duties: Owner/broker cannot approve their own listing even if they have admin role
    let propAdvertiserId: string | null = null;
    let propAdvertiserType: "owner" | "broker" | null = null;
    const authorization = req.headers.get("authorization");
    const authToken = authorization?.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : undefined;
    const supabase = createSupabaseServerClient(undefined, authToken);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
    const useCloud = isSupabaseDirect();

    if (isUuid && useCloud) {
      const { data: cloudCheck, error: cloudCheckError } = await supabase
        .from("properties")
        .select("advertiser_id, advertiser_type")
        .eq("id", propertyId)
        .maybeSingle();
      if (cloudCheckError) {
        return NextResponse.json(
          { error: `تعذر التحقق من بيانات العقار قبل المراجعة: ${cloudCheckError.message}` },
          { status: 500 }
        );
      }
      if (!cloudCheck) {
        return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });
      }
      if (cloudCheck) {
        propAdvertiserId = cloudCheck.advertiser_id;
        propAdvertiserType = cloudCheck.advertiser_type === "broker" ? "broker" : "owner";
      }
    } else {
      const localProp = dbStore.getRawPropertyById(propertyId);
      if (localProp) {
        propAdvertiserId = localProp.advertiserId;
        propAdvertiserType = localProp.advertiserType;
      }
    }

    let isSelfApproval = propAdvertiserId === user.id;
    if (!isSelfApproval && user.email && propAdvertiserId) {
      const { data: advUser } = await supabase.from("profiles").select("id").eq("email", user.email).single();
      if (advUser && advUser.id === propAdvertiserId) {
        isSelfApproval = true;
      }
    }

    if (decision === "approve" && isSelfApproval) {
      return NextResponse.json({
        error: "غير مسموح للمعلن أو الوسيط باعتماد عقاره الخاص بنفسه لمنع تضارب المصالح (فصل المهام والصلاحيات)",
      }, { status: 403 });
    }

    let updatedCloudRecord: any = null;
    if (isUuid && useCloud) {
      if (decision === "approve") {
        const supabaseAdmin = createAdminClient();
        const { data: published, error: publishError } = await supabaseAdmin.rpc(
          "admin_publish_project_with_audit",
          {
            p_project_id: propertyId,
            p_actor_user_id: user.id,
            p_actor_name: user.name,
            p_actor_email: user.email ?? null,
            p_actor_role: user.adminRole ?? user.role,
            p_notes: reason ?? null,
          }
        );
        if (publishError || !published) {
          return NextResponse.json(
            { error: `تعذر اعتماد المشروع أو تسجيل العملية: ${publishError?.message || "المشروع غير موجود"}` },
            { status: 500 }
          );
        }
        updatedCloudRecord = published;
      } else {
        const nowIso = new Date().toISOString();
        const { data: cloudUpdated, error: supaModErr } = await supabase
          .from("properties")
          .update({
            status: targetStatus,
            moderation_notes: reason || null,
            approved_at: null,
            published_at: null,
            moderated_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", propertyId)
          .select()
          .single();

        if (!supaModErr && cloudUpdated) {
          updatedCloudRecord = cloudUpdated;
        } else {
          return NextResponse.json(
            { error: `تعذر حفظ قرار المراجعة: ${supaModErr?.message || "لم يتم تحديث سجل العقار"}` },
            { status: 500 }
          );
        }
      }
    }

    // Also update local store and audit trail
    let updatedLocalRecord = null;
    try {
      updatedLocalRecord = dbStore.updatePropertyStatus(propertyId, targetStatus, user, reason);
    } catch {
      // Local store may not have this cloud ID
    }

    propertyService.recordModerationOverride(propertyId, { status: targetStatus });

    if (decision === "approve" && propAdvertiserId && propAdvertiserType) {
      try {
        await applyApprovedPublisherRole(
          propAdvertiserId,
          propAdvertiserType,
          user,
          Boolean(updatedCloudRecord)
        );
      } catch (error) {
        return NextResponse.json(
          { error: `تم اعتماد المشروع، لكن تعذر تحديث صفة المعلن: ${error instanceof Error ? error.message : "خطأ غير معروف"}` },
          { status: 500 }
        );
      }
    }

    // Record immutable audit event
    dbStore.recordAuditEvent(user.id, "ADMIN_MODERATION_DECISION", "property", propertyId, {
      decision,
      targetStatus,
      reason,
      adminEmail: user.email,
    });
    if (decision === "approve" && (updatedCloudRecord || updatedLocalRecord)) {
      const approvedProject = updatedLocalRecord || {
        id: propertyId,
        title: updatedCloudRecord.title,
        slug: updatedCloudRecord.slug,
        isProject: updatedCloudRecord.is_project,
        advertiserId: updatedCloudRecord.advertiser_id,
        projectDetails: updatedCloudRecord.project_details,
      };
      dbStore.recordAuditEvent(
        user.id,
        "ADMIN_PROJECT_APPROVED_PUBLISHED",
        "property",
        propertyId,
        buildProjectAdminAuditEntry("approved_published", approvedProject, user)
      );
    }

    return NextResponse.json({
      success: true,
      property: updatedCloudRecord || updatedLocalRecord,
      source: updatedCloudRecord ? "supabase" : "local",
      message:
        decision === "approve"
          ? "تمت الموافقة على نشر العقار بنجاح"
          : decision === "reject"
          ? "تم رفض الإعلان وإشعار المعلن بالسبب"
          : decision === "suspend"
          ? "تم تعليق الإعلان بنجاح"
          : "تمت استعادة الإعلان إلى قائمة المراجعة",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ أثناء اتخاذ قرار المراجعة";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
