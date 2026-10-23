import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";
import { createAdminClient } from "@/utils/supabase/server";
import {
  validateBrokerRecord,
  validateCustomerRecord,
  type BrokerRecordInput,
  type CustomerRecordInput,
} from "./records";

export type RecordKind = "clients" | "brokers";

const TABLES: Record<RecordKind, string> = {
  clients: "admin_customers",
  brokers: "admin_brokers",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorized(request: Request): Promise<NextResponse | null> {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "يلزم تسجيل الدخول" }, { status: 401 });
  if (!hasAdminPermission(user, "clients.manage")) {
    return NextResponse.json({ error: "ليس لديك صلاحية إدارة سجلات العملاء والوسطاء" }, { status: 403 });
  }
  return null;
}

function convertRow(kind: RecordKind, row: Record<string, unknown>) {
  const common = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return kind === "clients"
    ? { ...common, desiredProperty: row.desired_property }
    : { ...common, availableOffers: row.available_offers };
}

function convertInput(kind: RecordKind, value: CustomerRecordInput | BrokerRecordInput) {
  return kind === "clients"
    ? {
        name: value.name,
        phone: value.phone,
        desired_property: (value as CustomerRecordInput).desiredProperty,
      }
    : {
        name: value.name,
        phone: value.phone,
        available_offers: (value as BrokerRecordInput).availableOffers,
      };
}

function validateInput(kind: RecordKind, body: unknown) {
  return kind === "clients" ? validateCustomerRecord(body) : validateBrokerRecord(body);
}

export async function handleRecordsCollection(request: Request, kind: RecordKind) {
  const denied = await authorized(request);
  if (denied) return denied;
  try {
    const client = createAdminClient();
    if (request.method === "GET") {
      const { data, error } = await client.from(TABLES[kind]).select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return NextResponse.json({ records: (data ?? []).map((row) => convertRow(kind, row)) });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "صيغة البيانات غير صالحة" }, { status: 400 });
    }
    const validation = validateInput(kind, body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { data, error } =
      kind === "clients"
        ? await client
            .from("admin_customers")
            .insert({
              name: validation.value.name,
              phone: validation.value.phone,
              desired_property: (validation.value as CustomerRecordInput).desiredProperty,
            })
            .select("*")
            .single()
        : await client
            .from("admin_brokers")
            .insert({
              name: validation.value.name,
              phone: validation.value.phone,
              available_offers: (validation.value as BrokerRecordInput).availableOffers,
            })
            .select("*")
            .single();
    if (error) throw error;
    return NextResponse.json({ record: convertRow(kind, data) }, { status: 201 });
  } catch (error) {
    console.error(`[admin/${kind}] Collection request failed`, error);
    return NextResponse.json({ error: "تعذر الوصول إلى قاعدة البيانات المركزية" }, { status: 503 });
  }
}

export async function handleRecordItem(request: Request, kind: RecordKind, id: string) {
  const denied = await authorized(request);
  if (denied) return denied;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "معرّف السجل غير صالح" }, { status: 400 });
  }

  try {
    const client = createAdminClient();
    if (request.method === "DELETE") {
      const { data, error } = await client.from(TABLES[kind]).delete().eq("id", id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "صيغة البيانات غير صالحة" }, { status: 400 });
    }
    const validation = validateInput(kind, body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { data, error } = await client
      .from(TABLES[kind])
      .update({ ...convertInput(kind, validation.value), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
    return NextResponse.json({ record: convertRow(kind, data) });
  } catch (error) {
    console.error(`[admin/${kind}] Record request failed`, error);
    return NextResponse.json({ error: "تعذر الوصول إلى قاعدة البيانات المركزية" }, { status: 503 });
  }
}
