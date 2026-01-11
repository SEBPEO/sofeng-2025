import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components';
import styles from './AudioRecorder.module.css';

interface AudioRecorderProps {
  onSave: (file: File) => Promise<void>;
}

type RecorderState = 'idle' | 'recording' | 'stopped';

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSave }) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      setDurationMs((prev) => prev + 1000);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleStart = async () => {
    setError(null);
    setDurationMs(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopTimer();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setState('stopped');
        await onSave(file);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState('recording');
      startTimer();
    } catch (err: any) {
      console.error('Microphone error', err);
      setError(err?.message || 'Unable to access microphone');
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const disabled = state === 'recording';

  return (
    <div className={styles.recorder}>
      <div className={styles.controls}>
        <Button onClick={handleStart} disabled={state === 'recording'}>
          {state === 'recording' ? 'Recording…' : 'Start Recording'}
        </Button>
        <Button variant="ghost" onClick={handleStop} disabled={!disabled}>
          Stop
        </Button>
        <span className={styles.timer}>{formatDuration(durationMs)}</span>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};
