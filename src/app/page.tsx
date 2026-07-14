import { readDb } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

// Force dynamic rendering to ensure fresh database content on load
export const dynamic = "force-dynamic";

export default async function Home() {
  const db = readDb();
  return <HomeClient initialData={db} />;
}
