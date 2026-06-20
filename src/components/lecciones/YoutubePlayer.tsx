import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, PictureInPicture2, Settings
} from 'lucide-react';

// ───────────────────────────────────────────────────────────────────────────────
// YouTube IFrame API types (minimal)
// ───────────────────────────────────────────────────────────────────────────────
declare global {
    interface Window {
        YT: {
            Player: new (id: string, opts: YTPlayerOptions) => YTPlayer;
            PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number; CUED: number };
        };
        onYouTubeIframeAPIReady: () => void;
    }
}
interface YTPlayerOptions {
    videoId: string;
    playerVars?: Record<string, number | string>;
    events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
        onPlaybackQualityChange?: (e: { data: string }) => void;
    };
}
interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    setVolume(volume: number): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    getVolume(): number;
    getDuration(): number;
    getCurrentTime(): number;
    setPlaybackRate(rate: number): void;
    getPlaybackRate(): number;
    getAvailablePlaybackRates(): number[];
    getAvailableQualityLevels(): string[];
    getPlaybackQuality(): string;
    setPlaybackQuality(suggestedQuality: string): void;
    getPlayerState(): number;
    destroy(): void;
}

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Load YouTube IFrame API once
let ytApiLoaded = false;
let ytApiCallbacks: (() => void)[] = [];

function loadYouTubeAPI(cb: () => void) {
    if (ytApiLoaded && window.YT?.Player) {
        cb();
        return;
    }
    ytApiCallbacks.push(cb);
    if (document.getElementById('yt-iframe-api-script')) return;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
        ytApiLoaded = true;
        if (prev) prev();
        ytApiCallbacks.forEach((fn) => fn());
        ytApiCallbacks = [];
    };
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api-script';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
}

// ───────────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────────
interface YouTubePlayerProps {
    videoId: string;
    title?: string;
}

