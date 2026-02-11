/**
 * Cloudinary URL transformation utilities for optimized image loading.
 * 
 * These helpers inject transformation parameters into Cloudinary URLs
 * to generate optimized thumbnails and responsive images.
 */

/**
 * Generates a thumbnail URL from a Cloudinary image URL.
 * 
 * @param url - Original Cloudinary URL
 * @param width - Target width in pixels (default: 400)
 * @param quality - Quality setting (default: 'auto')
 * @returns Transformed URL with optimization parameters
 * 
 * @example
 * getCloudinaryThumbnail('https://res.cloudinary.com/.../upload/v123/image.jpg', 600)
 * // Returns: 'https://res.cloudinary.com/.../upload/w_600,q_auto,f_auto/v123/image.jpg'
 */
export function getCloudinaryThumbnail(
    url: string,
    width: number = 400,
    quality: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' = 'auto'
): string {
    // Only transform Cloudinary URLs
    if (!url.includes('res.cloudinary.com')) {
        return url;
    }

    // Check if already has transformations
    if (url.includes('/upload/w_') || url.includes('/upload/c_') || url.includes('/upload/q_')) {
        return url;
    }

    // Insert transformation parameters after /upload/
    const transform = `w_${width},q_${quality},f_auto,c_limit`;
    return url.replace('/upload/', `/upload/${transform}/`);
}

/**
 * Generates a responsive srcSet for Cloudinary images.
 * 
 * @param url - Original Cloudinary URL
 * @param widths - Array of widths to generate (default: [400, 800, 1200, 2048])
 * @returns srcSet string for responsive images
 */
export function getCloudinarySrcSet(
    url: string,
    widths: number[] = [400, 800, 1200, 2048]
): string {
    if (!url.includes('res.cloudinary.com')) {
        return url;
    }

    return widths
        .map(w => `${getCloudinaryThumbnail(url, w)} ${w}w`)
        .join(', ');
}

/**
 * Gets an HD version of the image for fullscreen viewing.
 * 
 * @param url - Original Cloudinary URL
 * @param maxWidth - Maximum width (default: 2048)
 * @returns Optimized HD URL
 */
export function getCloudinaryHD(url: string, maxWidth: number = 2048): string {
    if (!url.includes('res.cloudinary.com')) {
        return url;
    }

    // Check if already has transformations
    if (url.includes('/upload/w_') || url.includes('/upload/c_')) {
        return url;
    }

    const transform = `w_${maxWidth},q_auto:best,f_auto,c_limit`;
    return url.replace('/upload/', `/upload/${transform}/`);
}
