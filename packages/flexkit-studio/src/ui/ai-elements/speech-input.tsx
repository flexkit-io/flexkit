'use client';

import { Button } from '../primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { cn } from '../lib/utils';
import { LoaderIcon, MicIcon, SquareIcon } from 'lucide-react';
import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';

export type SpeechInputProps = Omit<ComponentProps<typeof Button>, 'onError'> & {
  onTranscriptionChange?: (text: string) => void;
  /**
   * Required. Receives the recorded audio blob and an abort signal that is
   * cancelled if the user stops processing. Return the transcribed text.
   */
  onAudioRecorded?: (audioBlob: Blob, signal: AbortSignal) => Promise<string>;
  onError?: (error: Error) => void;
};

const MAX_RECORDING_MS = 60_000;

function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

function getSupportedRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function toSpeechInputError(error: unknown, fallback: string): Error {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
    return new Error('Microphone permission was denied. Enable the microphone to dictate.');
  }

  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return new Error('No microphone was found.');
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function getTooltip(isSupported: boolean, isListening: boolean, isProcessing: boolean): string {
  if (!isSupported) {
    return 'Dictation is not available in this browser.';
  }

  if (isProcessing) {
    return 'Cancel transcription';
  }

  if (isListening) {
    return 'Stop recording';
  }

  return 'Dictate';
}

export const SpeechInput = ({
  className,
  disabled,
  onAudioRecorded,
  onError,
  onTranscriptionChange,
  size = 'icon-sm',
  variant = 'ghost',
  ...props
}: SpeechInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const maxDurationTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onAudioRecordedRef = useRef(onAudioRecorded);
  const onErrorRef = useRef(onError);
  const onTranscriptionChangeRef = useRef(onTranscriptionChange);

  onAudioRecordedRef.current = onAudioRecorded;
  onErrorRef.current = onError;
  onTranscriptionChangeRef.current = onTranscriptionChange;

  useEffect(() => {
    setIsSupported(isMediaRecorderSupported());
  }, []);

  const releaseStream = useCallback(() => {
    if (!streamRef.current) {
      return;
    }

    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }

    streamRef.current = null;
  }, []);

  const clearMaxDurationTimer = useCallback(() => {
    if (maxDurationTimerRef.current === null) {
      return;
    }

    window.clearTimeout(maxDurationTimerRef.current);
    maxDurationTimerRef.current = null;
  }, []);

  const stopMediaRecorder = useCallback(() => {
    clearMaxDurationTimer();

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsListening(false);
  }, [clearMaxDurationTimer]);

  const abortProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsProcessing(false);
  }, []);

  const startMediaRecorder = useCallback(async () => {
    if (!onAudioRecordedRef.current) {
      onErrorRef.current?.(new Error('Dictation is not configured.'));

      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getSupportedRecorderMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        releaseStream();
        clearMaxDurationTimer();
        setIsListening(false);

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        if (audioBlob.size === 0) {
          return;
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        setIsProcessing(true);

        try {
          const transcribe = onAudioRecordedRef.current;

          if (!transcribe) {
            return;
          }

          const transcript = await transcribe(audioBlob, abortController.signal);

          if (transcript) {
            onTranscriptionChangeRef.current?.(transcript);
          }
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }

          onErrorRef.current?.(toSpeechInputError(error, 'Transcription failed.'));
        } finally {
          abortControllerRef.current = null;
          setIsProcessing(false);
        }
      };

      mediaRecorder.onerror = () => {
        setIsListening(false);
        releaseStream();
        clearMaxDurationTimer();
        onErrorRef.current?.(new Error('Recording failed. Try again.'));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsListening(true);
      maxDurationTimerRef.current = window.setTimeout(() => {
        stopMediaRecorder();
      }, MAX_RECORDING_MS);
    } catch (error) {
      setIsListening(false);
      releaseStream();
      onErrorRef.current?.(toSpeechInputError(error, 'Could not start the microphone.'));
    }
  }, [clearMaxDurationTimer, releaseStream, stopMediaRecorder]);

  useEffect(() => {
    return () => {
      clearMaxDurationTimer();
      abortControllerRef.current?.abort();

      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      releaseStream();
    };
  }, [clearMaxDurationTimer, releaseStream]);

  const handleClick = useCallback(() => {
    if (isProcessing) {
      abortProcessing();

      return;
    }

    if (isListening) {
      stopMediaRecorder();

      return;
    }

    void startMediaRecorder();
  }, [abortProcessing, isListening, isProcessing, startMediaRecorder, stopMediaRecorder]);

  const isDisabled = disabled || !isSupported || !onAudioRecorded;
  const tooltip = getTooltip(isSupported && Boolean(onAudioRecorded), isListening, isProcessing);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="fk:relative fk:inline-flex fk:items-center fk:justify-center">
          {isListening
            ? [0, 1, 2].map((index) => (
                <span
                  className="fk:absolute fk:inset-0 fk:animate-ping fk:rounded-full fk:border-2 fk:border-red-400/30"
                  key={index}
                  style={{
                    animationDelay: `${String(index * 0.3)}s`,
                    animationDuration: '2s',
                  }}
                />
              ))
            : null}
          <Button
            aria-label={tooltip}
            aria-pressed={isListening}
            size={size}
            variant={isListening ? 'destructive' : variant}
            {...props}
            className={cn('fk:relative fk:z-10 fk:rounded-full fk:dark:hover:bg-accent', className)}
            disabled={isDisabled}
            onClick={handleClick}
            type="button"
          >
            {isProcessing ? <LoaderIcon className="fk:size-4 fk:animate-spin" /> : null}
            {!isProcessing && isListening ? <SquareIcon className="fk:size-4" /> : null}
            {!(isProcessing || isListening) ? <MicIcon className="fk:size-5" /> : null}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};
