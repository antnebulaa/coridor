'use client';

import React, { useRef, useCallback, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import axios from 'axios';
import { EDL_COLORS } from '@/lib/inspection';

interface CameraCaptureProps {
  label: string;
  instruction?: string;
  onCapture: (url: string, thumbnailUrl: string, sha256: string) => void;
  onCancel?: () => void;
  accentColor?: string;
}

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for non-secure contexts (HTTP localhost)
  let hash = 0;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash + bytes[i]) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + '-' + file.size.toString(16) + '-' + Date.now().toString(16);
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  label,
  instruction,
  onCapture,
  onCancel,
  accentColor = EDL_COLORS.accent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setCapturedFile(file);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!capturedFile) return;
    setIsUploading(true);

    try {
      // Compress
      const compressed = await compressImage(capturedFile);

      // SHA-256 hash before upload (proof of integrity)
      const sha256 = await computeSHA256(compressed);

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('upload_preset', 'airbnb-clone');

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );

      const url = response.data.secure_url;
      // Generate thumbnail URL via Cloudinary transform
      const thumbnailUrl = url.replace('/upload/', '/upload/w_400,c_fill/');

      onCapture(url, thumbnailUrl, sha256);
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [capturedFile, onCapture]);

  const handleRetake = () => {
    setPreview(null);
    setCapturedFile(null);
    fileInputRef.current?.click();
  };

  // Preview mode — show the photo with confirm/retake
  if (preview) {
    return (
      <div className="flex-1 flex flex-col" style={{ background: EDL_COLORS.bg }}>
        <div className="flex-1 relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        </div>
        <div
          className="flex gap-3 p-4 pb-safe"
          style={{ borderTop: `1px solid ${EDL_COLORS.border}` }}
        >
          <button
            onClick={handleRetake}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[18px] font-bold"
            style={{
              background: EDL_COLORS.card2,
              color: EDL_COLORS.text,
              border: `1px solid ${EDL_COLORS.border}`,
            }}
          >
            <RotateCcw size={18} />
            Reprendre
          </button>
          <button
            onClick={handleConfirm}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[18px] font-bold"
            style={{ background: accentColor, color: '#000' }}
          >
            {isUploading ? (
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              'Valider ✓'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Camera mode — show viewfinder UI
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center relative"
      style={{
        background: 'linear-gradient(180deg, #1a1a2e, #0d1b2a)',
      }}
    >
      {/* Scan lines overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.05) 50px, rgba(255,255,255,0.05) 51px)',
        }}
      />

      {/* Label & instruction */}
      <div className="text-center mb-8 px-8 pointer-events-none">
        <div className="text-[22px] font-bold mb-2" style={{ color: EDL_COLORS.text }}>
          {label}
        </div>
        {instruction && (
          <div className="text-[16px]" style={{ color: EDL_COLORS.text2 }}>
            {instruction}
          </div>
        )}
      </div>

      {/* Shutter button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{
          background: accentColor,
          boxShadow: `0 0 0 4px rgba(0,0,0,0.3), 0 0 30px ${accentColor}40`,
        }}
      >
        <Camera size={28} color="#000" />
      </button>

      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-6 text-[16px] font-medium"
          style={{ color: EDL_COLORS.text3 }}
        >
          Annuler
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default CameraCapture;
