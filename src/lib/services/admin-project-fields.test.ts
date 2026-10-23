import assert from "node:assert/strict";
import { test } from "node:test";
import type { User } from "../db/types";
import { hasAdminPermission } from "../auth/admin-permissions";
import { ADMIN_PROJECT_FIELD_COLUMNS, buildProjectAdminAuditEntry, validateAdminProjectFields } from "./admin-project-fields";

const staff: User = {
  id: "staff-123",
  name: "Project Moderator",
  email: "moderator@example.com",
  phone: "",
  role: "admin",
  adminRole: "moderator",
  isStaff: true,
  adminPermissions: ["projects.review", "projects.delete"],
  isVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("project field validation accepts the complete editable property model", () => {
  assert.equal(hasAdminPermission(staff, "projects.review"), true);
  assert.equal(hasAdminPermission({ ...staff, adminPermissions: ["projects.delete"] }, "projects.review"), false);
  const completeEdit = {
    title: "New title",
    slug: "new-title",
    description: "Updated description",
    transactionType: "sale",
    category: "villa",
    price: 1_500_000,
    currency: "EGP",
    rentalPeriod: null,
    negotiable: true,
    downPayment: 250_000,
    installmentYears: 5,
    areaSqM: 240,
    bedrooms: 4,
    bathrooms: 3,
    floor: 2,
    totalFloors: 6,
    finishingStatus: "fully_finished",
    furnishingStatus: "furnished",
    parkingSpots: 2,
    hasElevator: true,
    hasBuildingPermit: true,
    yearBuilt: 2022,
    cityId: "city-id",
    districtId: "district-id",
    addressDetails: "Main street",
    lat: 30.1,
    lng: 31.2,
    locationPrivacy: "approximate",
    approximateLat: 30.11,
    approximateLng: 31.21,
    amenities: ["pool", "garden"],
    images: ["https://example.com/one.jpg"],
    isProject: true,
    projectDetails: {
      contactName: "Sales",
      totalUnitsCount: 30,
      tags: ["compound"],
      nearbyLandmarks: [{ name: "Station", distanceKm: 1.5 }],
      subUnits: [{
        id: "unit-1",
        title: "Villa",
        price: 2_000_000,
        areaSqM: 180,
        image: "https://example.com/unit.jpg",
        locationText: "Phase 1",
      }],
    },
  };
  const result = validateAdminProjectFields(completeEdit);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.updates, completeEdit);
  assert.equal(Object.keys(ADMIN_PROJECT_FIELD_COLUMNS).length, Object.keys(completeEdit).length);
});

test("project field validation rejects invalid enums, numeric limits, and malformed nested details", () => {
  for (const edit of [
    { category: "not-a-category" },
    { price: -1 },
    { lat: 91 },
    { images: [""] },
    { projectDetails: { subUnits: [{ id: "missing-fields" }] } },
  ]) {
    assert.ok(validateAdminProjectFields(edit).error, JSON.stringify(edit));
  }
});

test("project audit entry snapshots staff and project identity for approvals and deletion", () => {
  const project = {
    id: "project-7",
    title: "Nile Gardens",
    slug: "nile-gardens",
    isProject: true,
    advertiserId: "company-9",
    projectDetails: { totalUnitsCount: 120 },
  };
  const approved = buildProjectAdminAuditEntry("approved_published", project, staff, "2026-03-01T10:00:00.000Z");
  const deleted = buildProjectAdminAuditEntry("deleted", project, staff, "2026-03-02T11:00:00.000Z");

  assert.equal(approved.actor_user_id, staff.id);
  assert.equal(approved.actor_name, staff.name);
  assert.equal(approved.actor_email, staff.email);
  assert.equal(approved.occurred_at, "2026-03-01T10:00:00.000Z");
  assert.equal(approved.project_title, project.title);
  assert.deepEqual(approved.project_identity, {
    projectId: project.id,
    title: project.title,
    slug: project.slug,
    isProject: true,
    advertiserId: project.advertiserId,
    projectDetails: project.projectDetails,
  });
  assert.equal(deleted.event_type, "deleted");
  assert.equal(deleted.project_id, project.id);
  assert.equal(deleted.occurred_at, "2026-03-02T11:00:00.000Z");
});
