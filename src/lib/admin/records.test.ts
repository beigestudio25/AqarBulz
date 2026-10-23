import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { hasAdminPermission } from "../auth/admin-permissions";
import type { User } from "@/lib/db/types";
import { validateBrokerRecord, validateCustomerRecord } from "./records";

test("customer validation preserves structured search criteria and rejects invalid ranges", () => {
  const valid = validateCustomerRecord({
    name: "  سارة علي ",
    phone: "+20 100 123 4567",
    desiredProperty: {
      propertyType: "شقة",
      transactionType: "sale",
      location: "القاهرة",
      minPrice: 1_000_000,
      maxPrice: 3_000_000,
      bedrooms: 3,
      notes: "",
    },
  });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.equal(valid.value.name, "سارة علي");
    assert.equal(valid.value.desiredProperty.maxPrice, 3_000_000);
  }

  const invalidRange = validateCustomerRecord({
    name: "عميل",
    phone: "01012345678",
    desiredProperty: {
      propertyType: "شقة",
      transactionType: "sale",
      location: "القاهرة",
      minPrice: 4_000_000,
      maxPrice: 2_000_000,
    },
  });
  assert.equal(invalidRange.valid, false);
  if (!invalidRange.valid) assert.match(invalidRange.error, /الحد الأدنى/);
  assert.equal(
    validateCustomerRecord({
      name: "عميل",
      phone: "not-a-phone",
      desiredProperty: { propertyType: "شقة", transactionType: "sale", location: "القاهرة" },
    }).valid,
    false
  );
});

test("broker validation requires bounded, non-empty available offers", () => {
  const valid = validateBrokerRecord({
    name: "أحمد سمير",
    phone: "٠١٠١٢٣٤٥٦٧٨",
    availableOffers: ["فيلا للبيع في التجمع، 5 غرف", "شقة للإيجار قرب الجامعة"],
  });
  assert.equal(valid.valid, true);
  if (valid.valid) assert.equal(valid.value.availableOffers.length, 2);

  assert.equal(
    validateBrokerRecord({ name: "وسيط", phone: "01012345678", availableOffers: ["  "] }).valid,
    false
  );
  assert.equal(
    validateBrokerRecord({ name: "وسيط", phone: "01012345678", availableOffers: [] }).valid,
    false
  );
});

test("only administrators with the dedicated grant can manage client records", () => {
  const staff: User = {
    id: "staff",
    name: "موظف",
    email: "staff@example.com",
    phone: "",
    role: "admin",
    isVerified: true,
    isStaff: true,
    adminRole: "moderator",
    adminPermissions: ["projects.review"],
    createdAt: new Date(0).toISOString(),
  };
  assert.equal(hasAdminPermission(staff, "clients.manage"), false);
  assert.equal(hasAdminPermission({ ...staff, adminPermissions: ["clients.manage"] }, "clients.manage"), true);
  assert.equal(hasAdminPermission({ ...staff, role: "seeker", adminPermissions: ["clients.manage"] }, "clients.manage"), false);
});

test("central migration persists records and denies direct client-role access", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20261023221924_admin_client_broker_records.sql"),
    "utf8"
  );
  assert.match(migration, /CREATE TABLE public\.admin_customers/);
  assert.match(migration, /CREATE TABLE public\.admin_brokers/);
  assert.match(migration, /desired_property JSONB NOT NULL/);
  assert.match(migration, /available_offers JSONB NOT NULL/);
  assert.match(migration, /ALTER TABLE public\.admin_customers ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE public\.admin_brokers ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL .* FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE, DELETE .* TO service_role/);
});
