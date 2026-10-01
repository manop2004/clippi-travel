import React, { useState, useEffect } from "react";
import {
  Image,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Link,
  Tag,
  ArrowUpRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { C } from "../../constants/mockData";
import { useLang } from "../../lib/i18n";
import {
  AppBanner,
  PRESET_GRADIENTS,
  fetchAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  getBannerStatus,
} from "../../lib/bannerHelpers";

export default function AdminBannerManagePage() {
  const { t } = useLang();
  const [banners, setBanners] = useState<AppBanner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | "active" | "scheduled" | "expired" | "disabled">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<AppBanner | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    tag: " PROMOTION",
    cta_text: "",
    cta_link: "",
    image_url: "",
    bg_gradient: PRESET_GRADIENTS[0].value,
    is_active: true,
    has_duration: false,
    start_date: "",
    end_date: "",
    display_order: 1,
  });

  const [saving, setSaving] = useState<boolean>(false);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await fetchAllBannersAdmin();
      setBanners(data);
    } catch (err) {
      console.error("Error loading banners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  // Format ISO string to datetime-local format for input
  const formatDatetimeLocal = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const handleOpenAddModal = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      subtitle: "",
      tag: " PROMOTION",
      cta_text: "",
      cta_link: "",
      image_url: "",
      bg_gradient: PRESET_GRADIENTS[0].value,
      is_active: true,
      has_duration: false,
      start_date: "",
      end_date: "",
      display_order: banners.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (b: AppBanner) => {
    setEditingBanner(b);
    setFormData({
      title: b.title || "",
      subtitle: b.subtitle || "",
      tag: b.tag || " PROMOTION",
      cta_text: b.cta_text || "",
      cta_link: b.cta_link || "",
      image_url: b.image_url || "",
      bg_gradient: b.bg_gradient || PRESET_GRADIENTS[0].value,
      is_active: b.is_active,
      has_duration: Boolean(b.start_date || b.end_date),
      start_date: formatDatetimeLocal(b.start_date),
      end_date: formatDatetimeLocal(b.end_date),
      display_order: b.display_order ?? 1,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (b: AppBanner) => {
    try {
      await updateBanner(b.id, { is_active: !b.is_active });
      loadBanners();
    } catch (err) {
      alert(t("bn.toggleFail"));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("bn.confirmDelete"))) {
      try {
        await deleteBanner(id);
        loadBanners();
      } catch (err) {
        alert(t("bn.deleteFail"));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert(t("bn.needTitle"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        tag: formData.tag.trim(),
        cta_text: formData.cta_text.trim(),
        cta_link: formData.cta_link.trim(),
        image_url: formData.image_url.trim(),
        bg_gradient: formData.bg_gradient,
        is_active: formData.is_active,
        start_date: formData.has_duration && formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.has_duration && formData.end_date ? new Date(formData.end_date).toISOString() : null,
        display_order: Number(formData.display_order) || 1,
      };

      if (editingBanner) {
        await updateBanner(editingBanner.id, payload);
      } else {
        await createBanner(payload);
      }

      setIsModalOpen(false);
      loadBanners();
    } catch (err) {
      console.error("Error saving banner:", err);
      alert(t("bn.saveFail"));
    } finally {
      setSaving(false);
    }
  };

  // Quick preset duration helper
  const addDurationDays = (days: number) => {
    const now = new Date();
    const future = new Date(now.getTime() + days * 86400000);
    setFormData((prev) => ({
      ...prev,
      has_duration: true,
      start_date: formatDatetimeLocal(now.toISOString()),
      end_date: formatDatetimeLocal(future.toISOString()),
    }));
  };

  // Filter banners
  const filteredBanners = banners.filter((b) => {
    const info = getBannerStatus(b);
    if (filter === "all") return true;
    return info.status === filter;
  });

  // Calculate statistics
  const stats = {
    total: banners.length,
    active: banners.filter((b) => getBannerStatus(b).status === "active").length,
    scheduled: banners.filter((b) => getBannerStatus(b).status === "scheduled").length,
    expired: banners.filter((b) => getBannerStatus(b).status === "expired").length,
    disabled: banners.filter((b) => getBannerStatus(b).status === "disabled").length,
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-xs" style={{ borderColor: C.line }}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-black">
            <Sparkles size={13} />
            <span>{t("bn.breadcrumb")}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: C.ink }}>
            {t("bn.pageTitle")}
          </h1>
          <p className="text-xs font-medium text-[#777]">
            {t("bn.pageDesc")}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-2xl bg-[#E0533C] text-white text-xs font-black hover:bg-[#c94530] transition flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>{t("bn.addNew")}</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setFilter("all")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${filter === "all" ? "bg-[#FD775C] text-white border-[#FD775C] shadow-md" : "bg-white text-stone-800 border-stone-200 hover:bg-stone-50"}`}
        >
          <p className="text-[11px] font-bold opacity-80">{t("bn.statAll")}</p>
          <p className="text-xl font-black mt-1">{stats.total}</p>
        </div>

        <div
          onClick={() => setFilter("active")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${filter === "active" ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:bg-emerald-100"}`}
        >
 <p className="text-[11px] font-bold opacity-80">{t("bn.statLive")}</p>
          <p className="text-xl font-black mt-1">{stats.active}</p>
        </div>

        <div
          onClick={() => setFilter("scheduled")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${filter === "scheduled" ? "bg-amber-600 text-white border-amber-600 shadow-md" : "bg-amber-50/70 text-amber-950 border-amber-200 hover:bg-amber-100"}`}
        >
          <p className="text-[11px] font-bold opacity-80">{t("bn.statScheduled")}</p>
          <p className="text-xl font-black mt-1">{stats.scheduled}</p>
        </div>

        <div
          onClick={() => setFilter("expired")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${filter === "expired" ? "bg-rose-600 text-white border-rose-600 shadow-md" : "bg-rose-50/70 text-rose-950 border-rose-200 hover:bg-rose-100"}`}
        >
 <p className="text-[11px] font-bold opacity-80">{t("bn.statExpired")}</p>
          <p className="text-xl font-black mt-1">{stats.expired}</p>
        </div>

        <div
          onClick={() => setFilter("disabled")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${filter === "disabled" ? "bg-stone-600 text-white border-[#FD775C] shadow-md" : "bg-stone-100 text-stone-900 border-stone-200 hover:bg-stone-200"}`}
        >
 <p className="text-[11px] font-bold opacity-80">{t("bn.statOff")}</p>
          <p className="text-xl font-black mt-1">{stats.disabled}</p>
        </div>
      </div>

      {/* Banners List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-[#8A7870] bg-white rounded-3xl border">
          {t("bn.loading")}
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border text-stone-500 space-y-3" style={{ borderColor: C.line }}>
          <Image size={40} className="mx-auto text-stone-300" />
          <p className="text-sm font-bold">{t("bn.empty")}</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-[#FD775C] text-white text-xs font-bold hover:bg-[#E31E27] transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>{t("bn.createNew")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBanners.map((b) => {
            const statusInfo = getBannerStatus(b);

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl border shadow-xs overflow-hidden flex flex-col justify-between transition hover:shadow-md"
                style={{ borderColor: C.line }}
              >
                {/* Banner Card Preview Header */}
                <div
                  className="p-5 text-white relative flex flex-col justify-between min-h-[160px] bg-cover bg-center transition"
                  style={{
                    background: b.image_url
                      ? `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.75) 100%), url("${b.image_url}") center/cover no-repeat`
                      : b.bg_gradient || PRESET_GRADIENTS[0].value,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 z-10">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-md uppercase tracking-wider">
 <Tag size={10} /> {b.tag || " PROMOTION"}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="z-10 mt-3">
                    <h3 className="text-base font-black leading-snug drop-shadow-xs">{b.title}</h3>
                    {b.subtitle && (
                      <p className="text-xs font-medium text-white/90 mt-1 line-clamp-2 leading-relaxed">
                        {b.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="z-10 mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full bg-white/95 text-stone-900 shadow-xs">
                      {b.cta_text || t("bn.defaultCta")} →
                    </span>
                    {b.cta_link && (
                      <span className="text-[10px] font-mono text-white/80 truncate max-w-[140px]" title={b.cta_link}>
                         {b.cta_link}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Details & Duration Controls */}
                <div className="p-4 bg-stone-50/60 border-t space-y-3" style={{ borderColor: C.line }}>
                  {/* Duration Display */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200/80">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-stone-400 shrink-0" />
                      <span>
                        {b.start_date || b.end_date ? (
                          <>
                            {b.start_date ? new Date(b.start_date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "เริ่มต้นทันที"}
                            {" → "}
                            {b.end_date ? new Date(b.end_date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "ไม่มีวันหมดอายุ"}
                          </>
                        ) : (
                          <span className="text-emerald-700 font-bold">{t("bn.forever")}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleToggleActive(b)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        b.is_active ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200" : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                      }`}
                    >
                      {b.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{b.is_active ? t("bn.isOn") : t("bn.isOff")}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(b)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer"
                        title={t("bn.edit")}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 transition cursor-pointer"
                        title={t("bn.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-xl overflow-hidden my-8" style={{ borderColor: C.line }}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-stone-50" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2">
                <Image size={18} className="text-[#E0533C]" />
                <h2 className="text-base font-black text-stone-900">
                  {editingBanner ? t("bn.edit") : t("bn.addNew")}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-stone-200 text-stone-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  {t("bn.fTitle")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("bn.titlePlaceholder")}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  {t("bn.fDesc")}
                </label>
                <textarea
                  rows={2}
                  placeholder={t("bn.descPlaceholder")}
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:outline-none focus:border-[#E0533C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tag */}
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    {t("bn.fTag")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("bn.tagPlaceholder")}
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
                  />
                </div>

                {/* Button Text */}
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    {t("bn.fCta")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("bn.ctaPlaceholder")}
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
                  />
                </div>
              </div>

              {/* Link */}
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  {t("bn.fLink")}
                </label>
                <input
                  type="text"
                  placeholder={t("bn.linkPlaceholder")}
                  value={formData.cta_link}
                  onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:outline-none focus:border-[#E0533C]"
                />
              </div>

              {/* Image Upload & Recommended Dimensions Box */}
              <div className="p-4 bg-stone-50 rounded-2xl border space-y-3" style={{ borderColor: C.line }}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-stone-900">
                    {t("bn.fImage")}
                  </label>
                  {formData.image_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: "" })}
                      className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={11} /> {t("bn.removeImage")}
                    </button>
                  )}
                </div>

                {/* Recommended Size Banner Guidelines */}
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Sparkles size={13} className="text-amber-600 shrink-0" />
                    <span>{t("bn.imageTips")}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 font-medium text-[10.5px] text-amber-900/90 pl-1">
                    <li><strong>{t("bn.tipSize")}</strong> <span className="font-bold underline">1200 x 600 px</span> ({t("bn.ratio")})</li>
                    <li><strong>{t("bn.tipMaxSize")}</strong> {t("bn.tipMax")} <span className="font-bold">5 MB</span></li>
                    <li><strong>{t("bn.tipTypes")}</strong> JPG, PNG, WEBP, GIF</li>
                  </ul>
                </div>

                {/* Upload File Control */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#FD775C] text-white text-xs font-black hover:bg-[#E31E27] transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs">
                    <Plus size={15} />
                    <span>{t("bn.upload")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert(t("bn.fileTooBig"));
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData((prev) => ({ ...prev, image_url: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <span className="text-xs font-bold text-stone-400 hidden sm:inline">{t("bn.or")}</span>

                  {/* Image URL Direct Input */}
                  <input
                    type="text"
                    placeholder={t("bn.urlPlaceholder")}
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:outline-none focus:border-[#E0533C]"
                  />
                </div>

                {/* Uploaded Image Preview */}
                {formData.image_url && (
                  <div className="relative rounded-2xl overflow-hidden border h-36 w-full bg-stone-200" style={{ borderColor: C.line }}>
                    <img
                      src={formData.image_url}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-md text-[10px] font-bold text-white">
                      {t("bn.imagePreview")}
                    </div>
                  </div>
                )}
              </div>

              {/* Preset Gradients */}
              <div>
                <label className="block text-xs font-black text-stone-800 mb-2">
                  {t("bn.fTheme")} {formData.image_url ? t("bn.themeFallback") : ""}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_GRADIENTS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, bg_gradient: g.value })}
                      className={`h-11 rounded-xl border transition p-2 text-[10px] font-black text-white flex items-center justify-center text-center shadow-xs cursor-pointer ${
                        formData.bg_gradient === g.value ? "ring-2 ring-offset-1 ring-stone-900 scale-98" : ""
                      }`}
                      style={{ background: g.value }}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Duration Settings */}
              <div className="p-4 bg-stone-50 rounded-2xl border space-y-3" style={{ borderColor: C.line }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                    <Calendar size={15} className="text-[#E0533C]" />
                    <span>{t("bn.schedule")}</span>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_duration}
                      onChange={(e) => setFormData({ ...formData, has_duration: e.target.checked })}
                      className="w-4 h-4 rounded-md accent-[#E0533C]"
                    />
                    <span className="text-xs font-bold text-stone-700">{t("bn.setDateTime")}</span>
                  </label>
                </div>

                {formData.has_duration ? (
                  <div className="space-y-3 pt-2">
                    {/* Presets */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-stone-500">{t("bn.quickSet")}</span>
                      <button
                        type="button"
                        onClick={() => addDurationDays(7)}
                        className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold hover:bg-stone-100 transition cursor-pointer"
                      >
                        + 7{t("log.days")}
                      </button>
                      <button
                        type="button"
                        onClick={() => addDurationDays(14)}
                        className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold hover:bg-stone-100 transition cursor-pointer"
                      >
                        + 14{t("log.days")}
                      </button>
                      <button
                        type="button"
                        onClick={() => addDurationDays(30)}
                        className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold hover:bg-stone-100 transition cursor-pointer"
                      >
                        {t("bn.plus1m")}
                      </button>
                      <button
                        type="button"
                        onClick={() => addDurationDays(90)}
                        className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold hover:bg-stone-100 transition cursor-pointer"
                      >
                        {t("bn.plus3m")}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-1">
                          {t("bn.startTime")}
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-1">
                          {t("bn.endTime")}
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-[#E0533C]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-stone-600">
                    {t("bn.noExpiry")}
                  </p>
                )}
              </div>

              {/* Order & Status */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-stone-800">{t("bn.sortOrder")}</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                    className="w-16 px-2 py-1 border rounded-lg text-xs font-bold text-center"
                  />
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded-md accent-emerald-600"
                  />
                  <span className="text-xs font-bold text-stone-800">{t("bn.activateNow")}</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t flex items-center justify-end gap-2" style={{ borderColor: C.line }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#E0533C] text-white text-xs font-black hover:bg-[#c94530] transition shadow-xs cursor-pointer"
                >
                  {saving ? t("bn.saving") : editingBanner ? t("bn.saveEdit") : t("bn.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
