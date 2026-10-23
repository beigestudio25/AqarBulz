import type { Property, User } from "@/lib/db/types";

export const ADMIN_PROJECT_FIELD_COLUMNS: Record<string, string> = {
  title: "title",
  slug: "slug",
  description: "description",
  transactionType: "transaction_type",
  category: "category",
  price: "price",
  currency: "currency",
  rentalPeriod: "rental_period",
  negotiable: "negotiable",
  downPayment: "down_payment",
  installmentYears: "installment_years",
  areaSqM: "area_sqm",
  bedrooms: "bedrooms",
  bathrooms: "bathrooms",
  floor: "floor",
  totalFloors: "total_floors",
  finishingStatus: "finishing_status",
  furnishingStatus: "furnishing_status",
  parkingSpots: "parking_spots",
  hasElevator: "has_elevator",
  hasBuildingPermit: "has_building_permit",
  yearBuilt: "year_built",
  cityId: "city_id",
  districtId: "district_id",
  addressDetails: "address_details",
  lat: "exact_lat",
  lng: "exact_lng",
  locationPrivacy: "location_privacy",
  approximateLat: "approximate_lat",
  approximateLng: "approximate_lng",
  amenities: "amenities",
  images: "images",
  isProject: "is_project",
  projectDetails: "project_details",
};

const CATEGORIES = new Set([
  "apartment", "house", "villa", "commercial_retail", "office", "duplex", "roof",
  "ground_floor_garden", "penthouse", "townhouse", "twin_house", "chalet", "studio",
  "clinic", "land",
]);
const FINISHING = new Set(["core_and_shell", "semi_finished", "fully_finished", "ultra_lux"]);
const FURNISHING = new Set(["unfurnished", "semi_furnished", "furnished"]);
const RENTAL_PERIODS = new Set(["monthly", "yearly", "daily"]);

function validString(value: unknown, maxLength: number, allowEmpty = true): value is string {
  return typeof value === "string" && value.length <= maxLength && (allowEmpty || value.trim().length > 0);
}

function validNullableNumber(value: unknown, min: number, max: number, integer = false): boolean {
  if (value === null) return true;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max && (!integer || Number.isInteger(numeric));
}

