import { handleRecordsCollection } from "@/lib/admin/records-api";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleRecordsCollection(request, "brokers");
}

export function POST(request: Request) {
  return handleRecordsCollection(request, "brokers");
}
