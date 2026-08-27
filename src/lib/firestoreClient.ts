import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  onSnapshot 
} from 'firebase/firestore';
import { getDb } from './firebase';
import { DbData, Verse, EventItem, Sermon, Podcast, Study, ContactMessage, LiveStream } from './db';

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
    },
    {
      id: "event-3",
      title: "Almuerzo Familiar de Confraternidad",
      date: "2026-08-02",
      time: "12:30 hs",
      description: "Compartimos un almuerzo especial todos juntos. Traer cubiertos y algo para compartir en la sobremesa.",
      category: "Comunidad"
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
    },
    {
      id: "sermon-2",
      title: "El Poder de la Gracia Transformadora",
      preacher: "Pastora Marta Gómez",
      date: "2026-07-05",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "38 min"
    },
    {
      id: "sermon-3",
      title: "Restaurando la Familia en el Altar de Dios",
      preacher: "Pastor Daniel Canclini",
      date: "2026-06-28",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "50 min"
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
    },
    {
      id: "podcast-2",
      title: "Conversaciones de Fe: El Perdón",
      speaker: "Coordinador Lucas Silva",
      date: "2026-07-06",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      duration: "18 min"
    }
  ],
  studies: [
    {
      id: "study-1",
      title: "Introducción al Estudio de Romanos",
      author: "Pastor Daniel Canclini",
      date: "2026-07-10",
      content: "Este estudio bíblico de 4 partes nos introduce a los temas principales de la epístola a los Romanos: la justificación por fe, la gracia redentora y nuestra vida de obediencia. Es ideal para células y grupos pequeños."
    },
    {
      id: "study-2",
      title: "Los Nombres de Dios y su Significado",
      author: "Líder de Educación Bíblica",
      date: "2026-06-20",
      content: "Un análisis profundo de los nombres hebreos de Dios en el Antiguo Testamento (Yahweh, El Shaddai, Adonai) y cómo revelan su carácter y cuidado por su pueblo."
    }
  ],
  gallery: [
    "https://images.unsplash.com/photo-1519406596751-0a3ccc4937fe?w=800&q=80",
    "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=800&q=80",
    "https://images.unsplash.com/photo-1490122417551-6ee9691429d0?w=800&q=80",
    "/uploads/1784052791768-396436704-729451671_18326948689259853_1195708044839511382_n.jpg"
  ],
  messages: [
    {
      id: "msg-1784054465673",
      name: "Pedro",
      phone: "3754406435",
      message: "Pido oración por mi",
      date: "2026-07-14T18:41:05.673Z",
      read: false
    }
  ],
  liveStream: {
    active: false,
    title: "Culto de Adoración y Palabra en Vivo",
    streamUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    description: "Te damos la bienvenida a nuestra reunión dominical. ¡Alabemos y escuchemos la Palabra de Dios juntos desde cualquier lugar!",
    scheduledTime: "Domingos 09:30 hs"
  }
};

const CACHE_KEY = 'bn_db_cache';

/**
 * Obtener datos en caché de forma inmediata (0 ms)
 */
export function getCachedDbData(): DbData {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as DbData;
      }
    } catch {
      // Ignorar errores de parseo de caché
    }
  }
  return defaultData;
}

/**
 * Guardar datos en caché local
 */
function setCachedDbData(data: DbData) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignorar si el almacenamiento está lleno
    }
  }
}

/**
 * READ ALL DATA FROM FIRESTORE DATABASE (PARALLEL & TIMEOUT-PROTECTED)
 */
