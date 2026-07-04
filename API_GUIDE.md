# 🏥 คู่มือการเชื่อมต่อข้อมูล OPOH API (สำหรับโรงพยาบาลเครือข่าย)

เอกสารนี้จัดทำขึ้นเพื่อใช้เป็นคู่มือสำหรับนักพัฒนาซอฟต์แวร์ของโรงพยาบาลต่างๆ ในการพัฒนาระบบเพื่อเชื่อมต่อและส่งข้อมูลเข้าสู่ **ระบบศูนย์กลางข้อมูล OPOH (OPOH API)** ซึ่งได้รับการออกแบบมาให้มีมาตรฐานความปลอดภัยสูง (Enterprise Security) และรองรับการเชื่อมต่อได้อย่างง่ายดาย

---

## 🔒 1. มาตรฐานความปลอดภัยและการยืนยันตัวตน (Authentication)

ระบบ OPOH API บังคับใช้การยืนยันตัวตนผ่าน **API Key** สำหรับทุกการร้องขอ (Request) เพื่อป้องกันผู้ไม่หวังดีและการส่งข้อมูลขยะ

*   **Header ที่จำเป็น:** `OPOH-Auth-Key`
*   **คำอธิบาย:** โรงพยาบาลจะได้รับ API Key จาก สสจ. (ตัวอย่างเช่น: `sk_live_hosp11078_abcdef`) นักพัฒนาต้องแนบค่านี้มาใน Header ของ HTTP Request ทุกครั้ง

> **คำเตือน:** ห้ามเปิดเผย API Key ไว้ในฝั่ง Client (เช่น หน้าเว็บ Javascript หรือแอปพลิเคชันฝั่งผู้ใช้) การเรียก API ควรทำผ่านระบบ Server (Backend) ของโรงพยาบาลเท่านั้น

---

## 🌐 2. ข้อมูลการเชื่อมต่อพื้นฐาน

*   **Base URL (Production):** `https://api.yourdomain.com/v1` *(ทาง สสจ. จะเป็นผู้แจ้ง URL จริงให้ทราบอีกครั้ง)*
*   **Base URL (Development/Local):** `http://localhost:466/api/v1`
*   **Content-Type:** `application/json` (ต้องส่งข้อมูลมาในรูปแบบ JSON เท่านั้น)
*   **HTTP Method:** `POST`

---

## 📝 3. โครงสร้างข้อมูล (Data Sets & Endpoints)

ระบบรองรับการรับข้อมูล 4 ระบบหลัก โรงพยาบาลสามารถส่งข้อมูลอัปเดต (Sync) มาได้ตลอดเวลา (หากข้อมูลเดิมมีอยู่แล้ว ระบบจะทำการอัปเดต, หากไม่มีจะทำการเพิ่มใหม่)

### 3.1 ระบบคิวผ่าตัด (Surgical Queue)
> **Endpoint:** `POST /sync/surgical-queue`

| ฟิลด์ (Field) | ชนิดข้อมูล (Type) | จำเป็น (Required) | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `hospitalCode` | String | ✅ **ใช่** | รหัสโรงพยาบาล 5 หลัก (เช่น "11078") |
| `hospitalName` | String | ✅ **ใช่** | ชื่อโรงพยาบาล (เช่น "โรงพยาบาลกมลาไสย") |
| `totalCases` | Integer | ❌ ไม่ | จำนวนผู้ป่วยรอผ่าตัดรวม (ห้ามติดลบ) |
| `generalSurgery` | Integer | ❌ ไม่ | คิวศัลยกรรมทั่วไป |
| `orthoSurgery` | Integer | ❌ ไม่ | คิวศัลยกรรมกระดูกและข้อ |
| `eyeSurgery` | Integer | ❌ ไม่ | คิวจักษุ |
| `obgynSurgery` | Integer | ❌ ไม่ | คิวสูตินรีเวช |
| `urgencyLevelDesc`| String | ❌ ไม่ | ระดับความฉุกเฉิน:<br>- "ฉุกเฉิน (Emergency)"<br>- "เร่งด่วน (Urgency)"<br>- "รอตามนัด (Elective)" |

