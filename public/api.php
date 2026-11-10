<?php
// Buenas Nuevas - Backend PHP para Servidor Ferozo / Hostmar / Apache
@ini_set('upload_max_filesize', '64M');
@ini_set('post_max_size', '64M');
@ini_set('memory_limit', '128M');
@ini_set('max_execution_time', '300');

// Headers de CORS y codificación UTF-8
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Responder inmediatamente a peticiones preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// -------------------------------------------------------------
// MINIATURAS Y OPTIMIZACIÓN DE IMÁGENES EN CACHÉ (?thumb=/uploads/...&w=240)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['thumb'])) {
    $rel = $_GET['thumb'];
    $w = isset($_GET['w']) ? max(64, min(1600, (int)$_GET['w'])) : 240;

    // Validar que sea un archivo dentro de /uploads/
    $clean_name = basename($rel);
    $src_path = __DIR__ . '/uploads/' . $clean_name;

    if (!file_exists($src_path) || !is_file($src_path)) {
        header('Location: ' . $rel, true, 302);
        exit;
    }

    $thumbs_dir = __DIR__ . '/uploads/thumbs';
    if (!is_dir($thumbs_dir)) {
        @mkdir($thumbs_dir, 0755, true);
    }

    $thumb_file = $thumbs_dir . '/' . $w . '_' . pathinfo($clean_name, PATHINFO_FILENAME) . '.jpg';

    if (!file_exists($thumb_file) && function_exists('imagecreatefromstring')) {
        $raw = @file_get_contents($src_path);
        $img = $raw ? @imagecreatefromstring($raw) : false;
        if ($img) {
            $orig_w = imagesx($img);
            $orig_h = imagesy($img);
            if ($orig_w > $w) {
                $new_w = $w;
                $new_h = max(1, (int)round($orig_h * ($w / $orig_w)));
            } else {
                $new_w = $orig_w;
                $new_h = $orig_h;
            }
            $dst = imagecreatetruecolor($new_w, $new_h);
            $white = imagecolorallocate($dst, 255, 255, 255);
            imagefill($dst, 0, 0, $white);
            imagecopyresampled($dst, $img, 0, 0, 0, 0, $new_w, $new_h, $orig_w, $orig_h);
            $quality = ($w <= 300) ? 78 : 82;
            @imagejpeg($dst, $thumb_file, $quality);
            imagedestroy($dst);
            imagedestroy($img);
        }
    }

    if (file_exists($thumb_file)) {
        header('Content-Type: image/jpeg');
        header('Cache-Control: public, max-age=31536000, immutable');
        header('Content-Length: ' . filesize($thumb_file));
        readfile($thumb_file);
        exit;
    }

    header('Location: ' . $rel, true, 302);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$db_file = __DIR__ . '/db.json';
$admin_secret = 'buenasnuevas2026';

