import { SurgicalQueueDashboard } from "@/components/surgical_queue-dashboard";

export const metadata = {
  title: 'ระบบจัดการคิวผ่าตัด - OPOH',
  description: 'ระบบจัดการคิวผ่าตัด - Surgical Queue',
};

export default function SurgicalQueuePage() {
  return (
    <div className="p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <SurgicalQueueDashboard />
    </div>
  );
}
