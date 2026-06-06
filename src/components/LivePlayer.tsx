import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Tv, RefreshCw, AlertTriangle, Activity, Settings, Settings2, Info } from "lucide-react";
import { Channel, PlaybackStatus } from "../types";

interface LivePlayerProps {
  channel: Channel;
  theaterMode: boolean;
  onToggleTheater: () => void;
}

export default function LivePlayer({ channel, theaterMode, onToggleTheater }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("player_volume");
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("player_muted") === "true";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [diagnostics, setDiagnostics] = useState({
    resolution: "Auto",
    bufferedAhead: 0,
    latency: "0.2s",
    fps: 0,
  });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restart feed on click
  const [retryKey, setRetryKey] = useState(0);

  // Mouse hover controls auto-hide
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Load stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setPlaybackStatus("loading");
    setIsPlaying(true);

    // Clean old stream
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if direct iframe embed or m3u8
    const isM3U8 = channel.url.includes(".m3u8") || channel.url.includes(".ts");

    if (!isM3U8) {
      // Set playing immediately and let browser handle it (could be an embed or standard url)
      video.src = channel.url;
      video.play().catch(() => setIsPlaying(false));
      setPlaybackStatus("playing");
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferSize: 30 * 1000 * 1000, // 30MB
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(channel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play()
          .then(() => {
            setIsPlaying(true);
            setPlaybackStatus("playing");
          })
          .catch(() => {
            console.warn("Unmuted playback restricted on initial manifest parse. Trying muted playback.");
            // Graceful autoplay fallback: Muted playback
            video.muted = true;
            setIsMuted(true);
            video.play()
              .then(() => {
                setIsPlaying(true);
                setPlaybackStatus("playing");
              })
              .catch(() => {
                setIsPlaying(false);
                setPlaybackStatus("idle");
              });
          });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("HLS network error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("HLS media error, attempting recovery...");
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal player error occurred", data);
              setPlaybackStatus("error");
              if (hlsRef.current) hlsRef.current.destroy();
              break;
          }
        }
      });

      // Buffer tracker
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (video) {
          let bufferedAhead = 0;
          if (video.buffered.length > 0) {
            const curTime = video.currentTime;
            for (let i = 0; i < video.buffered.length; i++) {
              if (video.buffered.start(i) <= curTime && video.buffered.end(i) >= curTime) {
                bufferedAhead = video.buffered.end(i) - curTime;
                break;
              }
            }
          }
          setDiagnostics((d) => ({
            ...d,
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            bufferedAhead: parseFloat(bufferedAhead.toFixed(1)),
          }));
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS
      video.src = channel.url;
      video.addEventListener("loadedmetadata", () => {
        video.play()
          .then(() => {
            setIsPlaying(true);
            setPlaybackStatus("playing");
          })
          .catch(() => {
            console.warn("Unmuted playback restricted in Safari HLS. Trying muted playback.");
            video.muted = true;
            setIsMuted(true);
            video.play()
              .then(() => {
                setIsPlaying(true);
                setPlaybackStatus("playing");
              })
              .catch(() => {
                setIsPlaying(false);
                setPlaybackStatus("idle");
              });
          });
      });
    } else {
      setPlaybackStatus("error");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel.url, retryKey]);

  // Volume operations
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
      video.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    localStorage.setItem("player_volume", val.toString());
    localStorage.setItem("player_muted", (val === 0).toString());
  };

  const toggleMute = () => {
    const state = !isMuted;
    setIsMuted(state);
    localStorage.setItem("player_muted", state.toString());
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const handleReconnect = () => {
    setRetryKey((k) => k + 1);
  };

  // Keyboard shortcut actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          handleFullscreen();
          break;
        case "KeyT":
          onToggleTheater();
          break;
        case "KeyR":
          handleReconnect();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => Math.min(1, parseFloat((v + 0.1).toFixed(1))));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => Math.max(0, parseFloat((v - 0.1).toFixed(1))));
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isMuted, volume]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative group bg-[#111] overflow-hidden rounded-2xl border border-white/5 shadow-2xl transition-all duration-300 ${
        theaterMode ? "w-full aspect-video" : "w-full aspect-video"
      }`}
      id="video-player-root"
    >
      {/* Video Tag */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      {/* Center Play Button Overlay */}
      {!isPlaying && playbackStatus !== "loading" && playbackStatus !== "error" && (
        <div 
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/45 cursor-pointer hover:bg-black/55 transition-colors z-25"
          id="center-play-button-overlay"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-brand-accent text-white shadow-2xl scale-95 hover:scale-105 active:scale-90 transition-all duration-300">
            <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1 md:ml-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Muted override helper */}
      {isPlaying && isMuted && playbackStatus === "playing" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(false);
          }}
          className="absolute top-4 left-4 z-30 bg-brand-accent hover:bg-brand-hover border border-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg animate-bounce active:scale-95 transition-all font-sans"
          id="muted-autoplay-hint-banner"
        >
          <VolumeX className="w-4 h-4 animate-pulse" />
          <span>Tap to unmute</span>
        </button>
      )}

      {/* Loading Overlay */}
      {playbackStatus === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90">
          <div className="w-10 h-10 border-4 border-[#9147ff]/20 border-t-[#9147ff] rounded-full animate-spin mb-4" />
          <p className="text-white font-bold text-xs tracking-widest text-gray-300 uppercase">
            Connecting Stream...
          </p>
          <p className="text-gray-400 text-xs mt-1">{channel.name}</p>
        </div>
      )}

      {/* Video Offline or Error State */}
      {playbackStatus === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0d0d11] p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">This channel is temporarily offline</h3>
          <p className="text-gray-400 max-w-sm text-xs mb-6">
            The stream link for <strong className="text-white">{channel.name}</strong> might have expired or is experiencing temporary buffering. Please try another channel.
          </p>
          <button
            onClick={handleReconnect}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 font-bold text-white rounded-lg transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Reconnect
          </button>
        </div>
      )}

      {/* Overlay controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 md:p-6 transition-opacity duration-300 z-20 flex flex-col gap-3 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Display Bar (Buffer Visualization for Live) */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative flex items-center">
          <div className="absolute top-0 bottom-0 left-0 bg-[#9147ff] w-[4px] rounded-full" />
          <div className="bg-[#9147ff]/20 h-full w-full" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-[#9147ff]/20 text-white hover:text-[#9147ff] transition-all"
              id="player-play-toggle-btn"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Muted/Volume Controls */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                id="player-mute-btn"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 transition-all duration-300 origin-left scale-x-0 group-hover/volume:scale-x-100 accent-[#9147ff] h-1.5 rounded-full cursor-pointer bg-white/25"
              />
            </div>

            {/* Live Indicator Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-red-600/20 border border-red-600/30 rounded">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-red-500">LIVE</span>
            </div>

            {/* Title */}
            <div className="hidden sm:block">
              <p className="text-white text-sm font-semibold truncate max-w-[200px] md:max-w-xs">{channel.name}</p>
              <p className="text-gray-400 text-[10px] tracking-wide font-mono">{channel.group.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Network / Stats Indicator */}
            <button
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className={`p-2.5 rounded-full text-white transition-all ${
                showDiagnostics ? "bg-[#9147ff]/20 text-[#9147ff]" : "bg-white/10 hover:bg-white/20"
              }`}
              title="Stream Diagnostics"
            >
              <Activity className="w-4 h-4" />
            </button>

            {/* Theater Mode Button */}
            <button
              onClick={onToggleTheater}
              className={`p-2.5 rounded-full text-white transition-all ${
                theaterMode ? "bg-[#9147ff]/20 text-[#9147ff]" : "bg-white/10 hover:bg-white/20"
              }`}
              title={theaterMode ? "Normal Mode (T)" : "Theater Mode (T)"}
              id="player-theater-mode-btn"
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Fullscreen Mode Button */}
            <button
              onClick={handleFullscreen}
              className="p-2.5 rounded-full bg-white/10 hover:bg-[#9147ff]/20 text-white hover:text-[#9147ff] transition-all"
              title="Fullscreen (F)"
              id="player-fullscreen-btn"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics panel */}
      {showDiagnostics && (
        <div className="absolute top-4 right-4 z-30 bg-[#121217] border border-white/10 p-4 rounded-lg max-w-[240px] text-xs font-mono text-gray-300 shadow-lg">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-[#9147ff] font-bold flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Diagnostics
            </span>
            <button onClick={() => setShowDiagnostics(false)} className="text-gray-500 hover:text-white">x</button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Codec/Stream:</span>
              <span className="text-white font-medium">H264/AAC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Resolution:</span>
              <span className="text-[#9147ff] font-medium">{diagnostics.resolution}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Buffer state:</span>
              <span className="text-green-400 font-medium">{diagnostics.bufferedAhead}s ahead</span>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Channels Info/Frame Overlay if url is not direct m3u8 */}
      {!channel.url.includes(".m3u8") && !channel.url.includes(".ts") && (
        <div className="absolute top-4 left-4 bg-white/5 text-gray-300 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 backdrop-blur">
          <Settings2 className="w-3.5 h-3.5" /> External Source Playback Mode
        </div>
      )}
    </div>
  );
}
