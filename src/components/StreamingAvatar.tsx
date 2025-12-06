"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";

interface AvatarConfig {
  avatarId: string;
  voiceId: string;
  quality: AvatarQuality;
  emotion: VoiceEmotion;
}

const AVATAR_PRESETS: Record<string, AvatarConfig> = {
  "Sports Anchor": {
    avatarId: "Wayne_20240711",
    voiceId: "1bd001e7e50f421d891986aad5158bc8",
    quality: AvatarQuality.High,
    emotion: VoiceEmotion.EXCITED,
  },
  "News Reporter": {
    avatarId: "Anna_public_3_20240108",
    voiceId: "2d5b0e6cf36f460aa7fc47e3eee4ba54",
    quality: AvatarQuality.High,
    emotion: VoiceEmotion.BROADCASTER,
  },
  "Friendly Host": {
    avatarId: "josh_lite3_20230714",
    voiceId: "131a436c47064f708210df6628ef8f32",
    quality: AvatarQuality.High,
    emotion: VoiceEmotion.FRIENDLY,
  },
};

export default function StreamingAvatarComponent() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [scriptText, setScriptText] = useState(
    "Welcome to AI Sports News! I'm your virtual anchor, bringing you the latest updates and analysis. The Lakers are facing the Celtics tonight in what promises to be an epic showdown..."
  );
  const [selectedPreset, setSelectedPreset] = useState("Sports Anchor");
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);

  const addDebug = useCallback((msg: string) => {
    setDebug((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const fetchAccessToken = async (): Promise<string> => {
    const response = await fetch("/api/heygen", { method: "POST" });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get access token");
    }
    const data = await response.json();
    return data.token;
  };

  const startSession = async () => {
    setIsLoading(true);
    setError(null);
    addDebug("Starting session...");

    try {
      const token = await fetchAccessToken();
      addDebug("Got access token");

      const avatar = new StreamingAvatar({ token });
      avatarRef.current = avatar;

      const preset = AVATAR_PRESETS[selectedPreset];

      // Set up event listeners
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        addDebug("Stream ready!");
        if (videoRef.current && event.detail) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.play().catch(console.error);
        }
        setIsSessionActive(true);
        setIsLoading(false);
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        addDebug("Stream disconnected");
        setIsSessionActive(false);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      });

      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        addDebug("Avatar started talking");
        setIsSpeaking(true);
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        addDebug("Avatar stopped talking");
        setIsSpeaking(false);
      });

      addDebug(`Creating session with avatar: ${preset.avatarId}`);

      await avatar.createStartAvatar({
        quality: preset.quality,
        avatarName: preset.avatarId,
        voice: {
          voiceId: preset.voiceId,
          rate: 1.0,
          emotion: preset.emotion,
        },
        language: "en",
      });

      addDebug("Session created successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      addDebug(`Error: ${message}`);
      setIsLoading(false);
    }
  };

  const speak = async () => {
    if (!avatarRef.current || !scriptText.trim()) return;

    addDebug("Sending speech request...");
    try {
      await avatarRef.current.speak({
        text: scriptText,
        taskType: TaskType.REPEAT,
      });
      addDebug("Speech request sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Speech failed";
      setError(message);
      addDebug(`Speech error: ${message}`);
    }
  };

  const stopSpeaking = async () => {
    if (!avatarRef.current) return;
    try {
      await avatarRef.current.interrupt();
      addDebug("Interrupted speech");
    } catch (err) {
      addDebug("Interrupt failed");
    }
  };

  const endSession = async () => {
    if (!avatarRef.current) return;

    addDebug("Ending session...");
    try {
      await avatarRef.current.stopAvatar();
    } catch (err) {
      addDebug("Stop avatar error (may be normal)");
    }

    avatarRef.current = null;
    setIsSessionActive(false);
    setIsSpeaking(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    addDebug("Session ended");
  };

  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            AI Sports News Channel
          </h1>
          <p className="text-slate-400">
            Powered by HeyGen Streaming Avatar | Modern AI Pro Workshop
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Panel */}
          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!isSessionActive && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <div className="text-6xl mb-4">🎬</div>
                    <p>Start a session to see your AI anchor</p>
                  </div>
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center text-white">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p>Initializing avatar...</p>
                  </div>
                </div>
              )}
              {isSpeaking && (
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                  LIVE
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Select Anchor Style
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  disabled={isSessionActive}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
                >
                  {Object.keys(AVATAR_PRESETS).map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                {!isSessionActive ? (
                  <button
                    onClick={startSession}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {isLoading ? "Starting..." : "Start Session"}
                  </button>
                ) : (
                  <button
                    onClick={endSession}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    End Session
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Script Panel */}
          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">
              Anchor Script
            </h2>

            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Enter the script for your AI anchor to read..."
              className="w-full h-48 bg-slate-700 text-white rounded-lg px-4 py-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <div className="mt-2 text-sm text-slate-400">
              {scriptText.split(" ").filter(Boolean).length} words |{" "}
              ~{Math.ceil(scriptText.split(" ").filter(Boolean).length / 150 * 60)} seconds
            </div>

            <div className="mt-4 flex gap-4">
              <button
                onClick={speak}
                disabled={!isSessionActive || isSpeaking || !scriptText.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSpeaking ? "Speaking..." : "Speak Script"}
              </button>
              <button
                onClick={stopSpeaking}
                disabled={!isSpeaking}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Stop
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg p-4">
                {error}
              </div>
            )}

            {/* Debug Log */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-2">
                Debug Log
              </h3>
              <div className="bg-slate-900 rounded-lg p-3 h-32 overflow-y-auto text-xs text-slate-400 font-mono">
                {debug.length === 0 ? (
                  <p>Waiting for events...</p>
                ) : (
                  debug.map((msg, i) => <div key={i}>{msg}</div>)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>
            Built for Modern AI Pro Workshop | Using HeyGen Streaming Avatar SDK
          </p>
        </div>
      </div>
    </div>
  );
}
