import type { Metadata } from "next";
import { Anuphan } from "next/font/google";
import { AdminLayout } from "@/components/layout/admin-layout";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import "./globals.css";

const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  variable: "--font-sans",
  preload: false,
});

export const metadata: Metadata = {
  title: `OPOH ${process.env.NEXT_PUBLIC_HOSPITAL_NAME || "Kalasin"} | One Province One Hospital Dashboards`,
  description: "ระบบ One Province One Hospital Dashboards จังหวัดกาฬสินธุ์ โดยสำนักงานสาธารณสุขจังหวัดกาฬสินธุ์",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const user = await decrypt(session);

  return (
    <html lang="th" className={`${anuphan.variable} antialiased light`}>
      <body className="font-sans min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <AdminLayout user={user}>
          {children}
        </AdminLayout>
      </body>
    </html>
  );
}