// Si no existe el archivo de base de datos, crear estructura inicial por defecto
if (!file_exists($db_file)) {
    $initial_data = [
        "verse" => [
            "text" => "Tú, Señor, amas a tu pueblo; todo tu pueblo santo está en tus manos. Por eso ellos siguen tus pasos y reciben de ti su dirección\n",
            "reference" => "Deut. 33.3"
        ],
        "schedules" => [
            ["id" => "sch-1", "dia" => "Martes", "hora" => "18:00 a 20:00 hs", "titulo" => "\"NewCom\" para adultos mayores", "desc" => "Lugar: C.A.M. (Lavalle 1660)"],
            ["id" => "sch-2", "dia" => "Miércoles", "hora" => "07:00 hs", "titulo" => "Reunión de Oración e Intercesión", "desc" => "Lugar: Edificio Fundacional (Rincón y Reconquista)"],
            ["id" => "sch-3", "dia" => "Miércoles", "hora" => "20:00 hs", "titulo" => "Reunión de Alabanza, Oración y Estudio de la Palabra", "desc" => "Lugar habitual: El Mensú 1177"],
            ["id" => "sch-4", "dia" => "Viernes", "hora" => "20:00 hs", "titulo" => "Voley para Jóvenes", "desc" => "Lugar: C.A.M. (Lavalle 1660)"],
            ["id" => "sch-5", "dia" => "Sábados", "hora" => "09:30 hs", "titulo" => "\"Pequeños Exploradores\" para niños de 4 a 12 años", "desc" => "Lugar: C.A.M. (Lavalle 1660)"],
            ["id" => "sch-6", "dia" => "Domingos", "hora" => "19:30 hs", "titulo" => "Celebramos al Señor en Familia", "desc" => "Lugar habitual: El Mensú 1177"],
            ["id" => "sch-1788958957071", "dia" => "Sábados", "hora" => "20 hs.", "titulo" => "Reunión de Jóvenes", "desc" => "Lugar: El Mensú 1177"],
            ["id" => "sch-1788959559028", "dia" => "Sábados por medio", "hora" => "18:00 hs.", "titulo" => "\"Generación de Fuego\" para todos los Adolescentes de 12 a 17 años.", "desc" => "Lugar: en el Edificio Fundacional (Rincón y Reconquista)"]
        ],
        "events" => [],
        "sermons" => [],
        "podcasts" => [],
        "studies" => [],
        "gallery" => [],
        "messages" => [],
        "liveStream" => [
            "active" => true,
            "title" => "Streaming en Vivo",
            "streamUrl" => "https://iptv.ixfo.com.ar:30443/live/BuenasNuevasTv/playlist.m3u8",
            "description" => "Te damos la bienvenida a nuestra transmisión en vivo. ¡Compartí este tiempo con nosotros desde cualquier lugar!",
            "scheduledTime" => "Domingos 19:30 hs"
        ]
    ];
    file_put_contents($db_file, json_encode($initial_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// -------------------------------------------------------------
// GET: Leer los datos para la web pública y panel de administración
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $content = file_get_contents($db_file);
    $json = json_decode($content, true);

    if (!is_array($json)) {
        $json = [];
    }

    if (!isset($json['visitStats']) || !is_array($json['visitStats'])) {
        $json['visitStats'] = [
            "totalVisits" => 0,
            "uniqueVisitors" => 0,
            "daily" => [],
            "lastUpdated" => date('c')
        ];
    }

    // Registrar visita si viene ?visit=1
    if (isset($_GET['visit']) && $_GET['visit'] === '1') {
        $today_key = date('Y-m-d');
        $json['visitStats']['totalVisits'] = (int)($json['visitStats']['totalVisits'] ?? 0) + 1;
        if (isset($_GET['unique']) && $_GET['unique'] === '1') {
            $json['visitStats']['uniqueVisitors'] = (int)($json['visitStats']['uniqueVisitors'] ?? 0) + 1;
        } elseif ((int)$json['visitStats']['uniqueVisitors'] === 0) {
            $json['visitStats']['uniqueVisitors'] = 1;
        }
        if (!isset($json['visitStats']['daily']) || !is_array($json['visitStats']['daily'])) {
            $json['visitStats']['daily'] = [];
        }
        $json['visitStats']['daily'][$today_key] = (int)($json['visitStats']['daily'][$today_key] ?? 0) + 1;

        // Mantener últimos 90 días para que db.json sea siempre liviano
        ksort($json['visitStats']['daily']);
        if (count($json['visitStats']['daily']) > 90) {
            $json['visitStats']['daily'] = array_slice($json['visitStats']['daily'], -90, 90, true);
        }

        $json['visitStats']['lastUpdated'] = date('c');
        @file_put_contents($db_file, json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["success" => true, "visitStats" => $json['visitStats']], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Asegurar horarios si vinieran vacíos
    if (!isset($json['schedules']) || empty($json['schedules'])) {
        $json['schedules'] = [
            ["id" => "sch-1", "dia" => "Martes", "hora" => "18:00 a 20:00 hs", "titulo" => "\"NewCom\" para adultos mayores", "desc" => "Lugar: C.A.M. (Lavalle 1660)"],
            ["id" => "sch-2", "dia" => "Miércoles", "hora" => "19:00 hs", "titulo" => "Reunión de oración e intercesión", "desc" => "Lugar: Edificio Fundacional (Rincón y Reconquista)"],
            ["id" => "sch-3", "dia" => "Miércoles", "hora" => "20:00 hs", "titulo" => "Reunión de Alabanza, Oración y Estudio de la Palabra", "desc" => "Lugar habitual: El Mensú 1177"],
            ["id" => "sch-4", "dia" => "Viernes", "hora" => "20:00 hs", "titulo" => "Voley para Jóvenes", "desc" => "Lugar: C.A.M. (Lavalle 1660)"],
            ["id" => "sch-5", "dia" => "Sábados", "hora" => "09:30 hs", "titulo" => "\"Pequeños Exploradores\" para niños de 4 a 12 años", "desc" => "Lugar: C.A.M. (Lavalle 1660)"],
            ["id" => "sch-6", "dia" => "Domingos", "hora" => "19:30 hs", "titulo" => "Culto Nocturno", "desc" => "Lugar habitual: El Mensú 1177 (Sin actividad por la mañana)"]
        ];
        file_put_contents($db_file, json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    // PRIVACIDAD: Proteger mensajes personales de contacto si la petición no está autenticada
    $auth = $_GET['auth'] ?? $_GET['password'] ?? '';
    if ($auth !== $admin_secret) {
        unset($json['messages']);
    }

    echo json_encode($json, JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// POST: Operaciones de guardado y carga de archivos
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    $action = $_POST['action'] ?? '';
    $data_b64 = $_POST['data'] ?? '';

    // Validar contraseña para cualquier acción que no sea enviar formulario de contacto
    if ($action !== 'contact' && $password !== $admin_secret) {
        http_response_code(403);
        echo json_encode(["error" => "No autorizado. Contraseña incorrecta."]);
        exit;
    }

    // Decodificar Base64 seguro (Anti-WAF de Ferozo)
    $data_payload = '';
    if ($action === 'contact' || $action === 'update_all') {
        $data_payload = base64_decode($data_b64);
        if (!$data_payload) {
            http_response_code(400);
            echo json_encode(["error" => "Error al decodificar datos."]);
            exit;
        }
    }

    $current_db = json_decode(file_get_contents($db_file), true);
    if (!is_array($current_db)) {
        $current_db = [];
    }

    // 1. Mensaje de contacto desde el sitio público
    if ($action === 'contact') {
        $msg = json_decode($data_payload, true);
        if (!is_array($msg)) {
            http_response_code(400);
            echo json_encode(["error" => "Datos de mensaje inválidos."]);
            exit;
        }

        if (!isset($current_db['messages'])) {
            $current_db['messages'] = [];
        }
        $current_db['messages'][] = $msg;
        
        $written = file_put_contents($db_file, json_encode($current_db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        if ($written !== false) {
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Fallo de escritura en db.json. Verifique permisos en el servidor."]);
        }
        exit;
    }

    // 2. Actualización completa de la base de datos desde el panel de admin
    if ($action === 'update_all') {
        $new_db = json_decode($data_payload, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($new_db)) {
            if (!isset($new_db['visitStats']) && isset($current_db['visitStats'])) {
                $new_db['visitStats'] = $current_db['visitStats'];
            }
            $written = file_put_contents($db_file, json_encode($new_db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            if ($written !== false) {
                echo json_encode(["success" => true]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Fallo de escritura en db.json. Verifique permisos en el servidor."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "JSON inválido tras decodificación."]);
        }
        exit;
    }

    // 3. Subida de archivos (Imágenes, PDF, MP3)
    if ($action === 'upload') {
        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(["error" => "No se envió ningún archivo."]);
            exit;
        }

        $file = $_FILES['file'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["error" => "Error al subir archivo. Código: " . $file['error']]);
            exit;
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed_exts = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'mp3', 'mp4', 'webm', 'ogg', 'mov'];
        
        if (!in_array($ext, $allowed_exts)) {
            http_response_code(400);
            echo json_encode(["error" => "Tipo de archivo no permitido. Permitidos: " . implode(', ', $allowed_exts)]);
            exit;
        }

        // Límite de 64MB
        $max_size = 64 * 1024 * 1024;
        if ($file['size'] > $max_size) {
            http_response_code(400);
            echo json_encode(["error" => "El archivo supera el límite de 64MB."]);
            exit;
        }

        // Nombre seguro y único
        $timestamp = time();
        $hash = substr(md5(uniqid((string)rand(), true)), 0, 8);
        $clean_name = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $new_filename = $timestamp . '_' . $hash . '.' . $ext;

        $upload_dir = __DIR__ . '/uploads/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        $target_path = $upload_dir . $new_filename;

        if (move_uploaded_file($file['tmp_name'], $target_path)) {
            $relative_url = '/uploads/' . $new_filename;
            
            $type = 'document';
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                $type = 'image';
            } elseif ($ext === 'mp3') {
                $type = 'audio';
            } elseif (in_array($ext, ['mp4', 'webm', 'ogg', 'mov'])) {
                $type = 'video';
            }

            echo json_encode([
                "success" => true,
                "url" => $relative_url,
                "type" => $type
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "No se pudo guardar el archivo. Verifique permisos de la carpeta uploads/."]);
        }
        exit;
    }

    echo json_encode(["error" => "Acción no válida."]);
    exit;
}
