import { readDb } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const db = await readDb();
  return <HomeClient initialData={db} />;
}
