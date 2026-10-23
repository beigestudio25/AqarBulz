"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import {
  Palette,
  Sparkles,
  Building2,
  Compass,
  Shield,
  Home,
  Crown,
  Layers,
  MapPin,
  Save,
  Check,
  RefreshCw,
  Image,
  Type,
  Phone,
  Mail,
  Sliders,
  ExternalLink,
  Smartphone,
  Eye,
  FileText,
} from "lucide-react";
import { CmsHomepageSettings, CmsStaticPage, VisualIdentitySettings } from "@/lib/db/types";
import {
  DEFAULT_BRAND_LOGO_HEIGHT_PX,
  DEFAULT_BRAND_LOGO_PATH,
  MAX_BRAND_LOGO_HEIGHT_PX,
  MIN_BRAND_LOGO_HEIGHT_PX,
  getBrandLogoHeightPx,
} from "@/lib/brand-theme";

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

export default function AdminCmsTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [siteName, setSiteName] = useState("دار العقار");
  const [siteSubtitle, setSiteSubtitle] = useState("Dar Al Aqar Egypt");
  const [logoType, setLogoType] = useState<"icon_text" | "image" | "text_only">("image");
  const [logoIcon, setLogoIcon] = useState<VisualIdentitySettings["logoIcon"]>("building");
  const [logoImageUrl, setLogoImageUrl] = useState(DEFAULT_BRAND_LOGO_PATH);
  const [logoHeightPx, setLogoHeightPx] = useState(DEFAULT_BRAND_LOGO_HEIGHT_PX);
  const [appIconUrl, setAppIconUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");

  const [primaryColor, setPrimaryColor] = useState("#059669");
  const [primaryHoverColor, setPrimaryHoverColor] = useState("#047857");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [colorSchemePreset, setColorSchemePreset] = useState<VisualIdentitySettings["colorSchemePreset"]>("emerald_pulse");
  const [headingWeight, setHeadingWeight] = useState<VisualIdentitySettings["headingWeight"]>("bold");
  const [fontFamily, setFontFamily] = useState<VisualIdentitySettings["fontFamily"]>("cairo");
  const [borderRadius, setBorderRadius] = useState<VisualIdentitySettings["borderRadius"]>("curved");
  const [headerBackground, setHeaderBackground] = useState<VisualIdentitySettings["headerBackground"]>("white");

  // Nav labels
  const [navHome, setNavHome] = useState("الرئيسية");
  const [navPropertiesDropdown, setNavPropertiesDropdown] = useState("العقارات");
  const [navSale, setNavSale] = useState("بيع");
  const [navRent, setNavRent] = useState("إيجار");
  const [navExplore, setNavExplore] = useState("الإعلانات");
  const [navProjects, setNavProjects] = useState("المشاريع");
  const [navSmartMatch, setNavSmartMatch] = useState("التوافق الذكي");
  const [navAddProperty, setNavAddProperty] = useState("أضف عقارك");
  const [navAbout, setNavAbout] = useState("من نحن");
  const [navContact, setNavContact] = useState("تواصل معنا");
  const [navTerms, setNavTerms] = useState("الشروط والأحكام");
  const [navPrivacy, setNavPrivacy] = useState("سياسة الخصوصية وأمن البيانات");

  // Contact info
  const [contactPhone, setContactPhone] = useState("+966500000000");
  const [contactWhatsApp, setContactWhatsApp] = useState("+966500000000");
  const [contactEmail, setContactEmail] = useState("support@aqar.sa");
  const [heroBadgeText, setHeroBadgeText] = useState("");
  const [heroTitleLine1, setHeroTitleLine1] = useState("");
  const [heroTitleLine2, setHeroTitleLine2] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [heroCtaText, setHeroCtaText] = useState("");
  const [heroCtaLink, setHeroCtaLink] = useState("/explore");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [cmsPages, setCmsPages] = useState<CmsStaticPage[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState("about");
  const [pageSaving, setPageSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAppIcon, setUploadingAppIcon] = useState(false);

  const fetchCmsSettings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [res, pagesRes] = await Promise.all([
        fetch("/api/admin/cms/settings", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/cms/pages", { cache: "no-store", credentials: "include" }),
      ]);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر تحميل إعدادات الهوية والمحتوى");
      }

      const s: CmsHomepageSettings = data.settings;
      const persistenceUnavailable = data.persistenceAvailable === false;
      let pageLoadError: string | null = null;
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setCmsPages(Array.isArray(pagesData.pages) ? pagesData.pages : []);
      } else {
        const pagesData = await pagesRes.json().catch(() => null);
        pageLoadError = pagesData?.error || "تعذر تحميل الصفحات العامة.";
      }

      setLoadError(persistenceUnavailable || !pagesRes.ok);
      setErrorMsg(
        persistenceUnavailable
          ? `${data.error || "تعذر الاتصال بمخزن الهوية المركزي."} أعد المحاولة قبل الحفظ لتجنب استبدال الإعدادات المحفوظة.`
          : pageLoadError
      );

      if (s) {
        if (s.visualIdentity) {
          setSiteName(s.visualIdentity.siteName || "دار العقار");
          setSiteSubtitle(s.visualIdentity.siteSubtitle || "Dar Al Aqar Egypt");
          setLogoType(s.visualIdentity.logoType || "image");
          setLogoIcon(s.visualIdentity.logoIcon || "building");
          setLogoImageUrl(s.visualIdentity.logoImageUrl || DEFAULT_BRAND_LOGO_PATH);
          setLogoHeightPx(getBrandLogoHeightPx(s.visualIdentity));
          setAppIconUrl(s.visualIdentity.appIconUrl || "");
          setFaviconUrl(s.visualIdentity.faviconUrl || "");
          setPrimaryColor(s.visualIdentity.primaryColor || "#059669");
          setPrimaryHoverColor(s.visualIdentity.primaryHoverColor || "#047857");
          setSecondaryColor(s.visualIdentity.secondaryColor || "#0f172a");
          setAccentColor(s.visualIdentity.accentColor || "#10b981");
          setColorSchemePreset(s.visualIdentity.colorSchemePreset || "emerald_pulse");
          setHeadingWeight(s.visualIdentity.headingWeight || "bold");
          setFontFamily(s.visualIdentity.fontFamily || "cairo");
          setBorderRadius(s.visualIdentity.borderRadius || "curved");
          setHeaderBackground(s.visualIdentity.headerBackground === "glass" ? "white" : s.visualIdentity.headerBackground || "white");
        }
        if (s.navLabels) {
          setNavHome(s.navLabels.home || "الرئيسية");
          setNavPropertiesDropdown(s.navLabels.propertiesDropdown || "العقارات");
          setNavSale(s.navLabels.sale || "بيع");
          setNavRent(s.navLabels.rent || "إيجار");
          setNavExplore(s.navLabels.explore || "الإعلانات");
          setNavProjects(s.navLabels.projects || "المشاريع");
          setNavSmartMatch(s.navLabels.smartMatch || "التوافق الذكي");
          setNavAddProperty(s.navLabels.addProperty || "أضف عقارك");
          setNavAbout(s.navLabels.about || "من نحن");
          setNavContact(s.navLabels.contact || "تواصل معنا");
          setNavTerms(s.navLabels.terms || "الشروط والأحكام");
          setNavPrivacy(s.navLabels.privacy || "سياسة الخصوصية وأمن البيانات");
        }
        if (s.contactPhone) setContactPhone(s.contactPhone);
        if (s.contactWhatsApp) setContactWhatsApp(s.contactWhatsApp);
        if (s.contactEmail) setContactEmail(s.contactEmail);
        setHeroBadgeText(s.heroBadgeText || "");
        setHeroTitleLine1(s.heroTitleLine1 || "");
        setHeroTitleLine2(s.heroTitleLine2 || "");
        setHeroDescription(s.heroDescription || "");
        setHeroCtaText(s.heroCtaText || "");
        setHeroCtaLink(s.heroCtaLink || "/explore");
        setMetaTitle(s.metaTitle || "");
        setMetaDescription(s.metaDescription || "");
      }
    } catch (err) {
      console.error("Failed to fetch CMS settings:", err);
      setLoadError(true);
      setErrorMsg(err instanceof Error ? err.message : "تعذر تحميل إعدادات الهوية والمحتوى");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCmsSettings();
  }, []);

  const selectedPage = cmsPages.find((page) => page.slug === selectedPageSlug) || null;

  const applyColorPreset = (preset: (typeof COLOR_PRESETS)[number]) => {
    setColorSchemePreset(preset.id);
    setPrimaryColor(preset.primary);
    setPrimaryHoverColor(preset.hover);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: "logo" | "appIcon"
  ) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const input = event.currentTarget;
    const setUploading = target === "logo" ? setUploadingLogo : setUploadingAppIcon;

    setUploading(true);
    setErrorMsg(null);
    try {
      if (target === "appIcon") {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const image = document.createElement("img");
          image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: image.width, height: image.height });
          };
          image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("تعذر قراءة أبعاد الصورة"));
          };
          image.src = objectUrl;
        });
        const isSquare = dimensions.width === dimensions.height;
        const isLargeEnough = dimensions.width >= 192;
        if (!isSquare || !isLargeEnough) {
          throw new Error("يجب أن تكون أيقونة التطبيق مربعة وبأبعاد لا تقل عن 192×192 بكسل");
        }
      }

      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("propertyId", "draft");
      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: uploadData,
      });
      const result = await response.json();
      if (!response.ok || !result.url) {
        throw new Error(result.error || "فشل رفع الصورة");
      }
      if (target === "logo") setLogoImageUrl(result.url);
      else setAppIconUrl(result.url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const handleSavePage = async () => {
    if (!selectedPage) return;
    setPageSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);
    try {
      const response = await fetch("/api/admin/cms/pages", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedPage),
      });
      const result = await response.json();
      if (!response.ok || !result.page) {
        throw new Error(result.error || "تعذر حفظ الصفحة");
      }
      setCmsPages((pages) => pages.map((page) => page.slug === result.page.slug ? result.page : page));
      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "تعذر حفظ الصفحة العامة");
    } finally {
      setPageSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const payload: Partial<CmsHomepageSettings> = {
        visualIdentity: {
          siteName,
          siteSubtitle,
          logoType,
          logoIcon,
          logoImageUrl,
          logoHeightPx,
          appIconUrl,
          faviconUrl,
          primaryColor,
          primaryHoverColor,
          secondaryColor,
          accentColor,
          headerBackground,
          colorSchemePreset,
          fontFamily,
          headingWeight,
          borderRadius,
        },
        navLabels: {
          brandTitle: siteName,
          brandSubtitle: siteSubtitle,
          home: navHome,
          propertiesDropdown: navPropertiesDropdown,
          sale: navSale,
          rent: navRent,
          explore: navExplore,
          projects: navProjects,
          smartMatch: navSmartMatch,
          addProperty: navAddProperty,
          about: navAbout,
          contact: navContact,
          terms: navTerms,
          privacy: navPrivacy,
        },
        contactPhone,
        contactWhatsApp,
        contactEmail,
        heroBadgeText,
        heroTitleLine1,
        heroTitleLine2,
        heroDescription,
        heroCtaText,
        heroCtaLink,
        metaTitle,
        metaDescription,
      };

      const res = await fetch("/api/cms/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "فشل حفظ التعديلات");
        const savedLogoHeight = result.settings?.visualIdentity?.logoHeightPx;
        if (typeof savedLogoHeight === "number") {
          setLogoHeightPx(getBrandLogoHeightPx({ logoHeightPx: savedLogoHeight }));
        }
        setSaveSuccess(true);
        window.dispatchEvent(new Event("cms-settings-updated"));
        router.refresh();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const d = await res.json();
        throw new Error(d.error || "فشل حفظ التعديلات");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الإعدادات في الخادم");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  const renderIconPreview = () => {
    switch (logoIcon) {
      case "building":
        return <Building2 className="w-5 h-5 text-white" />;
      case "sparkles":
        return <Sparkles className="w-5 h-5 text-white" />;
      case "compass":
        return <Compass className="w-5 h-5 text-white" />;
      case "shield":
        return <Shield className="w-5 h-5 text-white" />;
      case "crown":
        return <Crown className="w-5 h-5 text-white" />;
      case "layers":
        return <Layers className="w-5 h-5 text-white" />;
      case "map_pin":
        return <MapPin className="w-5 h-5 text-white" />;
      default:
        return <Home className="w-5 h-5 text-white" />;
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-purple-700 text-xs font-black uppercase tracking-wider mb-1">
            <Palette className="w-4 h-4" />
            <span>شركة الإدارة • الهوية البصرية ومحتوى المنصة</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            التحكم الشامل في الهوية البصرية وأسماء الأزرار
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تخصيص الشعار والأيقونة، ألوان المنصة، وأسماء الأزرار في كافة واجهات التطبيق ومحركات التصفح.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin?tab=cms"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 px-4 py-3 text-xs font-black text-brand-800 transition-colors hover:bg-brand-50"
          >
            <Palette className="h-4 w-4" />
            صفحة الهوية المعاد بناؤها
          </Link>
          <button
            type="submit"
            disabled={saving || loading || loadError || uploadingLogo || uploadingAppIcon}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md shadow-purple-700/20 cursor-pointer self-start md:self-auto"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ والاعتماد...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات فوراً</span>
              </>
            )}
          </button>
          {loadError && (
            <button
              type="button"
              onClick={() => void fetchCmsSettings()}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة تحميل الإعدادات
            </button>
          )}
        </div>
      </div>

      {/* Success / Error notification */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>تم حفظ الهوية البصرية وأسماء الأزرار وتحديث واجهة التطبيق بنجاح!</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* 2. Interactive Live Brand Preview */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>معاينة حية وفورية للهوية والشعار</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
            تطبيق حي
          </span>
        </div>

        <div
          style={{
            backgroundColor: headerBackground === "dark" ? secondaryColor : "#ffffff",
            borderColor: headerBackground === "dark" ? secondaryColor : "#e2e8f0",
          }}
          className="rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          {/* Logo preview */}
          <div className="flex items-center gap-3">
            {logoType === "image" ? (
              <NextImage
                src={logoImageUrl || DEFAULT_BRAND_LOGO_PATH}
                alt={siteName}
                width={144}
                height={74}
                unoptimized
                style={{ height: `${logoHeightPx}px`, width: "auto" }}
                className="rounded-xl border border-slate-700 bg-white object-contain"
              />
            ) : logoType !== "text_only" ? (
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/20"
              >
                {renderIconPreview()}
              </div>
            ) : null}

            {logoType !== "image" && (
              <div style={{ color: headerBackground === "dark" ? "#ffffff" : "#0f172a" }}>
                <div style={{ fontWeight: headingWeight === "bold" ? 700 : headingWeight === "extrabold" ? 800 : 900 }} className="text-base tracking-tight">
                  {siteName}
                </div>
                <p style={{ color: accentColor }} className="text-[11px] font-medium">{siteSubtitle}</p>
              </div>
            )}
          </div>

          {/* Sample Navigation Buttons Preview */}
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
            <span
              style={{ backgroundColor: primaryColor }}
              className="px-3 py-1.5 rounded-xl text-white text-xs font-black shadow-xs"
            >
              {navAddProperty}
            </span>
            <span
              style={{ backgroundColor: secondaryColor }}
              className="px-3 py-1.5 rounded-xl text-white text-xs font-bold"
            >
              {navExplore}
            </span>
            <span
              style={{ backgroundColor: accentColor }}
              className="px-3 py-1.5 rounded-xl text-slate-950 text-xs font-bold"
            >
              {navProjects}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Detailed Setting Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel A: الشعار والأيقونة واسم المنصة */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-purple-700" />
            <span>الشعار، الأيقونة، واسم المنصة</span>
          </div>

          <div className="space-y-4 text-xs font-bold text-slate-700">
            <div>
              <label className="block mb-1.5">اسم المنصة الرسمي (Site Name)</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="دار العقار"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block mb-1.5">الشعار اللفظي أو الوصف المختصر</label>
              <input
                type="text"
                value={siteSubtitle}
                onChange={(e) => setSiteSubtitle(e.target.value)}
                placeholder="منصة التسويق العقاري الذكي"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            {/* Logo Display Format */}
            <div>
              <label className="block mb-1.5">نمط عرض الشعار</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "icon_text", label: "أيقونة + نص" },
                  { id: "image", label: "صورة شعار مخصصة" },
                  { id: "text_only", label: "نص فقط" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLogoType(item.id as VisualIdentitySettings["logoType"])}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      logoType === item.id
                        ? "bg-purple-700 text-white border-purple-700 font-black"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-bold"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Choose Icon */}
            {logoType !== "image" && (
              <div>
                <label className="block mb-2">اختر الأيقونة الرمزية للشعار</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "building", label: "برج وعمارة", icon: Building2 },
                    { id: "sparkles", label: "بريق ذكي", icon: Sparkles },
                    { id: "shield", label: "درع أمان", icon: Shield },
                    { id: "crown", label: "تاج فخامة", icon: Crown },
                    { id: "compass", label: "بوصلة", icon: Compass },
                    { id: "map_pin", label: "دبوس موقع", icon: MapPin },
                    { id: "layers", label: "طبقات", icon: Layers },
                    { id: "home", label: "منزل راقٍ", icon: Home },
                  ].map((ic) => {
                    const IconComponent = ic.icon;
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setLogoIcon(ic.id as VisualIdentitySettings["logoIcon"])}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          logoIcon === ic.id
                            ? "bg-purple-50 text-purple-800 border-purple-600 ring-2 ring-purple-600/20"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span className="text-[10px] font-bold">{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Image URL if image mode */}
            {logoType === "image" && (
              <div>
                <label className="block mb-1.5">رابط صورة الشعار (URL أو مسار في /images)</label>
                <input
                  type="text"
                  value={logoImageUrl}
                  onChange={(e) => setLogoImageUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  dir="ltr"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-left"
                />
                <label className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-800 cursor-pointer">
                  <Image className="w-4 h-4" />
                  <span>{uploadingLogo ? "جارٍ رفع الشعار..." : "رفع صورة شعار"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    disabled={uploadingLogo}
                    onChange={(event) => void handleImageUpload(event, "logo")}
                    className="sr-only"
                  />
                </label>
                <label className="mt-4 block space-y-2">
                  <span className="flex items-center justify-between">
                    <span>حجم الشعار في التطبيق</span>
                    <span className="text-purple-700" dir="ltr">{logoHeightPx}px</span>
                  </span>
                  <input
                    type="range"
                    min={MIN_BRAND_LOGO_HEIGHT_PX}
                    max={MAX_BRAND_LOGO_HEIGHT_PX}
                    step={4}
                    value={logoHeightPx}
                    disabled={saving}
                    onChange={(event) => setLogoHeightPx(Number(event.target.value))}
                    className="w-full accent-purple-700 disabled:cursor-wait disabled:opacity-60"
                    aria-label="حجم الشعار بالبكسل"
                  />
                  <span className="flex justify-between text-[10px] text-slate-500" dir="ltr">
                    <span>{MIN_BRAND_LOGO_HEIGHT_PX}px</span>
                    <span>{MAX_BRAND_LOGO_HEIGHT_PX}px</span>
                  </span>
                </label>
              </div>
            )}

            <div>
              <label className="block mb-1.5">أيقونة التطبيق المثبت والمتصفح</label>
              <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                ارفع صورة PNG أو JPEG أو WebP أو AVIF مربعة، 192×192 بكسل على الأقل. ستُستخدم لأيقونة التطبيق وPWA وأيقونة المتصفح.
              </p>
              {appIconUrl && (
                <div className="mb-2 flex items-center gap-3">
                  <NextImage
                    src={appIconUrl}
                    alt="معاينة أيقونة التطبيق"
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-xl border border-slate-200 object-contain bg-white"
                  />
                  <span className="text-[11px] text-slate-500">معاينة أيقونة التطبيق</span>
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-800 cursor-pointer">
                <Smartphone className="w-4 h-4" />
                <span>{uploadingAppIcon ? "جارٍ رفع الأيقونة..." : "رفع أيقونة التطبيق"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  disabled={uploadingAppIcon}
                  onChange={(event) => void handleImageUpload(event, "appIcon")}
                  className="sr-only"
                />
              </label>
              <input
                type="text"
                value={appIconUrl}
                onChange={(e) => setAppIconUrl(e.target.value)}
                placeholder="رابط HTTPS أو مسار صورة الأيقونة"
                dir="ltr"
                className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-left"
              />
            </div>

            <div>
              <label className="block mb-1.5">أيقونة المتصفح المخصصة (اختياري)</label>
              <p className="mb-2 text-[11px] text-slate-500">إذا تركت هذا الحقل فارغاً، ستُستخدم أيقونة التطبيق أعلاه.</p>
              <input
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="/favicon.ico أو رابط أيقونة"
                dir="ltr"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-left"
              />
            </div>
          </div>
        </div>

        {/* Panel B: أسماء الأزرار وعناصر التنقل */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
            <Type className="w-4 h-4 text-purple-700" />
            <span>أسماء الأزرار وعناصر التنقل الرئيسية</span>
          </div>

          <div className="space-y-4 text-xs font-bold text-slate-700">
            <div>
              <label className="block mb-1.5">اسم زر إضافة العقار</label>
              <input
                type="text"
                value={navAddProperty}
                onChange={(e) => setNavAddProperty(e.target.value)}
                placeholder="أضف عقارك"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block mb-1.5">اسم زر "المشاريع"</label>
              <input
                type="text"
                value={navProjects}
                onChange={(e) => setNavProjects(e.target.value)}
                placeholder="المشاريع"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block mb-1.5">اسم زر "الإعلانات / تصفح"</label>
              <input
                type="text"
                value={navExplore}
                onChange={(e) => setNavExplore(e.target.value)}
                placeholder="الإعلانات"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block mb-1.5">اسم زر "الرئيسية"</label>
              <input
                type="text"
                value={navHome}
                onChange={(e) => setNavHome(e.target.value)}
                placeholder="الرئيسية"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "قائمة العقارات", value: navPropertiesDropdown, setValue: setNavPropertiesDropdown },
                { label: "عقارات للبيع", value: navSale, setValue: setNavSale },
                { label: "عقارات للإيجار", value: navRent, setValue: setNavRent },
                { label: "التوافق الذكي", value: navSmartMatch, setValue: setNavSmartMatch },
                { label: "الشروط والأحكام", value: navTerms, setValue: setNavTerms },
                { label: "سياسة الخصوصية", value: navPrivacy, setValue: setNavPrivacy },
              ].map((item) => (
                <label key={item.label} className="space-y-1.5">
                  <span className="block">{item.label}</span>
                  <input
                    type="text"
                    value={item.value}
                    onChange={(event) => item.setValue(event.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5">اسم زر "من نحن"</label>
                <input
                  type="text"
                  value={navAbout}
                  onChange={(e) => setNavAbout(e.target.value)}
                  placeholder="من نحن"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block mb-1.5">اسم زر "تواصل معنا"</label>
                <input
                  type="text"
                  value={navContact}
                  onChange={(e) => setNavContact(e.target.value)}
                  placeholder="تواصل معنا"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel C: الألوان والسمة البصرية */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-purple-700" />
            <span>لوحة الألوان والسمة الجمالية</span>
          </div>

          <div className="space-y-4 text-xs font-bold text-slate-700">
            <div>
              <label className="block mb-2">اللون الأساسي المميز (Primary Accent)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    setColorSchemePreset("custom");
                  }}
                  className="w-12 h-12 rounded-xl cursor-pointer border border-slate-300 p-1"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    setColorSchemePreset("custom");
                  }}
                  dir="ltr"
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-left"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyColorPreset(preset)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <span
                      style={{ backgroundColor: preset.primary }}
                      className="w-3 h-3 rounded-full"
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="block">لون التفاعل والتحويم</span>
                <input
                  type="color"
                  value={primaryHoverColor}
                  onChange={(event) => {
                    setPrimaryHoverColor(event.target.value);
                    setColorSchemePreset("custom");
                  }}
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                />
              </label>
              <label className="space-y-1.5">
                <span className="block">اللون الثانوي</span>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(event) => {
                    setSecondaryColor(event.target.value);
                    setColorSchemePreset("custom");
                  }}
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                />
              </label>
              <label className="space-y-1.5">
                <span className="block">لون التمييز</span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => {
                    setAccentColor(event.target.value);
                    setColorSchemePreset("custom");
                  }}
                  className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                />
              </label>
            </div>

            <div>
              <label className="block mb-1.5">سماكة العناوين</label>
              <select
                value={headingWeight}
                onChange={(event) => setHeadingWeight(event.target.value as VisualIdentitySettings["headingWeight"])}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              >
                <option value="bold">عريض</option>
                <option value="extrabold">عريض جداً</option>
                <option value="black">ثقيل</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5">خط العناوين والواجهة (Typography)</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as VisualIdentitySettings["fontFamily"])}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white cursor-pointer"
              >
                <option value="cairo">Cairo - خط القاهرة العربي الأنيق</option>
                <option value="alexandria">Alexandria - خط الإسكندرية الحديث</option>
                <option value="tajawal">Tajawal - خط تجوال المتزن</option>
                <option value="almarai">Almarai - خط المراعي الرسمي</option>
                <option value="ibm_plex">IBM Plex Arabic - خط تقني احترافي</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5">خلفية شريط التنقل العلوي</label>
              <select
                value={headerBackground}
                onChange={(event) => setHeaderBackground(event.target.value as VisualIdentitySettings["headerBackground"])}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              >
                <option value="white">بيضاء ثابتة</option>
                <option value="dark">داكنة</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5">استدارة الحواف</label>
              <select
                value={borderRadius}
                onChange={(event) => setBorderRadius(event.target.value as VisualIdentitySettings["borderRadius"])}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              >
                <option value="soft">ناعمة</option>
                <option value="curved">منحنية</option>
                <option value="rounded">دائرية بارزة</option>
              </select>
            </div>
          </div>
        </div>

        {/* Panel D: بيانات التواصل والدعم */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
            <Phone className="w-4 h-4 text-purple-700" />
            <span>بيانات التواصل الرسمية لشركة الإدارة</span>
          </div>

          <div className="space-y-4 text-xs font-bold text-slate-700">
            <div>
              <label className="block mb-1.5">رقم الهاتف الرسمي</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+966500000000"
                dir="ltr"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-left"
              />
            </div>

            <div>
              <label className="block mb-1.5">رقم الواتساب المعتمد</label>
              <input
                type="text"
                value={contactWhatsApp}
                onChange={(e) => setContactWhatsApp(e.target.value)}
                placeholder="+966500000000"
                dir="ltr"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-left"
              />
            </div>

            <div>
              <label className="block mb-1.5">البريد الإلكتروني للدعم الفني</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="support@aqar.sa"
                dir="ltr"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-left"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
          <Home className="w-4 h-4 text-purple-700" />
          <span>محتوى الصفحة الرئيسية وظهور محركات البحث</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
          <label className="space-y-1.5">
            <span className="block">الشارة التعريفية أعلى الصفحة</span>
            <input value={heroBadgeText} onChange={(e) => setHeroBadgeText(e.target.value)} maxLength={120} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
          </label>
          <label className="space-y-1.5">
            <span className="block">عنوان الصفحة - السطر الأول</span>
            <input value={heroTitleLine1} onChange={(e) => setHeroTitleLine1(e.target.value)} maxLength={100} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
          </label>
          <label className="space-y-1.5">
            <span className="block">عنوان الصفحة - السطر الثاني</span>
            <input value={heroTitleLine2} onChange={(e) => setHeroTitleLine2(e.target.value)} maxLength={100} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
          </label>
          <label className="space-y-1.5">
            <span className="block">نص زر الإجراء الرئيسي</span>
            <input value={heroCtaText} onChange={(e) => setHeroCtaText(e.target.value)} maxLength={60} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className="block">وصف الصفحة الرئيسية</span>
            <textarea value={heroDescription} onChange={(e) => setHeroDescription(e.target.value)} rows={3} maxLength={500} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-y" />
          </label>
          <label className="space-y-1.5">
            <span className="block">وجهة زر الإجراء (مسار داخلي)</span>
            <input value={heroCtaLink} onChange={(e) => setHeroCtaLink(e.target.value)} dir="ltr" placeholder="/explore" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left" />
          </label>
          <div className="md:col-span-2 border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="block">عنوان نتائج البحث (SEO title)</span>
              <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={160} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </label>
            <label className="space-y-1.5">
              <span className="block">وصف نتائج البحث (SEO description)</span>
              <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} maxLength={320} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-y" />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 text-slate-900 font-black text-base pb-3 border-b border-slate-100">
          <FileText className="w-4 h-4 text-purple-700" />
          <span>إدارة محتوى الصفحات العامة</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { slug: "about", label: "من نحن" },
            { slug: "contact", label: "تواصل معنا" },
            { slug: "terms", label: "الشروط والأحكام" },
            { slug: "privacy", label: "الخصوصية" },
          ].map((page) => (
            <button
              key={page.slug}
              type="button"
              onClick={() => setSelectedPageSlug(page.slug)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${selectedPageSlug === page.slug ? "bg-purple-700 border-purple-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}
            >
              {page.label}
            </button>
          ))}
        </div>
        {selectedPage ? (
          <div className="space-y-4 text-xs font-bold text-slate-700">
            <label className="block space-y-1.5">
              <span>عنوان الصفحة</span>
              <input
                value={selectedPage.titleAr}
                onChange={(event) => setCmsPages((pages) => pages.map((page) => page.slug === selectedPageSlug ? { ...page, titleAr: event.target.value } : page))}
                maxLength={140}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </label>
            <label className="block space-y-1.5">
              <span>محتوى الصفحة (نص عادي، احتفظ بفواصل الأسطر)</span>
              <textarea
                value={selectedPage.contentAr}
                onChange={(event) => setCmsPages((pages) => pages.map((page) => page.slug === selectedPageSlug ? { ...page, contentAr: event.target.value } : page))}
                rows={8}
                maxLength={12000}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-y leading-7"
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span>عنوان محركات البحث</span>
                <input
                  value={selectedPage.metaTitle || ""}
                  onChange={(event) => setCmsPages((pages) => pages.map((page) => page.slug === selectedPageSlug ? { ...page, metaTitle: event.target.value } : page))}
                  maxLength={160}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </label>
              <label className="block space-y-1.5">
                <span>وصف محركات البحث</span>
                <textarea
                  value={selectedPage.metaDescription || ""}
                  onChange={(event) => setCmsPages((pages) => pages.map((page) => page.slug === selectedPageSlug ? { ...page, metaDescription: event.target.value } : page))}
                  rows={2}
                  maxLength={320}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-y"
                />
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedPage.isPublished}
                onChange={(event) => setCmsPages((pages) => pages.map((page) => page.slug === selectedPageSlug ? { ...page, isPublished: event.target.checked } : page))}
                className="w-4 h-4 accent-purple-700"
              />
              <span>الصفحة منشورة للزوار</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void handleSavePage()} disabled={pageSaving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 text-white font-black disabled:opacity-50">
                {pageSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ الصفحة العامة
              </button>
              <a href={`/${selectedPageSlug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-purple-700 font-bold">
                معاينة الصفحة <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <p className="text-xs text-rose-700">تعذر تحميل الصفحة المحددة.</p>
        )}
      </div>

      {/* Floating or Bottom Save Bar */}
      <div className="sticky bottom-20 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between gap-4">
        <span className="text-xs font-bold text-slate-600">
          يتم تطبيق الهوية البصرية فور حفظها على كافة صفحات التطبيق وزواره.
        </span>

        <button
          type="submit"
          disabled={saving || loading || loadError || uploadingLogo || uploadingAppIcon}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md shadow-purple-700/20 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات فوراً</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
