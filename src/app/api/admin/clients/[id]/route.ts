import { handleRecordItem } from "@/lib/admin/records-api";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export function PUT(request: Request, { params }: RouteContext) {
  return handleRecordItem(request, "clients", params.id);
}

export function DELETE(request: Request, { params }: RouteContext) {
  return handleRecordItem(request, "clients", params.id);
}
