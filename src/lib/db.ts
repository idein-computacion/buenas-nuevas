import fs from 'fs';
import path from 'path';

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
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  date: string;
  read: boolean;
}

export interface DbData {
  verse: Verse;
  events: EventItem[];
  sermons: Sermon[];
  podcasts: Podcast[];
  studies: Study[];
  gallery: string[];
  messages?: ContactMessage[];
}

const dbPath = path.join(process.cwd(), 'src/data/db.json');

// Ensure parent directory exists
function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

export function readDb(): DbData {
  try {
    ensureDirectoryExistence(dbPath);
    if (!fs.existsSync(dbPath)) {
      const initialData: DbData = {
        verse: { text: "Escribe tu versículo aquí", reference: "Referencia" },
        events: [],
        sermons: [],
        podcasts: [],
        studies: [],
        gallery: [],
        messages: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(data) as DbData;
    if (!parsed.messages) {
      parsed.messages = [];
    }
    return parsed;
  } catch (error) {
    console.error('Error reading local JSON database:', error);
    return {
      verse: { text: "Error de lectura", reference: "" },
      events: [],
      sermons: [],
      podcasts: [],
      studies: [],
      gallery: [],
      messages: []
    };
  }
}

export function writeDb(data: DbData): boolean {
  try {
    ensureDirectoryExistence(dbPath);
    if (!data.messages) {
      data.messages = [];
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing to local JSON database:', error);
    return false;
  }
}

// DB Helpers
export function getVerse(): Verse {
  return readDb().verse;
}

export function updateVerse(verse: Verse): boolean {
  const db = readDb();
  db.verse = verse;
  return writeDb(db);
}

// Generic CRUD operations
export function saveDbItem(type: 'events' | 'sermons' | 'podcasts' | 'studies', item: any): boolean {
  const db = readDb();
  const list = db[type] as any[];
  
  if (item.id) {
    // Edit existing
    const idx = list.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
  } else {
    // Create new
    item.id = `${type.substring(0, type.length - 1)}-${Date.now()}`;
    list.push(item);
  }
  
  return writeDb(db);
}

export function deleteDbItem(type: 'events' | 'sermons' | 'podcasts' | 'studies', id: string): boolean {
  const db = readDb();
  const list = db[type] as any[];
  const newList = list.filter(item => item.id !== id);
  (db as any)[type] = newList;
  return writeDb(db);
}

export function addGalleryPhoto(urlOrFilename: string): boolean {
  const db = readDb();
  if (!db.gallery.includes(urlOrFilename)) {
    db.gallery.push(urlOrFilename);
  }
  return writeDb(db);
}

export function deleteGalleryPhoto(urlOrFilename: string): boolean {
  const db = readDb();
  db.gallery = db.gallery.filter(p => p !== urlOrFilename);
  return writeDb(db);
}

// Message Helpers
export function saveMessage(name: string, phone: string, message: string): boolean {
  const db = readDb();
  if (!db.messages) {
    db.messages = [];
  }
  const newMessage: ContactMessage = {
    id: `msg-${Date.now()}`,
    name,
    phone,
    message,
    date: new Date().toISOString(),
    read: false
  };
  db.messages.push(newMessage);
  return writeDb(db);
}

export function deleteMessage(id: string): boolean {
  const db = readDb();
  if (!db.messages) return false;
  db.messages = db.messages.filter(m => m.id !== id);
  return writeDb(db);
}

export function toggleMessageRead(id: string): boolean {
  const db = readDb();
  if (!db.messages) return false;
  const msg = db.messages.find(m => m.id === id);
  if (msg) {
    msg.read = !msg.read;
  }
  return writeDb(db);
}