function validateProjectDetails(value: unknown): boolean {
  if (value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const details = value as Record<string, unknown>;
  for (const key of ["contactName", "contactPhone", "developerLogo"]) {
    if (details[key] !== undefined && details[key] !== null && !validString(details[key], 200)) return false;
  }
  for (const key of ["totalUnitsCount", "minAreaSqM", "maxAreaSqM", "minPrice", "maxPrice"]) {
    if (details[key] !== undefined && !validNullableNumber(details[key], 0, 1_000_000_000, key === "totalUnitsCount")) return false;
  }
  if (details.tags !== undefined && (!Array.isArray(details.tags) || details.tags.some((item) => !validString(item, 100)))) {
    return false;
  }
  if (details.nearbyLandmarks !== undefined &&
      (!Array.isArray(details.nearbyLandmarks) || details.nearbyLandmarks.some((item) =>
        !item || typeof item !== "object" ||
        !validString((item as Record<string, unknown>).name, 200, false) ||
        !validNullableNumber((item as Record<string, unknown>).distanceKm, 0, 100_000)
      ))) return false;
  if (details.subUnits !== undefined &&
      (!Array.isArray(details.subUnits) || details.subUnits.some((item) => {
        if (!item || typeof item !== "object") return true;
        const unit = item as Record<string, unknown>;
        return !validString(unit.id, 100, false) || !validString(unit.title, 300, false) ||
          !validNullableNumber(unit.price, 0, 100_000_000) ||
          !validNullableNumber(unit.areaSqM, 0, 1_000_000) ||
          !validString(unit.image, 2048) || !validString(unit.locationText, 300);
      }))) return false;
  return true;
}

export function validateAdminProjectFields(
  input: Record<string, unknown>
): { updates: Partial<Property>; error?: string } {
  const updates: Record<string, unknown> = {};
  for (const field of Object.keys(ADMIN_PROJECT_FIELD_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(input, field)) updates[field] = input[field];
  }
  if (Object.keys(updates).length === 0) return { updates: {} };

  const checks: Array<[string, boolean]> = [
    ["title", updates.title === undefined || validString(updates.title, 300, false)],
    ["slug", updates.slug === undefined || (validString(updates.slug, 255, false) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(updates.slug))],
    ["description", updates.description === undefined || validString(updates.description, 20_000)],
    ["transactionType", updates.transactionType === undefined || updates.transactionType === "sale" || updates.transactionType === "rent"],
    ["category", updates.category === undefined || (typeof updates.category === "string" && CATEGORIES.has(updates.category))],
    ["price", updates.price === undefined || validNullableNumber(updates.price, 1, 100_000_000)],
    ["currency", updates.currency === undefined || (typeof updates.currency === "string" && /^[A-Z]{3}$/.test(updates.currency))],
    ["rentalPeriod", updates.rentalPeriod === undefined || updates.rentalPeriod === null || RENTAL_PERIODS.has(String(updates.rentalPeriod))],
    ["negotiable", updates.negotiable === undefined || typeof updates.negotiable === "boolean"],
    ["downPayment", updates.downPayment === undefined || validNullableNumber(updates.downPayment, 0, 100_000_000)],
    ["installmentYears", updates.installmentYears === undefined || validNullableNumber(updates.installmentYears, 0, 100, true)],
    ["areaSqM", updates.areaSqM === undefined || validNullableNumber(updates.areaSqM, 0.01, 1_000_000)],
    ["bedrooms", updates.bedrooms === undefined || validNullableNumber(updates.bedrooms, 0, 100, true)],
    ["bathrooms", updates.bathrooms === undefined || validNullableNumber(updates.bathrooms, 0, 100, true)],
    ["floor", updates.floor === undefined || validNullableNumber(updates.floor, -10, 500, true)],
    ["totalFloors", updates.totalFloors === undefined || validNullableNumber(updates.totalFloors, 0, 500, true)],
    ["finishingStatus", updates.finishingStatus === undefined || updates.finishingStatus === null || FINISHING.has(String(updates.finishingStatus))],
    ["furnishingStatus", updates.furnishingStatus === undefined || updates.furnishingStatus === null || FURNISHING.has(String(updates.furnishingStatus))],
    ["parkingSpots", updates.parkingSpots === undefined || validNullableNumber(updates.parkingSpots, 0, 100, true)],
    ["hasElevator", updates.hasElevator === undefined || updates.hasElevator === null || typeof updates.hasElevator === "boolean"],
    ["hasBuildingPermit", updates.hasBuildingPermit === undefined || updates.hasBuildingPermit === null || typeof updates.hasBuildingPermit === "boolean"],
    ["yearBuilt", updates.yearBuilt === undefined || validNullableNumber(updates.yearBuilt, 1800, new Date().getFullYear() + 10, true)],
    ["cityId", updates.cityId === undefined || updates.cityId === null || validString(updates.cityId, 100, false)],
    ["districtId", updates.districtId === undefined || updates.districtId === null || validString(updates.districtId, 100, false)],
    ["addressDetails", updates.addressDetails === undefined || updates.addressDetails === null || validString(updates.addressDetails, 1000)],
    ["lat", updates.lat === undefined || (updates.lat !== null && validNullableNumber(updates.lat, -90, 90))],
    ["lng", updates.lng === undefined || (updates.lng !== null && validNullableNumber(updates.lng, -180, 180))],
    ["approximateLat", updates.approximateLat === undefined || validNullableNumber(updates.approximateLat, -90, 90)],
    ["approximateLng", updates.approximateLng === undefined || validNullableNumber(updates.approximateLng, -180, 180)],
    ["locationPrivacy", updates.locationPrivacy === undefined || updates.locationPrivacy === "exact" || updates.locationPrivacy === "approximate"],
    ["isProject", updates.isProject === undefined || typeof updates.isProject === "boolean"],
    ["projectDetails", updates.projectDetails === undefined || validateProjectDetails(updates.projectDetails)],
    ["amenities", updates.amenities === undefined || (Array.isArray(updates.amenities) && updates.amenities.length <= 100 && updates.amenities.every((v) => validString(v, 100, false)))],
    ["images", updates.images === undefined || (Array.isArray(updates.images) && updates.images.length <= 50 && updates.images.every((v) => validString(v, 2048, false)))],
  ];
  const invalid = checks.find(([, valid]) => !valid);
  if (invalid) return { updates: {}, error: `قيمة غير صالحة للحقل ${invalid[0]}` };

  for (const field of [
    "price", "downPayment", "installmentYears", "areaSqM", "bedrooms", "bathrooms",
    "floor", "totalFloors", "parkingSpots", "yearBuilt", "lat", "lng",
    "approximateLat", "approximateLng",
  ]) {
    if (updates[field] !== undefined && updates[field] !== null) updates[field] = Number(updates[field]);
  }
  return { updates: updates as Partial<Property> };
}

export function buildProjectAdminAuditEntry(
  eventType: "approved_published" | "deleted",
  project: Pick<Property, "id" | "title"> & Partial<Pick<Property, "slug" | "isProject" | "advertiserId" | "projectDetails">>,
  actor: User,
  occurredAt = new Date().toISOString()
) {
  return {
    event_type: eventType,
    project_id: project.id,
    project_title: project.title,
    project_slug: project.slug ?? null,
    project_identity: {
      projectId: project.id,
      title: project.title,
      slug: project.slug ?? null,
      isProject: Boolean(project.isProject),
      advertiserId: project.advertiserId ?? null,
      projectDetails: project.projectDetails ?? null,
    },
    actor_user_id: actor.id,
    actor_name: actor.name,
    actor_email: actor.email ?? null,
    actor_role: actor.adminRole ?? actor.role,
    occurred_at: occurredAt,
  };
}
