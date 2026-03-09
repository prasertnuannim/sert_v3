
export const dynamic = "force-dynamic";
import Navbar from "./navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="">
      {/* Sidebar */}
      {/* <Sidebar /> */}

      <div className="flex flex-col">
        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
