import { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminConsole from "@/components/admin/AdminConsole";

interface AdminPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { slug } = await params;
  const configuredSlug = process.env.ADMIN_ROUTE_SLUG || "control-room";

  if (slug !== configuredSlug) {
    notFound();
  }

  return <AdminConsole />;
}
