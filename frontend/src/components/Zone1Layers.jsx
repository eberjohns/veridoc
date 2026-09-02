import React from 'react';
import {
  Flame,
  Copy,
  FileCode,
  Type,
  Calculator,
  RotateCcw
} from 'lucide-react';

const STREAMLINED_LAYERS = [
  {
    id: 'ela',
    name: 'Visual ELA & Noise',
    desc: 'Compression error & pixel variance heatmap',
    color: '#F97316',
    icon: Flame
  },
  {
    id: 'copy_paste',
    name: 'Copy-Paste & Cloning',
    desc: 'Duplicated blocks & cloned regions',
    color: '#06B6D4',
    icon: Copy
  },
  {
    id: 'metadata',
    name: 'Metadata & Software Audit',
    desc: 'Editor tags, timestamps & revisions',
    color: '#8B5CF6',
    icon: FileCode
  },
  {
    id: 'font',
    name: 'Font & Typography',
    desc: 'Mismatched fonts & kerning deviations',
    color: '#EC4899',
    icon: Type
  },
  {
    id: 'math',
    name: 'Math & Logic Verification',
    desc: 'Arithmetic & formula consistency',
    color: '#EF4444',
    icon: Calculator
  }
];

export default function Zone1Layers({
  activeLayers,
  onToggleLayer,
  layerOpacity,
  onChangeOpacity,
  onResetLayers,
  analysisData
}) {
  return (
    <aside style={{
      width: '260px',
      minWidth: '240px',
      maxWidth: '280px',
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflowY: 'auto'
    }}>
      {/* Section Title */}
      <div style={{
        padding: '16px 20px 12px 20px',
        borderBottom: '1px solid #F1F5F9'
      }}>
        <h2 style={{
          fontSize: '11.5px',
          fontWeight: '700',
          letterSpacing: '0.06em',
          color: '#64748B',
          textTransform: 'uppercase'
        }}>
          Forensic Layers
        </h2>
      </div>

      {/* Streamlined Toggles List */}
      <div style={{
        flex: 1,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {STREAMLINED_LAYERS.map(layer => {
          const isActive = !!activeLayers[layer.id];
          const Icon = layer.icon;

          return (
            <div
              key={layer.id}
              onClick={() => onToggleLayer(layer.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: isActive ? '#FAFAFA' : 'transparent',
                border: isActive 
                  ? `1px solid ${layer.color}40` 
                  : '1px solid transparent',
                borderLeft: isActive ? `3px solid ${layer.color}` : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? `${layer.color}15` : '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? layer.color : '#94A3B8',
                  transition: 'all 0.18s ease',
                  flexShrink: 0
                }}>
                  <Icon size={16} strokeWidth={isActive ? 2.3 : 1.8} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? '#0F172A' : '#334155',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {layer.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#94A3B8',
                    marginTop: '1px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {layer.desc}
                  </div>
                </div>
              </div>

              {/* Custom Toggle Switch */}
              <div style={{
                width: '36px',
                height: '20px',
                borderRadius: '10px',
                backgroundColor: isActive ? '#2563EB' : '#CBD5E1',
                padding: '2px',
                position: 'relative',
                flexShrink: 0,
                transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                marginLeft: '8px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transform: isActive ? 'translateX(16px)' : 'translateX(0)',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Opacity Slider & Reset */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#475569' }}>
              Layer Opacity
            </span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>
              {Math.round(layerOpacity * 100)}%
            </span>
          </div>

          <input
            id="layer-opacity-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={layerOpacity}
            onChange={e => onChangeOpacity(parseFloat(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#2563EB',
              cursor: 'pointer',
              height: '4px'
            }}
          />
        </div>

        {/* Reset Layers Button */}
        <button
          id="reset-layers-btn"
          onClick={onResetLayers}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#475569',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#F1F5F9';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <RotateCcw size={14} />
          <span>Reset Layers</span>
        </button>
      </div>
    </aside>
  );
}
