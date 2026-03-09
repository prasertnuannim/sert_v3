import Sidebar from "./sidebar";
import Navbar from "./navbar";
import AdminProviders from "./provider";
import { getAuthSession } from "@/services/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  const profile = session?.user
    ? {
        name: session.user.name ?? "User",
        email: session.user.email ?? null,
        role: session.user.role ?? null,
        image: null,
      }
    : null;

  return (
    <AdminProviders>
      <div className="flex h-screen">
        <Sidebar profile={profile} />
        <div className="flex flex-col flex-1">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </AdminProviders>
  );
}
