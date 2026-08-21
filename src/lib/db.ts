import fs from 'fs';
import path from 'path';
import { adminDb, isFirebaseAdminConfigured } from './firebaseAdmin';

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

// Local JSON fallback helpers
function readLocalJsonDb(): DbData {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(data) as DbData;
      if (!parsed.messages) parsed.messages = [];
      return parsed;
    }
  } catch (error) {
    console.error('Error reading local JSON database:', error);
  }
  return {
    verse: { text: "Escribe tu versículo aquí", reference: "Referencia" },
    events: [],
    sermons: [],
    podcasts: [],
    studies: [],
    gallery: [],
    messages: []
  };
}

function writeLocalJsonDb(data: DbData): boolean {
  try {
    const dirname = path.dirname(dbPath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing to local JSON database:', error);
    return false;
  }
}

/**
 * Seed Firestore with initial JSON database if Firestore collections are empty.
 */
export async function seedFirestoreIfEmpty(): Promise<boolean> {
  if (!isFirebaseAdminConfigured) return false;
  try {
    const verseDoc = await adminDb.collection('settings').doc('verse').get();
    if (!verseDoc.exists) {
      const localData = readLocalJsonDb();
      
      // Seed Verse
      await adminDb.collection('settings').doc('verse').set(localData.verse);

      // Seed Events
      for (const item of localData.events) {
        await adminDb.collection('events').doc(item.id).set(item);
      }

      // Seed Sermons
      for (const item of localData.sermons) {
        await adminDb.collection('sermons').doc(item.id).set(item);
      }

      // Seed Podcasts
      for (const item of localData.podcasts) {
        await adminDb.collection('podcasts').doc(item.id).set(item);
      }

      // Seed Studies
      for (const item of localData.studies) {
        await adminDb.collection('studies').doc(item.id).set(item);
      }

      // Seed Gallery
      for (let i = 0; i < localData.gallery.length; i++) {
        const url = localData.gallery[i];
        const id = `photo-${i + 1}`;
        await adminDb.collection('gallery').doc(id).set({ id, url, order: i });
      }

      // Seed Messages
      if (localData.messages) {
        for (const msg of localData.messages) {
          await adminDb.collection('messages').doc(msg.id).set(msg);
        }
      }

      console.log('Firebase Firestore successfully seeded with initial db.json data!');
      return true;
    }
  } catch (error) {
    console.warn('Firestore seeding check skipped/failed:', error);
  }
  return false;
}

/**
 * READ ALL DATA (from Firestore with fallback to local JSON)
 */
export async function readDb(): Promise<DbData> {
  if (isFirebaseAdminConfigured) {
    try {
      // Check/seed empty DB
      await seedFirestoreIfEmpty();

      // Read Verse
      const verseDoc = await adminDb.collection('settings').doc('verse').get();
      const verse: Verse = verseDoc.exists 
        ? (verseDoc.data() as Verse) 
        : { text: "Escribe tu versículo aquí", reference: "Referencia" };

      // Read Events
      const eventsSnap = await adminDb.collection('events').get();
      const events: EventItem[] = eventsSnap.docs.map((doc: any) => doc.data() as EventItem);

      // Read Sermons
      const sermonsSnap = await adminDb.collection('sermons').get();
      const sermons: Sermon[] = sermonsSnap.docs.map((doc: any) => doc.data() as Sermon);

      // Read Podcasts
      const podcastsSnap = await adminDb.collection('podcasts').get();
      const podcasts: Podcast[] = podcastsSnap.docs.map((doc: any) => doc.data() as Podcast);

      // Read Studies
      const studiesSnap = await adminDb.collection('studies').get();
      const studies: Study[] = studiesSnap.docs.map((doc: any) => doc.data() as Study);

      // Read Gallery
      const gallerySnap = await adminDb.collection('gallery').get();
      const galleryDocs = gallerySnap.docs.map((doc: any) => doc.data());
      // Sort gallery by order if present
      galleryDocs.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      const gallery: string[] = galleryDocs.map((doc: any) => doc.url || doc.photoUrl);

      // Read Messages
      const messagesSnap = await adminDb.collection('messages').get();
      const messages: ContactMessage[] = messagesSnap.docs.map((doc: any) => doc.data() as ContactMessage);
      messages.sort((a: ContactMessage, b: ContactMessage) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        verse,
        events,
        sermons,
        podcasts,
        studies,
        gallery,
        messages
      };
    } catch (error) {
      console.error('Error fetching from Firestore, falling back to local JSON:', error);
    }
  }

  // Fallback to local JSON file
  return readLocalJsonDb();
}

/**
 * UPDATE VERSE
 */
export async function updateVerse(verse: Verse): Promise<boolean> {
  let success = false;
  if (isFirebaseAdminConfigured) {
    try {
      await adminDb.collection('settings').doc('verse').set(verse);
      success = true;
    } catch (error) {
      console.error('Error updating verse in Firestore:', error);
    }
  }

  // Synchronize local JSON as backup
  const localDb = readLocalJsonDb();
  localDb.verse = verse;
  writeLocalJsonDb(localDb);

  return isFirebaseAdminConfigured ? success : true;
}

/**
 * SAVE ITEM (Events, Sermons, Podcasts, Studies)
 */
export async function saveDbItem(type: 'events' | 'sermons' | 'podcasts' | 'studies', item: any): Promise<boolean> {
  if (!item.id) {
    item.id = `${type.substring(0, type.length - 1)}-${Date.now()}`;
  }

  let success = false;
  if (isFirebaseAdminConfigured) {
    try {
      await adminDb.collection(type).doc(item.id).set(item, { merge: true });
      success = true;
    } catch (error) {
      console.error(`Error saving ${type} item to Firestore:`, error);
    }
  }

  // Local JSON Backup
  const db = readLocalJsonDb();
  const list = db[type] as any[];
  const idx = list.findIndex(i => i.id === item.id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...item };
  } else {
    list.push(item);
  }
  writeLocalJsonDb(db);

  return isFirebaseAdminConfigured ? success : true;
}

