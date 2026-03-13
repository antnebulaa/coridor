import axios from 'axios';

/**
 * Upload un blob vers Cloudinary et retourne les URLs.
 *
 * Logique extraite de CameraCapture.tsx pour pouvoir
 * la partager entre le composant et la photoQueue.
 */
export async function uploadToCloudinary(
  blob: Blob
): Promise<{ url: string; thumbnailUrl: string }> {
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', 'airbnb-clone');

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    formData
  );

  const url: string = response.data.secure_url;
  const thumbnailUrl = url.replace('/upload/', '/upload/w_400,c_fill/');

  return { url, thumbnailUrl };
}
