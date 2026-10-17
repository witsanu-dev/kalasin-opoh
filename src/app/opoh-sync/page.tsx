import { OpohClient } from "./opoh-client";
import { getSession, isUserAdmin } from "@/lib/auth";

export default async function OpohSyncPage() {
  const session = await getSession();
  const isAdmin = isUserAdmin(session);

  return (
    <div className="container mx-auto py-6">
      <OpohClient currentUser={session} isAdmin={isAdmin} />
    </div>
  );
}
