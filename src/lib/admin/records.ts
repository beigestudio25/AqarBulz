export type PropertyCriteria = {
  propertyType: string;
  transactionType: "sale" | "rent";
  location: string;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  notes: string;
};

export type CustomerRecordInput = {
  name: string;
  phone: string;
  desiredProperty: PropertyCriteria;
};

export type BrokerRecordInput = {
  name: string;
  phone: string;
  availableOffers: string[];
};

export type RecordValidation<T> =
  | { valid: true; value: T }
  | { valid: false; error: string };

function cleanText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > maximumLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    return null;
  }
  return text;
}

function recordIdentity(input: unknown): RecordValidation<{ name: string; phone: string }> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "بيانات السجل غير صالحة" };
  }

  const body = input as Record<string, unknown>;
  const name = cleanText(body.name, 120);
  if (!name || name.length < 2) {
    return { valid: false, error: "الاسم مطلوب ويجب أن يتراوح بين حرفين و120 حرفاً" };
  }

  if (typeof body.phone !== "string") {
    return { valid: false, error: "رقم الهاتف مطلوب" };
  }
  const phone = body.phone.trim();
  if (phone.length > 30) {
    return { valid: false, error: "رقم الهاتف لا يمكن أن يتجاوز 30 حرفاً" };
  }
  const asciiPhone = phone
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776));
  const digits = asciiPhone
    .replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || !/^\+?[\d\s().-]+$/.test(asciiPhone)) {
    return { valid: false, error: "أدخل رقم هاتف صالحاً من 8 إلى 15 رقماً" };
  }

  return { valid: true, value: { name, phone } };
}

function optionalNumber(value: unknown, maximum: number): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum) {
    return undefined;
  }
  return value;
}

export function validateCustomerRecord(input: unknown): RecordValidation<CustomerRecordInput> {
  const identity = recordIdentity(input);
  if (!identity.valid) return identity;
  const body = input as Record<string, unknown>;
  const criteria = body.desiredProperty;
  if (!criteria || typeof criteria !== "object" || Array.isArray(criteria)) {
    return { valid: false, error: "تفاصيل العقار المطلوب غير صالحة" };
  }

  const value = criteria as Record<string, unknown>;
  const propertyType = cleanText(value.propertyType, 80);
  const location = cleanText(value.location, 120);
  const notes = value.notes === undefined || value.notes === "" ? "" : cleanText(value.notes, 1000);
  const minPrice = optionalNumber(value.minPrice, 1_000_000_000_000);
  const maxPrice = optionalNumber(value.maxPrice, 1_000_000_000_000);
  const bedrooms = optionalNumber(value.bedrooms, 100);
  if (!propertyType || propertyType.length < 2 || !location || location.length < 2) {
    return { valid: false, error: "نوع العقار والموقع مطلوبان" };
  }
  if (notes === null || minPrice === undefined || maxPrice === undefined || bedrooms === undefined) {
    return { valid: false, error: "معايير العقار تحتوي على بيانات غير صالحة" };
  }
  if (bedrooms !== null && !Number.isInteger(bedrooms)) {
    return { valid: false, error: "عدد الغرف يجب أن يكون رقماً صحيحاً" };
  }
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { valid: false, error: "الحد الأدنى للسعر لا يمكن أن يتجاوز الحد الأقصى" };
  }
  if (value.transactionType !== "sale" && value.transactionType !== "rent") {
    return { valid: false, error: "اختر البيع أو الإيجار" };
  }

  return {
    valid: true,
    value: {
      ...identity.value,
      desiredProperty: {
        propertyType,
        transactionType: value.transactionType,
        location,
        minPrice,
        maxPrice,
        bedrooms,
        notes,
      },
    },
  };
}

export function validateBrokerRecord(input: unknown): RecordValidation<BrokerRecordInput> {
  const identity = recordIdentity(input);
  if (!identity.valid) return identity;
  const offers = (input as Record<string, unknown>).availableOffers;
  if (!Array.isArray(offers) || offers.length > 50) {
    return { valid: false, error: "أدخل من عرض واحد إلى 50 عرضاً" };
  }
  const normalizedOffers: string[] = [];
  for (const offer of offers) {
    const text = cleanText(offer, 2000);
    if (!text) return { valid: false, error: "كل عرض مطلوب ويجب ألا يتجاوز 2000 حرف" };
    normalizedOffers.push(text);
  }
  if (normalizedOffers.length === 0) {
    return { valid: false, error: "أدخل عرضاً عقارياً واحداً على الأقل" };
  }
  return { valid: true, value: { ...identity.value, availableOffers: normalizedOffers } };
}
