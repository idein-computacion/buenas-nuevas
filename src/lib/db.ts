// Define DB Types
export interface Verse {
  text: string;
  reference: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  category: string;
  imageUrl?: string;
}

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string;
  videoUrl: string;
  duration: string;
}

export interface Podcast {
  id: string;
  title: string;
  speaker: string;
  date: string;
  audioUrl: string;
  duration: string;
}

export interface Study {
  id: string;
  title: string;
  author: string;
  date: string;
  content: string;
  pdfUrl?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  date: string;
  read: boolean;
}

export interface LiveStream {
  active: boolean;
  title: string;
  streamUrl: string;
  description: string;
  scheduledTime?: string;
}

export interface ScheduleItem {
  id: string;
  dia: string;
  hora: string;
  titulo: string;
  desc: string;
}

export interface DbData {
  verse: Verse;
  schedules?: ScheduleItem[];
  events: EventItem[];
  sermons: Sermon[];
  podcasts: Podcast[];
  studies: Study[];
  gallery: string[];
  messages?: ContactMessage[];
  liveStream?: LiveStream;
}

import defaultDataJson from "@/data/db.json";
export const defaultDbData: DbData = defaultDataJson as unknown as DbData;
export const defaultSchedules: ScheduleItem[] = defaultDbData.schedules || [];

