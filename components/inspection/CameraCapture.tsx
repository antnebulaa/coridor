'use client';

import React, { useRef, useCallback, useState } from 'react';
import { Camera, RotateCcw, ArrowRight, Check, X } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import axios from 'axios';
import { EDL_COLORS } from '@/lib/inspection';

interface CameraCaptureProps {
  label: string;
  title?: string;
  instruction?: string;
  onCapture: (url: string, thumbnailUrl: string, sha256: string) => void;
  onCancel?: () => void;
  onDone?: () => void;
  onExit?: () => void;
  doneLabel?: string;
  accentColor?: string;
  allowMultiple?: boolean;
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

function Thumbnail({ src, index, onDelete, dimmed }: { src: string; index: number; onDelete: () => void; dimmed: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <button
      onClick={onDelete}
      className="w-[48px] h-[48px] rounded-lg overflow-hidden flex-shrink-0 relative"
      style={{
        border: '2px solid rgba(255,255,255,0.2)',
        opacity: dimmed ? 0.5 : 1,
      }}
    >
      {!visible && (
        <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
      )}
      <img
        src={src}
        alt={`Photo ${index + 1}`}
        onLoad={() => setTimeout(() => setVisible(true), 100)}
        className="w-full h-full object-cover transition-opacity duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0 }}
      />
    </button>
  );
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  label,
  title,
  instruction,
  onCapture,
  onCancel,
  onDone,
  onExit,
  doneLabel = 'Continuer',
  accentColor = EDL_COLORS.accent,
  allowMultiple = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setCapturedFile(file);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!capturedFile || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsUploading(true);

    try {
      const compressed = await compressImage(capturedFile);
      const sha256 = await computeSHA256(compressed);

      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('upload_preset', 'airbnb-clone');

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );

      const url = response.data.secure_url;
      const thumbnailUrl = url.replace('/upload/', '/upload/w_400,c_fill/');

      await onCapture(url, thumbnailUrl, sha256);

      // Show "Validé ✓" feedback briefly
      setIsUploading(false);
      setIsValidated(true);

      if (allowMultiple) {
        setThumbnails((prev) => [...prev, thumbnailUrl]);
        setTimeout(() => {
          setIsValidated(false);
          setPreview(null);
          setCapturedFile(null);
          isProcessingRef.current = false;
          if (fileInputRef.current) fileInputRef.current.value = '';
        }, 500);
      } else {
        setTimeout(() => {
          setIsValidated(false);
          isProcessingRef.current = false;
        }, 500);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      setIsUploading(false);
      isProcessingRef.current = false;
    }
  }, [capturedFile, onCapture, allowMultiple]);

  const handleRetake = () => {
    setPreview(null);
    setCapturedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  // Preview mode — show the photo with confirm/retake
  if (preview) {
    return (
      <div className="flex-1 flex flex-col px-4 pb-4" style={{ background: EDL_COLORS.bg }}>
        <div className="flex-1 relative rounded-3xl overflow-hidden">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleRetake}
            disabled={isUploading || isValidated}
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
            disabled={isUploading || isProcessingRef.current || isValidated}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[18px] font-bold transition-colors duration-200"
            style={{
              background: isValidated ? EDL_COLORS.green : accentColor,
              color: '#fff',
            }}
          >
            {isUploading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isValidated ? (
              <>
                <Check size={18} strokeWidth={3} />
                Validé
              </>
            ) : (
              'Valider'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Split instruction into separate lines (split on " · " or " — ")
  const instructionLines = instruction?.split(/\s*[·—]\s*/).filter(Boolean) || [];

  // Camera mode — show viewfinder UI
  return (
    <div
      className="flex-1 flex flex-col px-4"
      style={{ background: EDL_COLORS.bg }}
    >
      <div
        className="flex-1 flex flex-col items-center justify-center relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0d1117, #070b10)',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.05) 50px, rgba(255,255,255,0.05) 51px)',
          }}
        />

        {/* Label & instruction — stacked lines */}
        <div className="text-center mb-10 px-8 pointer-events-none">
          {title ? (
            <>
              <div className="text-[36px] font-semibold tracking-tight mb-1" style={{ color: '#fff' }}>
                {title}
              </div>
              <div className="text-[18px] font-medium mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {label}
              </div>
            </>
          ) : (
            <div className="text-[22px] font-bold mb-4" style={{ color: '#fff' }}>
              {label}
            </div>
          )}
          {instructionLines.map((line, i) => (
            <div
              key={i}
              className="text-[15px] leading-relaxed"
              style={{ color: i === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)' }}
            >
              {line}
            </div>
          ))}
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
          <Camera size={28} color="#fff" />
        </button>

        {/* Thumbnails carousel */}
        {allowMultiple && thumbnails.length > 0 ? (
          <div className="mt-6 flex flex-col items-center gap-4 w-full">
            {/* Mini carousel */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-6 max-w-full">
              {thumbnails.map((thumb, i) => (
                <Thumbnail key={i} src={thumb} index={i} onDelete={() => setDeletingIndex(i)} dimmed={deletingIndex === i} />
              ))}
            </div>

            {/* Done button */}
            <button
              onClick={onDone}
              className="flex items-center gap-2 px-8 py-3 rounded-full text-[17px] font-bold"
              style={{ background: accentColor, color: '#fff' }}
            >
              {doneLabel}
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 mt-6">
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-[16px] font-medium"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Annuler
              </button>
            )}
            {onExit && (
              <button
                onClick={onExit}
                className="text-[15px] font-medium"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                Reprendre plus tard
              </button>
            )}
          </div>
        )}

        {/* Delete confirmation overlay */}
        {deletingIndex !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <div className="flex flex-col items-center gap-4">
              <img
                src={thumbnails[deletingIndex]}
                alt="Photo à supprimer"
                className="w-56 h-56 rounded-2xl object-cover"
              />
              <div className="text-[16px] font-medium" style={{ color: '#fff' }}>
                Supprimer cette photo ?
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingIndex(null)}
                  className="px-6 py-2.5 rounded-full text-[15px] font-bold"
                  style={{ background: EDL_COLORS.card2, color: '#fff' }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setThumbnails((prev) => prev.filter((_, j) => j !== deletingIndex));
                    setDeletingIndex(null);
                  }}
                  className="px-6 py-2.5 rounded-full text-[15px] font-bold"
                  style={{ background: EDL_COLORS.red, color: '#fff' }}
                >
                  <X size={16} className="inline mr-1" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default CameraCapture;
