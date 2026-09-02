import React from 'react';
import { 
  ShieldCheck, 
  FileText, 
  ChevronDown, 
  Minus, 
  Plus, 
  Maximize2, 
  Hand, 
  Bell, 
  Upload,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function TopNav({ 
  currentDoc, 
  caseDocs, 
  onSelectDoc, 
  zoomLevel, 
  onZoomIn, 
  onZoomOut, 
  onResetZoom,
  isPanMode,
  onTogglePanMode,
  onOpenUpload,
  backendConnected
}) {
  return (
    <header style={{
      height: '56px',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      userSelect: 'none',
      zIndex: 50
    }}>
      {/* Left: Brand & Document Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
          }}>
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <span style={{
            fontSize: '18px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: '#0F172A',
            fontFamily: 'var(--font-sans)'
          }}>
            Veridoc
          </span>
        </div>

        {/* Vertical divider */}
        <div style={{ height: '20px', width: '1px', backgroundColor: '#E2E8F0' }} />

        {/* Document Selector Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            id="doc-selector-btn"
            onClick={() => {
              const el = document.getElementById('doc-dropdown-menu');
              if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#1E293B',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626'
            }}>
              <FileText size={12} strokeWidth={2.5} />
            </div>
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentDoc?.filename || 'Select Document'}
            </span>
            <ChevronDown size={14} color="#64748B" />
          </button>

          {/* Dropdown Menu */}
          <div 
            id="doc-dropdown-menu"
            style={{
              display: 'none',
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              width: '280px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              zIndex: 100,
              padding: '4px'
            }}
          >
            <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' }}>
              Case Documents ({caseDocs.length})
            </div>
            {caseDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => {
                  onSelectDoc(doc);
                  const el = document.getElementById('doc-dropdown-menu');
                  if (el) el.style.display = 'none';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: currentDoc?.id === doc.id ? '#2563EB' : '#1E293B',
                  backgroundColor: currentDoc?.id === doc.id ? '#EFF6FF' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = currentDoc?.id === doc.id ? '#EFF6FF' : '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = currentDoc?.id === doc.id ? '#EFF6FF' : 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={14} color={doc.status === 'flagged' ? '#DC2626' : '#10B981'} />
                  <span style={{ fontSize: '12px' }}>{doc.filename}</span>
                </div>
                {doc.status === 'flagged' ? (
                  <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '10px', fontWeight: '600' }}>
                    {doc.trust_score}%
                  </span>
                ) : (
                  <CheckCircle2 size={14} color="#10B981" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center: Zoom & View Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          padding: '2px 4px'
        }}>
          <button 
            id="zoom-out-btn"
            onClick={onZoomOut}
            title="Zoom Out"
            style={{
              background: 'none',
              border: 'none',
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Minus size={14} />
          </button>

          <span 
            onClick={onResetZoom}
            title="Click to Reset Zoom (100%)"
            style={{
              padding: '0 10px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#1E293B',
              cursor: 'pointer',
              minWidth: '55px',
              textAlign: 'center'
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </span>

          <button 
            id="zoom-in-btn"
            onClick={onZoomIn}
            title="Zoom In"
            style={{
              background: 'none',
              border: 'none',
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Fit to screen button */}
        <button 
          id="fit-screen-btn"
          onClick={onResetZoom}
          title="Fit to Screen"
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#475569'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
        >
          <Maximize2 size={14} />
        </button>

        {/* Pan Mode Button */}
        <button 
          id="pan-mode-btn"
          onClick={onTogglePanMode}
          title="Toggle Pan Tool"
          style={{
            background: isPanMode ? '#EFF6FF' : '#F8FAFC',
            border: `1px solid ${isPanMode ? '#3B82F6' : '#E2E8F0'}`,
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isPanMode ? '#2563EB' : '#475569'
          }}
        >
          <Hand size={14} />
        </button>
      </div>

      {/* Right: Case Badge, Upload & Alerts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Upload Button */}
        <button 
          id="quick-upload-btn"
          onClick={onOpenUpload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
        >
          <Upload size={13} />
          <span>Upload File</span>
        </button>

        {/* Case Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#1E293B',
          cursor: 'pointer'
        }}>
          <span>Case: Fraud Investigation #1047</span>
          <ChevronDown size={14} color="#64748B" />
        </div>

        {/* Notification Bell */}
        <div style={{
          position: 'relative',
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          cursor: 'pointer',
          backgroundColor: '#F8FAFC'
        }}>
          <Bell size={16} />
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#EF4444'
          }} />
        </div>
      </div>
    </header>
  );
}
