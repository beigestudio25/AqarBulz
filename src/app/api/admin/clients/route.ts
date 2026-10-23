import { handleRecordsCollection } from "@/lib/admin/records-api";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleRecordsCollection(request, "clients");
}

export function POST(request: Request) {
  return handleRecordsCollection(request, "clients");
}
