import HomeClient from "@/components/HomeClient";
import { getCachedDbData } from "@/lib/apiClient";

export default function Home() {
  const db = getCachedDbData();
  return <HomeClient initialData={db} />;
}
