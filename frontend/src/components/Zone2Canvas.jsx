import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Layers,
  FolderOpen
} from 'lucide-react';

export default function Zone2Canvas({
  currentDoc,
  analysisData,
  activeLayers,
  layerOpacity,
  zoomLevel,
  setZoomLevel,
  isPanMode,
  hoveredFindingId,
  onHoverFinding,
  selectedFindingId,
  onSelectFinding,
  onOpenUpload,
  onLoadSamples
}) {
  const containerRef = useRef(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Touch pinch-to-zoom tracking
  const touchDistanceRef = useRef(null);

  // Reset pan on doc change
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [currentDoc?.id]);

  // Wheel & Trackpad Pinch-to-Zoom Handler
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Trackpad pinch gesture (browsers send wheel with ctrlKey)
      const zoomDelta = -e.deltaY * 0.01;
      setZoomLevel(prev => Math.min(3.0, Math.max(0.4, +(prev + zoomDelta).toFixed(2))));
    } else {
      // Standard wheel zoom or pan depending on pan mode
      if (isPanMode) {
        setPanOffset(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      } else {
        const zoomDelta = -e.deltaY * 0.002;
        setZoomLevel(prev => Math.min(3.0, Math.max(0.4, +(prev + zoomDelta).toFixed(2))));
      }
    }
  }, [isPanMode, setZoomLevel]);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Touch handlers for mobile/trackpad pinch
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    } else if (e.touches.length === 1 && isPanMode) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistanceRef.current;
      touchDistanceRef.current = dist;
      setZoomLevel(prev => Math.min(3.0, Math.max(0.4, +(prev * factor).toFixed(2))));
    } else if (e.touches.length === 1 && isDragging) {
      setPanOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    setIsDragging(false);
  };

  const handleMouseDown = (e) => {
    if (isPanMode || e.button === 1) {
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

  // Collect all bounding boxes from findings and layers
  const allBoundingBoxes = [];
  if (analysisData?.findings) {
    analysisData.findings.forEach(f => {
      if (f.bounding_boxes) {
        f.bounding_boxes.forEach(b => {
          allBoundingBoxes.push({
            ...b,
            target_finding_id: f.id,
            layer_type: f.layer_type,
            severity: f.severity
          });
        });
      }
    });
  }

  // Filter boxes by active layers
  const visibleBoxes = allBoundingBoxes.filter(box => {
    if (box.layer_type === 'ela' && !isElaActive) return false;
    if (box.layer_type === 'copy_paste' && !isCopyPasteActive) return false;
    if (box.layer_type === 'math' && !isMathActive) return false;
    if (box.layer_type === 'font' && !isFontActive) return false;
    return true;
  });

  // If no document is selected or loaded, display empty upload state
  if (!currentDoc && (!analysisData || !analysisData.filename)) {
    return (
      <main style={{
        flex: 1,
        height: '100%',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px dashed #CBD5E1',
          padding: '48px 32px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <Upload size={28} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
            No Document Loaded
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
            Upload a PDF, JPG, or PNG document to run automated forensic checks, error level analysis, and mathematical validation.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={onOpenUpload}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
              }}
            >
              <Upload size={16} />
              <span>Upload Document</span>
            </button>
            {onLoadSamples && (
              <button
                onClick={onLoadSamples}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FolderOpen size={15} />
                <span>Load Sample Case Files</span>
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Check if we have an image preview from backend
  const previewImg = analysisData?.preview_image_url;

  return (
    <main 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
        cursor: isPanMode ? (isDragging ? 'grabbing' : 'grab') : 'default'
      }}
    >
      {/* Zoomable / Pannable Document Container */}
      <div style={{
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
        transformOrigin: 'center center',
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        width: previewImg ? 'auto' : '840px',
        maxWidth: '920px',
        minHeight: previewImg ? 'auto' : '780px',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px #E2E8F0',
        borderRadius: '6px',
        position: 'relative',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: previewImg ? '0' : '38px 48px'
      }}>

        {/* Dynamic Document Rendering */}
        {previewImg ? (
          /* Render Backend Rasterized Image for ANY Uploaded File / PDF */
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img 
              src={previewImg} 
              alt={currentDoc?.filename || 'Document'} 
              style={{
                display: 'block',
                maxWidth: '820px',
                height: 'auto',
                borderRadius: '6px'
              }} 
            />

            {/* Render Base64 Heatmap Overlay directly if available */}
            {isElaActive && analysisData?.layers?.ela?.heatmap_data_url && (
              <img
                src={analysisData.layers.ela.heatmap_data_url}
                alt="ELA Heatmap"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: layerOpacity,
                  mixBlendMode: 'screen',
                  pointerEvents: 'none',
                  borderRadius: '6px'
                }}
              />
            )}

            {/* Render SVG Overlays with Normalized 0-100% Coordinates */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              {visibleBoxes.map((box, idx) => {
                const isHovered = hoveredFindingId === box.target_finding_id;
                const strokeColor = box.color || (box.layer_type === 'math' ? '#EF4444' : box.layer_type === 'copy_paste' ? '#06B6D4' : '#F97316');
                
                return (
                  <g key={box.id || idx}>
                    <rect
                      x={`${box.x}%`}
                      y={`${box.y}%`}
                      width={`${box.width}%`}
                      height={`${box.height}%`}
                      fill={isHovered ? `${strokeColor}25` : `${strokeColor}10`}
                      stroke={strokeColor}
                      strokeWidth={isHovered ? '2.5' : '1.8'}
                      strokeDasharray={box.layer_type === 'font' ? '4,4' : 'none'}
                      rx="3"
                    />
                    {box.tag && (
                      <g transform={`translate(${box.x}, ${box.y})`}>
                        <text
                          x={`${box.x + box.width}%`}
                          y={`${box.y + box.height * 0.7}%`}
                          fill="#0891B2"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="end"
                        >
                          {box.tag}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          /* Fallback Rich Vector Document View (for default bank statement if preview not yet cached) */
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            
            {/* Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
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
                <div style={{ marginTop: '22px', fontSize: '11px', lineHeight: '1.5', color: '#1E293B', fontWeight: '500' }}>
                  <div style={{ fontWeight: '700' }}>JOHN DOE</div>
                  <div>1234 MAPLE STREET</div>
                  <div>SAN DIEGO, CA 92101</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6' }}>
                  <div><span style={{ color: '#64748B' }}>Account Number:</span> <strong style={{ color: '#0F172A', marginLeft: '8px' }}>1234 5678 9012 3456</strong></div>
                  <div><span style={{ color: '#64748B' }}>Statement Period:</span> <strong style={{ color: '#0F172A', marginLeft: '8px' }}>Mar 01, 2024 - Mar 31, 2024</strong></div>
                  <div><span style={{ color: '#64748B' }}>Page:</span> <span style={{ color: '#0F172A', marginLeft: '8px' }}>1 of 3</span></div>
                </div>
              </div>
            </div>

            {/* Account Summary */}
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
                  <span style={{ fontFamily: 'var(--font-mono)' }}>$ 6,591.12</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Deposits</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>$ 12,430.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Withdrawals</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>$ 13,856.73</span>
                </div>
                
                {/* Current Balance with ELA glow & Math error box */}
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
                  
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
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
                          opacity: layerOpacity,
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      />
                    )}

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
                        pointerEvents: 'none',
                        zIndex: 3
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

                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '700',
                      color: '#0F172A',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      $ 5,164.39
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction History Table */}
            <div>
              <h3 style={{
                fontSize: '11.5px',
                fontWeight: '800',
                color: '#0A2540',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}>
                Transaction History
              </h3>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#1E293B' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #0A2540', color: '#475569', fontWeight: '700' }}>
                    <th style={{ padding: '6px 4px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '6px 4px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Withdrawals</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Deposits</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Balance</th>
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
                  <tr 
                    style={{ 
                      borderBottom: '1px solid #E0F2FE',
                      backgroundColor: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                      borderLeft: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '3px solid #06B6D4' : 'none'
                    }}
                  >
                    <td style={{ padding: '6px 4px' }}>Mar 10</td>
                    <td style={{ padding: '6px 4px' }}>Payment to ABC Supply Co. INV-0021</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 2,450.00</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}></td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 8,260.38</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {(isCopyPasteActive || hoveredFindingId === 'finding-cp-1') && (
                        <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#0891B2' }}>COPY-PASTED</span>
                      )}
                    </td>
                  </tr>
                  <tr 
                    style={{ 
                      borderBottom: '1px solid #E0F2FE',
                      backgroundColor: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                      borderLeft: (isCopyPasteActive || hoveredFindingId === 'finding-cp-1') ? '3px solid #06B6D4' : 'none'
                    }}
                  >
                    <td style={{ padding: '6px 4px' }}>Mar 10</td>
                    <td style={{ padding: '6px 4px' }}>Payment to ABC Supply Co. INV-0021</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 2,450.00</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}></td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>$ 5,810.38</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {(isCopyPasteActive || hoveredFindingId === 'finding-cp-1') && (
                        <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#0891B2' }}>COPY-PASTED</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

      {/* Bottom Canvas Legend */}
      {(isElaActive || isCopyPasteActive) && (
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
      )}

    </main>
  );
}
