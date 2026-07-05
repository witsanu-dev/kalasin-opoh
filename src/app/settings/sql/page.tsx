import { SqlEditorDashboard } from "@/components/sql-editor-dashboard";

export const metadata = {
  title: "ตั้งค่าคำสั่ง SQL | OPOH",
  description: "ตั้งค่าและแก้ไขคำสั่ง SQL สำหรับดึงข้อมูลจากฐานข้อมูล HIS",
};

export default function SqlEditorPage() {
  return <SqlEditorDashboard />;
}
