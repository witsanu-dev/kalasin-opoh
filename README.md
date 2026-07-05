<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/MariaDB-10.11-003545?style=for-the-badge&logo=mariadb" alt="MariaDB" />
  
  <br />
  <br />

  <h1>Kalasin OPOH Sync Platform</h1>
  <p>
    ระบบบริหารจัดการและเชื่อมโยงข้อมูลสารสนเทศทางการแพทย์ (OPOH) <br />
    รองรับการดึงข้อมูลเตียง (Beds), ห้องคลอด (LR), ห้องผ่าตัด (OR) และคิวผ่าตัด (Surgical Queue) <br />จากระบบ HIS (HOSxP) เพื่อส่งเข้าศูนย์กลางโดยอัตโนมัติ
  </p>
</div>

<br />

## 🚀 คุณสมบัติเด่น (Features)
- **Data Synchronization**: ดึงข้อมูลและปรับแต่งโครงสร้างผ่าน SQL Editor ได้จากหน้าเว็บโดยตรง
- **Smart Dictionary**: เชื่อมต่อ Data Dictionary รหัสมาตรฐานของโรงพยาบาลโดยอัตโนมัติ
- **Dashboard**: สรุปข้อมูลเตียง ห้องคลอด ห้องผ่าตัด และคิวผ่าตัด แบบ Real-time
- **Dockerized**: ติดตั้งง่ายดายแบบ One-Click ผ่าน Docker Compose พร้อมฐานข้อมูลในตัว

---

## 📋 สิ่งที่ต้องเตรียม (Prerequisites)
ก่อนเริ่มต้นติดตั้งเซิร์ฟเวอร์ กรุณาตรวจสอบให้แน่ใจว่าเครื่องของคุณมีซอฟต์แวร์ต่อไปนี้:
- [Git](https://git-scm.com/downloads)
- [Docker](https://docs.docker.com/get-docker/) และ [Docker Compose](https://docs.docker.com/compose/install/)

---

## 🛠️ ขั้นตอนการติดตั้ง (Installation Guide)

### 1. ดาวน์โหลดโปรเจกต์
ทำการโคลนโปรเจกต์ลงบนเซิร์ฟเวอร์ของคุณ:
```bash
git clone https://github.com/witsanu-dev/kalasin-opoh.git
cd kalasin-opoh
```

### 2. ตั้งค่าคอนฟิก (Environment Variables)
คัดลอกไฟล์ `.env.example` เป็น `.env` และแก้ไขค่าต่างๆ ให้ตรงกับโรงพยาบาลของคุณ:
```bash
cp .env.example .env
```
เปิดไฟล์ `.env` ด้วย Text Editor และตั้งค่ารหัสสถานพยาบาล และการเชื่อมต่อ HOSxP:
```ini
APP_PORT=46
NEXT_PUBLIC_HOSPITAL_NAME=YOUR_HOSPITAL_NAME
NEXT_PUBLIC_HOSPITAL_CODE=YOUR_HOSPITAL_CODE
NEXT_PUBLIC_HOSPITAL_FULL_NAME=โรงพยาบาลของคุณ
API_KEY=your_secure_api_key_here

LOCAL_DB_HOST=127.0.0.1
LOCAL_DB_PORT=3306
LOCAL_DB_USER=root
LOCAL_DB_PASSWORD=your_local_password
LOCAL_DB_NAME=db_opoh

HOSXP_DB_HOST=192.168.x.x
HOSXP_DB_PORT=3306
HOSXP_DB_USER=sa
HOSXP_DB_PASSWORD=your_hosxp_password
HOSXP_DB_NAME=hos
```

### 3. รันระบบด้วย Docker (Deploy)
ใช้คำสั่งด้านล่างเพื่อสร้างคอนเทนเนอร์และสตาร์ทระบบทั้งหมด (Web App และ Database):
```bash
docker-compose up -d --build
```

> [!TIP]
> **เพียงเท่านี้ระบบก็พร้อมใช้งาน!** ระบบฐานข้อมูลย่อยจะถูกสร้างอัตโนมัติพร้อมบัญชีผู้ดูแลระบบ (Admin) เริ่มต้น

---

## ⚙️ ขั้นตอนการติดตั้งแบบ Node.js (Manual Installation)
หากเซิร์ฟเวอร์ของคุณไม่สะดวกใช้งาน Docker คุณสามารถรันโปรเจกต์โดยตรงได้ดังนี้:

### สิ่งที่ต้องเตรียมเพิ่มเติม
- [Node.js](https://nodejs.org/) (เวอร์ชัน 18.x ขึ้นไป)
- MySQL หรือ MariaDB สำหรับสร้างฐานข้อมูลจำลองภายใน

### 1. ดาวน์โหลดแพ็กเกจ
```bash
npm install
# หรือ yarn install
```

### 2. นำเข้าฐานข้อมูล
สร้างฐานข้อมูลใน MySQL ของคุณ (เช่น `db_opoh`) จากนั้นนำเข้าสคริปต์โครงสร้างพร้อมบัญชี Admin:
```bash
mysql -u root -p db_opoh < database/db_opoh.sql
```

### 3. ตั้งค่า .env
อย่าลืมกำหนดค่าในไฟล์ `.env` (ทั้ง `HOSXP_DB_*` และ `LOCAL_DB_*`) ให้ถูกต้องตรงกับเซิร์ฟเวอร์และ MySQL ในเครื่องของคุณ

### 4. รันระบบ (Production)
```bash
npm run build
npm start
```
> ระบบจะเปิดทำงานที่ `http://localhost:3000` ตามค่าเริ่มต้นของ Next.js

---

## 🔐 ข้อมูลเข้าสู่ระบบ (Default Credentials)

หลังจากการติดตั้งเสร็จสมบูรณ์ สามารถเข้าถึงระบบได้ผ่านเว็บบราวเซอร์ที่ `http://localhost:46` *(หรือ IP ของเซิร์ฟเวอร์)*

- **Username**: `admin`
- **Password**: <details style="display:inline-block; cursor:pointer;"><summary><i>คลิกเพื่อแสดงรหัสผ่าน</i></summary><code>opoh@2026</code></details>

> [!WARNING]
> เพื่อความปลอดภัย กรุณาเปลี่ยนรหัสผ่านทันทีหลังจากการเข้าสู่ระบบครั้งแรก

---

## 📂 โครงสร้างฐานข้อมูล
โปรเจกต์นี้ใช้โครงสร้างฐานข้อมูล MySQL (MariaDB) สำหรับเก็บการตั้งค่าภายใน โดยมีสคริปต์เตรียมพร้อมอยู่ที่:
- `docker/init.sql` : สคริปต์สร้างฐานข้อมูลและเพิ่มบัญชี Admin อัตโนมัติเมื่อรัน Docker ครั้งแรก
- ข้อมูล SQL เบื้องต้นสำหรับคิวรี HOSxP จะถูกกำหนดให้ดึงค่าอัตโนมัติผ่านระบบ Web UI

---

## 💡 การปรับแต่งคำสั่ง SQL (SQL Customization)
แอดมินสามารถเข้าไปที่เมนู **"ตั้งค่าคำสั่ง SQL"** ภายในระบบ เพื่อแก้ไขคำสั่ง `SELECT` ในการดึงข้อมูลจาก HOSxP ได้เอง 
ระบบมาพร้อมกับ *SQL Code Editor* และ *HIS Data Dictionary* เพื่อความสะดวกในการตรวจสอบรหัสสถานะที่ถูกต้อง

<div align="center">
  <br />
  <p><i>Developed & Maintained by Witsanu-Dev</i></p>
</div>
