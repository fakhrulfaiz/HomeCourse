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
          nativeTextTracks: false, // Use Video.js text track implementation
        },
        controlBar: {
          subtitlesButton: true,
          volumePanel: {
            inline: false, // Vertical volume slider
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
        sources: [
          {
            src,
            type: 'video/mp4',
          },
        ],
      }));

      console.log('[VideoPlayer] Player initialized');

      player.on('ready', () => {
        
        console.log('[VideoPlayer] Player ready, adding initial subtitles');
        console.log('[VideoPlayer] Subtitle count:', subtitles.length);
        
        // Add subtitle tracks after player is ready
        subtitles.forEach((sub, index) => {
          console.log(`[VideoPlayer] Adding initial track ${index}:`, {
            src: sub.src,
            srclang: sub.srclang,
            label: sub.label,
            default: sub.default || index === 0
          });
          
          const trackElement = player.addRemoteTextTrack({
            kind: 'subtitles',
            src: sub.src,
            srclang: sub.srclang,
            label: sub.label,
            default: sub.default || index === 0, // Make first track default if none specified
          }, false);
          
          // Log track element to verify it was added
          console.log(`[VideoPlayer] Track ${index} element:`, trackElement);
        });
        
        console.log('[VideoPlayer] Total tracks after ready:', (player.remoteTextTracks() as any).length);
        
        // Log all text tracks for debugging
        const textTracks = player.textTracks();
        console.log('[VideoPlayer] Text tracks count:', (textTracks as any).length);
        for (let i = 0; i < (textTracks as any).length; i++) {
          const track = (textTracks as any)[i];
          console.log(`[VideoPlayer] Track ${i}:`, {
            kind: track.kind,
            label: track.label,
            language: track.language,
            mode: track.mode,
            src: track.src
          });
        }
        
        // Seek to initial time if provided
        if (initialTime > 0) {
          player.currentTime(initialTime);
        }

        // Keyboard shortcuts
        const handleKeydown = (e: KeyboardEvent) => {
          if (player.isDisposed()) return;

          // Don't capture keys if user is typing in an input
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

        // Clean up on dispose
        player.on('dispose', () => {
          document.removeEventListener('keydown', handleKeydown);
        });
      });

      player.on('ended', () => {
        if (onEndedRef.current) {
          onEndedRef.current();
        }
        // Mark as complete
        progressService.markComplete(currentVideoIdRef.current).catch(console.error);
      });

      // Track progress every 5 seconds
      progressIntervalRef.current = window.setInterval(() => {
        if (player && !player.isDisposed() && !player.paused()) {
          const currentTime = player.currentTime() || 0;
          const duration = player.duration() || 1;
          const completionPercentage = (currentTime / duration) * 100;

          if (onProgressRef.current) {
            onProgressRef.current(currentTime, duration);
          }

          // Update progress in backend
          progressService
            .updateProgress(currentVideoIdRef.current, {
              lastPositionSeconds: Math.floor(currentTime),
              watchTimeSeconds: Math.floor(currentTime),
              completionPercentage: Math.floor(completionPercentage),
            })
            .catch((err) => {
              // Silently fail if progress update fails
              console.warn('Progress update failed:', err.message);
            });
        }
      }, 5000);
    }

    // Dispose the Video.js player when the component unmounts
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
      
      console.log('[VideoPlayer] Switching to new video:', videoId);
      console.log('[VideoPlayer] New subtitles:', subtitles);
      
      // Remove all existing subtitle tracks
      const remoteTracks = player.remoteTextTracks();
      const trackCount = (remoteTracks as any).length || 0;
      console.log('[VideoPlayer] Removing', trackCount, 'existing tracks');
      for (let i = trackCount - 1; i >= 0; i--) {
        const track = (remoteTracks as any)[i];
        if (track) {
          player.removeRemoteTextTrack(track);
        }
      }
      
      // Update the source first
      player.src({ src, type: 'video/mp4' });
      
      // Add subtitle tracks AFTER the source has loaded
      // This is critical because player.src() clears all text tracks
      player.one('loadedmetadata', () => {
        console.log('[VideoPlayer] Source loaded, adding', subtitles.length, 'subtitle tracks');
        subtitles.forEach((sub, index) => {
          console.log(`[VideoPlayer] Adding track ${index}:`, {
            src: sub.src,
            srclang: sub.srclang,
            label: sub.label,
            default: sub.default
          });
          
          const trackElement = player.addRemoteTextTrack({
            kind: 'subtitles',
            src: sub.src,
            srclang: sub.srclang,
            label: sub.label,
            default: sub.default,
          }, false);
          
          console.log(`[VideoPlayer] Track ${index} added:`, trackElement);
        });
        
        console.log('[VideoPlayer] Total tracks after update:', (player.remoteTextTracks() as any).length);
        
        // Seek to initial time if provided
        if (initialTime > 0) {
          player.currentTime(initialTime);
        } else {
          // Reset to beginning for new video
          player.currentTime(0);
        }
      });
      
      
      // Auto-play the new video
      player.play()?.catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [videoId, src, initialTime, subtitles]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} className="w-full" />
    </div>
  );
}
