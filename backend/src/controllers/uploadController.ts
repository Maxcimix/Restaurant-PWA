import { Request, Response } from 'express';
import { v2 as cloudinary }  from 'cloudinary';
import multer                from 'multer';
import path                  from 'path';
import fs                    from 'fs';

// ── Cloudinary (si están configuradas las vars de entorno) ──
const cloudinaryConfigured =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY    &&
  !!process.env.CLOUDINARY_API_SECRET;

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[upload] Cloudinary configurado correctamente ✅');
} else {
  console.warn('[upload] ⚠️  Variables de Cloudinary no encontradas — usando almacenamiento local.');
}

// ── Multer — siempre en memoria para poder redirigir al destino correcto ──
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  },
});

// ── Directorio local para fallback ──────────────────────────
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
function ensureUploadsDir() {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

// POST /api/admin/upload
export async function uploadImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ninguna imagen' });
    }

    // ── OPCIÓN A: Cloudinary ────────────────────────────────
    if (cloudinaryConfigured) {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:         'restaurant_menu',
            transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto' }],
          },
          (error, result) => {
            if (error || !result) {
              console.error('[upload/cloudinary]', error);
              reject(error ?? new Error('Cloudinary upload failed'));
            } else {
              resolve(result as { secure_url: string });
            }
          }
        );
        stream.end(req.file!.buffer);
      });

      return res.json({ url: result.secure_url });
    }

    // ── OPCIÓN B: Disco local (fallback) ────────────────────
    ensureUploadsDir();
    const ext      = path.extname(req.file.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filepath = path.join(LOCAL_UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, req.file.buffer);
    console.log(`[upload/local] Imagen guardada: ${filename}`);

    // La URL pública será servida por Express como estático desde /uploads/
    const url = `/uploads/${filename}`;
    return res.json({ url });

  } catch (err) {
    console.error('[upload/image]', err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : 'Error al subir la imagen',
    });
  }
}