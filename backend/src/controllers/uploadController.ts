// ============================================================
// backend/src/controllers/uploadController.ts
// Subida de imágenes a Cloudinary
// ============================================================

import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer — guardar en memoria (buffer)
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  },
});

// POST /api/admin/upload
export async function uploadImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ninguna imagen' });
    }

    // Subir a Cloudinary desde buffer
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:         'restaurant_menu',
          transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto' }],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Upload failed'));
          else resolve(result as { secure_url: string });
        }
      );
      stream.end(req.file!.buffer);
    });

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error('[upload/image]', err);
    return res.status(500).json({ message: 'Error al subir la imagen' });
  }
}
