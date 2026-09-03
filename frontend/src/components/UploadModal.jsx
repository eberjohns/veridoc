import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  FileText, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Flame, 
  Copy, 
  Calculator, 
  Layers, 
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { uploadAndAnalyzeDocument } from '../services/api';

const PIPELINE_STAGES = [
  { 
    id: 'preflight', 
    label: 'Pre-Flight Quality & Deskew', 
    detail: 'Measuring Laplacian blur variance and glare hotspots',
    icon: ShieldCheck
  },
  { 
    id: 'hashing', 
    label: '3-Layer Fingerprinting', 
    detail: 'Generating SHA-256, DCT pHash & SimHash duplicate checks',
    icon: FileText
  },
  { 
    id: 'metadata', 
    label: 'Container & Revision Audit', 
    detail: 'Traversing trailer dictionaries and software producer tags',
    icon: Layers
  },
  { 
    id: 'ela', 
    label: 'Error Level Analysis (ELA)', 
    detail: 'Amplifying JPEG compression error variance (20x multiplier)',
    icon: Flame
  },
  { 
    id: 'dct', 
    label: 'DCT 2D Block-Matching Copy-Move', 
    detail: 'Scanning overlapping 16x16 frequency blocks for cloned regions',
    icon: Copy
  },
  { 
    id: 'math', 
    label: 'OCR & Ledger Math Reconciliation', 
    detail: 'Verifying double-entry balance formulas and duplicate table rows',
    icon: Calculator
  },
  { 
    id: 'synthesis', 
    label: 'Trust Score & Risk Synthesis', 
    detail: 'Compiling cross-layer evidentiary findings into audit verdict',
    icon: Cpu
  }
];

export default function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const fileInputRef = useRef(null);
  const stageTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setIsUploading(false);
      setErrorMsg(null);
      setActiveStageIndex(0);
      setProgressPercent(0);
      clearInterval(stageTimerRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = async (file) => {
    if (!file) return;
    setErrorMsg(null);
    setIsUploading(true);
    setActiveStageIndex(0);
    setProgressPercent(12);

    // Simulate realistic live pipeline progression while backend executes
    stageTimerRef.current = setInterval(() => {
      setActiveStageIndex(prev => {
        if (prev < PIPELINE_STAGES.length - 2) {
          const next = prev + 1;
          setProgressPercent(Math.round(((next + 1) / PIPELINE_STAGES.length) * 88));
          return next;
        }
        return prev;
      });
    }, 450);

    try {
      const result = await uploadAndAnalyzeDocument(file);
      clearInterval(stageTimerRef.current);
      setActiveStageIndex(PIPELINE_STAGES.length - 1);
      setProgressPercent(100);

      // Brief delay so user sees all green checkmarks
      setTimeout(() => {
        onUploadComplete(result, file);
        onClose();
      }, 350);
    } catch (err) {
      clearInterval(stageTimerRef.current);
      setIsUploading(false);
      setErrorMsg(err.message || 'Failed to analyze document.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      userSelect: 'none',
      padding: '20px'
    }}>
      <div style={{
        width: isUploading ? '520px' : '460px',
        maxWidth: '92vw',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        padding: '24px',
        position: 'relative',
        transition: 'width 0.2s ease'
      }}>
        {/* Close button */}
        {!isUploading && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Header */}
        <div style={{ marginBottom: '18px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px 0' }}>
            {isUploading ? 'Executing Forensic Verification Pipeline' : 'Upload Document for Forensic Analysis'}
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
            {isUploading 
              ? 'Multi-spectral computer vision, frequency transform, and ledger accounting engines active.'
              : 'Upload PDF, JPG, or PNG files to execute deterministic multi-layer verification.'}
          </p>
        </div>

        {/* Dropzone OR Live Multi-Stage Progress */}
        {!isUploading ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#2563EB' : '#CBD5E1'}`,
              borderRadius: '8px',
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: isDragging ? '#EFF6FF' : '#F8FAFC',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}>
                <Upload size={22} />
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#2563EB' }}>
                  Click to upload
                </span>
                <span style={{ fontSize: '13px', color: '#64748B' }}> or drag and drop</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                PDF, DOCX, XLSX, TXT, PNG, JPG (up to 25MB)
              </div>
            </div>
          </div>
        ) : (
          /* Live Forensic Pipeline Visualizer */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#2563EB' }}>
                  {PIPELINE_STAGES[activeStageIndex].label}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', fontFamily: 'monospace' }}>
                  {progressPercent}%
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: '#2563EB',
                  transition: 'width 0.3s ease',
                  borderRadius: '9999px'
                }} />
              </div>
            </div>

            {/* Stages checklist */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {PIPELINE_STAGES.map((stage, idx) => {
                const isComplete = idx < activeStageIndex || progressPercent === 100;
                const isCurrent = idx === activeStageIndex && progressPercent < 100;
                const Icon = stage.icon;

                return (
                  <div
                    key={stage.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: isCurrent ? '#EFF6FF' : isComplete ? '#FFFFFF' : 'transparent',
                      border: isCurrent ? '1px solid #BFDBFE' : '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Status Icon */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      {isComplete ? (
                        <CheckCircle2 size={16} color="#10B981" />
                      ) : isCurrent ? (
                        <Loader2 size={16} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid #CBD5E1' }} />
                      )}
                    </div>

                    {/* Stage Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: isCurrent ? '700' : isComplete ? '600' : '500',
                        color: isCurrent ? '#1D4ED8' : isComplete ? '#0F172A' : '#94A3B8'
                      }}>
                        {stage.label}
                      </div>
                      <div style={{
                        fontSize: '10.5px',
                        color: isCurrent ? '#2563EB' : '#94A3B8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {stage.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div style={{
            marginTop: '16px',
            padding: '10px',
            borderRadius: '6px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            color: '#DC2626',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
