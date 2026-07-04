# OPOH System - Development Standards & UI Guidelines

เอกสารฉบับนี้จัดทำขึ้นเพื่อกำหนดมาตรฐานในการพัฒนาโปรเจค (Development Standards) และรูปแบบส่วนติดต่อผู้ใช้งาน (UI/UX Guidelines) ของระบบ OPOH System เพื่อให้การต่อยอดและพัฒนาในอนาคตเป็นไปในทิศทางเดียวกัน สวยงาม ทันสมัย และมีประสิทธิภาพสูงสุด

---

## 1. Tech Stack (เทคโนโลยีหลัก)
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4)
- **Database Driver:** `mysql2` (สำหรับเชื่อมต่อ HOSxP และ Local Database)

---

## 2. UI/UX & Design System (มาตรฐานการออกแบบ)
- **โทนสีหลัก (Primary Color):** **Teal (สีเขียวอมฟ้า)** โดยมีการกำหนดค่าใน `globals.css` เป็น `oklch(0.56 0.12 195)` หรือใกล้เคียง
- **Theme:** เน้น **Light Mode** เป็นหลัก เพื่อความสะอาดตาและเป็นทางการ
- **Typography (ฟอนต์):** ใช้ฟอนต์ **Anuphan (อนุพันธ์)** จาก Google Fonts เป็นมาตรฐานสำหรับทั้งระบบ เพื่อความสวยงาม อ่านง่าย 
- **Rounded Corners:** ความโค้งมนของขอบ (Border Radius) กำหนดมาตรฐานไว้ที่ **8px (`0.5rem`)** เพื่อให้ Components มีความละมุน ไม่แข็งกระด้าง
- **Layout Structure:** หน้าจอของระบบต้องประกอบไปด้วย Admin Portal Layout เต็มรูปแบบเสมอ ได้แก่:
  1. **Sidebar** (เมนูด้านซ้าย)
  2. **Navbar** (เมนูด้านบน พร้อม Search, Notifications, Profile)
  3. **Footer** (แถบข้อมูลด้านล่าง)

---

## 3. Mandatory Plugins & Libraries (ไลบรารีและปลั๊กอินมาตรฐาน)

ห้ามใช้ไลบรารีของ jQuery (เช่น Select2, jQuery DataTables) ในโปรเจคนี้โดยเด็ดขาด เพื่อป้องกันปัญหาเรื่อง Performance และ Bug ที่เกิดจากการขัดแย้งกับ React **ให้ใช้ไลบรารีต่อไปนี้เป็นมาตรฐานแทน:**

1. **Icons:** `lucide-react` (สไตล์เรียบง่าย ทันสมัย เข้ากับ Tailwind ได้ดี)
2. **Alerts & Modals:** `sweetalert2` ร่วมกับ `sweetalert2-react-content` ใช้สำหรับการแจ้งเตือนความสำเร็จ (Success) หรือการถามเพื่อยืนยัน (Confirm) เช่น การยืนยันก่อนซิงค์ข้อมูล
3. **Data Tables:** `@tanstack/react-table` เป็นมาตรฐานหลักสำหรับการทำตารางข้อมูลทั้งหมดในระบบ เนื่องจากสามารถทำ Pagination, Search, และ Sort ได้อย่างมีประสิทธิภาพ และปรับแต่ง UI ด้วย Tailwind CSS ได้อย่างลงตัว
4. **Charts & Graphs:** `recharts` เป็นมาตรฐานสำหรับการแสดงข้อมูลเชิงสถิติ (Bar Chart, Pie Chart, Line Chart) มีแอนิเมชันที่สวยงามและใช้งานง่ายใน React
5. **Select/Dropdown:** `react-select` หรือ `shadcn/ui ComboBox` เป็นทางเลือกหลักแทน Select2 ดั้งเดิม

---

## 4. โครงสร้างโฟลเดอร์มาตรฐาน (Folder Structure)

- `src/app/` - สำหรับ Page และ API Routes ทั้งหมด
  - `src/app/api/` - Endpoint สำหรับ API
- `src/components/layout/` - สำหรับ Component ที่เป็นโครงสร้างหลัก เช่น `Sidebar.tsx`, `Navbar.tsx`, `Footer.tsx`, `AdminLayout.tsx`
- `src/components/ui/` - สำหรับ UI Components ย่อยๆ (เช่น Button, Card, Badge) ที่สร้างด้วย shadcn/ui
- `src/lib/db/` - สำหรับไฟล์ตั้งค่าการเชื่อมต่อฐานข้อมูล (เช่น `hosxp.ts`, `local.ts`)

---

## 5. มาตรฐานภาษาและการสื่อสาร (Language Standard)
- เนื้อหาในระบบ (UI Text) ใช้ **ภาษาไทย** ที่มีความเป็นทางการ เข้าใจง่าย สั้นกระชับ (สามารถมีภาษาอังกฤษกำกับในวงเล็บได้หากเป็นศัพท์เฉพาะทาง เช่น "เตียงใช้งาน (Occupied)")
- ข้อความแจ้งเตือนต่างๆ ควรมีความเป็นมิตรและสื่อสารตรงประเด็น

*(ปรับปรุงล่าสุด: มิถุนายน 2026)*
