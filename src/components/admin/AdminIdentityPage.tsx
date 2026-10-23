"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Compass,
  Crown,
  ExternalLink,
  Home,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Palette,
  RefreshCw,
  Save,
  Shield,
  Sparkles as SparklesIcon,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  DEFAULT_BRAND_LOGO_HEIGHT_PX,
  DEFAULT_BRAND_LOGO_PATH,
  DEFAULT_VISUAL_IDENTITY,
  MAX_BRAND_LOGO_HEIGHT_PX,
  MIN_BRAND_LOGO_HEIGHT_PX,
  getBrandFontFamily,
  getBrandLogoHeightPx,
  getBrandThemeStyle,
} from "@/lib/brand-theme";
import type { CmsHomepageSettings, VisualIdentitySettings } from "@/lib/db/types";

const COLOR_PRESETS: Array<{
  id: VisualIdentitySettings["colorSchemePreset"];
  name: string;
  primary: string;
  hover: string;
  secondary: string;
  accent: string;
}> = [
  { id: "emerald_pulse", name: "زمردي", primary: "#059669", hover: "#047857", secondary: "#0f172a", accent: "#10b981" },
  { id: "royal_blue", name: "أزرق ملكي", primary: "#2563eb", hover: "#1d4ed8", secondary: "#172554", accent: "#38bdf8" },
  { id: "luxury_gold", name: "ذهبي فاخر", primary: "#b45309", hover: "#92400e", secondary: "#1c1917", accent: "#f59e0b" },
  { id: "modern_indigo", name: "نيلي عصري", primary: "#4f46e5", hover: "#4338ca", secondary: "#1e1b4b", accent: "#818cf8" },
  { id: "midnight_slate", name: "رمادي داكن", primary: "#334155", hover: "#1e293b", secondary: "#020617", accent: "#94a3b8" },
];

const LOGO_ICONS: Array<{ id: VisualIdentitySettings["logoIcon"]; label: string }> = [
  { id: "building", label: "مبنى" },
  { id: "map_pin", label: "موقع" },
  { id: "sparkles", label: "بريق" },
  { id: "compass", label: "بوصلة" },
  { id: "shield", label: "درع" },
  { id: "home", label: "منزل" },
  { id: "crown", label: "تاج" },
  { id: "layers", label: "طبقات" },
];

