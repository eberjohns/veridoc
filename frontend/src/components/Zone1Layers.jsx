import React from 'react';
import {
  Flame,
  Copy,
  FileCode,
  Type,
  Calculator,
  GitCompare,
  RotateCcw,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

const STREAMLINED_LAYERS = [
  {
    id: 'prompt_guard',
    name: 'Prompt Injection Check',
    desc: 'Adversarial instructions, micro-constraints & white-on-white text',
    color: '#DC2626',
    icon: ShieldAlert
  },
  {
    id: 'ai_generation',
    name: 'AI Generation Check',
    desc: 'Synthetic diffusion grids, Midjourney/DALL-E & LLM watermarks',
    color: '#7C3AED',
    icon: Sparkles
  },
  {
    id: 'splicing',
    name: 'Splicing Check',
    desc: 'Error Level Analysis, spliced patches & doodled markups',
    color: '#F97316',
    icon: Flame
  },
  {
    id: 'copy_paste',
    name: 'Copy-Paste Check',
    desc: 'Duplicated content blocks & cloned regions in document',
    color: '#06B6D4',
    icon: Copy
  },
  {
    id: 'math',
    name: 'Math Check',
    desc: 'Financial balance calculations & arithmetic verification',
    color: '#EF4444',
    icon: Calculator
  },
  {
    id: 'font',
    name: 'Font Mismatch Check',
    desc: 'Inconsistent typography, font weights & kerning',
    color: '#EC4899',
    icon: Type
  },
  {
    id: 'metadata',
    name: 'Metadata Analysis',
    desc: 'Container tags, software signatures & timestamps',
    color: '#8B5CF6',
    icon: FileCode
  },
  {
    id: 'cross_reference',
    name: 'Cross-Reference Check',
    desc: 'Cross-document matching & differential comparison',
    color: '#3B82F6',
    icon: GitCompare
  }
];

export default function Zone1Layers({
  activeLayers,
  onToggleLayer,
  layerOpacity,
  onChangeOpacity,
  onResetLayers,
  analysisData,
  applicableLayers  // array of layer ids that apply to this document type
}) {
  // Normalize applicable layers from backend
  const applicable = applicableLayers && applicableLayers.length > 0
    ? applicableLayers
    : ['metadata', 'copy_paste', 'splicing', 'math', 'font', 'cross_reference'];

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
          Forensic Checks
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
          const isApplicable = applicable.includes(layer.id);
          const isActive = !!activeLayers[layer.id] && isApplicable;
          const Icon = layer.icon;

          return (
            <div
              key={layer.id}
              onClick={() => isApplicable && onToggleLayer(layer.id)}
              title={!isApplicable ? (layer.id === 'prompt_guard' ? 'No prompt injection or hidden text detected in this file' : 'N/A for this document type') : undefined}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: !isApplicable ? 'transparent' : isActive ? '#F8FAFC' : 'transparent',
                border: !isApplicable ? '1px solid transparent' : isActive ? `1px solid ${layer.color}30` : '1px solid transparent',
                cursor: isApplicable ? 'pointer' : 'not-allowed',
                opacity: isApplicable ? 1 : 0.35,
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: !isApplicable ? '#F1F5F9' : isActive ? `${layer.color}18` : '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: !isApplicable ? '#CBD5E1' : isActive ? layer.color : '#94A3B8',
                flexShrink: 0,
                marginTop: '1px',
                transition: 'all 0.15s ease'
              }}>
                <Icon size={16} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '12.5px',
                    fontWeight: isActive ? '600' : '500',
                    color: !isApplicable ? '#CBD5E1' : isActive ? '#0F172A' : '#64748B'
                  }}>
                    {layer.name}
                  </span>

                  {/* iOS Style Switch */}
                  <div style={{
                    width: '30px',
                    height: '16px',
                    borderRadius: '9999px',
                    backgroundColor: !isApplicable ? '#E2E8F0' : isActive ? layer.color : '#CBD5E1',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                    marginLeft: '6px'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: isActive ? '16px' : '2px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>

                <p style={{ fontSize: '10.5px', color: '#94A3B8', lineHeight: '1.3', margin: 0 }}>
                  {!isApplicable ? 'N/A for this document type' : layer.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Opacity & Reset Section */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #F1F5F9',
        backgroundColor: '#FAFBFD'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569' }}>
            Overlay Opacity
          </span>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
            {Math.round(layerOpacity * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={layerOpacity}
          onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#2563EB',
            cursor: 'pointer',
            height: '4px',
            marginBottom: '14px'
          }}
        />

        <button
          onClick={onResetLayers}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 10px',
            fontSize: '11px',
            fontWeight: '600',
            color: '#64748B',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94A3B8'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
        >
          <RotateCcw size={12} />
          <span>Reset All Checks</span>
        </button>
      </div>
    </aside>
  );
}
