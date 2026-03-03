import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './VideoPlayer.css';
import type Player from 'video.js/dist/types/player';
import { progressService } from '@/services/api.service';

interface VideoPlayerProps {
  videoId: string;
  src: string;
  subtitles?: Array<{
    src: string;
    srclang: string;
    label: string;
    default?: boolean;
  }>;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  initialTime?: number;
}

export function VideoPlayer({
  videoId,
  src,
  subtitles = [],
  onProgress,
  onEnded,
  initialTime = 0,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const progressIntervalRef = useRef<number | undefined>(undefined);
  const currentVideoIdRef = useRef<string>(videoId);
  // Always keep refs pointing to the latest callbacks so event listeners
  // registered once (in the [] useEffect) never close over stale values.
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, {
        controls: true,
        responsive: true,
        fluid: true,
        preload: 'auto',
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
        html5: {
          nativeTextTracks: false,
        },
        controlBar: {
          subtitlesButton: true,
          volumePanel: {
            inline: false,
          },
          children: [
            'playToggle',
            'skipBackward',
            'skipForward',
            'volumePanel',
            'currentTimeDisplay',
            'timeDivider',
            'durationDisplay',
            'progressControl',
            'playbackRateMenuButton',
            'subtitlesButton',
            'pictureInPictureToggle',
            'fullscreenToggle',
          ],
          skipForward: { skipTime: 15 },
          skipBackward: { skipTime: 15 },
        },
        textTrackSettings: true,
        sources: [{ src, type: 'video/mp4' }],
      }));

      player.on('ready', () => {
        subtitles.forEach((sub, index) => {
          player.addRemoteTextTrack({
            kind: 'subtitles',
            src: sub.src,
            srclang: sub.srclang,
            label: sub.label,
            default: sub.default || index === 0,
          }, false);
        });

        if (initialTime > 0) {
          player.currentTime(initialTime);
        }

        const handleKeydown = (e: KeyboardEvent) => {
          if (player.isDisposed()) return;
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

          switch (e.key) {
            case 'ArrowRight':
              e.preventDefault();
              player.currentTime(Math.min(player.currentTime()! + 5, player.duration()!));
              break;
            case 'ArrowLeft':
              e.preventDefault();
              player.currentTime(Math.max(player.currentTime()! - 5, 0));
              break;
            case ' ':
              e.preventDefault();
              if (player.paused()) { player.play(); } else { player.pause(); }
              break;
            case 'm':
            case 'M':
              player.muted(!player.muted());
              break;
            case 'f':
            case 'F':
              if (player.isFullscreen()) { player.exitFullscreen(); } else { player.requestFullscreen(); }
              break;
          }
        };

        document.addEventListener('keydown', handleKeydown);
        player.on('dispose', () => {
          document.removeEventListener('keydown', handleKeydown);
        });
      });

      player.on('ended', () => {
        if (onEndedRef.current) onEndedRef.current();
        progressService.markComplete(currentVideoIdRef.current).catch(console.error);
      });

      progressIntervalRef.current = window.setInterval(() => {
        if (player && !player.isDisposed() && !player.paused()) {
          const currentTime = player.currentTime() || 0;
          const duration = player.duration() || 1;
          const completionPercentage = (currentTime / duration) * 100;

          if (onProgressRef.current) onProgressRef.current(currentTime, duration);

          progressService
            .updateProgress(currentVideoIdRef.current, {
              lastPositionSeconds: Math.floor(currentTime),
              watchTimeSeconds: Math.floor(currentTime),
              completionPercentage: Math.floor(completionPercentage),
            })
            .catch((err: Error) => {
              console.warn('Progress update failed:', err.message);
            });
        }
      }, 5000);
    }

    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update video source and subtitles when videoId or src changes
  useEffect(() => {
    const player = playerRef.current;
    if (player && !player.isDisposed() && videoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = videoId;

      const remoteTracks = player.remoteTextTracks();
      const trackCount = remoteTracks.length || 0;
      for (let i = trackCount - 1; i >= 0; i--) {
        const track = remoteTracks[i];
        if (track) player.removeRemoteTextTrack(track as Parameters<typeof player.removeRemoteTextTrack>[0]);
      }

      player.src({ src, type: 'video/mp4' });

      player.one('loadedmetadata', () => {
        subtitles.forEach((sub) => {
          player.addRemoteTextTrack({
            kind: 'subtitles',
            src: sub.src,
            srclang: sub.srclang,
            label: sub.label,
            default: sub.default,
          }, false);
        });

        if (initialTime > 0) {
          player.currentTime(initialTime);
        } else {
          player.currentTime(0);
        }
      });

      player.play()?.catch(() => { /* ignore autoplay errors */ });
    }
  }, [videoId, src, initialTime, subtitles]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} className="w-full" />
    </div>
  );
}