const YouTubePlayer = ({ videoId, title }: YouTubePlayerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const iframeIdRef = useRef(`yt-player-${videoId}-${Math.random().toString(36).slice(2, 7)}`);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(100);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeedState] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [buffered, setBuffered] = useState(0);

    const isDraggingRef = useRef(false);
    const [quality, setQuality] = useState('auto');
    const [availableQualities, setAvailableQualities] = useState<string[]>([]);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    // ── Init YouTube Player ───────────────────────────────────────────────────
    useEffect(() => {
        loadYouTubeAPI(() => {
            playerRef.current = new window.YT.Player(iframeIdRef.current, {
                videoId,
                playerVars: {
                    controls: 0,          // hide YouTube native controls
                    modestbranding: 1,    // minimal branding
                    rel: 0,               // no related videos
                    showinfo: 0,
                    iv_load_policy: 3,    // no annotations
                    disablekb: 0,         // we handle keyboard
                    fs: 0,                // disable YouTube fullscreen (we use browser API)
                    playsinline: 1,
                    enablejsapi: 1,
                    origin: window.location.origin,
                    cc_load_policy: 0,
                    hl: 'es',
                },
                events: {
                    onReady: (e) => {
                        playerRef.current = e.target;
                        setDuration(e.target.getDuration());
                        setVolume(e.target.getVolume());
                        const qLevels = e.target.getAvailableQualityLevels();
                        if (qLevels && qLevels.length > 0) setAvailableQualities(qLevels);
                        setQuality(e.target.getPlaybackQuality() || 'auto');
                        setIsReady(true);
                    },
                    onStateChange: (e) => {
                        const S = window.YT.PlayerState;
                        setIsPlaying(e.data === S.PLAYING);
                        if (e.data === S.PLAYING) startProgressInterval();
                        else stopProgressInterval();
                        if (playerRef.current) {
                            setQuality(playerRef.current.getPlaybackQuality() || 'auto');
                            const qs = playerRef.current.getAvailableQualityLevels();
                            if (qs && qs.length > 0) {
                                setAvailableQualities(qs);
                            } else {
                                setAvailableQualities(['auto', 'hd1080', 'hd720', 'large', 'medium', 'small']);
                            }
                        }
                    },
                    onPlaybackQualityChange: (e) => {
                        setQuality(e.data || 'auto');
                    }
                },
            });
        });

        return () => {
            stopProgressInterval();
            playerRef.current?.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    // ── Progress tick ─────────────────────────────────────────────────────────
    const startProgressInterval = useCallback(() => {
        stopProgressInterval();
        progressIntervalRef.current = setInterval(() => {
            const p = playerRef.current;
            if (!p) return;
            if (!isDraggingRef.current) {
                setCurrentTime(p.getCurrentTime());
            }
            const dur = p.getDuration();
            if (dur) setDuration(dur);
            // buffered estimate (crude)
            setBuffered(Math.min(100, (p.getCurrentTime() / dur) * 100 + 10));
        }, 250);
    }, []);

    const stopProgressInterval = useCallback(() => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    }, []);

    // ── Controls auto-hide ────────────────────────────────────────────────────
    const resetHideTimer = useCallback(() => {
        setControlsVisible(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = setTimeout(() => {
            if (isPlaying) setControlsVisible(false);
        }, 3000);
    }, [isPlaying]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
    };

    const seek = (delta: number) => {
        if (!playerRef.current) return;
        const t = Math.max(0, Math.min(playerRef.current.getCurrentTime() + delta, duration));
        playerRef.current.seekTo(t, true);
        setCurrentTime(t);
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentTime(Number(e.target.value));
    };

    const handleSeekMouseDown = () => {
        isDraggingRef.current = true;
    };

    const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
        if (!playerRef.current) return;
        const t = Number((e.target as HTMLInputElement).value);
        playerRef.current.seekTo(t, true);
        // Esperamos 500ms para que la API de YouTube actualice su tiempo interno y evitar rebotes.
        setTimeout(() => {
            isDraggingRef.current = false;
        }, 500);
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        setVolume(v);
        setIsMuted(v === 0);
        playerRef.current?.setVolume(v);
        if (v > 0) playerRef.current?.unMute();
        else playerRef.current?.mute();
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
            playerRef.current.setVolume(volume || 80);
            setIsMuted(false);
        } else {
            playerRef.current.mute();
            setIsMuted(true);
        }
    };

    const applySpeed = (s: number) => {
        if (!playerRef.current) return;
        playerRef.current.setPlaybackRate(s);
        setSpeedState(s);
        setShowSpeedMenu(false);
    };

    const applyQuality = (q: string) => {
        if (!playerRef.current) return;
        playerRef.current.setPlaybackQuality(q);
        setQuality(q);
        setShowQualityMenu(false);
    };

    const formatQuality = (q: string) => {
        const map: Record<string, string> = {
            highres: '1080p+',
            hd1080: '1080p',
            hd720: '720p',
            large: '480p',
            medium: '360p',
            small: '240p',
            tiny: '144p',
            auto: 'Auto'
        };
        return map[q] || q;
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Fullscreen change listener
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            // Solo actuar si el reproductor está visible y "enfocado" o si es pantalla completa
            if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
            if (e.code === 'ArrowRight') seek(10);
            if (e.code === 'ArrowLeft') seek(-10);
            if (e.code === 'KeyF') toggleFullscreen();
            if (e.code === 'KeyM') toggleMute();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, isMuted, duration]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black rounded-xl overflow-hidden select-none group"
            onMouseMove={resetHideTimer}
            onMouseLeave={() => isPlaying && setControlsVisible(false)}
            onContextMenu={(e) => e.preventDefault()} // disable right-click
        >
            {/* ── YouTube iframe (hidden controls) ─────────────────────────────── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ transform: 'scale(1.04)' }} // slight scale to hide edge artifacts
            >
                <div id={iframeIdRef.current} className="w-full h-full" />
            </div>

            {/* ── Click interceptor overlay (play/pause on click, blocks YouTube UI) */}
            <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
            />

            {/* ── Loading state ───────────────────────────────────────────────── */}
            {!isReady && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-white/70 text-sm">Cargando video...</p>
                    </div>
                </div>
            )}

            {/* ── Big play button overlay (center) ────────────────────────────── */}
            {isReady && !isPlaying && (
                <div
                    className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
                    onClick={togglePlay}
                >
                    <div className="bg-primary/90 hover:bg-primary rounded-full p-5 shadow-2xl transition-transform hover:scale-110">
                        <Play className="h-10 w-10 text-white fill-white translate-x-0.5" />
                    </div>
                </div>
            )}

            {/* ── Controls bar ─────────────────────────────────────────────────── */}
            <div
                className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                {/* Gradient scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                <div className="relative px-4 pb-3 pt-8">
                    {/* Progress bar */}
                    <div className="relative h-1.5 mb-3 group/bar cursor-pointer">
                        {/* Buffered */}
                        <div
                            className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
                            style={{ width: `${buffered}%` }}
                        />
                        {/* Progress */}
                        <div
                            className="absolute inset-y-0 left-0 bg-primary rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            step={0.1}
                            value={currentTime}
                            onMouseDown={handleSeekMouseDown}
                            onTouchStart={handleSeekMouseDown}
                            onChange={handleSeekChange}
                            onMouseUp={handleSeekMouseUp}
                            onTouchEnd={handleSeekMouseUp}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                            aria-label="Progreso del video"
                        />
                        {/* Thumb */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                            style={{ left: `${progress}%` }}
                        />
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center gap-2 text-white">
                        {/* Back 10s */}
                        <button
                            onClick={() => seek(-10)}
                            className="p-1.5 hover:text-primary transition-colors"
                            title="Retroceder 10s"
                        >
                            <SkipBack className="h-4 w-4" />
                        </button>

                        {/* Play/Pause */}
                        <button
                            onClick={togglePlay}
                            className="p-1.5 hover:text-primary transition-colors"
                            title={isPlaying ? 'Pausar' : 'Reproducir'}
                        >
                            {isPlaying
                                ? <Pause className="h-5 w-5 fill-current" />
                                : <Play className="h-5 w-5 fill-current translate-x-px" />
                            }
                        </button>

                        {/* Forward 10s */}
                        <button
                            onClick={() => seek(10)}
                            className="p-1.5 hover:text-primary transition-colors"
                            title="Adelantar 10s"
                        >
                            <SkipForward className="h-4 w-4" />
                        </button>

                        {/* Volume */}
                        <button onClick={toggleMute} className="p-1.5 hover:text-primary transition-colors" title="Volumen">
                            {isMuted || volume === 0
                                ? <VolumeX className="h-4 w-4" />
                                : <Volume2 className="h-4 w-4" />
                            }
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolume}
                            className="w-20 accent-primary cursor-pointer"
                            aria-label="Volumen"
                        />

                        {/* Time */}
                        <span className="text-xs text-white/80 ml-1 tabular-nums">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Speed */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                className="p-1.5 hover:text-primary transition-colors flex items-center gap-1 text-xs"
                                title="Velocidad de reproducción"
                            >
                                <Settings className="h-4 w-4" />
                                <span>{speed}×</span>
                            </button>
                            {showSpeedMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-lg overflow-hidden shadow-xl z-40">
                                    <p className="text-xs text-white/50 px-3 pt-2 pb-1">Velocidad</p>
                                    {SPEEDS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => applySpeed(s)}
                                            className={`block w-full text-left px-4 py-1.5 text-sm transition-colors hover:bg-primary/20 ${speed === s ? 'text-primary font-semibold' : 'text-white'
                                                }`}
                                        >
                                            {s}×
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quality */}
                        {(availableQualities.length > 0 ? availableQualities : ['auto', 'hd1080', 'hd720', 'large', 'medium', 'small']).length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowQualityMenu(!showQualityMenu);
                                        setShowSpeedMenu(false);
                                    }}
                                    className="p-1.5 hover:text-primary transition-colors flex items-center gap-1 text-xs font-medium"
                                    title="Calidad de video"
                                >
                                    <span>{formatQuality(quality)}</span>
                                </button>
                                {showQualityMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-lg overflow-hidden shadow-xl z-40 whitespace-nowrap">
                                        <p className="text-xs text-white/50 px-3 pt-2 pb-1">Calidad</p>
                                        <button
                                            onClick={() => applyQuality('auto')}
                                            className={`block w-full text-left px-4 py-1.5 text-sm transition-colors hover:bg-primary/20 ${quality === 'auto' || !quality ? 'text-primary font-semibold' : 'text-white'
                                                }`}
                                        >
                                            {formatQuality('auto')}
                                        </button>
                                        {(availableQualities.length > 0 ? availableQualities : ['auto', 'hd1080', 'hd720', 'large', 'medium', 'small'])
                                            .filter(q => q !== 'auto' && q !== 'unknown')
                                            .map((q) => (
                                                <button
                                                    key={q}
                                                    onClick={() => applyQuality(q)}
                                                    className={`block w-full text-left px-4 py-1.5 text-sm transition-colors hover:bg-primary/20 ${quality === q ? 'text-primary font-semibold' : 'text-white'
                                                        }`}
                                                >
                                                    {formatQuality(q)}
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 hover:text-primary transition-colors"
                            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                        >
                            {isFullscreen
                                ? <Minimize className="h-4 w-4" />
                                : <Maximize className="h-4 w-4" />
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Speed menu backdrop */}
            {(showSpeedMenu || showQualityMenu) && (
                <div
                    className="absolute inset-0 z-[25]"
                    onClick={() => {
                        setShowSpeedMenu(false);
                        setShowQualityMenu(false);
                    }}
                />
            )}
        </div>
    );
};

export default YouTubePlayer;
