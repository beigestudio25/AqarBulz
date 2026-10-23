"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Handshake,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { BrokerRecordInput, CustomerRecordInput, PropertyCriteria } from "@/lib/admin/records";

type RecordItem = {
  id: string;
  name: string;
  phone: string;
  desiredProperty?: PropertyCriteria;
  availableOffers?: string[];
};
type RecordTab = "clients" | "brokers";

const emptyCriteria: PropertyCriteria = {
  propertyType: "",
  transactionType: "sale",
  location: "",
  minPrice: null,
  maxPrice: null,
  bedrooms: null,
  notes: "",
};
const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

export default function ClientsManagement() {
  const [activeTab, setActiveTab] = useState<RecordTab>("clients");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [criteria, setCriteria] = useState<PropertyCriteria>(emptyCriteria);
  const [offers, setOffers] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${activeTab}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تحميل السجلات");
      setRecords(result.records || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل السجلات");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setCriteria(emptyCriteria);
    setOffers("");
  };

  const beginEdit = (record: RecordItem) => {
    setEditingId(record.id);
    setName(record.name);
    setPhone(record.phone);
    setCriteria(record.desiredProperty || emptyCriteria);
    setOffers((record.availableOffers || []).join("\n"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body: CustomerRecordInput | BrokerRecordInput =
      activeTab === "clients"
        ? { name, phone, desiredProperty: criteria }
        : { name, phone, availableOffers: offers.split("\n").map((offer) => offer.trim()).filter(Boolean) };
    try {
      const response = await fetch(
        editingId ? `/api/admin/${activeTab}/${editingId}` : `/api/admin/${activeTab}`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر حفظ السجل");
      resetForm();
      await loadRecords();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ السجل");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: RecordItem) => {
    if (!window.confirm(`هل تريد حذف سجل ${record.name}؟`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/${activeTab}/${record.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر حذف السجل");
      if (editingId === record.id) resetForm();
      await loadRecords();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف السجل");
    }
  };

  const updateCriteria = (key: keyof PropertyCriteria, value: string) => {
    setCriteria((current) => ({
      ...current,
      [key]:
        key === "minPrice" || key === "maxPrice" || key === "bedrooms"
          ? value === ""
            ? null
            : Number(value)
          : value,
    }));
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-cyan-700">إدارة المنصة</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">العملاء والوسطاء</h1>
            <p className="mt-2 text-sm text-slate-500">حفظ بيانات العملاء ومعايير البحث، ومتابعة عروض الوسطاء.</p>
          </div>
          <button onClick={() => void loadRecords()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-100">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
        </header>

        <div className="flex gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => { resetForm(); setActiveTab("clients"); }}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${activeTab === "clients" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500"}`}
          >
            <Users className="h-4 w-4" /> العملاء
          </button>
          <button
            type="button"
            onClick={() => { resetForm(); setActiveTab("brokers"); }}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${activeTab === "brokers" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500"}`}
          >
            <Handshake className="h-4 w-4" /> الوسطاء
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-black">{editingId ? "تعديل السجل" : activeTab === "clients" ? "إضافة عميل" : "إضافة وسيط"}</h2>
            {editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-sm font-bold text-slate-500"><X className="h-4 w-4" /> إلغاء التعديل</button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-bold">الاسم<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></label>
            <label className="space-y-1.5 text-sm font-bold">رقم الهاتف<input required type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} /></label>
          </div>

          {activeTab === "clients" ? (
            <section className="space-y-4 rounded-xl bg-slate-50 p-4">
              <h3 className="font-bold">العقار المطلوب ومعاييره</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1.5 text-sm font-bold">نوع العقار<input required value={criteria.propertyType} onChange={(event) => updateCriteria("propertyType", event.target.value)} placeholder="شقة، فيلا، أرض..." className={fieldClass} /></label>
                <label className="space-y-1.5 text-sm font-bold">العملية<select value={criteria.transactionType} onChange={(event) => updateCriteria("transactionType", event.target.value)} className={fieldClass}><option value="sale">شراء</option><option value="rent">إيجار</option></select></label>
                <label className="space-y-1.5 text-sm font-bold">الموقع<input required value={criteria.location} onChange={(event) => updateCriteria("location", event.target.value)} placeholder="المدينة أو المنطقة" className={fieldClass} /></label>
                <label className="space-y-1.5 text-sm font-bold">أقل سعر<input type="number" min="0" value={criteria.minPrice ?? ""} onChange={(event) => updateCriteria("minPrice", event.target.value)} className={fieldClass} /></label>
                <label className="space-y-1.5 text-sm font-bold">أعلى سعر<input type="number" min="0" value={criteria.maxPrice ?? ""} onChange={(event) => updateCriteria("maxPrice", event.target.value)} className={fieldClass} /></label>
                <label className="space-y-1.5 text-sm font-bold">عدد الغرف<input type="number" min="0" max="100" value={criteria.bedrooms ?? ""} onChange={(event) => updateCriteria("bedrooms", event.target.value)} className={fieldClass} /></label>
              </div>
              <label className="block space-y-1.5 text-sm font-bold">ملاحظات إضافية<textarea maxLength={1000} rows={3} value={criteria.notes} onChange={(event) => updateCriteria("notes", event.target.value)} className={fieldClass} /></label>
            </section>
          ) : (
            <label className="block space-y-1.5 text-sm font-bold">العروض العقارية المتاحة<textarea required rows={5} value={offers} onChange={(event) => setOffers(event.target.value)} placeholder={"اكتب كل عرض في سطر مستقل، مع الموقع والسعر والتفاصيل"} className={fieldClass} /><span className="block text-xs font-normal text-slate-500">حتى 50 عرضاً، كل عرض في سطر منفصل.</span></label>
          )}
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التغييرات" : "إضافة السجل"}
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-black">{activeTab === "clients" ? "سجلات العملاء" : "سجلات الوسطاء"}</h2>
            <span className="text-sm text-slate-500">{records.length} سجل</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> جارٍ التحميل</div>
          ) : records.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">لا توجد سجلات بعد.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {records.map((record) => (
                <article key={record.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black">{record.name}</h3>
                    <p dir="ltr" className="mt-1 w-fit text-sm text-slate-500">{record.phone}</p>
                    {activeTab === "clients" && record.desiredProperty ? (
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <p>
                          {record.desiredProperty.propertyType} • {record.desiredProperty.transactionType === "sale" ? "شراء" : "إيجار"} • {record.desiredProperty.location}
                          {(record.desiredProperty.minPrice !== null || record.desiredProperty.maxPrice !== null) && ` • ${record.desiredProperty.minPrice ?? "—"} - ${record.desiredProperty.maxPrice ?? "—"}`}
                          {record.desiredProperty.bedrooms !== null && ` • ${record.desiredProperty.bedrooms} غرف`}
                        </p>
                        {record.desiredProperty.notes && <p className="whitespace-pre-wrap text-slate-500">{record.desiredProperty.notes}</p>}
                      </div>
                    ) : (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                        {(record.availableOffers || []).map((offer, index) => <li key={`${record.id}-offer-${index}`}>{offer}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => beginEdit(record)} aria-label={`تعديل ${record.name}`} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void remove(record)} aria-label={`حذف ${record.name}`} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
