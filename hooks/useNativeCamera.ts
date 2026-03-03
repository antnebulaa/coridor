'use client';

import { isNative } from '@/lib/platform';

export function useNativeCamera() {

  const takePhoto = async (): Promise<string | null> => {
    if (!isNative()) return null;

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080,
        correctOrientation: true,
      });

      return image.base64String
        ? `data:image/${image.format};base64,${image.base64String}`
        : null;
    } catch (error) {
      console.error('Camera error:', error);
      return null;
    }
  };

  const pickFromGallery = async (): Promise<string | null> => {
    if (!isNative()) return null;

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 1920,
        height: 1080,
      });

      return image.base64String
        ? `data:image/${image.format};base64,${image.base64String}`
        : null;
    } catch (error) {
      console.error('Gallery error:', error);
      return null;
    }
  };

  return {
    takePhoto,
    pickFromGallery,
    isNative: isNative(),
  };
}