**ตัวอย่าง JSON Payload:**
```json
{
  "hospitalCode": "11078",
  "hospitalName": "โรงพยาบาลกมลาไสย",
  "totalCases": 12,
  "generalSurgery": 6,
  "orthoSurgery": 2,
  "eyeSurgery": 1,
  "obgynSurgery": 5,
  "urgencyLevelDesc": "ฉุกเฉิน (Emergency) 2, เร่งด่วน (Urgency) 4, รอตามนัด (Elective) 6"
}
```

### 3.2 ระบบการจัดการเตียง (Bed Management)
> **Endpoint:** `POST /sync/beds`

| ฟิลด์ (Field) | ชนิดข้อมูล (Type) | จำเป็น (Required) | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `wardCode` | String | ✅ **ใช่** | รหัสวอร์ด / หอผู้ป่วย (ข้อมูลจะอิงตามรหัสนี้) |
| `wardName` | String | ✅ **ใช่** | ชื่อวอร์ด |
| `totalBed` | Integer | ❌ ไม่ | จำนวนเตียงทั้งหมด |
| `actualBed` | Integer | ❌ ไม่ | จำนวนเตียงที่เปิดให้บริการจริง |
| `occupiedBed` | Integer | ❌ ไม่ | จำนวนเตียงที่มีผู้ป่วยครอง |
| `availableBed` | Integer | ❌ ไม่ | จำนวนเตียงว่าง |
| `occupancyRate`| Decimal | ❌ ไม่ | อัตราการครองเตียง (%) ตั้งแต่ 0 - 100 |
| `exportCode` | String | ❌ ไม่ | รหัสสำหรับส่งออกข้อมูล (ถ้ามี) |

**ตัวอย่าง JSON Payload:**
```json
{
  "wardCode": "W001",
  "wardName": "Ward หญิง 1",
  "totalBed": 30,
  "actualBed": 30,
  "occupiedBed": 25,
  "availableBed": 5,
  "occupancyRate": 83.33,
  "exportCode": "EXP001"
}
```

### 3.3 ระบบห้องคลอด (Labor Room Management)
> **Endpoint:** `POST /sync/lr`

| ฟิลด์ (Field) | ชนิดข้อมูล (Type) | จำเป็น (Required) | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `hospitalCode` | String | ✅ **ใช่** | รหัสโรงพยาบาล 5 หลัก (เช่น "11078") |
| `hospitalName` | String | ❌ ไม่ | ชื่อโรงพยาบาล (เช่น "โรงพยาบาลกมลาไสย") |
| `waitingLabor` | Integer | ❌ ไม่ | จำนวนรอคลอด |
| `normalDelivery`| Integer | ❌ ไม่ | จำนวนคลอดปกติ |
| `cesareanDelivery`| Integer| ❌ ไม่ | จำนวนผ่าคลอด |
| `abortion` | Integer | ❌ ไม่ | จำนวนแท้ง |
| `notDelivery` | Integer | ❌ ไม่ | จำนวนยังไม่คลอด |
| `totalCase` | Integer | ❌ ไม่ | จำนวนรวมทั้งหมด |

**ตัวอย่าง JSON Payload:**
```json
{
  "hospitalCode": "11078",
  "hospitalName": "โรงพยาบาลกมลาไสย",
  "waitingLabor": 5,
  "normalDelivery": 10,
  "cesareanDelivery": 2,
  "abortion": 1,
  "notDelivery": 0,
  "totalCase": 18
}
```

### 3.4 ระบบห้องผ่าตัด (OR Management)
> **Endpoint:** `POST /sync/or`