export async function getDbDataClient(): Promise<DbData> {
  const cachedFallback = getCachedDbData();

  try {
    const db = getDb();
    if (!db) return cachedFallback;

    // Timeout de 1.5 segundos para evitar demoras si la conexión a Firestore es lenta
    const fetchPromise = (async (): Promise<DbData> => {
      // Ejecutar consultas en paralelo simultáneamente
      const [
        verseSnap,
        eventsSnap,
        sermonsSnap,
        podcastsSnap,
        studiesSnap,
        gallerySnap,
        messagesSnap,
        liveStreamSnap
      ] = await Promise.all([
        getDoc(doc(db, 'settings', 'verse')).catch(() => null),
        getDocs(collection(db, 'events')).catch(() => null),
        getDocs(collection(db, 'sermons')).catch(() => null),
        getDocs(collection(db, 'podcasts')).catch(() => null),
        getDocs(collection(db, 'studies')).catch(() => null),
        getDocs(collection(db, 'gallery')).catch(() => null),
        getDocs(collection(db, 'messages')).catch(() => null),
        getDoc(doc(db, 'settings', 'livestream')).catch(() => null)
      ]);

      // 1. Verse
      const verse: Verse = (verseSnap && verseSnap.exists()) 
        ? (verseSnap.data() as Verse) 
        : cachedFallback.verse || defaultData.verse;

      // 2. Events
      const events: EventItem[] = (eventsSnap && !eventsSnap.empty)
        ? eventsSnap.docs.map(d => d.data() as EventItem)
        : cachedFallback.events || defaultData.events;

      // 3. Sermons
      const sermons: Sermon[] = (sermonsSnap && !sermonsSnap.empty)
        ? sermonsSnap.docs.map(d => d.data() as Sermon)
        : cachedFallback.sermons || defaultData.sermons;

      // 4. Podcasts
      const podcasts: Podcast[] = (podcastsSnap && !podcastsSnap.empty)
        ? podcastsSnap.docs.map(d => d.data() as Podcast)
        : cachedFallback.podcasts || defaultData.podcasts;

      // 5. Studies
      const studies: Study[] = (studiesSnap && !studiesSnap.empty)
        ? studiesSnap.docs.map(d => d.data() as Study)
        : cachedFallback.studies || defaultData.studies;

      // 6. Gallery
      let gallery: string[] = cachedFallback.gallery || defaultData.gallery;
      if (gallerySnap && !gallerySnap.empty) {
        const galleryDocs = gallerySnap.docs.map(d => d.data());
        galleryDocs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        gallery = galleryDocs.map(d => d.url || d.photoUrl).filter(Boolean);
      }

      // 7. Messages
      let messages: ContactMessage[] = cachedFallback.messages || defaultData.messages || [];
      if (messagesSnap && !messagesSnap.empty) {
        messages = messagesSnap.docs.map(d => d.data() as ContactMessage);
        messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      // 8. LiveStream
      const liveStream: LiveStream = (liveStreamSnap && liveStreamSnap.exists())
        ? (liveStreamSnap.data() as LiveStream)
        : cachedFallback.liveStream || defaultData.liveStream || {
            active: false,
            title: "Culto de Adoración y Palabra en Vivo",
            streamUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description: "Te damos la bienvenida a nuestra reunión dominical. ¡Alabemos y escuchemos la Palabra de Dios juntos desde cualquier lugar!",
            scheduledTime: "Domingos 09:30 hs"
          };

      const resultData: DbData = {
        verse,
        events,
        sermons,
        podcasts,
        studies,
        gallery,
        messages,
        liveStream
      };

      // Guardar en caché para acceso ultrarrápido futuro
      setCachedDbData(resultData);

      // Si no existe el versículo, sembrar en segundo plano sin bloquear
      if (verseSnap && !verseSnap.exists()) {
        seedFirestoreFromClient().catch(console.warn);
      }

      return resultData;
    })();

    const timeoutPromise = new Promise<DbData>((resolve) => {
      setTimeout(() => {
        resolve(cachedFallback);
      }, 1500);
    });

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Error reading Firestore data, returning cached data:', error);
    return cachedFallback;
  }
}

/**
 * AUTO SEED FIRESTORE FROM CLIENT (PARALLEL)
 */
export async function seedFirestoreFromClient(): Promise<void> {
  try {
    const db = getDb();
    if (!db) return;

    const seedPromises: Promise<any>[] = [
      setDoc(doc(db, 'settings', 'verse'), defaultData.verse)
    ];

    for (const event of defaultData.events) {
      seedPromises.push(setDoc(doc(db, 'events', event.id), event));
    }
    for (const sermon of defaultData.sermons) {
      seedPromises.push(setDoc(doc(db, 'sermons', sermon.id), sermon));
    }
    for (const pod of defaultData.podcasts) {
      seedPromises.push(setDoc(doc(db, 'podcasts', pod.id), pod));
    }
    for (const study of defaultData.studies) {
      seedPromises.push(setDoc(doc(db, 'studies', study.id), study));
    }
    for (let i = 0; i < defaultData.gallery.length; i++) {
      seedPromises.push(setDoc(doc(db, 'gallery', `photo-${i + 1}`), {
        id: `photo-${i + 1}`,
        url: defaultData.gallery[i],
        order: i
      }));
    }

    await Promise.all(seedPromises);
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
    
    // Actualizar caché
    const current = getCachedDbData();
    current.verse = verse;
    setCachedDbData(current);
    
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

    // Actualizar caché local
    const current = getCachedDbData();
    const list = (current[type] as any[]) || [];
    const idx = list.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
    current[type] = list as any;
    setCachedDbData(current);

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

    // Actualizar caché local
    const current = getCachedDbData();
    if (current[type]) {
      (current as any)[type] = (current[type] as any[]).filter(i => i.id !== id);
      setCachedDbData(current);
    }

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

    // Actualizar caché
    const current = getCachedDbData();
    if (!current.gallery) current.gallery = [];
    current.gallery.push(url);
    setCachedDbData(current);

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
    const deletePromises: Promise<void>[] = [];
    for (const d of gallerySnap.docs) {
      const data = d.data();
      if (data.url === url || data.photoUrl === url) {
        deletePromises.push(deleteDoc(doc(db, 'gallery', d.id)));
      }
    }
    await Promise.all(deletePromises);

    // Actualizar caché
    const current = getCachedDbData();
    if (current.gallery) {
      current.gallery = current.gallery.filter(p => p !== url);
      setCachedDbData(current);
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

    // Actualizar caché
    const current = getCachedDbData();
    if (!current.messages) current.messages = [];
    current.messages.unshift(newMessage);
    setCachedDbData(current);

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

      // Actualizar caché
      const current = getCachedDbData();
      if (current.messages) {
        const target = current.messages.find(m => m.id === id);
        if (target) target.read = !currentRead;
        setCachedDbData(current);
      }

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
    await deleteDoc(doc(db, 'messages', id));

    // Actualizar caché
    const current = getCachedDbData();
    if (current.messages) {
      current.messages = current.messages.filter(m => m.id !== id);
      setCachedDbData(current);
    }

    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
}

/**
 * UPDATE LIVE STREAM CONFIGURATION IN FIRESTORE
 */
export async function updateLiveStreamClient(liveStream: LiveStream): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    await setDoc(doc(db, 'settings', 'livestream'), liveStream);

    // Actualizar caché
    const current = getCachedDbData();
    current.liveStream = liveStream;
    setCachedDbData(current);

    // Notificar a componentes en la misma ventana inmediatamente
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('livestream-updated', { detail: liveStream }));
    }

    return true;
  } catch (error) {
    console.error('Error updating live stream in Firestore:', error);
    return false;
  }
}

/**
 * SUBSCRIBE TO REAL-TIME LIVE STREAM CHANGES
 */
export function subscribeToLiveStreamClient(callback: (liveStream: LiveStream) => void): () => void {
  try {
    const db = getDb();
    if (!db) return () => {};

    const unsubscribe = onSnapshot(doc(db, 'settings', 'livestream'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as LiveStream;
        callback(data);
        const current = getCachedDbData();
        current.liveStream = data;
        setCachedDbData(current);
      }
    }, (error) => {
      console.error('Error in realtime livestream subscription:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up livestream subscription:', error);
    return () => {};
  }
}
