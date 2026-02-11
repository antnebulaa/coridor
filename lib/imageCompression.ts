'use client';

import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    fileType?: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: 'image/webp',
};

/**
 * Compresses an image file before upload.
 * - Converts to WebP for better compression
 * - Limits to 1MB max file size
 * - Limits to 2048px max dimension
 * 
 * @param file - The original image file
 * @param options - Optional compression settings override
 * @returns Compressed image file
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<File> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Skip compression for small files and already-webp images
    const isSmallEnough = file.size < (mergedOptions.maxSizeMB! * 1024 * 1024);
    const isWebP = file.type === 'image/webp';

    if (isSmallEnough && isWebP) {
        console.log('[ImageCompression] File already optimized, skipping compression');
        return file;
    }

    console.log(`[ImageCompression] Compressing ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    try {
        const compressedFile = await imageCompression(file, {
            maxSizeMB: mergedOptions.maxSizeMB,
            maxWidthOrHeight: mergedOptions.maxWidthOrHeight,
            useWebWorker: mergedOptions.useWebWorker,
            fileType: mergedOptions.fileType,
        });

        const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
        console.log(`[ImageCompression] Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);

        return compressedFile;
    } catch (error) {
        console.error('[ImageCompression] Compression failed, using original:', error);
        return file;
    }
}

/**
 * Compresses multiple images in parallel
 */
export async function compressImages(
    files: File[],
    options: CompressionOptions = {}
): Promise<File[]> {
    return Promise.all(files.map(file => compressImage(file, options)));
}
