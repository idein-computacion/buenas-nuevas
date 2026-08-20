import fs from 'fs';
import path from 'path';
import { adminDb, isFirebaseAdminConfigured } from '../src/lib/firebaseAdmin';

async function migrate() {
  console.log('🔥 Iniciando migración de db.json a Firebase Firestore...');

  if (!isFirebaseAdminConfigured) {
    console.error('❌ Error: Configuración de Firebase no detectada. Verificá las variables de entorno en .env.local');
    process.exit(1);
  }

  const dbPath = path.join(process.cwd(), 'src/data/db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('❌ No se encontró el archivo src/data/db.json');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  try {
    // 1. Versículo
    if (data.verse) {
      console.log('Uploading versículo del día...');
      await adminDb.collection('settings').doc('verse').set(data.verse);
    }

    // 2. Eventos
    if (Array.isArray(data.events)) {
      console.log(`Uploading ${data.events.length} eventos...`);
      for (const item of data.events) {
        await adminDb.collection('events').doc(item.id).set(item, { merge: true });
      }
    }

    // 3. Sermones
    if (Array.isArray(data.sermons)) {
      console.log(`Uploading ${data.sermons.length} sermones...`);
      for (const item of data.sermons) {
        await adminDb.collection('sermons').doc(item.id).set(item, { merge: true });
      }
    }

    // 4. Podcasts
    if (Array.isArray(data.podcasts)) {
      console.log(`Uploading ${data.podcasts.length} podcasts...`);
      for (const item of data.podcasts) {
        await adminDb.collection('podcasts').doc(item.id).set(item, { merge: true });
      }
    }

    // 5. Estudios
    if (Array.isArray(data.studies)) {
      console.log(`Uploading ${data.studies.length} estudios...`);
      for (const item of data.studies) {
        await adminDb.collection('studies').doc(item.id).set(item, { merge: true });
      }
    }

    // 6. Galería
    if (Array.isArray(data.gallery)) {
      console.log(`Uploading ${data.gallery.length} fotos de galería...`);
      for (let i = 0; i < data.gallery.length; i++) {
        const docId = `photo-${i + 1}`;
        await adminDb.collection('gallery').doc(docId).set({
          id: docId,
          url: data.gallery[i],
          order: i
        }, { merge: true });
      }
    }

    // 7. Mensajes
    if (Array.isArray(data.messages)) {
      console.log(`Uploading ${data.messages.length} mensajes...`);
      for (const msg of data.messages) {
        await adminDb.collection('messages').doc(msg.id).set(msg, { merge: true });
      }
    }

    console.log('✅ ¡Migración a Firebase completada con éxito!');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

migrate();
