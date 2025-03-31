import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export type ImageType = 'user' | 'cat' | 'thumbnail';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_DIMENSIONS = {
  user: { width: 800, height: 800 },
  cat: { width: 1200, height: 1200 },
  thumbnail: { width: 400, height: 400 }
};

export async function validateImage(filePath: string): Promise<void> {
  // Check file size
  const stats = await fs.stat(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('Imagem muito grande. Tamanho máximo: 10MB');
  }

  // Check file type
  const metadata = await sharp(filePath).metadata();
  if (!ALLOWED_TYPES.includes(`image/${metadata.format}`)) {
    throw new Error('Formato de imagem não suportado. Use JPEG, PNG ou WebP');
  }
}

export async function processImage(
  filePath: string,
  type: ImageType,
  originalName: string
): Promise<string> {
  const dimensions = MAX_DIMENSIONS[type];
  const outputDir = path.join(process.cwd(), 'public', 'uploads', type);
  await fs.mkdir(outputDir, { recursive: true });

  const outputFileName = `${Date.now()}-${originalName}`;
  const outputPath = path.join(outputDir, outputFileName);

  await sharp(filePath)
    .resize(dimensions.width, dimensions.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 80 })
    .toFile(outputPath);

  // Clean up temp file
  await fs.unlink(filePath);

  return `/uploads/${type}/${outputFileName}`;
} 