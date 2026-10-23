import Link from "next/link";
import { redirect } from "next/navigation";
import AdminCmsTab from "@/components/admin/AdminCmsTab";
import AdminNav from "@/components/admin/AdminNav";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user || !hasAdminPermission(user, "cms.edit")) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-dashboard-shell min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <AdminNav />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="مسار الصفحة" className="text-xs font-bold text-slate-500">
          <Link href="/admin" className="hover:text-brand-700">لوحة الإدارة</Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800">محتوى الموقع</span>
        </nav>
        <AdminCmsTab />
      </main>
    </div>
  );
}
