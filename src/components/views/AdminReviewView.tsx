import React, { useState, useEffect } from "react";
import { 
  Check, 
  X, 
  Shield, 
  Clock, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  Store, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  ExternalLink,
  Building
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C } from "../../constants/mockData";

export default function AdminReviewView() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Main Category Tab ("merchants" = อนุมัติสิทธิ์เจ้าของร้าน, "places" = อนุมัติสถานที่ใหม่)
  const [mainCategory, setMainCategory] = useState<"merchants" | "places">("merchants");

  // Prefecture states
  const [dbPrefectures, setDbPrefectures] = useState<string[]>([]);

  // Filter state for Places tab ("all" | "complete" | "incomplete")
  const [dataFilter, setDataFilter] = useState<"all" | "complete" | "incomplete">("all");

  // Modal State for Place Review
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameJp, setNameJp] = useState("");
  const [street, setStreet] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionJp, setDescriptionJp] = useState("");
  const [category, setCategory] = useState("food");
  const [prefecture, setPrefecture] = useState("");
  const [customPrefecture, setCustomPrefecture] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [validationError, setValidationError] = useState("");
  const [assignOwnership, setAssignOwnership] = useState(false);

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    try {
      let rawData: any[] = [];

      // 0. Fetch all admin rejection and approval logs from admin_action_log
      const { data: adminLogs } = await supabase
        .from("admin_action_log")
        .select("action_type, target_id, detail, created_at")
        .in("action_type", ["reject_merchant", "approve_merchant"]);

      let localRejectedKeys: any[] = [];
      try {
        localRejectedKeys = JSON.parse(localStorage.getItem("admin_rejected_keys") || "[]");
      } catch (e) {}

      let localApprovedKeys: any[] = [];
      try {
        localApprovedKeys = JSON.parse(localStorage.getItem("admin_approved_keys") || "[]");
      } catch (e) {}

      const rejectedMap = new Map<string, number>();
      const approvedMap = new Map<string, number>();

      (adminLogs || []).forEach((log) => {
        const logTime = new Date(log.created_at || Date.now()).getTime();
        const targetId = log.target_id ? String(log.target_id).toLowerCase() : "";
        const email = log.detail?.email ? String(log.detail.email).toLowerCase() : "";
        const userId = log.detail?.user_id ? String(log.detail.user_id).toLowerCase() : "";

        if (log.action_type === "reject_merchant") {
          if (targetId) rejectedMap.set(targetId, Math.max(rejectedMap.get(targetId) || 0, logTime));
          if (email) rejectedMap.set(email, Math.max(rejectedMap.get(email) || 0, logTime));
          if (userId) rejectedMap.set(userId, Math.max(rejectedMap.get(userId) || 0, logTime));
        } else if (log.action_type === "approve_merchant") {
          if (targetId) approvedMap.set(targetId, Math.max(approvedMap.get(targetId) || 0, logTime));
          if (email) approvedMap.set(email, Math.max(approvedMap.get(email) || 0, logTime));
          if (userId) approvedMap.set(userId, Math.max(approvedMap.get(userId) || 0, logTime));
        }
      });

      localRejectedKeys.forEach((k: any) => {
        const rTime = new Date(k.rejected_at || Date.now()).getTime();
        if (k.uid) rejectedMap.set(String(k.uid).toLowerCase(), Math.max(rejectedMap.get(String(k.uid).toLowerCase()) || 0, rTime));
        if (k.email) rejectedMap.set(String(k.email).toLowerCase(), Math.max(rejectedMap.get(String(k.email).toLowerCase()) || 0, rTime));
        if (k.subId) rejectedMap.set(String(k.subId).toLowerCase(), Math.max(rejectedMap.get(String(k.subId).toLowerCase()) || 0, rTime));
      });

      localApprovedKeys.forEach((k: any) => {
        const aTime = new Date(k.approved_at || Date.now()).getTime();
        if (k.uid) approvedMap.set(String(k.uid).toLowerCase(), Math.max(approvedMap.get(String(k.uid).toLowerCase()) || 0, aTime));
        if (k.email) approvedMap.set(String(k.email).toLowerCase(), Math.max(approvedMap.get(String(k.email).toLowerCase()) || 0, aTime));
        if (k.subId) approvedMap.set(String(k.subId).toLowerCase(), Math.max(approvedMap.get(String(k.subId).toLowerCase()) || 0, aTime));
      });

      const isItemRejectedOrApproved = (item: any) => {
        const itemUid = item.user_id ? String(item.user_id).toLowerCase() : (typeof item.id === "string" ? item.id.replace("prof_", "").replace("local_", "").toLowerCase() : "");
        const itemEmail = (item.contact_email || item.email || item.profiles?.email || "").toLowerCase();
        const itemId = item.id ? String(item.id).toLowerCase() : "";

        const itemTime = Math.max(
          item.updated_at ? new Date(item.updated_at).getTime() : 0,
          item.created_at ? new Date(item.created_at).getTime() : 0,
          item.profiles?.updated_at ? new Date(item.profiles.updated_at).getTime() : 0,
          item.profiles?.created_at ? new Date(item.profiles.created_at).getTime() : 0
        );

        const rejectTime = Math.max(
          itemUid ? (rejectedMap.get(itemUid) || 0) : 0,
          itemEmail ? (rejectedMap.get(itemEmail) || 0) : 0,
          itemId ? (rejectedMap.get(itemId) || 0) : 0
        );

        if (rejectTime > 0 && (itemTime === 0 || itemTime <= rejectTime + 5000)) {
          return true;
        }

        const approveTime = Math.max(
          itemUid ? (approvedMap.get(itemUid) || 0) : 0,
          itemEmail ? (approvedMap.get(itemEmail) || 0) : 0,
          itemId ? (approvedMap.get(itemId) || 0) : 0
        );

        if (approveTime > 0 && (itemTime === 0 || itemTime <= approveTime + 5000)) {
          return true;
        }

        return false;
      };

      // 1. Fetch place_submissions (try simple query)
      const { data: subData, error: subErr } = await supabase
        .from("place_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (subErr) {
        console.error("Error fetching place_submissions:", subErr);
      }

      // Map latest submissions by user_id and email using effective timestamp
      const latestSubMap = new Map<string, any>();
      const sortedSubs = [...(subData || [])].sort((a, b) => {
        const tA = Math.max(new Date(a.updated_at || 0).getTime(), new Date(a.created_at || 0).getTime());
        const tB = Math.max(new Date(b.updated_at || 0).getTime(), new Date(b.created_at || 0).getTime());
        return tB - tA;
      });

      sortedSubs.forEach((s) => {
        const uidStr = s.user_id ? String(s.user_id) : "";
        const emailStr = (s.contact_email || s.email || "").toLowerCase();
        if (uidStr && !latestSubMap.has(uidStr)) latestSubMap.set(uidStr, s);
        if (emailStr && !latestSubMap.has(emailStr)) latestSubMap.set(emailStr, s);
      });

      // Collect all pending place_submissions
      const addedSubIds = new Set<string>();
      (subData || []).forEach((s) => {
        const isPending = s.status === "pending" || !s.status || s.status === "incomplete";
        if (isPending && s.id && !addedSubIds.has(String(s.id))) {
          if (!isItemRejectedOrApproved(s)) {
            rawData.push(s);
            addedSubIds.add(String(s.id));
          }
        }
      });

      // 2. Fetch profiles for user_ids in submissions
      const userIdsToFetch = Array.from(new Set(rawData.map((s) => s.user_id).filter(Boolean)));
      let profMap = new Map();
      if (userIdsToFetch.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIdsToFetch);

        profMap = new Map((profs || []).map((p) => [p.id, p]));
      }

      rawData = rawData.map((s) => {
        const prof = s.profiles || profMap.get(s.user_id) || null;
        return {
          ...s,
          ownership_proof_url: s.ownership_proof_url || prof?.ownership_proof_url || null,
          name_en: s.name_en || s.shop_name || prof?.shop_name || "Merchant Partner Application",
          street: s.street || s.address || (s.prefecture ? `Prefecture: ${s.prefecture}` : "Address Pending"),
          description: s.description || `Contact: ${s.contact_name || prof?.display_name || "N/A"} (${s.contact_phone || prof?.phone || "N/A"})`,
          created_at: s.created_at || prof?.created_at || new Date().toISOString(),
          updated_at: s.updated_at || prof?.updated_at || s.created_at || prof?.created_at || new Date().toISOString(),
          profiles: prof,
        };
      });

      // 3. Fetch all pending merchant profiles from profiles table
      const { data: allProfiles, error: profErr } = await supabase
        .from("profiles")
        .select("*");

      if (profErr) {
        console.error("Error fetching profiles:", profErr);
      } else if (allProfiles) {
        const pendingProfiles = allProfiles.filter((p) => {
          if (p.is_deleted) return false;
          if (p.role === "store" || p.merchant_status === "approved" || p.merchant_status === "rejected") return false;

          const isProfilePending = p.role === "pending_store" || p.merchant_status === "pending";
          if (isProfilePending) {
            return !isItemRejectedOrApproved({ profiles: p, user_id: p.id, email: p.email });
          }

          const uidKey = p.id ? String(p.id) : "";
          const emailKey = p.email ? p.email.toLowerCase() : "";

          const latestSub = (uidKey && latestSubMap.get(uidKey)) || (emailKey && latestSubMap.get(emailKey));
          if (latestSub) {
            if (latestSub.status === "pending" || !latestSub.status) {
              return !isItemRejectedOrApproved(latestSub);
            }
          }

          return false;
        });

        for (const prof of pendingProfiles) {
          if (isItemRejectedOrApproved({ profiles: prof, user_id: prof.id, email: prof.email })) continue;
          const existingIdx = rawData.findIndex(
            (r) => r.user_id === prof.id || (r.contact_email && prof.email && r.contact_email.toLowerCase() === prof.email.toLowerCase())
          );
          if (existingIdx >= 0) {
            rawData[existingIdx] = {
              ...rawData[existingIdx],
              ownership_proof_url: prof.ownership_proof_url || rawData[existingIdx].ownership_proof_url || null,
              shop_name: prof.shop_name || rawData[existingIdx].shop_name,
              name_en: prof.shop_name || rawData[existingIdx].name_en,
              contact_phone: prof.phone || rawData[existingIdx].contact_phone,
              contact_name: prof.display_name || prof.full_name || rawData[existingIdx].contact_name,
              status: "pending",
              profiles: prof,
            };
          } else {
            rawData.push({
              id: `prof_${prof.id}`,
              user_id: prof.id,
              name_en: prof.shop_name || prof.display_name || prof.email || "Merchant Partner Application",
              shop_name: prof.shop_name || prof.display_name,
              contact_name: prof.display_name || prof.full_name || "Merchant Owner",
              contact_phone: prof.phone || "-",
              contact_email: prof.email || "-",
              category: prof.category || "food",
              prefecture: prof.prefecture || "Tokyo",
              street: prof.prefecture ? `Prefecture: ${prof.prefecture}` : "Address Pending",
              description: `Pending Merchant Registration for ${prof.shop_name || prof.display_name || prof.email}. Contact: ${prof.phone || prof.email || "-"}`,
              status: "pending",
              created_at: prof.created_at || new Date().toISOString(),
              updated_at: prof.updated_at || prof.created_at || new Date().toISOString(),
              ownership_proof_url: prof.ownership_proof_url || null,
              profiles: prof,
              is_profile_only: true,
            });
          }
        }
      }

      // 4. Local storage fallback pending submissions + auto-sync to DB by Admin
      try {
        const localSubs = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
        for (const lSub of localSubs) {
          if (isItemRejectedOrApproved(lSub)) continue;
          const lEmail = (lSub.contact_email || lSub.email || "").toLowerCase();
          const matchedProf = allProfiles?.find(
            (p) => (lEmail && p.email?.toLowerCase() === lEmail) || (lSub.user_id && p.id === lSub.user_id)
          );
          const isDbApproved = matchedProf?.merchant_status === "approved" || matchedProf?.role === "store";

          if (!isDbApproved && lSub.status === "pending") {
            const existingIdx = rawData.findIndex(
              (r) => (r.user_id && r.user_id === lSub.user_id) || (r.contact_email && r.contact_email.toLowerCase() === lEmail) || r.id === lSub.id
            );

            if (existingIdx >= 0) {
              rawData[existingIdx] = {
                ...rawData[existingIdx],
                status: "pending",
                shop_name: lSub.shop_name || rawData[existingIdx].shop_name,
                name_en: lSub.shop_name || lSub.name_en || rawData[existingIdx].name_en,
                contact_phone: lSub.contact_phone || lSub.phone || rawData[existingIdx].contact_phone,
                contact_name: lSub.contact_name || rawData[existingIdx].contact_name,
                ownership_proof_url: lSub.ownership_proof_url || rawData[existingIdx].ownership_proof_url || null,
                prefecture: lSub.prefecture || rawData[existingIdx].prefecture,
                category: lSub.category || rawData[existingIdx].category,
                updated_at: lSub.updated_at || new Date().toISOString(),
              };
            } else {
              rawData.push({
                ...lSub,
                id: lSub.id || `local_${lSub.user_id || Date.now()}`,
                ownership_proof_url: lSub.ownership_proof_url || lSub.profiles?.ownership_proof_url || null,
                name_en: lSub.shop_name || lSub.name_en || "Merchant Partner Application",
                shop_name: lSub.shop_name || lSub.name_en,
                contact_name: lSub.contact_name || "Merchant Owner",
                contact_phone: lSub.contact_phone || "-",
                contact_email: lSub.contact_email || lSub.email || "-",
                category: lSub.category || "food",
                prefecture: lSub.prefecture || "Tokyo",
                street: lSub.prefecture ? `Prefecture: ${lSub.prefecture}` : "Address Pending",
                description: `Pending Merchant Registration for ${lSub.shop_name || lSub.contact_email}. Contact: ${lSub.contact_phone || lSub.contact_email}`,
                status: "pending",
                created_at: lSub.created_at || new Date().toISOString(),
                updated_at: lSub.created_at || new Date().toISOString(),
                is_profile_only: true,
              });
            }
          }
        }
      } catch (e) {}

      // Filter out rejected, approved, or store owner profiles from rawData
      rawData = rawData.filter((s) => {
        if (s.status === "rejected" || s.status === "approved") return false;
        if (isItemRejectedOrApproved(s)) return false;
        const prof = s.profiles;
        if (prof) {
          if (prof.merchant_status === "rejected" || prof.merchant_status === "approved" || prof.role === "store") {
            return false;
          }
        }
        return true;
      });

      setSubmissions(rawData);
    } catch (err) {
      console.error("Error fetching pending submissions:", err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch prefectures from DB
  useEffect(() => {
    async function fetchPrefectures() {
      const { data, error } = await supabase
        .from("prefecture_regions")
        .select("prefecture")
        .order("prefecture", { ascending: true });
      if (error) {
        console.error("Error fetching prefectures:", error);
      } else if (data) {
        setDbPrefectures(data.map(p => p.prefecture));
      }
    }
    fetchPrefectures();
    fetchPendingSubmissions();
  }, []);

  // Separate submissions into Merchant Applications vs Spot Submissions
  const rawMerchantSubmissions = submissions.filter((s) => {
    if (s.status === "rejected" || s.status === "approved") return false;
    const isDoneMerchant =
      s.profiles?.role === "store" ||
      s.profiles?.merchant_status === "approved" ||
      s.profiles?.merchant_status === "rejected";
    if (isDoneMerchant) {
      return false;
    }

    return (
      s.is_profile_only ||
      (typeof s.id === "string" && (s.id.startsWith("prof_") || s.id.startsWith("local_"))) ||
      Boolean(s.ownership_proof_url) ||
      Boolean(s.contact_name) ||
      Boolean(s.contact_phone) ||
      (Boolean(s.shop_name || s.name_en) && !s.lat)
    );
  });

  // Deduplicate merchant applications so each applicant user/email gets EXACTLY 1 card (the latest one)
  const uniqueMerchantMap = new Map<string, any>();
  rawMerchantSubmissions.forEach((sub) => {
    const uidStr = sub.user_id ? String(sub.user_id) : "";
    const emailStr = (sub.contact_email || sub.email || "").toLowerCase();
    const key = uidStr || emailStr || String(sub.id);

    if (!uniqueMerchantMap.has(key)) {
      uniqueMerchantMap.set(key, sub);
    } else {
      const existing = uniqueMerchantMap.get(key)!;
      const timeNew = Math.max(new Date(sub.updated_at || 0).getTime(), new Date(sub.created_at || 0).getTime());
      const timeOld = Math.max(new Date(existing.updated_at || 0).getTime(), new Date(existing.created_at || 0).getTime());
      // Prefer newer submission or submission with ownership document attached
      if (timeNew > timeOld || (sub.ownership_proof_url && !existing.ownership_proof_url)) {
        uniqueMerchantMap.set(key, sub);
      }
    }
  });

  const merchantSubmissions = Array.from(uniqueMerchantMap.values()).sort((a, b) => {
    const tA = Math.max(
      a.updated_at ? new Date(a.updated_at).getTime() : 0,
      a.created_at ? new Date(a.created_at).getTime() : 0,
      a.profiles?.updated_at ? new Date(a.profiles.updated_at).getTime() : 0,
      a.profiles?.created_at ? new Date(a.profiles.created_at).getTime() : 0
    );
    const tB = Math.max(
      b.updated_at ? new Date(b.updated_at).getTime() : 0,
      b.created_at ? new Date(b.created_at).getTime() : 0,
      b.profiles?.updated_at ? new Date(b.profiles.updated_at).getTime() : 0,
      b.profiles?.created_at ? new Date(b.profiles.created_at).getTime() : 0
    );
    return tB - tA;
  });

  const placeSubmissions = submissions.filter(
    (s) => !rawMerchantSubmissions.includes(s)
  );

  // Filter places tab
  const isSubComplete = (sub: any) => {
    return !!(sub.name_jp?.trim() && sub.description_jp?.trim() && sub.prefecture);
  };

  const filteredPlaceSubmissions = placeSubmissions
    .filter((sub) => {
      if (dataFilter === "complete") {
        return isSubComplete(sub);
      }
      if (dataFilter === "incomplete") {
        return !isSubComplete(sub);
      }
      return true;
    })
    .sort((a, b) => {
      const tA = Math.max(
        a.updated_at ? new Date(a.updated_at).getTime() : 0,
        a.created_at ? new Date(a.created_at).getTime() : 0
      );
      const tB = Math.max(
        b.updated_at ? new Date(b.updated_at).getTime() : 0,
        b.created_at ? new Date(b.created_at).getTime() : 0
      );
      return tB - tA;
    });

  // ── Merchant Owner Approvals ──
  const handleApproveMerchant = async (sub: any) => {
    setProcessingId(sub.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || null;
      const uid = sub.user_id || (typeof sub.id === "string" ? sub.id.replace("prof_", "").replace("local_", "") : null);
      const email = sub.contact_email || sub.email;
      const cleanEmail = email ? email.trim().toLowerCase() : "";
      const nowIso = new Date().toISOString();

      // Save approval key into localStorage immediately
      try {
        const currentApproved = JSON.parse(localStorage.getItem("admin_approved_keys") || "[]");
        currentApproved.push({
          uid: uid ? String(uid) : null,
          email: cleanEmail || null,
          subId: sub.id || null,
          approved_at: nowIso
        });
        localStorage.setItem("admin_approved_keys", JSON.stringify(currentApproved));
      } catch (e) {}

      // 1. Update profiles table by email
      if (cleanEmail) {
        const { data: targetProf } = await supabase.from("profiles").select("id, role, is_admin").ilike("email", cleanEmail).maybeSingle();
        if (targetProf) {
          const isTargetAdmin = targetProf.role === "admin" || targetProf.is_admin === true;
          if (!isTargetAdmin) {
            await supabase
              .from("profiles")
              .update({ role: "store", merchant_status: "approved", ban_reason: null })
              .eq("id", targetProf.id);

            try {
              await supabase
                .from("user_roles")
                .upsert({ user_id: targetProf.id, role: "store" }, { onConflict: "user_id" });
            } catch (e) {}
          } else {
            await supabase
              .from("profiles")
              .update({ merchant_status: "approved", ban_reason: null })
              .eq("id", targetProf.id);
          }
        }
      }

      if (uid && !uid.startsWith("local_")) {
        const { data: targetProf } = await supabase.from("profiles").select("role, is_admin").eq("id", uid).maybeSingle();
        const isTargetAdmin = targetProf?.role === "admin" || targetProf?.is_admin === true;

        if (!isTargetAdmin) {
          await supabase
            .from("profiles")
            .update({ role: "store", merchant_status: "approved", ban_reason: null })
            .eq("id", uid);

          // 2. Upsert user_roles table
          try {
            await supabase
              .from("user_roles")
              .upsert({ user_id: uid, role: "store" }, { onConflict: "user_id" });
          } catch (e) {}
        } else {
          await supabase
            .from("profiles")
            .update({ merchant_status: "approved", ban_reason: null })
            .eq("id", uid);
        }
      }

      // 3. Update place_submissions in Supabase
      try {
        if (typeof sub.id === "string" && !sub.id.startsWith("prof_") && !sub.id.startsWith("local_")) {
          await supabase
            .from("place_submissions")
            .update({ status: "approved", reviewed_by: adminId, reviewed_at: nowIso })
            .eq("id", sub.id);
        }

        if (uid && !uid.startsWith("local_")) {
          await supabase
            .from("place_submissions")
            .update({ status: "approved", reviewed_by: adminId, reviewed_at: nowIso })
            .eq("user_id", uid);
        }

        if (email) {
          await supabase
            .from("place_submissions")
            .update({ status: "approved", reviewed_by: adminId, reviewed_at: nowIso })
            .ilike("contact_email", email.toLowerCase());
        }
      } catch (e) {}

      // 4. Log admin action
      if (adminId) {
        try {
          await supabase.from("admin_action_log").insert({
            admin_id: adminId,
            action_type: "approve_merchant",
            target_table: "profiles",
            target_id: uid || sub.id,
            detail: { shop_name: sub.shop_name || sub.name_en, email: cleanEmail, user_id: uid, sub_id: sub.id },
            created_at: nowIso
          });
        } catch (e) {}
      }

      // Clear local storage pending items for this applicant
      try {
        const localSubs = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
        const updatedLocals = localSubs.filter((l: any) => {
          const lEmail = (l.contact_email || l.email || "").toLowerCase();
          const lUid = l.user_id ? String(l.user_id) : "";
          const isMatch = (cleanEmail && lEmail === cleanEmail) || (uid && lUid === String(uid));
          return !isMatch;
        });
        localStorage.setItem("merchant_pending_submissions", JSON.stringify(updatedLocals));
      } catch (e) {}

      setSubmissions((prev) =>
        prev.filter((s) => {
          const sUid = s.user_id ? String(s.user_id) : "";
          const sEmail = (s.contact_email || s.email || "").toLowerCase();
          if (s.id === sub.id) return false;
          if (uid && (sUid === String(uid) || s.id === `prof_${uid}` || s.id === `local_${uid}`)) return false;
          if (cleanEmail && sEmail === cleanEmail) return false;
          return true;
        })
      );
      try {
        window.dispatchEvent(new CustomEvent("merchant_status_changed", { detail: { status: "approved", userId: uid } }));
      } catch (e) {}

      alert(`🎉 อนุมัติสิทธิ์เจ้าของร้านค้าสำหรับ "${sub.shop_name || sub.name_en || sub.contact_name}" เรียบร้อยแล้ว!`);
    } catch (err: any) {
      console.error("Approve merchant error:", err);
      alert("เกิดข้อผิดพลาดในการอนุมัติ: " + (err.message || "Failed"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectMerchant = async (subId: string) => {
    setProcessingId(subId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || null;
      const subObj = submissions.find(s => s.id === subId) || merchantSubmissions.find(s => s.id === subId);
      const uid = subObj?.user_id || subObj?.profiles?.id || (typeof subId === "string" ? subId.replace("prof_", "").replace("local_", "") : null);
      const email = subObj?.contact_email || subObj?.email || subObj?.profiles?.email;
      const cleanEmail = email ? email.trim().toLowerCase() : "";
      const finalReason = rejectionReason || "เอกสารหรือข้อมูลสิทธิ์ร้านค้าไม่ผ่านการตรวจสอบ";
      const nowIso = new Date().toISOString();

      // Save rejection key into localStorage immediately
      try {
        const currentRejected = JSON.parse(localStorage.getItem("admin_rejected_keys") || "[]");
        currentRejected.push({
          uid: uid ? String(uid) : null,
          email: cleanEmail || null,
          subId: subId || null,
          rejected_at: nowIso
        });
        localStorage.setItem("admin_rejected_keys", JSON.stringify(currentRejected));
      } catch (e) {}

      // 1. Update profiles table to role 'user' and status 'rejected'
      if (cleanEmail) {
        const { data: targetProf } = await supabase.from("profiles").select("id, role, is_admin").ilike("email", cleanEmail).maybeSingle();
        if (targetProf) {
          const isTargetAdmin = targetProf.role === "admin" || targetProf.is_admin === true;
          if (!isTargetAdmin) {
            await supabase
              .from("profiles")
              .update({
                role: "user",
                merchant_status: "rejected",
                ban_reason: finalReason
              })
              .eq("id", targetProf.id);

            try {
              await supabase
                .from("user_roles")
                .upsert({ user_id: targetProf.id, role: "user" }, { onConflict: "user_id" });
            } catch (e) {}
          } else {
            await supabase
              .from("profiles")
              .update({
                merchant_status: "rejected",
                ban_reason: finalReason
              })
              .eq("id", targetProf.id);
          }
        }
      }

      if (uid && !uid.startsWith("local_")) {
        const { data: targetProf } = await supabase.from("profiles").select("role, is_admin").eq("id", uid).maybeSingle();
        const isTargetAdmin = targetProf?.role === "admin" || targetProf?.is_admin === true;

        if (!isTargetAdmin) {
          await supabase
            .from("profiles")
            .update({
              role: "user",
              merchant_status: "rejected",
              ban_reason: finalReason
            })
            .eq("id", uid);

          // 2. Upsert user_roles table
          try {
            await supabase
              .from("user_roles")
              .upsert({ user_id: uid, role: "user" }, { onConflict: "user_id" });
          } catch (e) {}
        } else {
          await supabase
            .from("profiles")
            .update({
              merchant_status: "rejected",
              ban_reason: finalReason
            })
            .eq("id", uid);
        }
      }

      // 3. Update ALL matching place_submissions in Supabase or insert record
      try {
        if (typeof subId === "string" && !subId.startsWith("prof_") && !subId.startsWith("local_")) {
          await supabase
            .from("place_submissions")
            .update({
              status: "rejected",
              rejection_reason: finalReason,
              reviewed_by: adminId,
              reviewed_at: nowIso
            })
            .eq("id", subId);
        }

        if (uid && !uid.startsWith("local_")) {
          await supabase
            .from("place_submissions")
            .update({
              status: "rejected",
              rejection_reason: finalReason,
              reviewed_by: adminId,
              reviewed_at: nowIso
            })
            .eq("user_id", uid);
        }

        if (cleanEmail) {
          await supabase
            .from("place_submissions")
            .update({
              status: "rejected",
              rejection_reason: finalReason,
              reviewed_by: adminId,
              reviewed_at: nowIso
            })
            .ilike("contact_email", cleanEmail);
        }

        // Guaranteed place_submissions rejection record insertion
        const targetUid = (uid && !uid.startsWith("local_")) ? uid : undefined;
        const rejectionPayload = {
          user_id: targetUid || adminId || undefined,
          contact_email: cleanEmail || undefined,
          shop_name: subObj?.shop_name || subObj?.name_en || "Merchant Application",
          name_en: subObj?.shop_name || subObj?.name_en || "Merchant Application",
          contact_name: subObj?.contact_name || undefined,
          contact_phone: subObj?.contact_phone || undefined,
          category: (subObj?.category && ["station", "shrine", "spot", "food", "shop"].includes(subObj.category)) ? subObj.category : "food",
          prefecture: (subObj?.prefecture && dbPrefectures.includes(subObj.prefecture)) ? subObj.prefecture : "Tokyo",
          status: "rejected",
          rejection_reason: finalReason,
          reviewed_by: adminId,
          reviewed_at: nowIso,
          created_at: nowIso
        };

        if (rejectionPayload.user_id || rejectionPayload.contact_email) {
          const { error: insErr } = await supabase.from("place_submissions").insert(rejectionPayload);
          if (insErr && targetUid && adminId && targetUid !== adminId) {
            try {
              await supabase.from("place_submissions").insert({
                ...rejectionPayload,
                user_id: adminId
              });
            } catch (e) {}
          }
        }
      } catch (e) {}

      // 4. Log admin action
      if (adminId) {
        try {
          await supabase.from("admin_action_log").insert({
            admin_id: adminId,
            action_type: "reject_merchant",
            target_table: "profiles",
            target_id: uid || subId,
            detail: { reason: finalReason, email: cleanEmail, user_id: uid, sub_id: subId },
            created_at: nowIso
          });
        } catch (e) {}
      }

      // Clear local storage pending items for this applicant
      try {
        const localSubs = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
        const updatedLocals = localSubs.filter((l: any) => {
          const lEmail = (l.contact_email || l.email || "").toLowerCase();
          const lUid = l.user_id ? String(l.user_id) : "";
          const isMatch = (cleanEmail && lEmail === cleanEmail) || (uid && lUid === String(uid));
          return !isMatch;
        });
        localStorage.setItem("merchant_pending_submissions", JSON.stringify(updatedLocals));
      } catch (e) {}

      setSubmissions((prev) =>
        prev.filter((s) => {
          const sUid = s.user_id ? String(s.user_id) : "";
          const sEmail = (s.contact_email || s.email || "").toLowerCase();
          if (s.id === subId) return false;
          if (uid && (sUid === String(uid) || s.id === `prof_${uid}` || s.id === `local_${uid}`)) return false;
          if (cleanEmail && sEmail === cleanEmail) return false;
          return true;
        })
      );
      setRejectingId(null);
      setRejectionReason("");
      try {
        window.dispatchEvent(new CustomEvent("merchant_status_changed", { detail: { status: "rejected", userId: uid } }));
      } catch (e) {}

      alert("ปฏิเสธคำขอลงทะเบียนเจ้าของร้านค้าเรียบร้อยแล้ว");
    } catch (err: any) {
      console.error("Reject merchant error:", err);
      alert("เกิดข้อผิดพลาดในการปฏิเสธ: " + (err.message || "Failed"));
    } finally {
      setProcessingId(null);
    }
  };

  // ── Place Submissions Modal ──
  const openReviewModal = (sub: any) => {
    setSelectedSubmission(sub);
    setNameEn(sub.name_en || sub.shop_name || "");
    setNameJp(sub.name_jp || "");
    setStreet(sub.street || sub.address || "");
    setWebsite(sub.website || "");
    setDescription(sub.description || "");
    setDescriptionJp(sub.description_jp || "");
    setCategory(sub.category || "food");
    setLat(sub.lat !== undefined && sub.lat !== null ? String(sub.lat) : "");
    setLng(sub.lng !== undefined && sub.lng !== null ? String(sub.lng) : "");

    const editPref = sub.prefecture || "";
    if (editPref) {
      if (dbPrefectures.includes(editPref)) {
        setPrefecture(editPref);
        setCustomPrefecture("");
      } else {
        setPrefecture("custom");
        setCustomPrefecture(editPref);
      }
    } else {
      setPrefecture("");
      setCustomPrefecture("");
    }
    setValidationError("");
    setRejectionReason("");
    setAssignOwnership(false);
  };

  const handleSaveAndApprove = async () => {
    if (!selectedSubmission) return;

    if (!nameEn.trim() || !street.trim() || !description.trim()) {
      setValidationError("Spot Name (English), Address, and Description (English) are required.");
      return;
    }

    setProcessingId(selectedSubmission.id);
    setValidationError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || null;
      const selectedPrefecture = prefecture === "custom" ? customPrefecture.trim() || null : prefecture || null;

      if (!selectedSubmission.is_profile_only && !selectedSubmission.id.startsWith("prof_")) {
        const subUpdatePayload: Record<string, any> = {
          name_en: nameEn.trim(),
          name_jp: nameJp.trim() || null,
          street: street.trim(),
          description: description.trim(),
          description_jp: descriptionJp.trim() || null,
          category: category,
          prefecture: selectedPrefecture,
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
          website: website.trim() || null,
          status: "approved",
          updated_at: new Date().toISOString(),
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from("place_submissions")
          .update(subUpdatePayload)
          .eq("id", selectedSubmission.id);

        if (updateErr && (updateErr.message?.includes("updated_at") || updateErr.code === "PGRST204")) {
          delete subUpdatePayload.updated_at;
          await supabase.from("place_submissions").update(subUpdatePayload).eq("id", selectedSubmission.id);
        }
      }

      const shopPayload: Record<string, any> = {
        shop_name: nameEn.trim(),
        shop_name_jp: nameJp.trim() || null,
        category: category || "restaurant",
        address: street.trim() || null,
        description: description.trim() || null,
        description_jp: descriptionJp.trim() || null,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        image_url: selectedSubmission.image_urls?.[0] || selectedSubmission.image_url || null,
        prefecture: selectedPrefecture,
        owner_id: selectedSubmission.user_id || null,
        website: website.trim() || null,
      };

      let newShop: any = null;
      const { data: insertData, error: shopErr } = await supabase
        .from("century_shops")
        .insert(shopPayload)
        .select()
        .single();

      if (shopErr) {
        const msg = shopErr.message || "";
        if (msg.includes("website")) delete shopPayload.website;
        if (msg.includes("shop_name_jp")) delete shopPayload.shop_name_jp;

        const { data: retryData, error: retryErr } = await supabase
          .from("century_shops")
          .insert(shopPayload)
          .select()
          .single();

        if (retryErr) throw retryErr;
        newShop = retryData;
      } else {
        newShop = insertData;
      }

      if (adminId && newShop) {
        await supabase.from("admin_action_log").insert({
          admin_id: adminId,
          action_type: "approve_submission",
          target_table: "place_submissions",
          target_id: selectedSubmission.id,
          detail: { new_shop_id: newShop.id, shop_name: nameEn.trim() }
        });
      }

      if (selectedSubmission.user_id && newShop) {
        await supabase.from("store_owners").upsert({
          user_id: selectedSubmission.user_id,
          shop_id: newShop.id
        }, { onConflict: "user_id,shop_id" }).then(() => {});

        await supabase.from("profiles").update({ role: "store", merchant_status: "approved" }).eq("id", selectedSubmission.user_id).then(() => {});

        await supabase.from("user_roles").upsert({
          user_id: selectedSubmission.user_id,
          role: "store"
        }, { onConflict: "user_id" }).then(() => {});

        if (assignOwnership) {
          await supabase.rpc("assign_store_owner", {
            p_user_id: selectedSubmission.user_id,
            p_shop_id: newShop.id,
            p_admin_id: adminId,
          }).then(() => {});
        }
      }

      setSubmissions((prev) => prev.filter((s) => s.id !== selectedSubmission.id));
      alert(`อนุมัติสถานที่ "${nameEn.trim()}" เข้าสู่ระบบเรียบร้อยแล้ว!`);
      setSelectedSubmission(null);
    } catch (err: any) {
      console.error("Save & Approve error:", err);
      alert("เกิดข้อผิดพลาด: " + (err.message || "Failed"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPlace = async (subId: string) => {
    setProcessingId(subId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || null;
      const finalReason = rejectionReason || "ข้อมูลสถานที่ไม่อยู่ในเกณฑ์การอนุมัติ";

      await supabase
        .from("place_submissions")
        .update({
          status: "rejected",
          rejection_reason: finalReason,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", subId);

      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      setRejectingId(null);
      setRejectionReason("");
      alert("ปฏิเสธคำขอเพิ่มสถานที่เรียบร้อยแล้ว");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + (err.message || "Failed"));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
      {/* Header Panel */}
      <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-xs" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Shield size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#231C18]">Admin Review Panel</h2>
            <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
              ศูนย์รวมการอนุมัติสิทธิ์ร้านค้าและสถานที่ใหม่สำหรับแอดมิน
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchPendingSubmissions}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-50 hover:bg-stone-100 border text-[#231C18] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          style={{ borderColor: C.line }}
        >
          {loading ? <Loader2 size={14} className="animate-spin text-amber-600" /> : <Clock size={14} />}
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* Main Category Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tab 1: Merchant Owner Approvals */}
        <button
          type="button"
          onClick={() => setMainCategory("merchants")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            mainCategory === "merchants"
              ? "bg-amber-50/90 border-amber-300 shadow-xs"
              : "bg-white border-stone-200 hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              mainCategory === "merchants" ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-600"
            }`}>
              <Store size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#231C18]">อนุมัติสิทธิ์เจ้าของร้านค้า (Store Owners)</h3>
              <p className="text-[10px] text-[#8A7870] font-semibold mt-0.5">
                ตรวจสอบหลักฐานสิทธิ์ร้านค้า & อนุมัติสิทธิ์จัดการร้าน
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
            merchantSubmissions.length > 0 ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-600"
          }`}>
            {merchantSubmissions.length}
          </span>
        </button>

        {/* Tab 2: New Place/Spot Submissions */}
        <button
          type="button"
          onClick={() => setMainCategory("places")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            mainCategory === "places"
              ? "bg-emerald-50/90 border-emerald-300 shadow-xs"
              : "bg-white border-stone-200 hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              mainCategory === "places" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"
            }`}>
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#231C18]">อนุมัติสถานที่ / ร้านค้าใหม่ (New Spots)</h3>
              <p className="text-[10px] text-[#8A7870] font-semibold mt-0.5">
                ตรวจสอบข้อมูลสถานที่และเพิ่มลงแผนที่ระบบ
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
            placeSubmissions.length > 0 ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"
          }`}>
            {placeSubmissions.length}
          </span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
          <Loader2 size={24} className="animate-spin text-[#E0533C]" />
          <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดรายการคำขอ...</span>
        </div>
      ) : mainCategory === "merchants" ? (
        /* ════════════════════════════════════════════════════════════ */
        /* TAB 1: STORE OWNER MERCHANT APPROVALS                        */
        /* ════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {merchantSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2" style={{ borderColor: C.line }}>
              <CheckCircle2 size={32} className="text-emerald-500 opacity-50 mb-1" />
              <p className="text-sm font-black text-[#231C18]">ไม่มีคำขอสมัครเจ้าของร้านค้าค้างอยู่</p>
              <p className="text-xs text-[#8A7870] font-semibold">บัญชีเจ้าของร้านค้าทั้งหมดได้รับการตรวจสอบเรียบร้อยแล้ว</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {merchantSubmissions.map((m) => {
                const isRejectingThis = rejectingId === m.id;
                const shopNameTitle = m.shop_name || m.name_en || m.profiles?.shop_name || "คำขอลงทะเบียนร้านค้า";
                const ownerName = m.contact_name || m.profiles?.display_name || m.profiles?.full_name || m.profiles?.username || "เจ้าของร้านค้า";
                const phoneNum = m.contact_phone || m.phone || m.profiles?.phone || "-";
                const emailStr = m.contact_email || m.email || m.profiles?.email || "-";

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-3xl p-5 border shadow-xs space-y-4 hover:border-amber-300 transition-all relative overflow-hidden"
                    style={{ borderColor: C.line }}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 border-b pb-3.5" style={{ borderColor: C.line }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                          <Building size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-[#231C18]">{shopNameTitle}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              ⏳ รออนุมัติสิทธิ์ร้านค้า
                            </span>
                          </div>
                          <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
                            ผู้สมัคร / เจ้าของร้าน: <span className="text-[#231C18] font-bold">{ownerName}</span>
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-semibold text-gray-400 shrink-0">
                        ยื่นคำขอเมื่อ: {new Date(m.updated_at || m.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Merchant Details Grid */}
                    {(() => {
                      const CATEGORY_MAP: Record<string, string> = {
                        food: "ร้านอาหาร / คาเฟ่ (Food & Cafe)",
                        shop: "ร้านค้า / ของฝาก (Shopping & Souvenirs)",
                        sightseeing: "สถานที่ท่องเที่ยว / วัดเซน (Sightseeing & Shrine)",
                        service: "บริการ / โรงแรม (Service & Hotel)",
                        other: "อื่นๆ (Other)",
                      };
                      const prefectureStr = m.prefecture || m.profiles?.prefecture || "ไม่ระบุ";
                      const rawCat = m.category || m.profiles?.category || "food";
                      const categoryLabel = CATEGORY_MAP[rawCat] || rawCat;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 bg-stone-50/70 p-4 rounded-2xl border" style={{ borderColor: C.line }}>
                          <div className="flex items-start gap-2.5 text-xs">
                            <User size={15} className="text-[#8A7870] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8A7870] block">ชื่อผู้ติดต่อ</span>
                              <span className="font-bold text-[#231C18] break-words">{ownerName}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 text-xs">
                            <Phone size={15} className="text-[#8A7870] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8A7870] block">เบอร์โทรศัพท์ติดต่อ</span>
                              <span className="font-bold text-[#231C18] break-words">{phoneNum}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 text-xs">
                            <Mail size={15} className="text-[#8A7870] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8A7870] block">อีเมลบัญชีผู้ใช้</span>
                              <span className="font-bold text-[#231C18] break-all">{emailStr}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 text-xs">
                            <MapPin size={15} className="text-[#8A7870] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8A7870] block">จังหวัด (Prefecture)</span>
                              <span className="font-bold text-[#231C18] break-words">{prefectureStr}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 text-xs sm:col-span-2 md:col-span-2">
                            <Building size={15} className="text-[#8A7870] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-[#8A7870] block">หมวดหมู่ร้านค้า</span>
                              <span className="font-bold text-[#231C18] break-words leading-relaxed">{categoryLabel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Ownership Proof Document & Image Preview Section */}
                    <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                        <div>
                          <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider block">
                            เอกสารหลักฐานยืนยันสิทธิ์ร้านค้า (Ownership Proof Document)
                          </span>
                          <span className="text-[11px] text-amber-800/80 font-medium">
                            ใบจดทะเบียนพานิชย์ / ใบอนุญาตประกอบกิจการ / ภาพหน้าร้านพร้อมป้าย
                          </span>
                        </div>

                        {m.ownership_proof_url && (
                          <a
                            href={m.ownership_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl text-xs font-black text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 transition flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                          >
                            <ExternalLink size={13} className="text-blue-600" />
                            <span>เปิดดูแท็บใหม่</span>
                          </a>
                        )}
                      </div>

                      {m.ownership_proof_url ? (
                        <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
                          {typeof m.ownership_proof_url === "string" &&
                          (m.ownership_proof_url.startsWith("data:image/") ||
                            /\.(png|jpg|jpeg|webp|gif)($|\?)/i.test(m.ownership_proof_url)) ? (
                            <div className="relative group shrink-0">
                              <img
                                src={m.ownership_proof_url}
                                alt="Ownership Proof"
                                onClick={() => setPreviewImageUrl(m.ownership_proof_url)}
                                className="h-36 max-w-full sm:max-w-xs object-cover rounded-xl border border-amber-300/80 bg-white shadow-xs cursor-pointer hover:opacity-90 transition"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewImageUrl(m.ownership_proof_url)}
                                className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black text-white text-[10px] font-black backdrop-blur-xs flex items-center gap-1 opacity-90 transition cursor-pointer"
                              >
                                <FileText size={11} />
                                <span>คลิกเพื่อขยายดูรูปภาพ</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center gap-3 w-full max-w-md">
                              <FileText size={24} className="text-amber-700 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-stone-900 block truncate">เอกสารแนบหลักฐานสิทธิ์ร้านค้า (PDF / Document)</span>
                                <span className="text-[10px] text-stone-500 font-medium block">คลิกปุ่มเปิดดูเพื่อตรวจสอบไฟล์เอกสาร</span>
                              </div>
                              <a
                                href={m.ownership_proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 transition"
                              >
                                เปิดดูไฟล์
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
                          <AlertCircle size={15} className="text-amber-700 shrink-0" />
                          <span>ไม่ได้แนบไฟล์หลักฐาน (โปรดตรวจสอบข้อมูลหรือติดต่อร้านค้าก่อนอนุมัติ)</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons or Reject form */}
                    {isRejectingThis ? (
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                        <label className="text-xs font-bold text-red-800 block">ระบุเหตุผลที่ไม่ผ่านการอนุมัติสิทธิ์ร้านค้า:</label>
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="เช่น ข้อมูลหลักฐานไม่ชัดเจน, เบอร์โทรศัพท์ไม่ถูกต้อง..."
                          className="w-full px-3 py-2 text-xs rounded-xl border bg-white outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setRejectingId(null)} className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-white cursor-pointer">ยกเลิก</button>
                          <button onClick={() => handleRejectMerchant(m.id)} className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 cursor-pointer">ยืนยันปฏิเสธ</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: C.line }}>
                        <button
                          onClick={() => setRejectingId(m.id)}
                          disabled={processingId === m.id}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                        >
                          ปฏิเสธคำขอ
                        </button>
                        <button
                          onClick={() => handleApproveMerchant(m)}
                          disabled={processingId === m.id}
                          className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {processingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          <span>อนุมัติสิทธิ์เจ้าของร้านค้า</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════ */
        /* TAB 2: NEW PLACE / SPOT SUBMISSIONS                          */
        /* ════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* Sub-Filter Tabs for Places */}
          <div className="flex flex-wrap items-center gap-1.5 select-none">
            <button
              onClick={() => setDataFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                dataFilter === "all" ? "bg-[#231C18] text-white border-[#231C18]" : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={dataFilter !== "all" ? { borderColor: C.line } : undefined}
            >
              All Pending ({placeSubmissions.length})
            </button>
            <button
              onClick={() => setDataFilter("complete")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                dataFilter === "complete" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={dataFilter !== "complete" ? { borderColor: C.line } : undefined}
            >
              Complete ({placeSubmissions.filter(isSubComplete).length})
            </button>
            <button
              onClick={() => setDataFilter("incomplete")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                dataFilter === "incomplete" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={dataFilter !== "incomplete" ? { borderColor: C.line } : undefined}
            >
              Incomplete ({placeSubmissions.filter(s => !isSubComplete(s)).length})
            </button>
          </div>

          {filteredPlaceSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2" style={{ borderColor: C.line }}>
              <CheckCircle2 size={32} className="text-emerald-500 opacity-50 mb-1" />
              <p className="text-sm font-black text-[#231C18]">ไม่มีรายการคำขออนุมัติสถานที่ในหมวดนี้</p>
              <p className="text-xs text-[#8A7870] font-semibold">สถานที่ทั้งหมดได้รับการตรวจสอบเรียบร้อยแล้ว</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPlaceSubmissions.map((sub) => {
                const img = sub.image_urls?.[0] || sub.image_url || "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600";
                const isRejectingThis = rejectingId === sub.id;
                const complete = isSubComplete(sub);

                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-3xl p-5 border shadow-xs space-y-4 hover:border-emerald-300 transition-all"
                    style={{ borderColor: C.line }}
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-4 cursor-pointer" onClick={() => openReviewModal(sub)}>
                      <img src={img} alt={sub.name_en} className="w-24 h-24 rounded-2xl object-cover border shrink-0" style={{ borderColor: C.line }} />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-[#231C18]">{sub.name_en} {sub.name_jp && `(${sub.name_jp})`}</h3>
                          {complete ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 select-none">
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100 select-none">
                              Incomplete
                            </span>
                          )}
                        </div>
                        {sub.street && <p className="text-xs text-[#8A7870] font-semibold">{sub.street}</p>}
                        {sub.description && <p className="text-xs text-[#8A7870] line-clamp-2">{sub.description}</p>}
                        <p className="text-[10px] text-gray-400 font-semibold">
                          Submitted by: <span className="text-[#231C18] font-bold">{sub.profiles?.display_name || sub.profiles?.full_name || sub.profiles?.username || "Unknown user"}</span> · {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {isRejectingThis ? (
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                        <label className="text-xs font-bold text-red-800 block">ระบุเหตุผลที่ไม่ผ่านการอนุมัติสถานที่:</label>
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="เช่น ภาพถ่ายไม่ชัดเจน, พิกัดไม่ตรงกับสถานที่จริง..."
                          className="w-full px-3 py-2 text-xs rounded-xl border bg-white outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setRejectingId(null)} className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-white cursor-pointer">ยกเลิก</button>
                          <button onClick={() => handleRejectPlace(sub.id)} className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-red-600 cursor-pointer">ยืนยันปฏิเสธ</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: C.line }}>
                        <button
                          onClick={() => setRejectingId(sub.id)}
                          disabled={processingId === sub.id}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => openReviewModal(sub)}
                          disabled={processingId === sub.id}
                          className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          Review & Action
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review Modal for Place Submissions */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto transition-all animate-in zoom-in-95 duration-200 border"
            style={{ borderColor: C.line }}
          >
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between bg-white sticky top-0 z-10 shrink-0" style={{ borderColor: C.line }}>
              <h3 className="text-sm font-black text-[#231C18] flex items-center gap-2">
                <span>Review Spot Submission:</span>
                <span className="text-[#8A7870] font-bold">{nameEn}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 border hover:bg-stone-100 transition cursor-pointer"
                style={{ borderColor: C.line }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Editable Fields */}
              <div className="space-y-4 pr-1">
                <h4 className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider border-b pb-1" style={{ borderColor: C.line }}>Editable Fields</h4>
                
                {validationError && (
                  <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">{validationError}</p>
                )}

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Spot Name (English) <span className="text-red-500 font-bold">*</span></label>
                  <input
                    required
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Spot Name (Japanese)</label>
                  <input
                    type="text"
                    value={nameJp}
                    onChange={(e) => setNameJp(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                    placeholder="例：東京駅"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Address / Street <span className="text-red-500 font-bold">*</span></label>
                  <input
                    required
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Website URL <span className="text-[8px] text-gray-400 font-semibold lowercase italic">(optional)</span></label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">Category</label>
                  <div className="flex gap-1.5">
                    {[
                      { id: "food", label: "Food" },
                      { id: "shop", label: "Shop" },
                    ].map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className="px-3.5 py-1.5 rounded-full text-[10px] font-black border transition-all cursor-pointer"
                        style={category === c.id ? { background: "#F0FDF4", color: "#166534", borderColor: "#BBF7D0" } : { background: "#fff", color: C.inkSoft, borderColor: C.line }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Prefecture</label>
                  <select
                    value={prefecture}
                    onChange={(e) => {
                      setPrefecture(e.target.value);
                      if (e.target.value !== "custom") setCustomPrefecture("");
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/20 focus:border-[#E0533C] transition-all"
                    style={{ borderColor: C.line, color: C.ink }}
                  >
                    <option value="">Unknown</option>
                    {dbPrefectures.map((pref) => (
                      <option key={pref} value={pref}>{pref}</option>
                    ))}
                    <option value="custom">Type manually</option>
                  </select>
                  {prefecture === "custom" && (
                    <input
                      type="text"
                      placeholder="Enter prefecture name manually (e.g. Tokyo)"
                      value={customPrefecture}
                      onChange={(e) => setCustomPrefecture(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/20 focus:border-[#E0533C] mt-2 transition-all"
                      style={{ borderColor: C.line, color: C.ink }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                      style={{ borderColor: C.line, color: C.ink }}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                      style={{ borderColor: C.line, color: C.ink }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Description (English) <span className="text-red-500 font-bold">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20 resize-none"
                    style={{ borderColor: C.line, color: C.ink }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Description (Japanese)</label>
                  <textarea
                    rows={3}
                    value={descriptionJp}
                    onChange={(e) => setDescriptionJp(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20 resize-none"
                    style={{ borderColor: C.line, color: C.ink }}
                    placeholder="日本語の説明..."
                  />
                </div>
              </div>

              {/* Right Column: Photos & Submission Info */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider border-b pb-1" style={{ borderColor: C.line }}>Submission Media & Info</h4>
                
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Photos</label>
                  {Array.isArray(selectedSubmission.image_urls) && selectedSubmission.image_urls.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedSubmission.image_urls.map((url: string, index: number) => (
                        <img key={index} src={url} alt={`submission-${index}`} className="w-full h-28 rounded-xl object-cover border" style={{ borderColor: C.line }} />
                      ))}
                    </div>
                  ) : selectedSubmission.image_url ? (
                    <img src={selectedSubmission.image_url} alt="submission" className="w-full h-36 rounded-2xl object-cover border" style={{ borderColor: C.line }} />
                  ) : (
                    <p className="text-xs text-gray-400 font-semibold italic">No photos attached</p>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Ownership Proof Document</label>
                  <div className="mt-1 bg-stone-50/50 p-3 rounded-xl border" style={{ borderColor: C.line }}>
                    {selectedSubmission.ownership_proof_url ? (
                      <a
                        href={selectedSubmission.ownership_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1.5 underline cursor-pointer"
                      >
                        <FileText size={14} /> View Document
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-semibold italic">No document attached</span>
                    )}
                  </div>

                  <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assignOwnership}
                      onChange={(e) => setAssignOwnership(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#231C18]">
                      Assign as Store Owner
                    </span>
                  </label>
                  {selectedSubmission.ownership_proof_url ? (
                    <p className="text-[10px] text-[#8A7870] font-semibold ml-6">
                      Grant {selectedSubmission.profiles?.display_name || selectedSubmission.profiles?.full_name || selectedSubmission.profiles?.username || "this user"} ownership of this shop after approval
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-600 font-semibold ml-6">
                      No ownership proof attached — verify manually before assigning
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-stone-50/50 p-4 rounded-2xl border" style={{ borderColor: C.line }}>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider block text-[#8A7870]">Submitted By</label>
                    <p className="text-xs font-bold text-[#231C18] mt-0.5">{selectedSubmission.profiles?.display_name || selectedSubmission.profiles?.full_name || selectedSubmission.profiles?.username || "Unknown user"}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider block text-[#8A7870]">Submitted On</label>
                    <p className="text-xs font-bold text-[#231C18] mt-0.5">{new Date(selectedSubmission.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Reject option */}
                <div className="p-4 rounded-2xl bg-red-50/30 border border-red-100/60 space-y-3 mt-4">
                  <label className="text-[9px] font-black uppercase tracking-wider block text-red-800">Reject Option</label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify rejection reason (optional)"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border bg-white outline-none focus:border-red-500 transition-all"
                    style={{ borderColor: C.line }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRejectPlace(selectedSubmission.id)}
                    disabled={processingId === selectedSubmission.id}
                    className="w-full py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 transition shadow-xs cursor-pointer"
                  >
                    Reject Submission
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t bg-stone-50 flex items-center justify-end gap-3 sticky bottom-0 shrink-0" style={{ borderColor: C.line }}>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#231C18] bg-white border hover:bg-stone-100 transition cursor-pointer"
                style={{ borderColor: C.line }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndApprove}
                disabled={processingId === selectedSubmission.id}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {processingId === selectedSubmission.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save & Approve Spot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Full-Screen Image Preview Modal for Admin */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 select-none animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black text-white/90">🖼️ ตัวอย่างเอกสาร / รูปภาพหลักฐานสิทธิ์ร้านค้า</span>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="px-3.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-white text-xs font-black transition cursor-pointer flex items-center gap-1 border border-stone-600 shadow-md"
              >
                <X size={14} />
                <span>ปิดหน้าต่าง</span>
              </button>
            </div>
            <img
              src={previewImageUrl}
              alt="Ownership Proof Full Preview"
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain border border-stone-700 bg-stone-950/90"
            />
          </div>
        </div>
      )}
    </div>
  );
}
