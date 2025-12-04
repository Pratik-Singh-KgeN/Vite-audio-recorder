import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";

export default function Recorder({ maxDuration = null }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const recordRef = useRef(null);

  const [mode, _setMode] = useState("idle");
  const [_blob, setBlob] = useState(null);
  const [time, setTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const timerRef = useRef(null);
  const modeRef = useRef("idle");

  // Helper to update both mode state and ref
  const setMode = (newMode) => {
    modeRef.current = newMode;
    _setMode(newMode);
  };

  // Timer functions
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTime((t) => {
        const newTime = t + 1;
        if (maxDuration && newTime >= maxDuration) {
          if (recordRef.current) {
            recordRef.current.stopRecording();
          }
        }
        return newTime;
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" + secs : secs}`;
  };

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#2d4a54",
      progressColor: "#8eff64",
      height: 80,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      cursorColor: "#8eff64",
      cursorWidth: 2,
      interact: false,
      hideScrollbar: true,
    });

    // Create static baseline waveform with equal height bars
    const baselineData = Array(200).fill(0.05);
    ws.load("", baselineData);

    const record = ws.registerPlugin(
      RecordPlugin.create({
        scrollingWaveform: false,
        renderRecordedAudio: true,
      })
    );

    wavesurferRef.current = ws;
    recordRef.current = record;

    record.on("record-end", (recordedBlob) => {
      setBlob(recordedBlob);
      setMode("stopped");
      stopTimer();
      ws.loadBlob(recordedBlob);
      ws.on("interaction", () => {
        ws.play();
        setMode("playing");
      });
    });

    record.on("record-progress", (currentTime) => {
      setTime(Math.floor(currentTime / 1000));
    });

    ws.on("audioprocess", () => {
      if (modeRef.current === "playing") {
        setPlaybackTime(Math.floor(ws.getCurrentTime()));
      }
    });

    ws.on("finish", () => {
      setMode("stopped");
      setPlaybackTime(0);
    });

    return () => {
      ws.destroy();
    };
  }, []);

  // Enable interaction after recording
  useEffect(() => {
    if (!wavesurferRef.current) return;
  
    const ws = wavesurferRef.current;
  
    if (mode === "playing") {
      ws.setOptions({ interact: true, cursorWidth: 2 });  // show cursor
    } else if (mode === "stopped") {
      ws.setOptions({ interact: true, cursorWidth: 0 });  // stop ⇒ no cursor
    } else {
      ws.setOptions({ interact: false, cursorWidth: 0 }); // idle/recording/paused
    }
  }, [mode]);

  const startRecording = () => {
    setMode("recording");
    setTime(0);
    recordRef.current.startRecording();
    if (!maxDuration) {
      startTimer();
    }
  };

  const pauseRecording = () => {
    recordRef.current.pauseRecording();
    stopTimer();
    setMode("paused");
  };

  const resumeRecording = () => {
    recordRef.current.resumeRecording();
    if (!maxDuration) {
      startTimer();
    }
    setMode("recording");
  };

  const stopRecording = () => {
    if (mode !== "recording" && mode !== "paused") return;
    recordRef.current.stopRecording();
  };

  const play = () => {
    wavesurferRef.current.play();
    setMode("playing");
  };

  const pause = () => {
    wavesurferRef.current.pause();
    setMode("stopped");
  };

  const restart = () => {
    stopTimer();
    setTime(0);
    setPlaybackTime(0);
    setBlob(null);
    setMode("idle");
  
    if (wavesurferRef.current) {
      const ws = wavesurferRef.current;
  
      // Create equal height baseline bars
      const baselineData = Array(200).fill(0.05);
  
      ws.load("", baselineData);
  
      ws.seekTo(0);
      ws.setOptions({ interact: false, cursorWidth: 0 }); // ⬅ hide cursor
    }
  };
  

  const mockUpload = () => {
    alert("Uploading recorded audio...");
  };

  const getCurrentDisplayTime = () => {
    if (mode === "playing") return playbackTime;
    return time;
  };

  return (
    <div style={{
      background: "#1a2a32",
      padding: "40px 30px",
      borderRadius: "12px",
      border: "2px solid #2d4a54",
      maxWidth: "700px",
      margin: "auto",
      fontFamily: "monospace"
    }}>
      <div style={{
        border: "1px solid #2d4a54",
        padding: "15px",
        marginBottom: "20px",
        borderRadius: "8px",
        background: "#0f1c23"
      }}>
        <div ref={containerRef} style={{ width: "100%", height: "80px" }} />
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        color: "#8eff64",
        fontSize: "20px",
        fontWeight: "500",
        marginBottom: "30px",
        padding: "0 10px"
      }}>
        <span>{formatTime(0)}</span>
        <span>{formatTime(mode === "idle" ? (maxDuration || 0) : getCurrentDisplayTime())}</span>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "15px",
        flexWrap: "wrap"
      }}>
        {mode === "idle" && (
          <button
            onClick={startRecording}
            style={{
              background: "transparent",
              border: "4px solid #ff6b6b",
              color: "#ff6b6b",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s",
              boxShadow: "0 0 20px rgba(255, 107, 107, 0.3)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#ff6b6b";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <div style={{
              width: "20px",
              height: "20px",
              background: "#ff6b6b",
              borderRadius: "4px"
            }} />
          </button>
        )}

        {mode === "recording" && (
          <>
            <button
              onClick={restart}
              style={{
                background: "#2d3e47",
                border: "none",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              🗑
            </button>
            <button
              onClick={pauseRecording}
              style={{
                background: "#2d3e47",
                border: "none",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              ⏸ PAUSE
            </button>
            <button
              onClick={stopRecording}
              style={{
                background: "transparent",
                border: "4px solid #ff6b6b",
                color: "#ff6b6b",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse 1.5s ease-in-out infinite"
              }}
            >
              <div style={{
                width: "20px",
                height: "20px",
                background: "#ff6b6b",
                borderRadius: "4px"
              }} />
            </button>
          </>
        )}

        {mode === "paused" && (
          <>
            <button
              onClick={restart}
              style={{
                background: "#2d3e47",
                border: "none",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              🗑
            </button>
            <button
              onClick={resumeRecording}
              style={{
                background: "#2d3e47",
                border: "none",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              ▶ RESUME
            </button>
            <button
              onClick={stopRecording}
              style={{
                background: "transparent",
                border: "4px solid #ff6b6b",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "20px"
              }}
            >
              ⏹
            </button>
          </>
        )}

        {(mode === "stopped" || mode === "playing") && (
          <>
            <button
              onClick={restart}
              style={{
                background: "#2d3e47",
                border: "none",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              🗑
            </button>
            <button
              onClick={restart}
              style={{
                background: "#2d3e47",
                border: "none",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              ↻ Start Again
            </button>

            {mode !== "playing" ? (
              <button
                onClick={play}
                style={{
                  background: "#2d3e47",
                  border: "none",
                  color: "#8eff64",
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "20px"
                }}
              >
                ▶
              </button>
            ) : (
              <button
                onClick={pause}
                style={{
                  background: "#2d3e47",
                  border: "none",
                  color: "#8eff64",
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "20px"
                }}
              >
                ⏸
              </button>
            )}

            <button
              onClick={mockUpload}
              style={{
                background: "#8eff64",
                border: "none",
                color: "#000",
                padding: "12px 28px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "700"
              }}
            >
              ⬆ UPLOAD
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 107, 107, 0.6);
          }
        }
      `}</style>
    </div>
  );
}
