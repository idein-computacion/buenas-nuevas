import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { getDb } from './firebase';
import { DbData, Verse, EventItem, Sermon, Podcast, Study, ContactMessage } from './db';

// Fallback initial data
const defaultData: DbData = {
  verse: {
    text: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.",
    reference: "Juan 3:16"
  },
  events: [
    {
      id: "event-1",
      title: "Retiro de Jóvenes 2026",
      date: "2026-08-14",
      time: "18:00 hs",
      description: "Un fin de semana especial de comunión, alabanza y búsqueda de Dios en Panambí. ¡Inscribite ya!",
      category: "Jóvenes"
    },
    {
      id: "event-2",
      title: "Campaña Solidaria de Invierno",
      date: "2026-07-25",
      time: "09:00 hs",
      description: "Recolección de ropa de abrigo y alimentos no perecederos para las familias del barrio Yerbal.",
      category: "Social"
    }
  ],
  sermons: [
    {
      id: "sermon-1",
      title: "Caminando en Fe en Tiempos de Incertidumbre",
      preacher: "Pastor Daniel Canclini",
      date: "2026-07-12",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "45 min"
    }
  ],
  podcasts: [
    {
      id: "podcast-1",
      title: "Reflexiones Diarias: La Paz de Dios",
      speaker: "Pastor Daniel Canclini",
      date: "2026-07-13",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      duration: "12 min"
    }
  ],
  studies: [
    {
      id: "study-1",
      title: "Introducción al Estudio de Romanos",
      author: "Pastor Daniel Canclini",
      date: "2026-07-10",
      content: "Este estudio bíblico de 4 partes nos introduce a los temas principales de la epístola a los Romanos."
    }
  ],
  gallery: [
    "https://images.unsplash.com/photo-1519406596751-0a3ccc4937fe?w=800&q=80",
    "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=800&q=80"
  ],
  messages: []
};

/**
 * READ ALL DATA FROM FIRESTORE DATABASE
 */
export async function getDbDataClient(): Promise<DbData> {
  try {
    const db = getDb();
    if (!db) return defaultData;

    // 1. Verse
    const verseRef = doc(db, 'settings', 'verse');
    const verseSnap = await getDoc(verseRef);
    const verse: Verse = verseSnap.exists() ? (verseSnap.data() as Verse) : defaultData.verse;

    // 2. Events
    const eventsSnap = await getDocs(collection(db, 'events'));
    const events: EventItem[] = eventsSnap.docs.map(d => d.data() as EventItem);

    // 3. Sermons
    const sermonsSnap = await getDocs(collection(db, 'sermons'));
    const sermons: Sermon[] = sermonsSnap.docs.map(d => d.data() as Sermon);

    // 4. Podcasts
    const podcastsSnap = await getDocs(collection(db, 'podcasts'));
    const podcasts: Podcast[] = podcastsSnap.docs.map(d => d.data() as Podcast);

    // 5. Studies
    const studiesSnap = await getDocs(collection(db, 'studies'));
    const studies: Study[] = studiesSnap.docs.map(d => d.data() as Study);

    // 6. Gallery
    const gallerySnap = await getDocs(collection(db, 'gallery'));
    const galleryDocs = gallerySnap.docs.map(d => d.data());
    galleryDocs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const gallery: string[] = galleryDocs.map(d => d.url || d.photoUrl);

    // 7. Messages
    const messagesSnap = await getDocs(collection(db, 'messages'));
    const messages: ContactMessage[] = messagesSnap.docs.map(d => d.data() as ContactMessage);
    messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Auto-seed if verse or collections don't exist yet
    if (!verseSnap.exists() && events.length === 0) {
      await seedFirestoreFromClient();
      return defaultData;
    }

    return {
      verse,
      events: events.length ? events : defaultData.events,
      sermons: sermons.length ? sermons : defaultData.sermons,
      podcasts: podcasts.length ? podcasts : defaultData.podcasts,
      studies: studies.length ? studies : defaultData.studies,
      gallery: gallery.length ? gallery : defaultData.gallery,
      messages
    };
  } catch (error) {
    console.warn('Error reading Firestore data, returning default data:', error);
    return defaultData;
  }
}