/**
 * DELETE ITEM
 */
export async function deleteDbItem(type: 'events' | 'sermons' | 'podcasts' | 'studies', id: string): Promise<boolean> {
  let success = false;
  if (isFirebaseAdminConfigured) {
    try {
      await adminDb.collection(type).doc(id).delete();
      success = true;
    } catch (error) {
      console.error(`Error deleting ${type} item from Firestore:`, error);
    }
  }

  // Local JSON Backup
  const db = readLocalJsonDb();
  const list = db[type] as any[];
  (db as any)[type] = list.filter(item => item.id !== id);
  writeLocalJsonDb(db);

  return isFirebaseAdminConfigured ? success : true;
}

/**
 * ADD GALLERY PHOTO
 */
export async function addGalleryPhoto(urlOrFilename: string): Promise<boolean> {
  let success = false;
  if (isFirebaseAdminConfigured) {
    try {
      const docId = `photo-${Date.now()}`;
      await adminDb.collection('gallery').doc(docId).set({
        id: docId,
        url: urlOrFilename,
        order: Date.now()
      });
      success = true;
    } catch (error) {
      console.error('Error adding gallery photo to Firestore:', error);
    }
  }

  // Local JSON Backup
  const db = readLocalJsonDb();
  if (!db.gallery.includes(urlOrFilename)) {
    db.gallery.push(urlOrFilename);
  }
  writeLocalJsonDb(db);

  return isFirebaseAdminConfigured ? success : true;
}

/**
 * DELETE GALLERY PHOTO
 */
export async function deleteGalleryPhoto(urlOrFilename: string): Promise<boolean> {
  let success = false;
  if (isFirebaseAdminConfigured) {
    try {
      const gallerySnap = await adminDb.collection('gallery').get();
      const batch = adminDb.batch();
      gallerySnap.docs.forEach((doc: any) => {
        const data = doc.data();
        if (data.url === urlOrFilename || data.photoUrl === urlOrFilename) {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();
      success = true;
    } catch (error) {
      console.error('Error deleting gallery photo from Firestore:', error);
    }
  }

  // Local JSON Backup
  const db = readLocalJsonDb();
  db.gallery = db.gallery.filter(p => p !== urlOrFilename);
  writeLocalJsonDb(db);

  return isFirebaseAdminConfigured ? success : true;
}

/**
 * SAVE MESSAGE
 */
export async function saveMessage(name: string, phone: string, message: string): Promise<boolean> {
  const newMessage: ContactMessage = {
    id: `msg-${Date.now()}`,
    name,
    phone,
    message,
    date: new Date().toISOString(),
    read: false
  };

  let success = false;
  if (isFirebaseAdminConfigured) {
    try {
      await adminDb.collection('messages').doc(newMessage.id).set(newMessage);
      success = true;
    } catch (error) {
      console.error('Error saving contact message to Firestore:', error);
    }
  }

  // Local JSON Backup
  const db = readLocalJsonDb();
  if (!db.messages) db.messages = [];
  db.messages.push(newMessage);
  writeLocalJsonDb(db);

  return isFirebaseAdminConfigured ? success : true;
}

/**
 * DELETE MESSAGE
 */
export async function deleteMessage(id: string): Promise<boolean> {
  let success = false;
  if (isFirebaseAdminConfigured) {
    try {
      await adminDb.collection('messages').doc(id).delete();
      success = true;
    } catch (error) {
      console.error('Error deleting message from Firestore:', error);
    }
  }

  // Local JSON Backup
  const db = readLocalJsonDb();
  if (db.messages) {
    db.messages = db.messages.filter(m => m.id !== id);
    writeLocalJsonDb(db);
  }

  return isFirebaseAdminConfigured ? success : true;
}

/**
 * TOGGLE MESSAGE READ
 */
export async function toggleMessageRead(id: string): Promise<boolean> {
  let success = false;
  if (isFirebaseAdminConfigured) {
    try {
      const docRef = adminDb.collection('messages').doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        const currentRead = doc.data()?.read ?? false;
        await docRef.update({ read: !currentRead });
        success = true;
      }
    } catch (error) {
      console.error('Error toggling message read status in Firestore:', error);
    }
  }

  // Local JSON Backup
  const db = readLocalJsonDb();
  if (db.messages) {
    const msg = db.messages.find(m => m.id === id);
    if (msg) msg.read = !msg.read;
    writeLocalJsonDb(db);
  }

  return isFirebaseAdminConfigured ? success : true;
}
