// ⚠️ DEAD CODE - ยืนยันแล้วว่าไม่มีไฟล์ใดใน src/ import ไฟล์นี้ไปใช้
// (ตรวจสอบด้วย grep "import.*Sidebar" และ grep "import.*MobileNav" ทั่วโปรเจกต์ — ไม่พบผลลัพธ์ใดเลย)
// โค้ด Navigation ถูก inline ไว้ใน App.tsx โดยตรงแล้ว
// เก็บไว้ชั่วคราวเพื่อ rollback safety — จะลบไฟล์นี้ทิ้งจริงในรอบถัดไป
// หลังยืนยันว่า build/runtime ไม่มี regression ใดๆ

export function Sidebar() {
  return null;
}

export function MobileNav() {
  return null;
}