# คู่มือการติดตั้งและดูแลระบบ OPOH Sync Platform ระดับโรงพยาบาล
### (One Province One Hospital Deployment & Administration Manual)

เอกสารฉบับนี้จัดทำขึ้นสำหรับ **ผู้ดูแลระบบสารสนเทศ (IT / ศูนย์คอมพิวเตอร์)** ของโรงพยาบาลทั่วไปและโรงพยาบาลชุมชนทุกแห่ง เพื่อใช้เป็นมาตรฐานในการติดตั้งและดูแลระบบ One Province One Hospital (OPOH) บนเซิร์ฟเวอร์ของโรงพยาบาลตนเองอย่างปลอดภัย มั่นคง และได้มาตรฐานสูงสุด

---

## 📑 สารบัญ (Quick Navigation)
1. [สิ่งที่ต้องเตรียมก่อนติดตั้ง (System Prerequisites)](#1-สิ่งที่ต้องเตรียมก่อนติดตั้ง-system-prerequisites)
2. [แนวทางการติดตั้ง: ทางเลือกที่ 1 ติดตั้งผ่าน Docker (แนะนำสูงสุด)](#2-แนวทางการติดตั้ง-ทางเลือกที่-1-ติดตั้งผ่าน-docker-compose-แนะนำสูงสุด)
3. [แนวทางการติดตั้ง: ทางเลือกที่ 2 ติดตั้งผ่าน Node.js + PM2 (Bare-Metal)](#3-แนวทางการติดตั้ง-ทางเลือกที่-2-ติดตั้งผ่าน-nodejs--pm2-bare-metal)
4. [การตั้งค่าการเชื่อมต่อฐานข้อมูลผ่านหน้าเว็บ (UI Setup Modal)](#4-การตั้งค่าการเชื่อมต่อฐานข้อมูลผ่านหน้าเว็บ-ui-setup-modal)
5. [การจัดการสิทธิ์ Admin และระบบ 2-Factor Authentication (MFA)](#5-การจัดการสิทธิ์-admin-และระบบ-2-factor-authentication-mfa)
6. [การเข้าถึงและสำรองข้อมูล Local Database ด้วย Navicat / DBeaver (Port 3307)](#6-การเข้าถึงและสำรองข้อมูล-local-database-ด้วย-navicat--dbeaver-port-3307)
7. [คำสั่งควบคุมและอัปเดตระบบ (Ops Cheat Sheet)](#7-คำสั่งควบคุมและอัปเดตระบบ-ops-cheat-sheet)
8. [การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)](#8-การแก้ไขปัญหาที่พบบ่อย-troubleshooting--faq)

---

## 1. สิ่งที่ต้องเตรียมก่อนติดตั้ง (System Prerequisites)

### ข้อกำหนดด้านฮาร์ดแวร์และเซิร์ฟเวอร์
- **CPU:** 2 Cores ขึ้นไป (แนะนำ 4 Cores)
- **RAM:** ขั้นต่ำ 4GB (แนะนำ 8GB ขึ้นไป)
- **Disk Space:** พื้นที่ว่างอย่างน้อย 10GB (SSD แนะนำ)
- **OS:** รองรับทั้ง Linux (Ubuntu 20.04/22.04/24.04, Debian 11/12, CentOS/Rocky 9) และ Windows Server 2019/2022 หรือ Windows 10/11 Pro (พร้อมเปิด Hyper-V/WSL2)

### ข้อมูลระบบที่ต้องใช้ของโรงพยาบาล
1. **รหัสสถานพยาบาล 5 หลัก** (เช่น `11078`, `11077`, `10709`)
2. **ข้อมูลการเชื่อมต่อฐานข้อมูล HOSxP** (IP, Port, User ที่มีสิทธิ์ SELECT, รหัสผ่าน, ชื่อฐานข้อมูล เช่น `hos` หรือ `hosxp`)
3. **API Key ประจำโรงพยาบาล** สำหรับส่งข้อมูลเข้าศูนย์กลาง สสจ. (ติดต่อขอรับจากกลุ่มงาน ICT สสจ.กาฬสินธุ์)

---

## 2. แนวทางการติดตั้ง: ทางเลือกที่ 1 ติดตั้งผ่าน Docker Compose (แนะนำสูงสุด)

วิธีนี้สะดวกรวดเร็วที่สุด มีฐานข้อมูล MariaDB สำหรับแคชข้อมูลมาให้ในตัวแบบแยกสัดส่วน (Isolated) และรันบน **Default Port 3000**

### ขั้นตอนที่ 2.1: ดาวน์โหลดโปรเจกต์
เปิด Terminal (Linux) หรือ PowerShell (Windows) แล้วพิมพ์:
```bash
git clone https://github.com/witsanu-dev/kalasin-opoh.git
cd kalasin-opoh
```

### ขั้นตอนที่ 2.2: กำหนดค่า Environment (`.env`)
คัดลอกไฟล์ตัวอย่างคอนฟิกมาเป็น `.env`:
```bash
cp .env.example .env
```
เปิดไฟล์ `.env` ด้วย Text Editor (เช่น `nano .env` หรือ Notepad) แล้วปรับแต่งค่าหลัก:
```ini
# 1. ข้อมูลประจำโรงพยาบาล
APP_PORT=3000
NEXT_PUBLIC_HOSPITAL_CODE=11078
NEXT_PUBLIC_HOSPITAL_NAME=KAMALASAI
NEXT_PUBLIC_HOSPITAL_FULL_NAME=โรงพยาบาลกมลาไสย

# 2. คอนฟิกเชื่อมต่อศูนย์กลาง
OPOH_BASE_URL=https://appksn.moph.go.th/opoh/api/v1
API_KEY=รหัส_API_Key_ที่ได้รับจาก_สสจ
# ช่องทางเข้าดู API Token: https://appksn.moph.go.th/opoh/

# 3. ข้อมูลเชื่อมต่อ HOSxP ของโรงพยาบาล
# กรณี HOSxP อยู่บน LAN เครื่องอื่น: ใส่ IP จริงของ Server เช่น 192.168.1.100
# กรณี HOSxP ติดตั้งอยู่บนเครื่องแม่เดียวกับ Docker: ให้ใส่ host.docker.internal
HOSXP_DB_HOST=192.168.1.100
HOSXP_DB_PORT=3306
HOSXP_DB_USER=sa
HOSXP_DB_PASSWORD=รหัสผ่านHOSxPของคุณ
HOSXP_DB_NAME=hos
HOSXP_DB_CHARSET=utf8mb4

# 4. ความปลอดภัยของ Cookie สำหรับวง LAN
# ตั้งเป็น false หากเปิดใช้งานผ่าน HTTP (เช่น http://192.168.1.x:3000)
COOKIE_SECURE=false
JWT_SECRET=ใส่ข้อความสุ่มยาวอย่างน้อย32ตัวอักษรเพื่อความปลอดภัย
```
> 🔗 **ช่องทางการเข้าดู API Token สำหรับส่งข้อมูล:** [https://appksn.moph.go.th/opoh/](https://appksn.moph.go.th/opoh/)  
*(หมายเหตุ: ส่วนของ `LOCAL_DB_...` ใน Docker ไม่ต้องแก้ไข ระบบจะเชื่อมโยงเข้าหา Container `opoh-db` ให้อัตโนมัติ)*

### ขั้นตอนที่ 2.3: สั่งรันระบบทั้งหมด
```bash
docker compose up -d --build
```
ระบบจะทำการดาวน์โหลด Component, สร้างฐานข้อมูลแคชภายใน และสตาร์ท Web Dashboard ขึ้นมาพร้อมใช้งานทันที

### ขั้นตอนที่ 2.4: ทดสอบเข้าใช้งาน
เปิดเว็บเบราว์เซอร์แล้วไปที่:
```text
http://localhost:3000
# หรือเปิดจากเครื่องลูกข่ายในวง LAN:
http://<IP-Server-ของโรงพยาบาล>:3000
```

---

## 3. แนวทางการติดตั้ง: ทางเลือกที่ 2 ติดตั้งผ่าน Node.js + PM2 (Bare-Metal)

สำหรับเซิร์ฟเวอร์ที่ต้องการรัน Node.js โดยตรงบนเครื่องแม่ข่าย

### ข้อกำหนดเพิ่มเติม
- ติดตั้ง **Node.js เวอร์ชัน >= 20.0.0 LTS**
- ติดตั้ง **MySQL 5.7/8.0 หรือ MariaDB 10.4+** บนเครื่องเซิร์ฟเวอร์

### ขั้นตอนที่ 3.1: ติดตั้ง Dependencies
```bash
git clone https://github.com/witsanu-dev/kalasin-opoh.git
cd kalasin-opoh

npm install
```

### ขั้นตอนที่ 3.2: นำเข้าฐานข้อมูลเริ่มต้น (`db_opoh`)
รันคำสั่ง SQL Dump เข้าสู่ MySQL ในเครื่อง:
```bash
mysql -u root -p < database/db_opoh.sql
```
*(สคริปต์นี้มีคำสั่ง `CREATE DATABASE IF NOT EXISTS db_opoh` และสร้างตารางให้อัตโนมัติ)*

### ขั้นตอนที่ 3.3: ตั้งค่า `.env`
```bash
cp .env.example .env
```
ตรวจสอบให้แน่ใจว่า:
- `LOCAL_DB_HOST=127.0.0.1` (ต่อฐานข้อมูล MySQL ในเครื่องแม่)
- `LOCAL_DB_USER` และ `LOCAL_DB_PASSWORD` ถูกต้องตรงกับ MySQL ในเครื่อง
- `HOSXP_DB_HOST` ชี้ไปที่ Server HOSxP ของโรงพยาบาล

### ขั้นตอนที่ 3.4: คอมไพล์และรันระบบผ่าน PM2
```bash
# 1. คอมไพล์โปรแกรม
npm run build

# 2. ติดตั้ง PM2 (หากยังไม่มี)
npm install -g pm2

# 3. รันโปรแกรมในรูปแบบ Fork Mode (Instance เดียว)
pm2 start npm --name "kls_opoh" -- start

# 4. ตั้งค่าให้เปิดอัตโนมัติเมื่อรีสตาร์ท Server
pm2 save
pm2 startup
```

---

## 4. การตั้งค่าการเชื่อมต่อฐานข้อมูลผ่านหน้าเว็บ (UI Setup Modal)

หากแอดมินต้องการเปลี่ยน IP ของ HOSxP หรือปรับแต่งค่าเชื่อมต่อในภายหลัง **ไม่ต้องแก้ไฟล์หรือ Restart Server**:

1. เปิดหน้า Login: `http://localhost:3000/login`
2. คลิกที่ **ไอคอนรูปฐานข้อมูล (Database Icon)** บริเวณมุมล่างของหน้าต่าง Login
3. ระบบจะแสดงหน้าต่าง **"ตั้งค่าการเชื่อมต่อฐานข้อมูล (Database Configuration)"**
4. กรอกข้อมูล Host, Port, User, Password:
   - **ฐานข้อมูลระบบ (Local DB):** รองรับทั้ง Container ภายใน (`opoh-db:3306`), **AppServ**, **XAMPP** หรือ MySQL/MariaDB ในเครื่องแม่ข่าย (สามารถระบุ `127.0.0.1` หรือ `localhost` และ Port เช่น `3306` หรือพอร์ตอื่นๆ ได้ทันที ระบบ Docker มี Smart Gateway Map เข้าเครื่อง Host ให้อัตโนมัติ พร้อมปุ่มเลือก Preset 1-Click)
5. กดปุ่ม **"ทดสอบการเชื่อมต่อ"**:
   - ระบบจะทำการ Ping เครือข่าย และตรวจสอบโครงสร้างตารางหลัก (`opduser`, `doctor`, `officer`, `ward`) ให้ทันที
6. กดปุ่ม **"บันทึกการตั้งค่า"**:
   - ระบบจะทำ **In-Memory Hot-Reload** ทันที และบันทึกสำรองลงตาราง `system_config` รวมถึงไฟล์ `.env`
   - **ผู้ใช้งานสามารถล็อกอินด้วยบัญชี HOSxP ได้ทันทีโดยไม่ต้อง Restart Server หรือ Container**

---

## 5. การจัดการสิทธิ์ Admin และระบบ 2-Factor Authentication (MFA)

### 5.1 การเข้าสู่ระบบด้วยสิทธิ์ Admin ของ HOSxP
ระบบตรวจจับสิทธิ์ Admin จากตาราง `opduser` ของ HOSxP ให้อัตโนมัติ:
- อยู่ในกลุ่ม `groupname` เช่น `admin`, `administrator`, `ศูนย์คอมพิวเตอร์`, `งานสารสนเทศ`
- มีสิทธิ์ใน `accessright` ที่ระบุ `[ADMIN]`
- ดำรงตำแหน่ง `position` เช่น `นักวิชาการคอมพิวเตอร์`, `เจ้าพนักงานคอมพิวเตอร์`
- หรือระบุชื่อบัญชีไว้ในตัวแปร `ADMIN_USERNAMES=admin,sa,ict,...` ในไฟล์ `.env`

### 5.2 บัญชี Admin สำรองกรณีฉุกเฉิน (Local Emergency Admin)
หากยังไม่ได้ต่อ HOSxP หรือระบบเครือข่ายของ HOSxP ขัดข้อง สามารถใช้บัญชีนี้เข้าจัดการระบบได้:
- **Username:** `admin`
- **Password:** `opoH@2026`

### 5.3 การรีเซ็ต MFA กรณีเจ้าหน้าที่ทำรหัสหาย (Emergency MFA Reset CLI)
หากเจ้าหน้าที่ทำสมาร์ทโฟนหายหรือลบแอป Google Authenticator แอดมินสามารถปลดล็อกให้ได้ทันทีผ่าน Terminal:
```bash
# สำหรับแบบ Node.js ปกติ:
npm run reset-mfa <username>
# ตัวอย่าง:
npm run reset-mfa admin

# สำหรับแบบ Docker Container:
docker exec -it opoh_web node scripts/reset-mfa.js <username>
```

---

## 6. การเข้าถึงและสำรองข้อมูล Local Database ด้วย Navicat / DBeaver (Port 3307)

สำหรับผู้ที่ติดตั้งผ่าน **Docker** ระบบได้เปิดช่องทางเข้าถึงฐานข้อมูลแคชภายใน (`db_opoh`) สู่เครื่องแม่ข่ายไว้ที่พอร์ต **`3307`** (เพื่อไม่ให้ชนกับ MySQL พอร์ต 3306 เดิมของเครื่อง):

- **Host:** `localhost` หรือ `IP-Server`
- **Port:** **`3307`**
- **User:** `opoh_user`
- **Password:** `opoh_secure_password` (หรือตามที่ระบุใน `.env`)
- **Database:** `db_opoh`

> [!TIP]
> แอดมินสามารถใช้ DBeaver หรือ Navicat ต่อเข้าไปตรวจสอบ Logs ในตาราง `opoh_sync_logs` หรือดูข้อมูลแคชของเตียง ห้องคลอด ห้องผ่าตัด ได้อย่างสะดวก

---

## 7. คำสั่งควบคุมและอัปเดตระบบ (Ops Cheat Sheet)

### คำสั่งควบคุม Docker Compose
```bash
# ดูสถานะ Container ทั้งหมด
docker compose ps

# ดู Logs การทำงานแบบ Real-time
docker compose logs -f opoh-web

# หยุดการทำงานชั่วคราว
docker compose stop

# เริ่มทำงานใหม่
docker compose start

# รีสตาร์ทเฉพาะแอปเว็บ
docker compose restart opoh-web
```

### การอัปเดตระบบเป็นเวอร์ชันใหม่ล่าสุด (System Upgrade)
เมื่อมีการออกอัปเดตใหม่จากศูนย์พัฒนาจังหวัด แอดมินสามารถอัปเดตได้ด้วย 3 คำสั่ง:
```bash
# 1. ดึงโค้ดเวอร์ชันล่าสุด
git pull origin main

# 2. บิลด์และสตาร์ท Container ใหม่ (ข้อมูลในฐานข้อมูลไม่สูญหาย)
docker compose up -d --build

# 3. ล้าง Docker Image เก่าที่ไม่ใช้แล้วเพื่อคืนพื้นที่ดิสก์
docker image prune -f
```

---

## 8. การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)

### Q1: เข้าใช้งานผ่าน IP โรงพยาบาล (เช่น `http://192.168.1.50:3000`) แล้ว Login ไม่ติด หรือเด้งกลับมาหน้า Login ซ้ำ?
* **สาเหตุ:** การตั้งค่า Cookie ถูกบังคับใช้ผ่าน HTTPS (`secure: true`) แต่เครื่องแม่ข่ายเปิดผ่าน HTTP ธรรมดา
* **วิธีแก้ไข:** ในไฟล์ `.env` ให้ตรวจสอบว่า `COOKIE_SECURE=false` จากนั้นรันคำสั่ง `docker compose restart opoh-web` (หรือรีสตาร์ท PM2)

### Q2: Docker บนเครื่อง Windows/Linux แจ้งว่าเชื่อมต่อ HOSxP ไม่ได้?
* **กรณี HOSxP อยู่บนเครื่องเดียวกับที่ลง Docker:** ใน `.env` ให้ตั้งค่า `HOSXP_DB_HOST=host.docker.internal`
* **กรณี HOSxP อยู่บน LAN เครื่องอื่น:** ตรวจสอบ Firewall ของเครื่อง Server HOSxP ว่าได้เปิดรับพอร์ต 3306 จาก IP ของเครื่อง OPOH แล้วหรือไม่

### Q3: รันคำสั่ง `npm run dev` หรือ `start` แล้วแจ้ง Error `Another next dev server is already running`?
* **สาเหตุ:** มีโปรเซสเก่ายังค้างอยู่ที่พอร์ต 3000
* **วิธีแก้ไข:**
  - บน Windows PowerShell: `Stop-Process -Id <PID> -Force` หรือ `taskkill /PID <PID> /F`
  - บน Linux: `fuser -k 3000/tcp`

### Q4: ทำไมเปลี่ยนรหัสโรงพยาบาลใน `.env` แล้วหน้าเว็บยังเป็นชื่อโรงพยาบาลเดิม?
* **สาเหตุ:** ตัวแปร `NEXT_PUBLIC_HOSPITAL_*` จะถูกคอมไพล์ฝังลงใน Client Bundle ตอน Build Time
* **วิธีแก้ไข:** สั่งบิลด์ระบบใหม่เสมอ:
  - แบบ Docker: `docker compose up -d --build`
  - แบบ Node.js: `npm run build && pm2 restart kls_opoh`

### Q5: เครื่องลูกข่ายในวง LAN หรือระบบภายนอกเข้าใช้งานเว็บผ่าน IP ของ Server ไม่ได้ (Connection Timed Out / ไม่สามารถเชื่อมต่อไซต์นี้ได้)?
* **สาเหตุ:** Firewall ของเครื่อง Server (Windows Defender Firewall หรือ Linux UFW / Firewalld / iptables) ปิดกั้น Inbound Traffic พอร์ต 3000 หรือยังไม่ได้เปิดพอร์ตบนระบบเครือข่าย
* **วิธีตรวจสอบเบื้องต้นจากเครื่องลูกข่าย (Client):**
  - บน Windows (PowerShell):
    ```powershell
    Test-NetConnection -ComputerName <IP-Server> -Port 3000
    ```
    *(หากแสดง `TcpTestSucceeded : False` แสดงว่าติด Firewall ที่เครื่อง Server)*
  - บน Linux / macOS:
    ```bash
    nc -zv <IP-Server> 3000
    # หรือ
    curl -I http://<IP-Server>:3000/login
    ```
* **วิธีเปิด Port บน Server อย่างมีมาตรฐานและปลอดภัย:**
  - **สำหรับ Windows Server / Windows 10/11 (เปิด PowerShell แบบ "Run as Administrator"):**
    ```powershell
    # 1. เปิด Port 3000 สำหรับ Web Dashboard & OPOH REST APIs
    New-NetFirewallRule -DisplayName "OPOH Web Service (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

    # 2. (กรณีใช้ Docker) เปิด Port 3307 สำหรับเข้าดูฐานข้อมูลแคช Local DB
    New-NetFirewallRule -DisplayName "OPOH Local DB (Port 3307)" -Direction Inbound -LocalPort 3307 -Protocol TCP -Action Allow
    ```
  - **สำหรับ Linux Server (Ubuntu / Debian - UFW):**
    ```bash
    # 1. เปิด Port 3000 สำหรับ Web Service
    sudo ufw allow 3000/tcp comment "OPOH Web Service"

    # 2. (แนะนำ) เปิด Port 3307 เฉพาะ Subnet หรือ IP ของแอดมิน เพื่อความปลอดภัย
    sudo ufw allow from 192.168.1.0/24 to any port 3307 proto tcp comment "OPOH Local DB Admin"

    # 3. สั่ง Reload Firewall
    sudo ufw reload
    sudo ufw status verbose
    ```
  - **สำหรับ Linux Server (RHEL / CentOS / Rocky Linux / AlmaLinux - Firewalld):**
    ```bash
    # เปิด Port 3000 และ 3307 แบบถาวร
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --permanent --add-port=3307/tcp
    sudo firewall-cmd --reload
    ```
  - **กรณีติดตั้งบน VM หรือ Cloud (VMware ESXi, Proxmox, Hyper-V, Cloud Provider):**
    - ตรวจสอบ Virtual Switch, VLAN หรือ Security Group ของ Hypervisor ให้ยอมรับ Traffic ขาเข้า (Inbound TCP Port 3000) จากวง LAN ของโรงพยาบาล

---

## 👨‍💻 ผู้พัฒนาและหน่วยงานรับผิดชอบ (Developer & Maintainer)

| ข้อมูล (Detail) | รายละเอียด (Description) |
| :--- | :--- |
| **ผู้พัฒนา (Developer)** | **นายวิษณุ ศรีโยธา** (`wITsaNU _<`) |
| **ตำแหน่ง (Position)** | นักวิชาการคอมพิวเตอร์ |
| **กลุ่มงาน (Department)** | กลุ่มงานสุขภาพดิจิทัล (Digital Health Department) |
| **หน่วยงาน (Organization)** | โรงพยาบาลกมลาไสย จังหวัดกาฬสินธุ์ |
| **สำนักงานสาธารณสุขจังหวัด** | สำนักงานสาธารณสุขจังหวัดกาฬสินธุ์ เขตสุขภาพที่ 7 กระทรวงสาธารณสุข |

---

<div align="center">
  <p><b>Kalasin OPOH Sync System</b> &copy; 2026 | พัฒนาและดูแลโดย กลุ่มงานสุขภาพดิจิทัล โรงพยาบาลกมลาไสย ร่วมกับ สำนักงานสาธารณสุขจังหวัดกาฬสินธุ์</p>
</div>
