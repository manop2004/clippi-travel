// src/components/scanner/QRScannerModal.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  RefreshCw,
  MapPin,
  Camera,
  Compass,
  Sparkles,
  Info,
} from "lucide-react";
import { haversineDistance, formatDistance } from "../../lib/geoHelpers";
import { JigsawPiece } from "../../constants/jigsawData";
import { useJigsawQuests } from "../../hooks/useJigsawQuests";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPieceCollected: (questId: string, pieceId: string, piece: JigsawPiece) => void;
  onStampCollected?: (stampData: any) => void;
  onViewBoard?: () => void;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onPieceCollected,
  onStampCollected,
  onViewBoard,
}: QRScannerModalProps) {
  const { quests } = useJigsawQuests();

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<"idle" | "checking" | "granted" | "denied" | "unavailable">("idle");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>("");

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual/Dev Input
  const [manualCode, setManualCode] = useState("");
  const [activeTab, setActiveTab] = useState<"camera" | "dev">("camera");
  const [simSelectedQuestId, setSimSelectedQuestId] = useState<string>("");

  useEffect(() => {
    if (quests.length > 0 && (!simSelectedQuestId || !quests.some((q) => q.id === simSelectedQuestId))) {
      setSimSelectedQuestId(quests[0].id);
    }
  }, [quests, simSelectedQuestId]);

  // Result Modal State
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    title: string;
    message: string;
    piece?: JigsawPiece;
    distance?: number;
  } | null>(null);

  // 1. ขอสิทธิ์และพิกัด GPS ทันทีที่เปิด Modal (บังคับเปิด GPS)
  const requestGPS = () => {
    setGpsStatus("checking");
    setGpsErrorMsg("");

    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      setGpsErrorMsg("เบราว์เซอร์หรืออุปกรณ์ของคุณไม่รองรับ Geolocation GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsStatus("granted");
      },
      (err) => {
        console.warn("GPS Permission / Retrieval Error:", err);
        setGpsStatus("denied");
        if (err.code === 1) {
          setGpsErrorMsg("คุณปฏิเสธการอนุญาตเข้าถึงพิกัด GPS กรุณาอนุญาต Location ในการตั้งค่าเบราว์เซอร์");
        } else if (err.code === 2) {
          setGpsErrorMsg("ไม่สามารถระบุตำแหน่งได้ กรุณาเปิดบริการตำแหน่งที่ตั้ง (Location/GPS) บนอุปกรณ์");
        } else {
          setGpsErrorMsg("หมดเวลาในการดึงพิกัด GPS กรุณากดลองใหม่อีกครั้ง");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // 2. เปิดกล้องวิดีโอ
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
      }

      // เริ่ม Loop สแกนบาร์โค้ด
      startBarcodeScanning();
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError(err?.message || "ไม่สามารถเปิดกล้องได้ อาจมีแอปอื่นใช้งานกล้องอยู่ หรือไม่อนุญาตสิทธิ์กล้อง");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // 3. ตรวจจับ QR Code จากวิดีโอ (ใช้ Native BarcodeDetector หากเบราว์เซอร์รองรับ)
  const startBarcodeScanning = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    // @ts-ignore
    const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

    if (hasBarcodeDetector) {
      try {
        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !scanResult) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                handleScannedData(barcodes[0].rawValue);
              }
            } catch (e) {
              // ignore detection loop frame errors
            }
          }
        }, 500);
      } catch (e) {
        console.warn("BarcodeDetector error:", e);
      }
    }
  };

  // Effect: จัดการเมื่อเปิด/ปิด Modal
  useEffect(() => {
    if (isOpen) {
      setScanResult(null);
      setManualCode("");
      requestGPS();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Effect: เมื่อ GPS ได้รับอนุมัติแล้ว และกล้องยังไม่เปิด ให้เปิดกล้อง
  useEffect(() => {
    if (isOpen && gpsStatus === "granted" && !scanResult && !cameraActive && activeTab === "camera") {
      startCamera();
    }
  }, [isOpen, gpsStatus, scanResult, activeTab]);

  // 4. ตรวจสอบข้อมูล QR Code และคำนวณพิกัด GPS (Geofencing)
  const handleScannedData = (scannedText: string) => {
    const trimmed = scannedText.trim();
    if (!trimmed) return;

    // บังคับต้องมีพิกัด GPS ก่อน
    if (gpsStatus !== "granted" || !userCoords) {
      setScanResult({
        success: false,
        title: " ต้องเปิด GPS ก่อนสแกน",
        message: "ระบบต้องการพิกัด GPS ของคุณเพื่อยืนยันว่าคุณอยู่ ณ สถานที่จริง กรุณากดเปิด GPS",
      });
      return;
    }

    // หยุดกล้องชั่วคราว
    stopCamera();

    // 4.1 ตรวจสอบว่าตรงกับชิ้นส่วนจิ๊กซอว์หรือไม่
    for (const quest of quests) {
      const piece = quest.pieces.find(
        (p) => p.qrCodeValue.toLowerCase() === trimmed.toLowerCase() || p.id === trimmed
      );

      if (piece) {
        // คำนวณระยะห่างด้วย Haversine
        const distMeters = haversineDistance(
          userCoords.lat,
          userCoords.lng,
          piece.targetLat,
          piece.targetLng
        );

        // ตรวจสอบว่าอยู่ในรัศมีที่กำหนดหรือไม่
        // (สำหรับการทดสอบ หากห่างเกิน ให้แสดงเตือนและแจ้งระยะทางที่แท้จริง)
        const isNearby = distMeters <= piece.radiusMeters;

        if (!isNearby) {
          setScanResult({
            success: false,
            title: " คุณอยู่ไกลจากสถานที่จริง!",
            message: `QR Code ถูกต้องสำหรับ "${piece.checkpointName}" แต่ตำแหน่งปัจจุบันของคุณอยู่ห่างออกไป ${formatDistance(
              distMeters
            )} (ต้องอยู่ในระยะไม่เกิน ${formatDistance(piece.radiusMeters)})`,
            piece,
            distance: distMeters,
          });
          return;
        }

        // ปลดล็อกชิ้นส่วนสำเร็จ!
        onPieceCollected(quest.id, piece.id, piece);
        setScanResult({
          success: true,
          title: " ปลดล็อกชิ้นส่วนสำเร็จ!",
          message: `คุณได้รับชิ้นส่วนจิ๊กซอว์จาก "${piece.checkpointName}" แล้ว! (พิกัดถูกต้อง ระยะห่าง ${formatDistance(
            distMeters
          )})`,
          piece,
          distance: distMeters,
        });
        return;
      }
    }

    // 4.2 ตรวจสอบแสตมป์ทั่วไป
    if (onStampCollected) {
      onStampCollected({ qr: trimmed, userCoords });
      setScanResult({
        success: true,
        title: "สแกนแสตมป์สำเร็จ!",
        message: `ได้รับแสตมป์จากรหัส: ${trimmed}`,
      });
      return;
    }

    // 4.3 กรณีรหัสไม่ถูกต้อง
    setScanResult({
      success: false,
      title: "ไม่พบข้อมูลที่ตรงกัน",
      message: `รหัส QR "${trimmed}" ไม่ตรงกับชิ้นส่วนจิ๊กซอว์หรือแสตมป์ในระบบ`,
    });
  };

  // จำลองพิกัดไปยังสถานที่นั้น (สำหรับทดสอบ Dev Simulator)
  const simulateCheckinAt = (piece: JigsawPiece) => {
    // จำลองให้อยู่ห่างจากเป้าหมายเพียง 20 เมตร
    const simLat = piece.targetLat + 0.0001;
    const simLng = piece.targetLng + 0.0001;
    setUserCoords({
      lat: simLat,
      lng: simLng,
      accuracy: 10,
    });
    setGpsStatus("granted");

    // ประมวลผลรหัสทันที
    setTimeout(() => {
      const dist = haversineDistance(simLat, simLng, piece.targetLat, piece.targetLng);
      for (const quest of quests) {
        if (quest.pieces.some((p) => p.id === piece.id)) {
          onPieceCollected(quest.id, piece.id, piece);
          setScanResult({
            success: true,
            title: " ปลดล็อกชิ้นส่วนสำเร็จ (GPS Test)!",
            message: `จำลองเดินทางมาถึง "${piece.checkpointName}" สำเร็จ! (ระยะห่าง ${formatDistance(dist)})`,
            piece,
            distance: dist,
          });
          break;
        }
      }
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-stone-200 animate-fade-in relative my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5">
                สแกนเนอร์ QR Code + GPS
                <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-black uppercase">
                  Clippi Hunt
                </span>
              </h3>
              <p className="text-[10px] text-stone-500 font-medium">
                บังคับเปิด GPS เพื่อยืนยันว่าคุณเดินทางมาถึงสถานที่จริง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live GPS Status Bar */}
        <div
          className={`px-4 py-2.5 border-b text-xs flex items-center justify-between transition-colors ${
            gpsStatus === "granted"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : gpsStatus === "denied"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Navigation
              size={15}
              className={`${gpsStatus === "granted" ? "text-emerald-600 animate-pulse" : "text-amber-600"}`}
            />
            <div className="leading-tight">
              <span className="font-bold text-[11px] block">
                {gpsStatus === "checking" && "กำลังตรวจสอบพิกัด GPS..."}
                {gpsStatus === "granted" && (
                  <>
                    GPS พร้อมใช้งาน • ความแม่นยำ ~{Math.round(userCoords?.accuracy || 0)} ม.
                  </>
                )}
                {gpsStatus === "denied" && "GPS ไม่ได้รับอนุญาต (บังคับเปิด GPS)"}
                {gpsStatus === "unavailable" && "อุปกรณ์ไม่รองรับ GPS"}
                {gpsStatus === "idle" && "ยังไม่ได้เปิด GPS"}
              </span>
              {userCoords && (
                <span className="text-[9px] text-stone-500">
                  ละติจูด: {userCoords.lat.toFixed(5)}, ลองจิจูด: {userCoords.lng.toFixed(5)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={requestGPS}
            className="px-2.5 py-1 bg-[#FD775C] hover:bg-[#E31E27] text-white font-black rounded-xl text-[10px] flex items-center gap-1 transition shrink-0 cursor-pointer"
          >
            <RefreshCw size={11} /> รีเฟรช GPS
          </button>
        </div>

        {/* Mode Switcher: กล้องจริง vs โหมดทดสอบ */}
        <div className="flex border-b bg-stone-100 p-1 text-xs">
          <button
            onClick={() => {
              setActiveTab("camera");
              if (gpsStatus === "granted") startCamera();
            }}
            className={`flex-1 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "camera" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Camera size={14} /> กล้องสแกนเนอร์
          </button>
          <button
            onClick={() => {
              setActiveTab("dev");
              stopCamera();
            }}
            className={`flex-1 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "dev" ? "bg-white text-orange-600 shadow-xs" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Sparkles size={14} /> จุด Checkpoint จำลอง (Dev)
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 flex flex-col items-center justify-center min-h-[340px]">
          
          {/* กรณีถูกปฏิเสธ GPS หรือยังไม่ได้เปิด -> บล็อกการสแกนตามโจทย์ */}
          {gpsStatus === "denied" ? (
            <div className="text-center p-6 space-y-4 max-w-sm">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h4 className="font-black text-stone-900 text-base">จำเป็นต้องเปิดและอนุญาต GPS</h4>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  {gpsErrorMsg ||
                    "กติกากิจกรรม Clippi Jigsaw Hunt บังคับให้ผู้เล่นต้องเปิดตำแหน่ง GPS เพื่อยืนยันว่าคุณเดินทางมาถึงสถานที่จริง"}
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 text-left space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Info size={13} /> วิธีเปิดสิทธิ์:
                </p>
 <p>1. กดไอคอนแม่กุญแจ  หรือสิทธิ์ที่แถบ URL บนเบราว์เซอร์</p>
                <p>2. ปรับการตั้งค่า Location / ตำแหน่ง ให้เป็น <strong>"อนุญาต (Allow)"</strong></p>
              </div>

              <button
                onClick={requestGPS}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> อนุญาตและลองเปิด GPS อีกครั้ง
              </button>
            </div>
          ) : scanResult ? (
            /* กรณีได้ผลลัพธ์การสแกน (สำเร็จ หรือ ผิดเงื่อนไข) */
            <div className="text-center p-5 space-y-4 w-full">
              <div
                className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-sm ${
                  scanResult.success ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                }`}
              >
                {scanResult.success ? <CheckCircle2 size={36} /> : <AlertTriangle size={36} />}
              </div>

              <div>
                <h4 className="font-black text-stone-900 text-base">{scanResult.title}</h4>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed max-w-sm mx-auto">
                  {scanResult.message}
                </p>
              </div>

              {scanResult.piece && (
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-left max-w-sm mx-auto flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                    ชิ้นที่ {scanResult.piece.pieceIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-stone-900 truncate">{scanResult.piece.checkpointName}</p>
                    <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-orange-500" /> {scanResult.piece.locationArea}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 max-w-xs mx-auto pt-2">
                <button
                  onClick={() => {
                    setScanResult(null);
                    if (activeTab === "camera") startCamera();
                  }}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold rounded-xl text-xs transition cursor-pointer"
                >
                  สแกนจุดอื่นต่อ
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onViewBoard?.();
                  }}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  ดูกระดานจิ๊กซอว์
                </button>
              </div>
            </div>
          ) : activeTab === "camera" ? (
            /* หน้าต่างกล้องสแกนจริง */
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full max-w-[300px] aspect-square bg-[#FD775C] rounded-3xl overflow-hidden border-2 border-dashed border-orange-400 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Viewfinder Overlay Frame */}
                <div className="absolute inset-8 border-2 border-white/60 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-orange-500" />
                    <div className="w-4 h-4 border-t-2 border-r-2 border-orange-500" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-orange-500" />
                    <div className="w-4 h-4 border-b-2 border-r-2 border-orange-500" />
                  </div>
                </div>

                {!cameraActive && (
                  <div className="absolute inset-0 bg-stone-900/90 text-white flex flex-col items-center justify-center p-4 text-center">
                    <Camera size={32} className="text-stone-400 mb-2 animate-bounce" />
                    <p className="text-xs font-bold text-stone-200">
                      {cameraError || "กำลังเตรียมกล้องสแกนเนอร์..."}
                    </p>
                    <button
                      onClick={startCamera}
                      className="mt-3 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl cursor-pointer"
                    >
                      เปิดกล้องอีกครั้ง
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-stone-500 mt-3 flex items-center gap-1 font-medium">
                <MapPin size={12} className="text-orange-500" /> นำกล้องส่องไปที่ QR Code ณ จุดเช็คพอยต์สถานที่จริง
              </p>

              {/* ป้อนรหัส QR ด้วยตนเอง หากกล้องติดปัญหา */}
              <div className="mt-4 pt-3 border-t w-full flex items-center gap-2">
                <input
                  type="text"
                  placeholder="พิมพ์รหัส QR Code (ถ้ามี)..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleScannedData(manualCode);
                  }}
                  className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
                />
                <button
                  onClick={() => handleScannedData(manualCode)}
                  className="px-3 py-2 bg-[#FD775C] text-white rounded-xl text-xs font-extrabold hover:bg-[#E31E27] transition cursor-pointer"
                >
                  ตรวจสอบ
                </button>
              </div>
            </div>
          ) : (
            /* โหมดทดสอบสำหรับจำลอง Checkpoint และการเดินทาง */
            <div className="w-full space-y-3">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Sparkles size={16} className="shrink-0 text-amber-600" />
                <p className="text-[11px] leading-tight">
                  <strong>โหมดทดสอบ (Dev GPS Simulator):</strong> กดปุ่มด้านล่างเพื่อจำลองว่าคุณเดินทางไปถึงพิกัดสถานที่จริงและสแกน QR Code ประจำจุดนั้น
                </p>
              </div>

              {/* เลือกเควสต์ใน Dev Simulator */}
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {quests.map((quest) => {
                  const isCur = quest.id === simSelectedQuestId;
                  return (
                    <button
                      key={quest.id}
                      onClick={() => setSimSelectedQuestId(quest.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition cursor-pointer ${
                        isCur
                          ? "bg-[#FD775C] text-white shadow-xs"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {quest.title.split(":")[0]}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                {((quests.find((q) => q.id === simSelectedQuestId) || quests[0])?.pieces || []).map((piece, idx) => {
                  const currentDistance = userCoords
                    ? haversineDistance(userCoords.lat, userCoords.lng, piece.targetLat, piece.targetLng)
                    : null;

                  return (
                    <div
                      key={piece.id}
                      className="p-3 rounded-2xl bg-stone-50 border border-stone-200 hover:border-orange-300 flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-xs text-stone-900 truncate">
                            {piece.checkpointName}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 pl-5.5 mt-0.5 truncate">
                          {piece.locationArea} • รหัส: <code className="bg-stone-200 px-1 rounded">{piece.qrCodeValue}</code>
                        </p>
                        {currentDistance !== null && (
                          <p className="text-[9px] text-stone-400 pl-5.5 mt-0.5">
                            ห่างจากพิกัดคุณปัจจุบัน: <strong>{formatDistance(currentDistance)}</strong>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* ปุ่มทดสอบสแกนตรงๆ */}
                        <button
                          onClick={() => handleScannedData(piece.qrCodeValue)}
                          title="สแกนด้วยพิกัดปัจจุบันของคุณ"
                          className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[10px] font-bold rounded-xl transition cursor-pointer"
                        >
                          สแกนจริง
                        </button>
                        {/* ปุ่มวาร์ป/จำลองให้พิกัดตรง */}
                        <button
                          onClick={() => simulateCheckinAt(piece)}
                          title="จำลองพิกัดให้อยู่ที่นี่และเช็คอินสำเร็จ"
                          className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Compass size={11} /> วาร์ป & เก็บ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
