import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";
import ClientsManagement from "@/components/admin/ClientsManagement";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!hasAdminPermission(user, "clients.manage")) redirect("/admin");
  return <ClientsManagement />;
}
