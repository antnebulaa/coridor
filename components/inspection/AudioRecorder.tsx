'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { EDL_COLORS } from '@/lib/inspection';

interface AudioRecorderProps {
  value?: string;
  onChange: (text: string) => void;
  placeholder?: string;
  label?: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  value = '',
  onChange,
  placeholder = 'Dicter',
  label,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(value);
  const [canRecord, setCanRecord] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setCanRecord(!!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    setTranscript(value);
  }, [value]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (audioBlob.size < 1000) return;

        setIsTranscribing(true);
        try {
          const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
          const formData = new FormData();
          formData.append('audio', audioBlob, `recording.${ext}`);

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const { text } = await res.json();
            if (text && text.trim()) {
              setTranscript((prev) => {
                const newText = prev ? `${prev} ${text.trim()}` : text.trim();
                onChange(newText);
                return newText;
              });
            }
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [onChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex flex-col gap-4">
      {label && (
        <div className="text-[20px] font-bold" style={{ color: EDL_COLORS.text }}>
          {label}
        </div>
      )}

      {/* Textarea — big readable text */}
      <textarea
        value={transcript}
        onChange={(e) => {
          setTranscript(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Saisissez ou dictez..."
        className="w-full p-4 rounded-2xl text-[18px] font-medium leading-relaxed min-h-28 resize-none outline-none"
        style={{
          background: EDL_COLORS.card,
          color: EDL_COLORS.text,
          border: `2px solid ${EDL_COLORS.border}`,
        }}
      />

      {/* Mic button */}
      <button
        onClick={isTranscribing ? undefined : toggleRecording}
        disabled={isTranscribing}
        className="flex items-center justify-center gap-3 py-4 rounded-2xl text-[18px] font-bold"
        style={{
          background: isRecording ? EDL_COLORS.red : isTranscribing ? EDL_COLORS.card2 : EDL_COLORS.accent,
          color: isRecording ? '#fff' : isTranscribing ? EDL_COLORS.text : '#fff',
          border: `2px solid ${isRecording ? EDL_COLORS.red : isTranscribing ? EDL_COLORS.border : EDL_COLORS.accent}`,
          boxShadow: isRecording ? `0 0 30px ${EDL_COLORS.red}50` : 'none',
          opacity: isTranscribing ? 0.6 : 1,
        }}
      >
        {isTranscribing ? (
          <>
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Transcription...
          </>
        ) : isRecording ? (
          <>
            <Square size={20} fill="currentColor" />
            Arrêter
          </>
        ) : (
          <>
            <Mic size={20} />
            {placeholder}
          </>
        )}
      </button>
    </div>
  );
};

export default AudioRecorder;
