# 🏥 คู่มือมาตรฐานการเชื่อมต่อระบบ OPOH API (OPOH API Integration Guide)

เอกสารนี้เป็นคู่มือมาตรฐานสากลสำหรับการเชื่อมต่อและแลกเปลี่ยนข้อมูลของ **ระบบบริหารจัดการเตียง ห้องผ่าตัด ห้องคลอด และคิวผ่าตัด (OPOH)** ครอบคลุมทั้ง **Local Inbound REST APIs** (สำหรับให้หน่วยงานภายนอกหรือระบบในเครือข่ายดึงข้อมูลจากโรงพยาบาล) และ **Outbound Central Sync API** (การส่งข้อมูลอัตโนมัติขึ้นสู่ศูนย์กลางระดับจังหวัด)

---

## 📑 สารบัญ (Table of Contents)
1. [สถาปัตยกรรมการแลกเปลี่ยนข้อมูล (System Architecture)](#-1-สถาปัตยกรรมการแลกเปลี่ยนข้อมูล-system-architecture)
2. [มาตรฐานความปลอดภัยและการยืนยันตัวตน (Authentication & Security)](#-2-มาตรฐานความปลอดภัยและการยืนยันตัวตน-authentication--security)
3. [ข้อมูลการเชื่อมต่อพื้นฐาน (Connection Endpoints)](#-3-ข้อมูลการเชื่อมต่อพื้นฐาน-connection-endpoints)
4. [หมวดที่ 1: Local Inbound REST APIs (API ดึงข้อมูลประจำโรงพยาบาล)](#-4-หมวดที่-1-local-inbound-rest-apis)
   - [4.1 สรุปข้อมูลรวมทุกระบบ (Unified All Modules)](#41-สรุปข้อมูลรวมทุกระบบ-unified-all-modules)
   - [4.2 ระบบบริหารจัดการเตียง (Bed Management)](#42-ระบบบริหารจัดการเตียง-bed-management)
   - [4.3 ระบบเตียงวิกฤต (ICU Beds Metrics)](#43-ระบบเตียงวิกฤต-icu-beds-metrics)
   - [4.4 ระบบห้องผ่าตัด (Operating Room - OR)](#44-ระบบห้องผ่าตัด-operating-room---or)
   - [4.5 ระบบห้องคลอด (Labor Room - LR)](#45-ระบบห้องคลอด-labor-room---lr)
   - [4.6 ระบบคิวรอผ่าตัด (Surgical Queue)](#46-ระบบคิวรอผ่าตัด-surgical-queue)
   - [4.7 ภาพรวมโรงพยาบาลสำหรับผู้บริหาร (Executive Overview)](#47-ภาพรวมโรงพยาบาลสำหรับผู้บริหาร-executive-overview)
   - [4.8 สั่งรันการส่งข้อมูลอัตโนมัติ (Manual Sync Trigger)](#48-สั่งรันการส่งข้อมูล-manual-sync-trigger)
   - [4.9 ตรวจสอบและจัดการประวัติการส่งข้อมูล (Sync Logs & Config)](#49-ตรวจสอบและจัดการประวัติการส่งข้อมูล-sync-logs--config)
5. [หมวดที่ 2: Outbound Central Sync APIs (การส่งข้อมูลขึ้นศูนย์กลาง สสจ.)](#-5-หมวดที่-2-outbound-central-sync-apis)
6. [กลไกความเสถียรและความปลอดภัยระดับ Enterprise (Enterprise Safeguards)](#-6-กลไกความเสถียรและความปลอดภัยระดับ-enterprise)
7. [ตัวอย่างโค้ดการเชื่อมต่อ (Implementation Examples)](#-7-ตัวอย่างโค้ดการเชื่อมต่อ-implementation-examples)
8. [การจัดการข้อผิดพลาดและ HTTP Status Codes (Error Handling)](#-8-การจัดการข้อผิดพลาดและ-http-status-codes)

---

## 🏛️ 1. สถาปัตยกรรมการแลกเปลี่ยนข้อมูล (System Architecture)

ระบบ OPOH ทำงานในรูปแบบไฮบริด 2 ทิศทางอย่างอิสระและปลอดภัย:

```mermaid
flowchart LR
    subgraph Hospital["🏥 เครือข่ายภายในโรงพยาบาล (Hospital Internal Network)"]
        HOSxP[(ฐานข้อมูล HOSxP)] -->|Extract/Transform| LocalDB[(ฐานข้อมูล Local db_opoh)]
        LocalDB --> App[OPOH Application Server :3000]
    end

    subgraph Inbound["📥 Inbound Integration (ดึงข้อมูล)"]
        Client[ระบบภายใน / Dashboard ภายนอก] -->|Authorization: Bearer API_KEY| App
    end

    subgraph Outbound["📤 Outbound Central Push (ส่งข้อมูล)"]
        App -->|OPOH-Auth-Key: CENTRAL_KEY| Central[ศูนย์กลางข้อมูล OPOH จังหวัด<br/>appksn.moph.go.th]
    end
```

1. **Inbound Data Access:** ระบบภายนอกหรือระบบย่อยในโรงพยาบาลสามารถเรียกอ่านสถานะเตียง ห้องผ่าตัด ห้องคลอด ผ่าน REST APIs ที่พอร์ต `3000` โดยใช้ `Authorization: Bearer <API_KEY>`
2. **Outbound Data Sync:** ตัว Background Worker ของ OPOH ดึงข้อมูลที่ประมวลผลแล้วจากฐานข้อมูลภายใน (`db_opoh`) ส่งขึ้นเซิร์ฟเวอร์จังหวัดอัตโนมัติตามรอบเวลาที่กำหนด โดยผ่านระบบ Circuit Breaker และ Throttle Guard

---

## 🔒 2. มาตรฐานความปลอดภัยและการยืนยันตัวตน (Authentication & Security)

### 2.1 มาตรฐานการเรียก Local REST APIs (Inbound)
การเรียกใช้งาน API ทุก Endpoint ในกลุ่ม `/api/opoh/*` จะต้องแนบ **Bearer Token** มาใน HTTP Request Header ตามมาตรฐาน **RFC 6750**:

*   **Header Name:** `Authorization`
*   **Header Value:** `Bearer <YOUR_LOCAL_API_KEY>`
*   **การตั้งค่ารหัส API Key:** กำหนดในไฟล์ `.env` ของระบบผ่านตัวแปร `API_KEY` หรือตั้งค่าผ่านหน้าเว็บระบบผู้ดูแล

> ⚠️ **คำเตือนความปลอดภัย:**
> 1. ห้ามเผยแพร่ค่า `API_KEY` บน Client-side Scripts หรือ Source Code สาธารณะ
> 2. การเรียกใช้ API จากระบบภายนอก ควรผ่านการคัดกรอง IP Firewall (Network Whitelisting) ในระดับหน่วยงาน

### 2.2 มาตรฐานการส่งข้อมูลขึ้นศูนย์กลางจังหวัด (Outbound Central Sync)
เมื่อ OPOH ส่งข้อมูลขึ้นระบบส่วนกลางระดับจังหวัด จะใช้ Header มาตรฐานตามที่ สสจ. กำหนด:
*   **Header Name:** `OPOH-Auth-Key`
*   **Header Value:** `<CENTRAL_API_KEY>` (รหัสที่ได้รับจากผู้ดูแลระบบ สสจ.)

---

## 🌐 3. ข้อมูลการเชื่อมต่อพื้นฐาน (Connection Endpoints)

| สภาพแวดล้อม (Environment) | Base URL | มาตรฐานพอร์ต | โปรโตคอล |
| :--- | :--- | :---: | :---: |
| **Local OPOH Instance (Production/Node)** | `http://<hospital-server-ip>:3000` | 3000 | HTTP / HTTPS (ผ่าน Reverse Proxy) |
| **Local OPOH Instance (Docker)** | `http://<hospital-server-ip>:3000` | 3000 | HTTP / HTTPS |
| **Development (เครื่องนักพัฒนา)** | `http://localhost:3000` | 3000 | HTTP |
| **ศูนย์กลาง OPOH สสจ. กาฬสินธุ์ (Central)** | `https://appksn.moph.go.th/opoh/api/v1` | 443 | HTTPS |

*   **Encoding:** UTF-8
*   **Content-Type:** `application/json; charset=utf-8`

---

## 📦 4. หมวดที่ 1: Local Inbound REST APIs

API ในหมวดนี้เปิดให้บริการบนเซิร์ฟเวอร์ OPOH ประจำโรงพยาบาล เพื่อให้ระบบ Third-party, Dashboard วอร์ด หรือระบบสารสนเทศอื่นสามารถดึงข้อมูลแบบ Real-time ไปใช้งาน

---

### 4.1 สรุปข้อมูลรวมทุกระบบ (Unified All Modules)
ดึงข้อมูลรวมของทั้ง 4 ระบบ (เตียง, ห้องผ่าตัด, ห้องคลอด, คิวผ่าตัด) ในครั้งเดียว เพื่อลด Round-trip การเรียก API

*   **Endpoint:** `GET /api/opoh/all`
*   **Headers:**
    *   `Authorization: Bearer <API_KEY>`
*   **ตัวอย่างการเรียก (cURL):**
    ```bash
    curl -X GET "http://localhost:3000/api/opoh/all" \
      -H "Authorization: Bearer opoh_secret_token_kalasin_2026"
    ```
*   **ตัวอย่าง Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "hospital_code": "11078",
        "hospital_name": "โรงพยาบาลกมลาไสย",
        "timestamp": "2026-10-18T12:00:00.000Z",
        "data": {
          "beds": [ ... ],
          "or": [ ... ],
          "lr": [ ... ],
          "surgical_queue": [ ... ]
        }
      }
    }
    ```

---

### 4.2 ระบบบริหารจัดการเตียง (Bed Management)
ส่งกลับข้อมูลสถานะเตียงของผู้ป่วยใน (IPD) แยกรายหอผู้ป่วย (Ward) พร้อมผลรวมสรุปทั้งโรงพยาบาล

*   **Endpoint:** `GET /api/opoh/beds`
*   **Headers:** `Authorization: Bearer <API_KEY>`
*   **คำอธิบายโครงสร้าง Response Data:**

| ชื่อฟิลด์ (Field) | ชนิดข้อมูล (Type) | คำอธิบาย |
| :--- | :---: | :--- |
| `hospital_code` | String | รหัสหน่วยบริการ 5 หลักของโรงพยาบาล |
| `hospital_name` | String | ชื่อเต็มโรงพยาบาล |
| `summary.total_active_beds` | Number | จำนวนเตียงที่เปิดให้บริการจริงรวมทั้งโรงพยาบาล |
| `summary.total_occupied` | Number | จำนวนเตียงที่มีผู้ป่วยครองรวม |
| `summary.total_available` | Number | จำนวนเตียงว่างพร้อมรับผู้ป่วยรวม |
| `summary.overall_occupancy_rate` | Number | อัตราการครองเตียงรวม (%) |
| `data[].ward_code` | String | รหัสหอผู้ป่วย |
| `data[].ward_name` | String | ชื่อหอผู้ป่วย |
| `data[].active_beds` | Number | เตียงเปิดจริงประจำวอร์ด |
| `data[].occupied` | Number | ผู้ป่วยครองเตียงประจำวอร์ด |
| `data[].available` | Number | เตียงว่างประจำวอร์ด |
| `data[].occupancy_rate` | Number | อัตราครองเตียง (%) ของวอร์ด |
| `data[].export_code` | String | รหัสส่งออกข้อมูลมาตรฐาน (ถ้ามี) |
| `data[].last_sync_at` | String | วันเวลาที่อัปเดตข้อมูลล่าสุด |

*   **ตัวอย่าง Response (200 OK):**
    ```json
    {
      "success": true,
      "hospital_code": "11078",
      "hospital_name": "โรงพยาบาลกมลาไสย",
      "hospital_short_name": "กมลาไสย",
      "timestamp": "2026-10-18T12:00:00.000Z",
      "summary": {
        "total_active_beds": 90,
        "total_occupied": 65,
        "total_available": 25,
        "overall_occupancy_rate": 72.22
      },
      "data": [
        {
          "export_code": "W01",
          "ward_code": "01",
          "ward_name": "หอผู้ป่วยอายุรกรรมหญิง",
          "active_beds": 30,
          "occupied": 28,
          "available": 2,
          "occupancy_rate": 93.33,
          "last_sync_at": "2026-10-18 11:58:30"
        },
        {
          "export_code": "W02",
          "ward_code": "02",
          "ward_name": "หอผู้ป่วยศัลยกรรม",
          "active_beds": 30,
          "occupied": 20,
          "available": 10,
          "occupancy_rate": 66.67,
          "last_sync_at": "2026-10-18 11:58:30"
        }
      ]
    }
    ```

---

### 4.3 ระบบเตียงวิกฤต (ICU Beds Metrics)
คัดกรองเฉพาะข้อมูลหอผู้ป่วยวิกฤต (ICU) สำหรับการติดตามสถานการณ์ฉุกเฉินและการส่งต่อผู้ป่วย (Referral System)

*   **Endpoint:** `GET /api/opoh/icu`
*   **Headers:** `Authorization: Bearer <API_KEY>`
*   **ตัวอย่าง Response (200 OK):**
    ```json
    {
      "success": true,
      "hospital_code": "11078",
      "hospital_name": "โรงพยาบาลกมลาไสย",
      "hospital_short_name": "กมลาไสย",
      "timestamp": "2026-10-18T12:00:00.000Z",
      "summary": {
        "total_wards": 1,
        "total_active_beds": 8,
        "total_occupied": 6,
        "total_available": 2,
        "overall_occupancy_rate": 75.00
      },
      "data": [
        {
          "export_code": "ICU01",
          "ward_code": "09",
          "ward_name": "หอผู้ป่วยวิกฤต (ICU)",
          "active_beds": 8,
          "occupied": 6,
          "available": 2,
          "occupancy_rate": 75.00,
          "last_sync_at": "2026-10-18 11:58:30"
        }
      ]
    }
    ```

---

### 4.4 ระบบห้องผ่าตัด (Operating Room - OR)
ส่งกลับข้อมูลสถานะห้องผ่าตัด เคสที่กำลังผ่าตัด เคสรอ และผลสรุปประจำวัน

*   **Endpoint:** `GET /api/opoh/or`
*   **Headers:** `Authorization: Bearer <API_KEY>`
*   **คำอธิบายโครงสร้าง Data:**
    *   `room_available`: สัดส่วนห้องผ่าตัดว่างพร้อมใช้งาน (เช่น `"2/4"`)
    *   `operating`: จำนวนห้องที่อยู่ระหว่างลงมีดผ่าตัด (In Surgery)
    *   `waiting`: จำนวนผู้ป่วยที่รอคิวผ่าตัดในห้องพักรอ
    *   `completed`: จำนวนเคสผ่าตัดที่เสร็จสิ้นแล้ววันนี้
    *   `cancelled`: จำนวนเคสที่ถูกยกเลิกวันนี้
    *   `total_cases`: ยอดรวมเคสผ่าตัดทั้งหมดของวันนี้

*   **ตัวอย่าง Response (200 OK):**
    ```json
    {
      "success": true,
      "hospital_code": "11078",
      "hospital_name": "โรงพยาบาลกมลาไสย",
      "hospital_short_name": "กมลาไสย",
      "timestamp": "2026-10-18T12:00:00.000Z",
      "data": {
        "room_available": "2/4",
        "operating": 2,
        "waiting": 3,
        "completed": 8,
        "cancelled": 1,
        "total_cases": 14,
        "last_sync_at": "2026-10-18 11:55:00"
      }
    }
    ```

---

### 4.5 ระบบห้องคลอด (Labor Room - LR)
ส่งกลับข้อมูลสถิติและการทำงานของห้องคลอดประจำวัน

*   **Endpoint:** `GET /api/opoh/lr`
*   **Headers:** `Authorization: Bearer <API_KEY>`
*   **คำอธิบายโครงสร้าง Data:**
    *   `waiting_labor`: จำนวนมารดารอคลอด (Labor stage)
    *   `normal_delivery`: จำนวนคลอดปกติสำเร็จ (Normal Delivery)
    *   `cesarean_delivery`: จำนวนผ่าตัดคลอด (C/S)
    *   `abortion`: จำนวนการแท้งบุตร
    *   `not_delivery`: จำนวนตรวจแล้วยังไม่คลอด/กลับบ้าน
    *   `total_cases`: ผู้รับบริการห้องคลอดสะสมทั้งหมดของวัน

*   **ตัวอย่าง Response (200 OK):**
    ```json
    {
      "success": true,
      "hospital_code": "11078",
      "hospital_name": "โรงพยาบาลกมลาไสย",
      "hospital_short_name": "กมลาไสย",
      "timestamp": "2026-10-18T12:00:00.000Z",
      "data": {
        "waiting_labor": 2,
        "normal_delivery": 5,
        "cesarean_delivery": 1,
        "abortion": 0,
        "not_delivery": 0,
        "total_cases": 8,
        "last_sync_at": "2026-10-18 11:55:00"
      }
    }
    ```

---

### 4.6 ระบบคิวรอผ่าตัด (Surgical Queue)
ส่งกลับข้อมูลผู้ป่วยที่ถูกจองคิวผ่าตัดล่วงหน้า แยกตามความเชี่ยวชาญทางการแพทย์และระดับความฉุกเฉิน

*   **Endpoint:** `GET /api/opoh/surgical_queue`
*   **Headers:** `Authorization: Bearer <API_KEY>`
*   **คำอธิบายโครงสร้าง Data:**
    *   `total_cases`: ยอดรวมคิวรอผ่าตัดทั้งหมด
    *   `general_surgery`: แผนกศัลยกรรมทั่วไป
    *   `ortho_surgery`: แผนกศัลยกรรมกระดูกและข้อ
    *   `eyeSurgery / eye_surgery`: แผนกจักษุวิทยา
    *   `obgyn_surgery`: แผนกสูติ-นรีเวช
    *   `urgency_high`: เคสระดับฉุกเฉิน (Emergency)
    *   `urgency_med`: เคสระดับเร่งด่วน (Urgency)
    *   `urgency_low`: เคสนัดหมายตามรอบปกติ (Elective)
    *   `urgency_level_desc`: ข้อความจำแนกระดับความเร่งด่วน

*   **ตัวอย่าง Response (200 OK):**
    ```json
    {
      "success": true,
      "hospital_code": "11078",
      "hospital_name": "โรงพยาบาลกมลาไสย",
      "hospital_short_name": "กมลาไสย",
      "timestamp": "2026-10-18T12:00:00.000Z",
      "data": {
        "total_cases": 24,
        "general_surgery": 10,
        "ortho_surgery": 8,
        "eye_surgery": 4,
        "obgyn_surgery": 2,
        "urgency_high": 3,
        "urgency_med": 7,
        "urgency_low": 14,
        "urgency_level_desc": "ฉุกเฉิน (Emergency): 3, เร่งด่วน (Urgency): 7, รอตามนัด (Elective): 14",
        "last_sync_at": "2026-10-18 11:50:00"
      }
    }
    ```

---

### 4.7 ภาพรวมโรงพยาบาลสำหรับผู้บริหาร (Executive Overview)
สรุปสถิติสำคัญในหน้าเดียว สำหรับจอแสดงผลผู้บริหารหรือ Monitor กลาง

*   **Endpoint:** `GET /api/opoh/overview`
*   **Headers:** `Authorization: Bearer <API_KEY>`
*   **ตัวอย่าง Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "hospital_code": "11078",
        "hospital_name": "โรงพยาบาลกมลาไสย",
        "timestamp": "2026-10-18T12:00:00.000Z",
        "last_sync_at": "2026-10-18T11:58:30.000Z",
        "summary": {
          "total_beds": 90,
          "available_beds": 25,
          "total_icu": 8,
          "available_icu": 2,
          "or_cases_today": 14,
          "or_waiting": 3,
          "lr_cases_today": 8
        }
      }
    }
    ```

---

### 4.8 สั่งรันการส่งข้อมูล (Manual Sync Trigger)
คำสั่งให้ระบบ OPOH ทำการประมวลผลข้อมูลล่าสุดและส่งขึ้นสู่ระบบศูนย์กลาง สสจ. ทันทีโดยไม่ต้องรอรอบเวลาอัตโนมัติ

*   **Endpoint:** `POST /api/sync/opoh/trigger`
*   **Headers:**
    *   `Authorization: Bearer <API_KEY>`
    *   `Content-Type: application/json`
*   **ตัวอย่าง Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "ส่งข้อมูลสำเร็จครบทั้ง 4 ส่วนงาน (ใช้เวลา 1450 ms)",
      "results": {
        "beds": { "success": true, "status": 200, "durationMs": 350 },
        "lr": { "success": true, "status": 200, "durationMs": 310 },
        "or": { "success": true, "status": 200, "durationMs": 320 },
        "surgical_queue": { "success": true, "status": 200, "durationMs": 470 }
      },
      "durationMs": 1450
    }
    ```

---

### 4.9 ตรวจสอบและจัดการประวัติการส่งข้อมูล (Sync Logs & Config)

#### A. ดึงข้อมูลการตั้งค่าระบบซิงค์ (Get Sync Configuration)
*   **Endpoint:** `GET /api/sync/opoh/config`
*   **Response:**
    ```json
    {
      "success": true,
      "config": {
        "id": 1,
        "is_auto_sync": true,
        "interval_minutes": 3,
        "base_url": "https://appksn.moph.go.th/opoh/api/v1",
        "last_sync_at": "2026-10-18T11:58:30.000Z",
        "last_sync_status": "สำเร็จ",
        "last_sync_message": "ส่งข้อมูลสำเร็จครบทั้ง 4 ส่วนงาน (ใช้เวลา 1450 ms)",
        "is_running": false,
        "next_sync_time": "2026-10-18T12:01:30.000Z",
        "rate_limited_until": null
      },
      "minIntervalMinutes": 0.25
    }
    ```

#### B. ดูประวัติการส่งข้อมูลย้อนหลัง (Get Audit Logs)
*   **Endpoint:** `GET /api/sync/opoh/logs?limit=50`
*   **Query Parameters:** `limit` (Default: 50, Max: 100)
*   **Response:**
    ```json
    {
      "success": true,
      "count": 4,
      "logs": [
        {
          "id": 1024,
          "sync_type": "AUTO",
          "endpoint": "/sync/beds",
          "status_code": 200,
          "is_success": true,
          "records_count": 5,
          "response_data": "{\"status\":\"ok\"}",
          "error_message": null,
          "duration_ms": 320,
          "created_at": "2026-10-18T11:58:30.000Z"
        }
      ]
    }
    ```

#### C. ล้างประวัติ Logs (Delete Logs - สิทธิ์ Admin เท่านั้น)
*   **Endpoint:** `DELETE /api/sync/opoh/logs?mode=truncate`
*   **Query Parameters:** `mode=truncate` | `mode=older_7_days` | `mode=older_30_days`

---

## 🚀 5. หมวดที่ 2: Outbound Central Sync APIs

ข้อมูลโครงสร้าง JSON Payload ที่ระบบ OPOH ของโรงพยาบาลสร้างขึ้นและส่งไปยังศูนย์กลางข้อมูล สสจ. กาฬสินธุ์ (`https://appksn.moph.go.th/opoh/api/v1`)

```
Target URL: https://appksn.moph.go.th/opoh/api/v1
Authentication Header: OPOH-Auth-Key: <CENTRAL_API_KEY>
HTTP Method: POST
Content-Type: application/json
```

### 5.1 ส่งข้อมูลเตียง (Endpoint: `/sync/beds`)
```json
{
  "hospitalCode": "11078",
  "updatedAt": "2026-10-18T12:00:00+07:00",
  "wards": [
    {
      "wardCode": "01",
      "wardName": "หอผู้ป่วยอายุรกรรมหญิง",
      "totalBed": 30,
      "actualBed": 30,
      "occupiedBed": 28,
      "availableBed": 2,
      "occupancyRate": 93.33,
      "exportCode": "W01"
    },
    {
      "wardCode": "09",
      "wardName": "หอผู้ป่วยวิกฤต (ICU)",
      "totalBed": 8,
      "actualBed": 8,
      "occupiedBed": 6,
      "availableBed": 2,
      "occupancyRate": 75.0,
      "exportCode": "ICU01"
    }
  ]
}
```

### 5.2 ส่งข้อมูลห้องผ่าตัด (Endpoint: `/sync/or`)
```json
{
  "hospitalCode": "11078",
  "hospitalName": "โรงพยาบาลกมลาไสย",
  "roomAvailableStr": "2/4",
  "operatingCount": 2,
  "waitingCount": 3,
  "completedCount": 8,
  "cancelledCount": 1,
  "totalCaseToday": 14
}
```

### 5.3 ส่งข้อมูลห้องคลอด (Endpoint: `/sync/lr`)
```json
{
  "hospitalCode": "11078",
  "hospitalName": "โรงพยาบาลกมลาไสย",
  "waitingLabor": 2,
  "normalDelivery": 5,
  "cesareanDelivery": 1,
  "abortion": 0,
  "notDelivery": 0,
  "totalCase": 8
}
```

### 5.4 ส่งข้อมูลคิวรอผ่าตัด (Endpoint: `/sync/surgical-queue`)
```json
{
  "hospitalCode": "11078",
  "hospitalName": "โรงพยาบาลกมลาไสย",
  "totalCases": 24,
  "generalSurgery": 10,
  "orthoSurgery": 8,
  "eyeSurgery": 4,
  "obgynSurgery": 2,
  "urgencyLevelDesc": "ฉุกเฉิน (Emergency): 3, เร่งด่วน (Urgency): 7, รอตามนัด (Elective): 14"
}
```

---

## 🛡️ 6. กลไกความเสถียรและความปลอดภัยระดับ Enterprise

ระบบ OPOH มาพร้อมสถาปัตยกรรมป้องกันข้อผิดพลาดอัตโนมัติ (Resilience & Self-Healing Architecture):

1. **Circuit Breaker ป้องกันการแบน IP (HTTP 429 Protection):**
   * หากเซิร์ฟเวอร์ศูนย์กลางตอบกลับมาด้วยรหัส `HTTP 429 Too Many Requests`
   * ระบบจะเปิด **Circuit Breaker** หยุดพักการส่งข้อมูลขึ้นศูนย์กลางอัตโนมัติเป็นเวลา **15 นาที (Cooldown Period)** ทันที เพื่อป้องกันการระงับสิทธิ์การเข้าถึงของโรงพยาบาล
2. **Throttle Guard (เว้นระยะห่างการส่งข้อมูล):**
   * ป้องกันการยิงคำสั่งส่งข้อมูลอัตโนมัติถี่เกินไป โดยมีการควบคุมระยะห่างอย่างน้อย **45 วินาที** ระหว่างรอบการส่งอัตโนมัติ
3. **Staggered Dispatching (กระจายโหลดการส่งข้อมูล):**
   * ขณะส่งข้อมูล 4 ส่วนงาน ระบบจะทำการเว้นระยะห่าง 300ms ระหว่างแต่ละ Request เพื่อป้องกันการเกิด Spike Connection ไปยังเซิร์ฟเวอร์กลาง
4. **Mutex Concurrency Guard:**
   * ล็อคไม่ให้กระบวนการส่งข้อมูลทำงานทับซ้อนกัน (Overlap) หากรอบก่อนหน้ายังส่งไม่เสร็จสิ้น
5. **Orphaned Process / Zombie Timers Cleanup:**
   * สแกนและทำความสะอาดตัวนับเวลา (Background Timers) ที่ตกค้างในหน่วยความจำของ Node.js โดยอัตโนมัติทุกครั้งที่เริ่มต้นระบบ

---

## 💻 7. ตัวอย่างโค้ดการเชื่อมต่อ (Implementation Examples)

### 7.1 ตัวอย่างการเรียกด้วย cURL (Command Line)
```bash
# ดึงสถานะเตียงทั้งหมด
curl -X GET "http://192.168.1.100:3000/api/opoh/beds" \
     -H "Authorization: Bearer opoh_secret_token_kalasin_2026" \
     -H "Content-Type: application/json"

# สั่งกระตุ้นการซิงค์ข้อมูลขึ้นเซิร์ฟเวอร์กลางทันที
curl -X POST "http://192.168.1.100:3000/api/sync/opoh/trigger" \
     -H "Authorization: Bearer opoh_secret_token_kalasin_2026"
```

---

### 7.2 ตัวอย่างการเรียกด้วย JavaScript (Node.js / Axios)
```javascript
const axios = require('axios');

const API_BASE_URL = 'http://192.168.1.100:3000';
const API_KEY = 'opoh_secret_token_kalasin_2026';

async function fetchHospitalBeds() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/opoh/beds`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 วินาที Timeout
    });

    if (response.data.success) {
      console.log('ยอดเตียงเปิดจริง:', response.data.summary.total_active_beds);
      console.log('ยอดเตียงครอง:', response.data.summary.total_occupied);
      console.log('ยอดเตียงว่าง:', response.data.summary.total_available);
    }
  } catch (error) {
    if (error.response) {
      console.error(`HTTP Error: ${error.response.status}`, error.response.data);
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

fetchHospitalBeds();
```

---

### 7.3 ตัวอย่างการเรียกด้วย Python 3 (Requests)
```python
import requests

API_BASE_URL = "http://192.168.1.100:3000"
API_KEY = "opoh_secret_token_kalasin_2026"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

try:
    response = requests.get(f"{API_BASE_URL}/api/opoh/icu", headers=headers, timeout=10)
    response.raise_for_status()
    result = response.json()
    
    if result.get("success"):
        summary = result["summary"]
        print(f"🏥 ICU Beds: เปิด {summary['total_active_beds']} | ครอง {summary['total_occupied']} | ว่าง {summary['total_available']}")
        print(f"📊 อัตราการครองเตียง ICU: {summary['overall_occupancy_rate']}%")

except requests.exceptions.HTTPError as err:
    print(f"HTTP Error: {err}")
except Exception as e:
    print(f"Error: {e}")
```

---

### 7.4 ตัวอย่างการเรียกด้วย PHP (cURL Native)
```php
<?php
$baseUrl = 'http://192.168.1.100:3000';
$apiKey = 'opoh_secret_token_kalasin_2026';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "{$baseUrl}/api/opoh/or");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer {$apiKey}",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo 'Curl error: ' . curl_error($ch);
} else {
    $data = json_decode($response, true);
    if ($httpCode === 200 && $data['success']) {
        echo "สถานะห้องผ่าตัด: " . $data['data']['room_available'] . "\n";
        echo "กำลังผ่าตัด: " . $data['data']['operating'] . " ห้อง\n";
    } else {
        echo "API Error [{$httpCode}]: " . ($data['message'] ?? 'Unknown error');
    }
}
curl_close($ch);
?>
```

---

## ⛔ 8. การจัดการข้อผิดพลาดและ HTTP Status Codes

ระบบ OPOH สื่อสารผลลัพธ์ผ่านรหัสมาตรฐาน HTTP Status Codes ดังต่อไปนี้:

| Status Code | ข้อความมาตรฐาน | สาเหตุที่เป็นไปได้ | แนวทางแก้ไข |
| :---: | :--- | :--- | :--- |
| **`200 OK`** | Success | ประมวลผลและส่งข้อมูลสำเร็จ | ใช้งานข้อมูลใน Response Body ตามปกติ |
| **`400 Bad Request`** | Invalid Request | รูปแบบ JSON ผิด, ขาด Field สำคัญ หรือยังไม่ได้ตั้งค่า Hospital Code | ตรวจสอบข้อมูลใน Request Body หรือเข้าไปตั้งค่ารหัสโรงพยาบาลในระบบ |
| **`401 Unauthorized`** | Missing or Invalid Key | ลืมแนบ Header `Authorization: Bearer <API_KEY>` หรือรหัสผิด | ตรวจสอบค่า API_KEY ในไฟล์ `.env` ให้ตรงกับที่ส่งมาใน Header |
| **`403 Forbidden`** | Access Denied | ผู้ใช้ไม่มีสิทธิ์ใน Endpoint ดังกล่าว (เช่น ล้าง Logs โดยไม่ใช่ Admin) | ตรวจสอบสิทธิ์การเข้าถึงของผู้ใช้งาน |
| **`404 Not Found`** | Not Found | URL Endpoint ไม่ถูกต้อง หรือไม่มีข้อมูลในระบบ | ตรวจสอบความถูกต้องของเส้นทาง URI |
| **`429 Too Many Requests`** | Rate Limited | มีการยิงคำสั่งถี่เกินกำหนด | ลดความถี่ในการยิง และรอระบบคลาย Cooldown |
| **`500 Internal Error`** | Server Error | ข้อผิดพลาดในการเชื่อมต่อ Local Database | ตรวจสอบสถานะ MySQL / MariaDB ในเครื่องแม่ข่าย |
| **`503 Unavailable`** | Service Unavailable | ระบบยังไม่ได้กำหนดค่า `API_KEY` ในไฟล์ `.env` | กำหนดค่า `API_KEY` ในไฟล์ `.env` แล้วรีสตาร์ทระบบ |

### รูปแบบ Error Response Body มาตรฐาน:
```json
{
  "success": false,
  "message": "Unauthorized. Invalid or missing API Key."
}
```

---

> 💡 **ต้องการความช่วยเหลือเพิ่มเติม?**  
> สามารถเข้าไปตรวจสอบสถานะการทำงาน การเชื่อมต่อฐานข้อมูล และประวัติการส่งข้อมูลแบบ Real-time ได้ที่หน้าจอ **ระบบส่งข้อมูล OPOH (Sync Management)** บนหน้าเว็บ OPOH ประจำโรงพยาบาล (`/dashboard/sync-opoh`)
