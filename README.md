# 🗾 Clippi Travel / Ekitag Web (Heritage Tourism & Stamp Rally)

เว็บแอปพลิเคชันและโมบายล์แอปสำหรับการท่องเที่ยวเชิงวัฒนธรรมและประวัติศาสตร์ญี่ปุ่น สะสมแสตมป์ดิจิทัล (Digital Stamp Rally) เควสจิ๊กซอว์ และบริหารจัดการร้านค้า

---

## 📖 เอกสารส่งมอบโปรเจกต์ (Handover Documentation)
👉 **กรุณาอ่านเอกสารฉบับเต็มสำหรับการรับมอบและพัฒนาต่อยอดได้ที่:**  
📄 [**HANDOVER_DOCUMENTATION.md**](./HANDOVER_DOCUMENTATION.md)

---

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` ใน Root Directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. รัน Development Server
```bash
npm run dev
```

### 4. ตรวจสอบ Lint และ Type Check
```bash
npm run lint
npm run build
```

---

## 🛠 Tech Stack
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, Leaflet.js, jsQR, i18next
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage, Realtime, RLS)
- **Mobile:** Capacitor (iOS / Android)

