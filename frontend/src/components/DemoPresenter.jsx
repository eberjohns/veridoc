import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Presentation
} from 'lucide-react';

export const DEMO_STEPS = [
  {
    id: 'hero',
    title: '1. Mathematical & Scientific Architecture',
    targetView: 'landing',
    targetSelector: '#hero',
    duration: 6
  },
  {
    id: 'pipeline',
    title: '2. Deterministic Forensic Pipeline',
    targetView: 'landing',
    targetSelector: '#pipeline',
    duration: 6
  },
  {
    id: 'algorithms',
    title: '3. 8 Deep Forensic Check Algorithms',
    targetView: 'landing',
    targetSelector: '#algorithms',
    duration: 7
  },
  {
    id: 'benchmarks',
    title: '4. Zero-Drift Benchmark Telemetry',
    targetView: 'landing',
    targetSelector: '#benchmarks',
    duration: 5
  },
  {
    id: 'zone1_layers',
    title: '5. Zone 1: Forensic Checks & Overlay Opacity',
    targetView: 'workspace',
    targetSelector: 'aside',
    duration: 6
  },
  {
    id: 'zone2_canvas',
    title: '6. Zone 2: Document Canvas & Heatmap Overlays',
    targetView: 'workspace',
    targetSelector: 'main',
    duration: 6
  },
  {
    id: 'zone3_auditor',
    title: '7. Zone 3: Trust Score & Detailed Forensic Findings',
    targetView: 'workspace',
    targetSelector: 'aside:last-of-type',
    duration: 6
  }
];

export default function DemoPresenter({
  currentView,
  onSwitchView,
  onLoadSamples,
  isDemoActive,
  setIsDemoActive
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  const currentStep = DEMO_STEPS[currentStepIndex] || DEMO_STEPS[0];

  // Start presentation
  const handleStart = () => {
    setIsDemoActive(true);
    setCurrentStepIndex(0);
    setIsPlaying(true);
    setProgress(0);
  };

  // Stop / Exit presentation
  const handleStop = () => {
    setIsDemoActive(false);
    setIsPlaying(false);
    clearInterval(timerRef.current);
  };

  // Go to next step
  const handleNext = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setProgress(0);
    } else {
      handleStop();
    }
  };

  // Go to prev step
  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  // Execute step transitions & smooth scrolling
  useEffect(() => {
    if (!isDemoActive) return;
    const step = DEMO_STEPS[currentStepIndex];
    if (!step) return;

    // View switching
    if (step.targetView !== currentView) {
      onSwitchView(step.targetView);
    }
    if (step.targetView === 'workspace') {
      setTimeout(() => {
        onLoadSamples?.();
      }, 150);
    }

    // Auto-scroll inside landing container or workspace
    if (step.targetSelector) {
      setTimeout(() => {
        const el = document.querySelector(step.targetSelector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }
  }, [currentStepIndex, isDemoActive]);

  // Timer loop for auto-advance
  useEffect(() => {
    if (!isDemoActive || !isPlaying) {
      clearInterval(timerRef.current);
      return;
    }

    const step = DEMO_STEPS[currentStepIndex];
    const totalMs = (step?.duration || 6) * 1000;
    const intervalMs = 100;
    const increment = (intervalMs / totalMs) * 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timerRef.current);
  }, [isDemoActive, isPlaying, currentStepIndex]);

  // Floating trigger button (when demo is not active)
  if (!isDemoActive) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999
      }}>
        <button
          onClick={handleStart}
          title="Launch Guided Demo Tour"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '9999px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
            transition: 'transform 0.15s, background-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
        >
          <Presentation size={16} />
        </button>
      </div>
    );
  }

  // Sleek Floating Controller
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '520px',
      maxWidth: '92vw',
      zIndex: 10000,
      backgroundColor: '#FFFFFF',
      border: '1px solid #CBD5E1',
      borderRadius: '12px',
      boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none'
    }}>
      {/* Subtle Progress Bar */}
      <div style={{ width: '100%', height: '3px', backgroundColor: '#F1F5F9' }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: '#2563EB',
          transition: 'width 0.1s linear'
        }} />
      </div>

      {/* Main Bar Controls */}
      <div style={{
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Step Indicator & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{
            fontSize: '10.5px',
            fontWeight: '800',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            padding: '2px 7px',
            borderRadius: '4px',
            letterSpacing: '0.04em',
            flexShrink: 0
          }}>
            {currentStepIndex + 1} / {DEMO_STEPS.length}
          </span>
          <span style={{
            fontSize: '12.5px',
            fontWeight: '700',
            color: '#0F172A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {currentStep.title}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            title="Previous Step"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: currentStepIndex === 0 ? '#CBD5E1' : '#475569',
              borderRadius: '6px',
              padding: '5px 8px',
              cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '11px',
              fontWeight: '600'
            }}
          >
            <SkipBack size={13} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Auto-Play' : 'Resume Auto-Play'}
            style={{
              backgroundColor: isPlaying ? '#F1F5F9' : '#2563EB',
              border: isPlaying ? '1px solid #CBD5E1' : 'none',
              color: isPlaying ? '#334155' : '#FFFFFF',
              borderRadius: '6px',
              padding: '5px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11.5px',
              fontWeight: '700'
            }}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} fill="#FFFFFF" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={handleNext}
            title="Next Step"
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#334155',
              borderRadius: '6px',
              padding: '5px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: '600'
            }}
          >
            <span>{currentStepIndex === DEMO_STEPS.length - 1 ? 'Finish' : 'Next'}</span>
            <SkipForward size={13} />
          </button>

          <button
            onClick={handleStop}
            title="Exit Presentation"
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '6px',
              marginLeft: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
            onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
