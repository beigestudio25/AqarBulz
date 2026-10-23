import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";
import { createAdminClient, isCentralSupabaseConfigured } from "@/utils/supabase/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كمسؤول للنظام" }, { status: 401 });
    }
    if (!hasAdminPermission(user, "staff.manage")) {
      return NextResponse.json({ error: "غير مصرح، يتطلب صلاحية مدير النظام" }, { status: 403 });
    }

    const auditEvents = dbStore.getAuditEvents();
    let projectAdminAudit: unknown[] = [];
    if (isCentralSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("project_admin_audit")
        .select("id,event_type,project_id,project_title,project_slug,project_identity,actor_user_id,actor_name,actor_email,actor_role,occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error && error.code !== "42P01" && error.code !== "PGRST205") {
        throw new Error(`تعذر جلب سجل تدقيق المشاريع: ${error.message}`);
      }
      projectAdminAudit = data || [];
    }
    return NextResponse.json({ auditEvents, projectAdminAudit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ في جلب سجل العمليات";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
