import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { uploadAndAnalyzeDocument } from '../services/api';

export default function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFile = async (file) => {
    if (!file) return;
    setErrorMsg(null);
    setIsUploading(true);

    try {
      const result = await uploadAndAnalyzeDocument(file);
      onUploadComplete(result, file);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze document.');
    } finally {
      setIsUploading(false);
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
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      userSelect: 'none'
    }}>
      <div style={{
        width: '460px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '24px',
        position: 'relative'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isUploading}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
          Upload Document for Forensic Analysis
        </h3>
        <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '20px' }}>
          Upload PDF, JPG, or PNG files to execute Metadata, Visual ELA, and OCR validation.
        </p>

        {/* Dropzone */}
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
            cursor: isUploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />

          {isUploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={32} color="#2563EB" className="animate-spin" />
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>
                Running Multi-Module Forensics...
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Extracting metadata, calculating ELA heatmaps, verifying math formulas
              </div>
            </div>
          ) : (
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
                PDF, PNG, JPG (up to 25MB)
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
}
