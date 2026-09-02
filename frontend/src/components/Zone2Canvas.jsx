import React, { useRef, useState, useEffect } from 'react';
import { 
  MousePointer, 
  Hand, 
  Search, 
  Crop, 
  Bookmark,
  Info,
  ExternalLink
} from 'lucide-react';

export default function Zone2Canvas({
  currentDoc,
  analysisData,
  activeLayers,
  layerOpacity,
  zoomLevel,
  isPanMode,
  hoveredFindingId,
  onHoverFinding,
  selectedFindingId,
  onSelectFinding
}) {
  const containerRef = useRef(null);
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'pan', 'zoom', 'crop', 'bookmark'
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [currentDoc?.id]);

  const handleMouseDown = (e) => {
    if (isPanMode || activeTool === 'pan' || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const isElaActive = !!activeLayers['ela'];
  const isCopyPasteActive = !!activeLayers['copy_paste'];
  const isMathActive = !!activeLayers['math'];
  const isFontActive = !!activeLayers['font'];

  return (
    <main 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        flex: 1,
        height: '100%',
        backgroundColor: '#F8FAFC',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: (isPanMode || activeTool === 'pan') ? (isDragging ? 'grabbing' : 'grab') : 'default'
      }}
    >
      {/* Document View Area (Zoomable / Pannable) */}
      <div style={{
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
        transformOrigin: 'center center',
        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        width: '840px',
        minHeight: '780px',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px #E2E8F0',
        borderRadius: '4px',
        padding: '38px 48px',
        position: 'relative',
        userSelect: 'none',
        fontFamily: "'Inter', sans-serif"
      }}>
        
        {/* Document Content */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            {/* Bank Logo */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '28px',
                fontWeight: '900',
                color: '#0A2540',
                letterSpacing: '-0.04em'
              }}>
                <span style={{ color: '#D92D20', marginRight: '1px' }}>us</span>bank.
              </div>

              {/* Address */}
              <div style={{ marginTop: '22px', fontSize: '11px', lineHeight: '1.5', color: '#1E293B', fontWeight: '500' }}>
                <div style={{ fontWeight: '700' }}>JOHN DOE</div>
                <div>1234 MAPLE STREET</div>
                <div>SAN DIEGO, CA 92101</div>
              </div>
            </div>

            {/* Account Meta & Contact Info */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6' }}>
                <div><span style={{ color: '#64748B' }}>Account Number:</span> <strong style={{ color: '#0F172A', marginLeft: '8px' }}>1234 5678 9012 3456</strong></div>
                <div><span style={{ color: '#64748B' }}>Statement Period:</span> <strong style={{ color: '#0F172A', marginLeft: '8px' }}>Mar 01, 2024 - Mar 31, 2024</strong></div>
                <div><span style={{ color: '#64748B' }}>Page:</span> <span style={{ color: '#0F172A', marginLeft: '8px' }}>1 of 3</span></div>
              </div>

              {/* Contact Card */}
              <div style={{
                marginTop: '16px',
                padding: '10px 14px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                textAlign: 'left',
                backgroundColor: '#FFFFFF',
                fontSize: '10px',
                color: '#334155',
                display: 'inline-block'
              }}>
                <div style={{ fontWeight: '700', color: '#0A2540', marginBottom: '6px', fontSize: '11px' }}>To Contact U.S. Bank</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ color: '#64748B' }}>🌐</span> <span>usbank.com</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ color: '#64748B' }}>📱</span> <span>Mobile Banking</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#64748B' }}>📞</span> <span>800-USB-HELP (872-4357)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACCOUNT SUMMARY */}
          <div style={{ width: '400px', marginBottom: '30px' }}>
            <h3 style={{
              fontSize: '11.5px',
              fontWeight: '800',
              letterSpacing: '0.04em',
              color: '#0A2540',
              textTransform: 'uppercase',
              marginBottom: '8px',
              borderBottom: '1.5px solid #0A2540',
              paddingBottom: '4px'
            }}>
              Account Summary
            </h3>

            <div style={{ fontSize: '11.5px', lineHeight: '1.8', color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Previous Balance</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '500' }}>$ 6,591.12</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Deposits</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '500' }}>$ 12,430.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Withdrawals</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '500' }}>$ 13,856.73</span>
              </div>
              
              {/* Current Balance Row (Target of Tampering & ELA Heatmap) */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '700',
                color: '#0A2540',
                borderTop: '1px solid #E2E8F0',
                paddingTop: '6px',
                marginTop: '4px',
                position: 'relative'
              }}>
                <span>Current Balance</span>
                
                {/* Balance container with integrated forensic overlays */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  
                  {/* ELA Glowing Heatmap */}
                  {isElaActive && (
                    <div 
                      className="heatmap-glow"
                      style={{
                        position: 'absolute',
                        top: '-14px',
                        left: '-24px',
                        width: '145px',
                        height: '52px',
                        borderRadius: '16px',
                        background: 'radial-gradient(ellipse at center, rgba(249, 115, 22, 0.85) 0%, rgba(245, 158, 11, 0.55) 45%, rgba(239, 68, 68, 0.25) 75%, transparent 100%)',
                        boxShadow: '0 0 35px rgba(249, 115, 22, 0.9), 0 0 60px rgba(245, 158, 11, 0.5)',
                        opacity: layerOpacity,
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    />
                  )}

                  {/* Math Error Highlight Box */}
                  {(isMathActive || hoveredFindingId === 'finding-math-1') && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      left: '-8px',
                      width: '110px',
                      height: '28px',
                      border: '2px solid #EF4444',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      boxShadow: '0 0 14px rgba(239, 68, 68, 0.4)',
                      pointerEvents: 'none',
                      zIndex: 3,
                      animation: 'pulseSubtle 2s infinite'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '-18px',
                        right: '0',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        fontSize: '9px',
                        fontWeight: '700',
                        padding: '1px 5px',
                        borderRadius: '3px'
                      }}>
                        MATH ERROR
                      </div>
                    </div>
                  )}

                  {/* Font Anomaly Box */}
                  {(isFontActive || hoveredFindingId === 'finding-font-1') && (
                    <div style={{
                      position: 'absolute',
                      top: '-3px',
                      left: '-6px',
                      width: '106px',
                      height: '26px',
                      border: '1.5px dashed #EC4899',
                      borderRadius: '4px',
                      pointerEvents: 'none',
                      zIndex: 4
                    }} />
                  )}

                  {/* Stated Number */}
                  <span 
                    id="current-balance-figure"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '700',
                      color: '#0F172A',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      position: 'relative',
                      zIndex: 2,
                      backgroundColor: isElaActive ? 'rgba(255, 237, 213, 0.6)' : 'transparent',
                      border: isElaActive ? '1px solid #F97316' : '1px solid transparent'
                    }}
                  >
                    $ 5,164.39
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* TRANSACTION HISTORY TABLE */}
          <div>
            <h3 style={{
              fontSize: '11.5px',
              fontWeight: '800',
              letterSpacing: '0.04em',
              color: '#0A2540',
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}>
              Transaction History
            </h3>

            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              color: '#1E293B',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #0A2540', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '6px 4px', width: '60px' }}>Date</th>
                  <th style={{ padding: '6px 4px' }}>Description</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right', width: '90px' }}>Withdrawals</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right', width: '90px' }}>Deposits</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right', width: '90px' }}>Balance</th>
                  <th style={{ width: '95px' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 4px' }}>Mar 01</td>
                  <td style={{ padding: '5px 4px' }}>Opening Balance</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 6,591.12</td>
                  <td></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 4px' }}>Mar 03</td>
                  <td style={{ padding: '5px 4px' }}>ACH Deposit - Payroll</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 4,215.00</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 10,806.12</td>
                  <td></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 4px' }}>Mar 05</td>
                  <td style={{ padding: '5px 4px' }}>Amazon.com*6R2VJ1K80 Amzn.com/bill WA</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 89.99</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 10,716.13</td>
                  <td></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 4px' }}>Mar 07</td>
                  <td style={{ padding: '5px 4px' }}>Starbucks Store 12345 San Diego CA</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 5.75</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 10,710.38</td>
                  <td></td>
                </tr>

                {/* Duplicated Transaction Rows with Copy-Paste Overlay */}
                <tr 
                  id="row-cp-1"
                  style={{ 
                    borderBottom: '1px solid #E0F2FE',
                    borderLeft: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '3px solid #06B6D4' : 'none',
                    backgroundColor: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                    boxShadow: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '0 0 0 1px #06B6D4' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <td style={{ padding: '6px 4px', fontWeight: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '700' : 'normal' }}>Mar 10</td>
                  <td style={{ padding: '6px 4px', fontWeight: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '700' : 'normal' }}>Payment to ABC Supply Co. INV-0021</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>$ 2,450.00</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 8,260.38</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                    {(isCopyPasteActive || hoveredFindingId === 'finding-cp-1') && (
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: '700',
                        color: '#0891B2',
                        letterSpacing: '0.04em'
                      }}>
                        COPY-PASTED
                      </span>
                    )}
                  </td>
                </tr>

                <tr 
                  id="row-cp-2"
                  style={{ 
                    borderBottom: '1px solid #E0F2FE',
                    borderLeft: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '3px solid #06B6D4' : 'none',
                    backgroundColor: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                    boxShadow: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '0 0 0 1px #06B6D4' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <td style={{ padding: '6px 4px', fontWeight: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '700' : 'normal' }}>Mar 10</td>
                  <td style={{ padding: '6px 4px', fontWeight: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '700' : 'normal' }}>Payment to ABC Supply Co. INV-0021</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>$ 2,450.00</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 5,810.38</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                    {(isCopyPasteActive || hoveredFindingId === 'finding-cp-1') && (
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: '700',
                        color: '#0891B2',
                        letterSpacing: '0.04em'
                      }}>
                        COPY-PASTED
                      </span>
                    )}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 4px' }}>Mar 15</td>
                  <td style={{ padding: '5px 4px' }}>Shell Oil 574873 San Diego CA</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 60.00</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 5,750.38</td>
                  <td></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 4px' }}>Mar 20</td>
                  <td style={{ padding: '5px 4px' }}>Check #1025</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 350.00</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 5,400.38</td>
                  <td></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 4px' }}>Mar 25</td>
                  <td style={{ padding: '5px 4px' }}>Interest Payment</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 1.23</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 5,401.61</td>
                  <td></td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 4px' }}>Mar 31</td>
                  <td style={{ padding: '5px 4px' }}>Service Fee</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 37.22</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}></td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 5,364.39</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            {/* Ending Balance Summary Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '8px',
              borderTop: '1.5px solid #0A2540',
              fontWeight: '700',
              fontSize: '11.5px',
              color: '#0A2540'
            }}>
              <span>Ending Balance</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginRight: '95px' }}>
                $ 5,164.39
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Floating Canvas Action Toolbar (Right side of canvas) */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        zIndex: 40
      }}>
        <button
          onClick={() => setActiveTool('select')}
          title="Select / Pointer"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: activeTool === 'select' ? '#EFF6FF' : 'transparent',
            color: activeTool === 'select' ? '#2563EB' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <MousePointer size={16} />
        </button>
        <button
          onClick={() => setActiveTool('pan')}
          title="Pan Hand Tool"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: activeTool === 'pan' ? '#EFF6FF' : 'transparent',
            color: activeTool === 'pan' ? '#2563EB' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Hand size={16} />
        </button>
        <button
          onClick={() => setActiveTool('zoom')}
          title="Inspect Zoom"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: activeTool === 'zoom' ? '#EFF6FF' : 'transparent',
            color: activeTool === 'zoom' ? '#2563EB' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Search size={16} />
        </button>
        <button
          onClick={() => setActiveTool('crop')}
          title="Area Crop / Region Analysis"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: activeTool === 'crop' ? '#EFF6FF' : 'transparent',
            color: activeTool === 'crop' ? '#2563EB' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Crop size={16} />
        </button>
        <button
          onClick={() => setActiveTool('bookmark')}
          title="Bookmark Region"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            background: activeTool === 'bookmark' ? '#EFF6FF' : 'transparent',
            color: activeTool === 'bookmark' ? '#2563EB' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Bookmark size={16} />
        </button>
      </div>

      {/* Bottom Canvas Legend */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '11px',
        color: '#475569',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(4px)',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        zIndex: 30
      }}>
        {isElaActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '3px',
              backgroundColor: '#F97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '9px',
              fontWeight: 'bold'
            }}>
              E
            </div>
            <span>ELA heatmap indicates potential tampering in highlighted regions.</span>
          </div>
        )}
        {isCopyPasteActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '3px',
              backgroundColor: '#06B6D4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '9px',
              fontWeight: 'bold'
            }}>
              C
            </div>
            <span>Cyan boxes indicate copy-paste / cloned content.</span>
          </div>
        )}
      </div>

    </main>
  );
}
