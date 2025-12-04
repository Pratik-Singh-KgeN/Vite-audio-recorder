import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Pause, Trash2, Upload, X } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import '../styles/Recorder.scss';


// --- Helper: Format Time ---
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // --- Configuration Constants ---
  const MODES = {
    LIMITED: 'limited',
    UNLIMITED: 'unlimited',
  };
  
  const AudioRecorderApp = () => {
    // --- Refs ---
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    const recordPluginRef = useRef(null);
    
    // --- State ---
    const [recorderState, setRecorderState] = useState('idle'); // 'idle', 'recording', 'paused', 'finished'
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [mode, setMode] = useState(MODES.LIMITED); // Default to limited
    const [recordedUrl, setRecordedUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
  
    // --- Visual Config ---
    const maxDuration = 30; // 30 seconds limit for 'limited' mode
    const primaryColor = '#a3e635'; // Lime-400
    const progressColor = '#d9f99d'; // Lime-200
    const waveHeight = 80;
  
    // --- Initialize WaveSurfer ---
    useEffect(() => {
      if (!containerRef.current) return;
  
      // Destroy previous instance if exists
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
  
      // 1. Create WaveSurfer Instance
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: primaryColor,
        progressColor: progressColor,
        height: waveHeight,
        barWidth: 2,
        barGap: 3,
        barRadius: 2,
        cursorWidth: 0, 
        normalize: true,
        // For unlimited: high pxPerSec causes scrolling. For limited: 0 fits container.
        minPxPerSec: mode === MODES.UNLIMITED ? 100 : 0, 
        fillParent: mode === MODES.LIMITED,
        interact: true, 
        hideScrollbar: true,
        autoScroll: true,
      });
  
      // 2. Initialize Record Plugin
      const record = ws.registerPlugin(RecordPlugin.create({
        scrollingWaveform: mode === MODES.UNLIMITED,
        renderRecordedAudio: false, // Prevent duplicate rendering on finish
      }));
  
      // --- Event Listeners ---
      
      // Update timer during recording
      record.on('record-progress', (time) => {
        const currentSecs = time / 1000;
        setDuration(currentSecs);
        
        // Auto-stop for limited mode logic
        if (mode === MODES.LIMITED && currentSecs >= maxDuration) {
          stopRecording();
        }
      });
  
      // Handle end of recording
      record.on('record-end', (blob) => {
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        // Load the audio for playback
        ws.load(url);
      });
  
      // Playback events
      ws.on('timeupdate', (time) => setCurrentTime(time));
      ws.on('finish', () => setIsPlaying(false));
      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
  
      wavesurferRef.current = ws;
      recordPluginRef.current = record;
  
      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }
      };
    }, [mode]);
  
    // --- Actions ---
  
    const startRecording = async () => {
      if (!recordPluginRef.current) return;
      
      // Request permissions and start
      try {
        // Check supported mime types
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        
        await recordPluginRef.current.startRecording({ mimeType });
        setRecorderState('recording');
        setRecordedUrl(null);
        setDuration(0);
      } catch (err) {
        console.error("Recording error:", err);
      }
    };
  
    const pauseRecording = () => {
      if (!recordPluginRef.current) return;
      recordPluginRef.current.pauseRecording();
      setRecorderState('paused');
    };
  
    const resumeRecording = () => {
      if (!recordPluginRef.current) return;
      recordPluginRef.current.resumeRecording();
      setRecorderState('recording');
    };
  
    const stopRecording = () => {
      if (!recordPluginRef.current) return;
      // Small delay to ensure last chunk is processed
      setTimeout(() => {
        if (recordPluginRef.current) recordPluginRef.current.stopRecording();
        setRecorderState('finished');
      }, 100);
    };
  
    const deleteRecording = () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.empty();
      }
      setRecorderState('idle');
      setDuration(0);
      setCurrentTime(0);
      setRecordedUrl(null);
      setIsPlaying(false);
    };
  
    const togglePlayback = () => {
      if (!wavesurferRef.current) return;
      wavesurferRef.current.playPause();
    };
  
    const handleUpload = () => {
      // In a real app, you would send `recordedUrl` (converted to blob) to your backend
      alert("Upload triggered! Ready to send Blob to server.");
    };
  
    return (
      <div className="audio-recorder-app">
        
        {/* Mode Switcher */}
        <div className="mode-switcher">
          <label className={`mode-option ${mode === MODES.LIMITED ? 'active' : ''}`}>
            <input 
              type="radio" 
              name="mode" 
              checked={mode === MODES.LIMITED} 
              onChange={() => { deleteRecording(); setMode(MODES.LIMITED); }}
            />
            Fixed Length (30s)
          </label>
          <label className={`mode-option ${mode === MODES.UNLIMITED ? 'active' : ''}`}>
            <input 
              type="radio" 
              name="mode" 
              checked={mode === MODES.UNLIMITED} 
              onChange={() => { deleteRecording(); setMode(MODES.UNLIMITED); }}
            />
            Unlimited Scroll
          </label>
        </div>
  
        {/* Main Recorder Card */}
        <div className="recorder-card">
          
          {/* Subtle Green Border/Glow Top */}
          <div className="card-glow"></div>
  
          <div className="card-content">
            
            {/* Close Button (Bottom Left, visible when Idle) */}
            {recorderState === 'idle' && (
              <button className="close-button">
                <X size={18} />
              </button>
            )}
  
            {/* --- Waveform Visualization Area --- */}
            <div className="waveform-container">
              <div className="waveform-background"></div>
              <div 
                ref={containerRef} 
                className="waveform-wrapper"
                style={{ 
                  overflowX: mode === MODES.UNLIMITED ? 'hidden' : 'visible' 
                }}
              />
            </div>
  
            {/* --- Timers --- */}
            <div className="timers">
              <span>
                {recorderState === 'finished' ? formatTime(currentTime) : formatTime(duration)}
              </span>
              <span>
                {mode === MODES.LIMITED ? formatTime(maxDuration) : formatTime(duration)}
              </span>
            </div>
  
            {/* --- Controls Area --- */}
            <div className="controls">
              
              {/* LEFT: Trash / Pause (Contextual) */}
              <div className="controls-left">
                {(recorderState === 'paused' || recorderState === 'recording' || recorderState === 'finished') && (
                  <div className="control-group">
                    <button 
                      onClick={deleteRecording}
                      className="control-button delete-button"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                    
                    {recorderState === 'recording' && (
                      <button
                        onClick={pauseRecording}
                        className="control-button pause-button"
                      >
                        <Pause size={16} fill="currentColor" />
                        <span>PAUSE</span>
                      </button>
                    )}
                    
                    {recorderState === 'paused' && (
                      <button
                        onClick={resumeRecording}
                        className="control-button resume-button"
                      >
                        <span>RESUME</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
  
              {/* CENTER: Main Action Button */}
              <div className="controls-center">
                
                {recorderState === 'idle' && (
                  <button 
                    onClick={startRecording}
                    className="main-button record-button"
                  >
                    <div className="button-ripple"></div>
                    <Mic className="icon" size={24} />
                  </button>
                )}
  
                {recorderState === 'recording' && (
                  <button 
                    onClick={stopRecording}
                    className="main-button stop-button"
                  >
                    <div className="button-pulse"></div>
                    <div className="stop-square"></div>
                  </button>
                )}
  
                {(recorderState === 'paused' || recorderState === 'finished') && (
                  <div className="button-spacer"></div>
                )}
  
              </div>
  
              {/* RIGHT: Play / Upload */}
              <div className="controls-right">
                {recorderState === 'finished' || recorderState === 'paused' ? (
                  <>
                    <button 
                      onClick={togglePlayback}
                      className="control-button play-button"
                    >
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>
                    
                    {recorderState === 'finished' && (
                      <button 
                        onClick={handleUpload}
                        className="control-button upload-button"
                      >
                        <Upload size={16} />
                        <span className="upload-text">UPLOAD</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button disabled className="control-button play-button disabled">
                    <Play size={18} fill="currentColor" />
                  </button>
                )}
              </div>
  
            </div>
  
          </div>
          
          {/* Progress Bar (Visual Only - Bottom Border for Limited Mode) */}
          {mode === MODES.LIMITED && recorderState !== 'idle' && (
            <div 
              className="progress-bar" 
              style={{ width: `${(duration / maxDuration) * 100}%` }}
            ></div>
          )}
  
        </div>
  
      </div>
    );
  };
  
  export default AudioRecorderApp;