| ฟิลด์ (Field) | ชนิดข้อมูล (Type) | จำเป็น (Required) | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `hospitalCode` | String | ✅ **ใช่** | รหัสโรงพยาบาล 5 หลัก (เช่น "11078") |
| `hospitalName` | String | ✅ **ใช่** | ชื่อโรงพยาบาล (เช่น "โรงพยาบาลกมลาไสย") |
| `roomAvailableStr`| String | ❌ ไม่ | จำนวนห้องที่ว่าง (เช่น "3/5") |
| `operatingCount`| Integer | ❌ ไม่ | จำนวนห้องที่กำลังผ่าตัด |
| `waitingCount` | Integer | ❌ ไม่ | จำนวนรอผ่าตัด |
| `completedCount`| Integer | ❌ ไม่ | จำนวนผ่าตัดเสร็จแล้ว |
| `cancelledCount`| Integer | ❌ ไม่ | จำนวนยกเลิก |
| `totalCaseToday`| Integer | ❌ ไม่ | เคสทั้งหมดของวันนี้ |

**ตัวอย่าง JSON Payload:**
```json
{
  "hospitalCode": "11078",
  "hospitalName": "โรงพยาบาลกมลาไสย",
  "roomAvailableStr": "3/5",
  "operatingCount": 2,
  "waitingCount": 3,
  "completedCount": 5,
  "cancelledCount": 1,
  "totalCaseToday": 11
}
```

---

## 💻 4. ตัวอย่างการเขียนโค้ด (Code Examples)

### ตัวอย่าง: การใช้ cURL
```bash
curl -X POST "https://api.yourdomain.com/v1/sync/surgical-queue" \
     -H "Content-Type: application/json" \
     -H "OPOH-Auth-Key: YOUR_API_KEY_HERE" \
     -d '{
           "hospitalCode": "11078",
           "hospitalName": "โรงพยาบาลกมลาไสย",
           "totalCases": 12,
           "generalSurgery": 6,
           "orthoSurgery": 2,
           "eyeSurgery": 1,
           "obgynSurgery": 5,
           "urgencyLevelDesc": "ฉุกเฉิน (Emergency) 2, เร่งด่วน (Urgency) 4, รอตามนัด (Elective) 6"
         }'
```

### ตัวอย่าง: การใช้ JavaScript (Node.js / Axios)
```javascript
const axios = require('axios');

async function syncData() {
  try {
    const response = await axios.post('https://api.yourdomain.com/v1/sync/surgical-queue', {
      hospitalCode: "11078",
      hospitalName: "โรงพยาบาลกมลาไสย",
      totalCases: 12,
      generalSurgery: 6,
      urgencyLevelDesc: "ฉุกเฉิน (Emergency) 2, เร่งด่วน (Urgency) 4, รอตามนัด (Elective) 6"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'OPOH-Auth-Key': 'YOUR_API_KEY_HERE'
      }
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}
```

---

## ⛔ 5. การจัดการข้อผิดพลาด (Error Handling)

ระบบมีกลไกคัดกรองข้อมูล (Validation) หากข้อมูลไม่ตรงตาม Format หรือรหัส API Key ไม่ถูกต้อง ระบบจะตีกลับพร้อม HTTP Status ดังนี้:

*   **`200 OK`**: บันทึกข้อมูลสำเร็จ
*   **`400 Bad Request`**: ข้อมูล JSON ผิดรูปแบบ, ส่งข้อมูลที่เป็น String แทนที่จะเป็น Integer, หรือลืมส่งฟิลด์ที่ **จำเป็น (Required)**
*   **`401 Unauthorized`**: ลืมแนบ `OPOH-Auth-Key` ใน Header
*   **`403 Forbidden`**: `OPOH-Auth-Key` ไม่ถูกต้อง หรือถูกระงับการใช้งาน
*   **`429 Too Many Requests`**: โรงพยาบาลส่งข้อมูลรัวเกินลิมิต (ระบบตั้งไว้ที่ 100 ครั้งต่อ 15 นาที เพื่อป้องกันสแปม)
*   **`500 Internal Server Error`**: ข้อผิดพลาดฝั่งเซิร์ฟเวอร์

> **แนะนำ:** หากได้รับ Error `400 Bad Request` ใน Response Body จะมีข้อความระบุชัดเจนว่าฟิลด์ใดที่ส่งผิดพลาด (เช่น `"Expected number, received string"`) ให้นักพัฒนาแก้ไขชนิดข้อมูลฝั่งต้นทางให้ถูกต้อง