/**
 * AUTO SEED FIRESTORE FROM CLIENT IF EMPTY
 */
export async function seedFirestoreFromClient(): Promise<void> {
  try {
    const db = getDb();
    if (!db) return;

    await setDoc(doc(db, 'settings', 'verse'), defaultData.verse);
    for (const event of defaultData.events) {
      await setDoc(doc(db, 'events', event.id), event);
    }
    for (const sermon of defaultData.sermons) {
      await setDoc(doc(db, 'sermons', sermon.id), sermon);
    }
    for (const pod of defaultData.podcasts) {
      await setDoc(doc(db, 'podcasts', pod.id), pod);
    }
    for (const study of defaultData.studies) {
      await setDoc(doc(db, 'studies', study.id), study);
    }
    for (let i = 0; i < defaultData.gallery.length; i++) {
      await setDoc(doc(db, 'gallery', `photo-${i + 1}`), {
        id: `photo-${i + 1}`,
        url: defaultData.gallery[i],
        order: i
      });
    }
  } catch (err) {
    console.warn('Error seeding Firestore:', err);
  }
}

/**
 * UPDATE VERSE IN FIRESTORE
 */
export async function updateVerseClient(verse: Verse): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    await setDoc(doc(db, 'settings', 'verse'), verse);
    return true;
  } catch (error) {
    console.error('Error updating verse:', error);
    return false;
  }
}

/**
 * SAVE ITEM IN FIRESTORE
 */
export async function saveItemClient(type: 'events' | 'sermons' | 'podcasts' | 'studies', item: any): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    if (!item.id) {
      item.id = `${type.substring(0, type.length - 1)}-${Date.now()}`;
    }
    await setDoc(doc(db, type, item.id), item, { merge: true });
    return true;
  } catch (error) {
    console.error(`Error saving ${type} item:`, error);
    return false;
  }
}

/**
 * DELETE ITEM IN FIRESTORE
 */
export async function deleteItemClient(type: 'events' | 'sermons' | 'podcasts' | 'studies', id: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    await deleteDoc(doc(db, type, id));
    return true;
  } catch (error) {
    console.error(`Error deleting ${type} item:`, error);
    return false;
  }
}

/**
 * ADD GALLERY PHOTO URL IN FIRESTORE
 */
export async function addGalleryPhotoClient(url: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    const id = `photo-${Date.now()}`;
    await setDoc(doc(db, 'gallery', id), {
      id,
      url,
      order: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Error adding photo to gallery:', error);
    return false;
  }
}

/**
 * DELETE GALLERY PHOTO IN FIRESTORE
 */
export async function deleteGalleryPhotoClient(url: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    const gallerySnap = await getDocs(collection(db, 'gallery'));
    for (const d of gallerySnap.docs) {
      const data = d.data();
      if (data.url === url || data.photoUrl === url) {
        await deleteDoc(doc(db, 'gallery', d.id));
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    return false;
  }
}

/**
 * SUBMIT CONTACT MESSAGE IN FIRESTORE
 */
export async function submitMessageClient(name: string, phone: string, message: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    const id = `msg-${Date.now()}`;
    const newMessage: ContactMessage = {
      id,
      name,
      phone,
      message,
      date: new Date().toISOString(),
      read: false
    };
    await setDoc(doc(db, 'messages', id), newMessage);
    return true;
  } catch (error) {
    console.error('Error submitting message:', error);
    return false;
  }
}

/**
 * TOGGLE MESSAGE READ IN FIRESTORE
 */
export async function toggleMessageReadClient(id: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    const msgRef = doc(db, 'messages', id);
    const msgSnap = await getDoc(msgRef);
    if (msgSnap.exists()) {
      const currentRead = msgSnap.data().read ?? false;
      await updateDoc(msgRef, { read: !currentRead });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error toggling message read:', error);
    return false;
  }
}

/**
 * DELETE MESSAGE IN FIRESTORE
 */
export async function deleteMessageClient(id: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    await deleteDoc(doc(db, typeDoc(id) || 'messages', id));
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
}

function typeDoc(id: string) {
  return 'messages';
}
