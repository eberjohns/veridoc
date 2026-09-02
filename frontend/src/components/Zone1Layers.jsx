import React from 'react';
import {
  Activity,
  Flame,
  Copy,
  Files,
  Scissors,
  FileCode,
  Type,
  Calculator,
  RotateCcw
} from 'lucide-react';

const LAYER_CONFIGS = [
  {
    id: 'noise',
    name: 'Noise Analysis',
    desc: 'Sensor pattern inconsistencies',
    color: '#64748B',
    icon: Activity
  },
  {
    id: 'ela',
    name: 'ELA',
    subtitle: 'Error Level Analysis',
    desc: 'Error Level Analysis',
    color: '#F97316',
    icon: Flame
  },
  {
    id: 'cloning',
    name: 'Cloning Detection',
    desc: 'Detects cloned regions',
    color: '#6366F1',
    icon: Copy
  },
  {
    id: 'copy_paste',
    name: 'Copy-Paste',
    desc: 'Detects repeated content',
    color: '#06B6D4',
    icon: Files
  },
  {
    id: 'splicing',
    name: 'Splicing Detection',
    desc: 'Detects spliced regions',
    color: '#10B981',
    icon: Scissors
  },
  {
    id: 'metadata',
    name: 'Metadata Analysis',
    desc: 'File & author metadata',
    color: '#8B5CF6',
    icon: FileCode
  },
  {
    id: 'font',
    name: 'Font & Style Anomalies',
    desc: 'Inconsistent fonts & styling',
    color: '#EC4899',
    icon: Type
  },
  {
    id: 'math',
    name: 'Math Verification',
    desc: 'Calculations & consistency',
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
          fontSize: '12px',
          fontWeight: '700',
          letterSpacing: '0.05em',
          color: '#64748B',
          textTransform: 'uppercase'
        }}>
          Layers
        </h2>
      </div>

      {/* Toggles List */}
      <div style={{
        flex: 1,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {LAYER_CONFIGS.map(layer => {
          const isActive = !!activeLayers[layer.id];
          const Icon = layer.icon;
          const isFlagged = analysisData?.layers?.[layer.id]?.flagged;

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? `${layer.color}15` : '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? layer.color : '#94A3B8',
                  transition: 'all 0.18s ease'
                }}>
                  <Icon size={16} strokeWidth={isActive ? 2.3 : 1.8} />
                </div>
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? '#0F172A' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {layer.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#94A3B8',
                    marginTop: '1px',
                    maxWidth: '135px',
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
                transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
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

          {/* Slider input */}
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