function getResponseError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = Reflect.get(payload, "error");
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export default function AdminIdentityPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<VisualIdentitySettings>(DEFAULT_VISUAL_IDENTITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "appIcon" | null>(null);
  const [persistenceAvailable, setPersistenceAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/cms/settings", {
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(getResponseError(result, "تعذر تحميل إعدادات الهوية."));
      const settings = result.settings as CmsHomepageSettings | undefined;
      setIdentity({ ...DEFAULT_VISUAL_IDENTITY, ...settings?.visualIdentity });
      setPersistenceAvailable(result.persistenceAvailable === true);
      if (result.persistenceAvailable !== true) {
        setError(result.error || "الحفظ غير متاح حالياً: تعذر الاتصال بمخزن الإعدادات المركزي.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل إعدادات الهوية.");
      setPersistenceAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateIdentity = <K extends keyof VisualIdentitySettings>(
    key: K,
    value: VisualIdentitySettings[K]
  ) => {
    setIdentity((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const applyPreset = (preset: (typeof COLOR_PRESETS)[number]) => {
    setIdentity((current) => ({
      ...current,
      colorSchemePreset: preset.id,
      primaryColor: preset.primary,
      primaryHoverColor: preset.hover,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
    setSaved(false);
  };

  const uploadImage = async (
    event: ChangeEvent<HTMLInputElement>,
    target: "logo" | "appIcon"
  ) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const input = event.currentTarget;
    setUploading(target);
    setError(null);
    setSaved(false);
    try {
      if (target === "appIcon") {
        const imageUrl = URL.createObjectURL(file);
        try {
          const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const image = document.createElement("img");
            image.onload = () => resolve({ width: image.width, height: image.height });
            image.onerror = () => reject(new Error("تعذر قراءة أبعاد الصورة."));
            image.src = imageUrl;
          });
          if (dimensions.width !== dimensions.height || dimensions.width < 192) {
            throw new Error("يجب أن تكون أيقونة التطبيق مربعة وبأبعاد لا تقل عن 192×192 بكسل.");
          }
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", "draft");
      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") {
        throw new Error(getResponseError(result, "تعذر رفع الصورة."));
      }
      updateIdentity(target === "logo" ? "logoImageUrl" : "appIconUrl", result.url);
      if (target === "logo") updateIdentity("logoType", "image");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر رفع الصورة.");
    } finally {
      setUploading(null);
      input.value = "";
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !persistenceAvailable) return;
    if (![identity.primaryColor, identity.primaryHoverColor, identity.secondaryColor, identity.accentColor]
      .every((color) => /^#[0-9a-fA-F]{6}$/.test(color))) {
      setError("تأكد من إدخال الألوان بصيغة HEX صحيحة، مثل #2563eb.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/cms/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualIdentity: identity,
          navLabels: { brandTitle: identity.siteName, brandSubtitle: identity.siteSubtitle },
        }),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        throw new Error(getResponseError(result, "تعذر حفظ الهوية."));
      }

      const verifyResponse = await fetch("/api/admin/cms/settings", {
        cache: "no-store",
        credentials: "include",
      });
      const verified = await verifyResponse.json();
      const persistedIdentity = verified.settings?.visualIdentity as VisualIdentitySettings | undefined;
      if (!verifyResponse.ok || !persistedIdentity ||
        Object.keys(identity).some((key) => persistedIdentity[key as keyof VisualIdentitySettings] !== identity[key as keyof VisualIdentitySettings])) {
        throw new Error("تم إرسال التغييرات لكن تعذر التحقق من حفظها. أعد تحميل الإعدادات قبل المتابعة.");
      }

      setIdentity({ ...DEFAULT_VISUAL_IDENTITY, ...persistedIdentity });
      setSaved(true);
      window.dispatchEvent(new Event("cms-settings-updated"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ أثناء حفظ الهوية.");
    } finally {
      setSaving(false);
    }
  };

  const previewStyle = {
    ...getBrandThemeStyle(identity),
    fontFamily: getBrandFontFamily(identity.fontFamily),
  };
  const logoHeight = getBrandLogoHeightPx(identity);
  const LogoIcon = {
    building: Building2,
    map_pin: MapPin,
    sparkles: SparklesIcon,
    compass: Compass,
    shield: Shield,
    home: Home,
    crown: Crown,
    layers: Layers,
  }[identity.logoIcon];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-brand-700">
            <Palette className="h-5 w-5" />
            <span>إعدادات المنصة</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">الهوية البصرية</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            عدّل الشعار والألوان والخط، شاهد النتيجة ثم احفظها وتحقق من تطبيقها على المنصة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/content" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ImageIcon className="h-4 w-4" />
            محتوى الموقع
          </Link>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ExternalLink className="h-4 w-4" />
            معاينة المنصة
          </a>
          <button type="submit" form="identity-form" disabled={saving || loading || !persistenceAvailable || uploading !== null} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-black text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ والتحقق..." : "حفظ وتفعيل الهوية"}
          </button>
        </div>
      </div>

      {saved && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          <Check className="h-5 w-5" />
          تم الحفظ والتحقق من الإعدادات؛ تم تحديث معاينة المنصة.
        </div>
      )}
      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => void loadSettings()} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-black hover:bg-rose-100">
            <RefreshCw className="h-4 w-4" />
            إعادة التحميل
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
          جاري تحميل إعدادات الهوية...
        </div>
      ) : (
        <form id="identity-form" onSubmit={handleSave} className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <SparklesIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-black text-slate-900">معاينة مباشرة</h3>
                <p className="text-xs text-slate-500">تتغير مع كل تعديل قبل الحفظ.</p>
              </div>
            </div>
            <div className="p-4 sm:p-6" style={previewStyle}>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
                <div className={`flex min-h-20 items-center justify-between gap-4 border-b px-5 py-3 ${identity.headerBackground === "dark" ? "border-slate-800 bg-secondary text-white" : "border-slate-200 bg-white text-slate-900"}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    {identity.logoType === "image" ? (
                      <NextImage src={identity.logoImageUrl || DEFAULT_BRAND_LOGO_PATH} alt={identity.siteName} width={180} height={90} unoptimized style={{ height: `${logoHeight}px`, width: "auto" }} className="max-w-40 object-contain" />
                    ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white">
                          <LogoIcon className="h-5 w-5" />
                      </span>
                    )}
                    {identity.logoType !== "image" && (
                      <span className="min-w-0">
                        <strong className="block truncate text-base" style={{ fontWeight: identity.headingWeight === "bold" ? 700 : identity.headingWeight === "extrabold" ? 800 : 900 }}>{identity.siteName}</strong>
                        <small className="block truncate text-xs text-accent">{identity.siteSubtitle}</small>
                      </span>
                    )}
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <span className="rounded-xl bg-brand-700 px-3 py-2 text-xs font-black text-white">أضف عقارك</span>
                    <span className="rounded-xl bg-secondary px-3 py-2 text-xs font-black text-white">العقارات</span>
                    <span className="rounded-xl bg-accent px-3 py-2 text-xs font-black text-slate-950">استكشف</span>
                  </div>
                </div>
                <div className="grid gap-3 bg-slate-50 p-4 sm:grid-cols-3">
                  {["بطاقات العقارات", "الأزرار الرئيسية", "العناوين والنصوص"].map((item) => (
                    <div key={item} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-brand-700">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <ImageIcon className="h-5 w-5 text-brand-700" />
                <h3 className="font-black text-slate-900">الشعار واسم المنصة</h3>
              </div>
              <label className="block space-y-2 text-sm font-bold text-slate-700">
                <span>اسم المنصة</span>
                <input required maxLength={80} value={identity.siteName} onChange={(event) => updateIdentity("siteName", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </label>
              <label className="block space-y-2 text-sm font-bold text-slate-700">
                <span>الشعار اللفظي</span>
                <input maxLength={120} value={identity.siteSubtitle} onChange={(event) => updateIdentity("siteSubtitle", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm font-bold text-slate-700">طريقة عرض الشعار</legend>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["image", "صورة"],
                    ["icon_text", "أيقونة ونص"],
                    ["text_only", "نص فقط"],
                  ] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => updateIdentity("logoType", value)} aria-pressed={identity.logoType === value} className={`min-h-11 rounded-xl border px-2 text-xs font-black ${identity.logoType === value ? "border-brand-700 bg-brand-700 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>{label}</button>
                  ))}
                </div>
              </fieldset>
              {identity.logoType !== "image" && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-bold text-slate-700">رمز الشعار</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {LOGO_ICONS.map((icon) => (
                      <button key={icon.id} type="button" onClick={() => updateIdentity("logoIcon", icon.id)} aria-pressed={identity.logoIcon === icon.id} className={`min-h-10 rounded-lg border text-xs font-bold ${identity.logoIcon === icon.id ? "border-brand-700 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{icon.label}</button>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="block space-y-2 text-sm font-bold text-slate-700">
                <span>رابط صورة الشعار</span>
                <input dir="ltr" value={identity.logoImageUrl || ""} onChange={(event) => updateIdentity("logoImageUrl", event.target.value)} placeholder="/branding/logo.png أو https://..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left font-mono text-sm text-slate-900" />
              </label>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <ImageIcon className="h-4 w-4" />
                {uploading === "logo" ? "جارٍ رفع الشعار..." : "رفع صورة الشعار"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={uploading !== null} onChange={(event) => void uploadImage(event, "logo")} className="sr-only" />
              </label>
              {identity.logoType === "image" && (
                <label className="block space-y-2 text-sm font-bold text-slate-700">
                  <span className="flex justify-between"><span>ارتفاع الشعار</span><span dir="ltr">{identity.logoHeightPx}px</span></span>
                  <input type="range" min={MIN_BRAND_LOGO_HEIGHT_PX} max={MAX_BRAND_LOGO_HEIGHT_PX} step={1} value={logoHeight} onChange={(event) => updateIdentity("logoHeightPx", Number(event.target.value))} className="w-full accent-brand-700" />
                  <span className="flex justify-between text-xs text-slate-400" dir="ltr"><span>{MIN_BRAND_LOGO_HEIGHT_PX}px</span><span>{MAX_BRAND_LOGO_HEIGHT_PX}px</span></span>
                </label>
              )}
            </section>

            <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Palette className="h-5 w-5 text-brand-700" />
                <h3 className="font-black text-slate-900">الألوان والسمة</h3>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-bold text-slate-700">مجموعات ألوان جاهزة</legend>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button key={preset.id} type="button" onClick={() => applyPreset(preset)} aria-pressed={identity.colorSchemePreset === preset.id} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-bold ${identity.colorSchemePreset === preset.id ? "border-brand-700 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.primary }} />{preset.name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["primaryColor", "اللون الأساسي"],
                  ["primaryHoverColor", "لون التفاعل والتحويم"],
                  ["secondaryColor", "اللون الثانوي"],
                  ["accentColor", "لون التمييز"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="space-y-2 text-sm font-bold text-slate-700">
                    <span className="block">{label}</span>
                    <span className="flex items-center gap-2">
                      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(identity[key]) ? identity[key] : "#059669"} onChange={(event) => { updateIdentity(key, event.target.value); updateIdentity("colorSchemePreset", "custom"); }} aria-label={label} className="h-11 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                      <input dir="ltr" value={identity[key]} onChange={(event) => { updateIdentity(key, event.target.value); updateIdentity("colorSchemePreset", "custom"); }} aria-label={`${label} HEX`} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left font-mono text-sm text-slate-900" />
                    </span>
                  </label>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  <span className="block">الخط</span>
                  <select value={identity.fontFamily} onChange={(event) => updateIdentity("fontFamily", event.target.value as VisualIdentitySettings["fontFamily"])} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <option value="cairo">Cairo</option><option value="alexandria">Alexandria</option><option value="tajawal">Tajawal</option><option value="almarai">Almarai</option><option value="ibm_plex">IBM Plex Sans Arabic</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  <span className="block">سماكة العناوين</span>
                  <select value={identity.headingWeight} onChange={(event) => updateIdentity("headingWeight", event.target.value as VisualIdentitySettings["headingWeight"])} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <option value="bold">عريض</option><option value="extrabold">عريض جداً</option><option value="black">ثقيل</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  <span className="block">استدارة الحواف</span>
                  <select value={identity.borderRadius} onChange={(event) => updateIdentity("borderRadius", event.target.value as VisualIdentitySettings["borderRadius"])} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <option value="soft">ناعمة</option><option value="curved">منحنية</option><option value="rounded">دائرية</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  <span className="block">خلفية شريط التنقل</span>
                  <select value={identity.headerBackground === "dark" ? "dark" : "white"} onChange={(event) => updateIdentity("headerBackground", event.target.value as VisualIdentitySettings["headerBackground"])} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <option value="white">بيضاء</option><option value="dark">داكنة</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Smartphone className="h-5 w-5 text-brand-700" />
                <h3 className="font-black text-slate-900">أيقونات التطبيق والمتصفح</h3>
              </div>
              <p className="text-sm leading-6 text-slate-500">أيقونة التطبيق يجب أن تكون مربعة ولا يقل حجمها عن 192×192 بكسل.</p>
              {identity.appIconUrl && <NextImage src={identity.appIconUrl} alt="معاينة أيقونة التطبيق" width={64} height={64} unoptimized className="h-16 w-16 rounded-2xl border border-slate-200 object-contain" />}
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Smartphone className="h-4 w-4" />
                {uploading === "appIcon" ? "جارٍ رفع الأيقونة..." : "رفع أيقونة التطبيق"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={uploading !== null} onChange={(event) => void uploadImage(event, "appIcon")} className="sr-only" />
              </label>
              <label className="block space-y-2 text-sm font-bold text-slate-700">
                <span>رابط أيقونة التطبيق</span>
                <input dir="ltr" value={identity.appIconUrl || ""} onChange={(event) => updateIdentity("appIconUrl", event.target.value)} placeholder="https://... أو مسار محلي" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left font-mono text-sm" />
              </label>
              <label className="block space-y-2 text-sm font-bold text-slate-700">
                <span>أيقونة المتصفح (اختياري)</span>
                <input dir="ltr" value={identity.faviconUrl || ""} onChange={(event) => updateIdentity("faviconUrl", event.target.value)} placeholder="اتركه فارغاً لاستخدام أيقونة التطبيق" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left font-mono text-sm" />
              </label>
            </section>
          </div>

          <div className="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <button type="submit" disabled={saving || !persistenceAvailable || uploading !== null} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-700 px-6 text-sm font-black text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "جارٍ الحفظ والتحقق..." : "حفظ وتفعيل الهوية"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
