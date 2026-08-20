import { getDbDataClient } from "@/lib/firestoreClient";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const db = await getDbDataClient();
  return <HomeClient initialData={db} />;
}
