import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Layers,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  Hand,
  Sliders,
  Grid
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
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  
  // Multi-page navigation
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'all'
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Keep pan offset ref synchronized
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  // Reset pan and page index when document changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setActivePageIndex(0);
  }, [currentDoc?.id]);

  // Handle Spacebar pan shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Trackpad Pinch-to-Zoom & Wheel Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Trackpad pinch gesture
      const zoomDelta = -e.deltaY * 0.012;
      setZoomLevel(prev => Math.min(4.0, Math.max(0.3, +(prev + zoomDelta).toFixed(2))));
    } else {
      if (isPanMode || isSpacePressed) {
        // Pan via 2-finger scroll
        setPanOffset(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      } else {
        // Normal mouse wheel zoom
        const zoomDelta = -e.deltaY * 0.002;
        setZoomLevel(prev => Math.min(4.0, Math.max(0.3, +(prev + zoomDelta).toFixed(2))));
      }
    }
  }, [isPanMode, isSpacePressed, setZoomLevel]);

  // Attach non-passive wheel listener to allow e.preventDefault()
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Robust Global Mouse Panning (Never gets stuck)
  const handleMouseDown = (e) => {
    if (isPanMode || isSpacePressed || e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - panOffsetRef.current.x,
        y: e.clientY - panOffsetRef.current.y
      };

      const handleMouseMove = (moveEvent) => {
        setPanOffset({
          x: moveEvent.clientX - dragStartRef.current.x,
          y: moveEvent.clientY - dragStartRef.current.y
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Two-Finger Touch Pinch-to-Zoom & Pan for Mobile/Touchscreens
  const touchDistanceRef = useRef(null);
  const initialTouchZoomRef = useRef(zoomLevel);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
      initialTouchZoomRef.current = zoomLevel;
    } else if (e.touches.length === 1 && (isPanMode || isSpacePressed)) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - panOffsetRef.current.x,
        y: e.touches[0].clientY - panOffsetRef.current.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistanceRef.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistanceRef.current;
      setZoomLevel(Math.min(4.0, Math.max(0.3, +(initialTouchZoomRef.current * factor).toFixed(2))));
    } else if (e.touches.length === 1 && isDragging) {
      setPanOffset({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    setIsDragging(false);
  };

  // Active Forensic Check Toggles
  const isSplicingActive = !!activeLayers['splicing'] || !!activeLayers['ela'];
  const isCopyPasteActive = !!activeLayers['copy_paste'];
  const isMathActive = !!activeLayers['math'];
  const isFontActive = !!activeLayers['font'];
  const isCrossReferenceActive = !!activeLayers['cross_reference'];
  const isPromptGuardActive = activeLayers['prompt_guard'] !== false;

  // Collect bounding boxes
  const allBoundingBoxes = [];
  if (analysisData?.findings) {
    analysisData.findings.forEach(f => {
      if (f.bounding_boxes) {
        f.bounding_boxes.forEach(b => {
          allBoundingBoxes.push({
            ...b,
            target_finding_id: f.id,
            layer_type: f.layer_type,
            severity: f.severity,
            page: b.page || f.page || 1
          });
        });
      }
    });
  }

  // Filter boxes by active checks
  const visibleBoxes = allBoundingBoxes.filter(box => {
    if ((box.layer_type === 'splicing' || box.layer_type === 'ela') && !isSplicingActive) return false;
    if (box.layer_type === 'copy_paste' && !isCopyPasteActive) return false;
    if (box.layer_type === 'math' && !isMathActive) return false;
    if (box.layer_type === 'font' && !isFontActive && box.tag !== 'WHITE-ON-WHITE-TEXT' && box.tag !== 'INJECTION-PAYLOAD') return false;
    if (box.layer_type === 'cross_reference' && !isCrossReferenceActive) return false;
    if ((box.layer_type === 'prompt_guard' || box.layer_type === 'security' || box.tag === 'WHITE-ON-WHITE-TEXT' || box.tag === 'INJECTION-PAYLOAD') && !isPromptGuardActive) return false;
    return true;
  });

  // Pages array from analysis
  const pagesList = analysisData?.pages && analysisData.pages.length > 0 
    ? analysisData.pages 
    : (analysisData?.preview_image_url ? [{ page_number: 1, preview_image_url: analysisData.preview_image_url, heatmap_data_url: analysisData?.layers?.ela?.heatmap_data_url }] : []);

  const totalPages = pagesList.length;

  // Clean empty state if no document uploaded or loaded
  if (!currentDoc || !analysisData) {
    return (
      <main style={{
        flex: 1,
        height: '100%',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px',
        userSelect: 'none'
      }}>
        <div style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px dashed #CBD5E1',
          padding: '44px 32px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <Upload size={26} />
          </div>
          <h3 style={{ fontSize: '16.5px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
            No Document Loaded
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '22px' }}>
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
                fontSize: '13px',
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
                  fontSize: '12px',
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

  const isPanningActive = isPanMode || isSpacePressed;

  return (
    <main 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        flex: 1,
        height: '100%',
        backgroundColor: '#F1F5F9',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isPanningActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none'
      }}
    >
      {/* Zoomable & Pannable Document Container */}
      <div 
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.08s ease-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          padding: '40px',
          pointerEvents: isDragging ? 'none' : 'auto'
        }}
      >
        {/* Render Multi-Page PDF Pages */}
        {pagesList.length > 0 ? (
          (viewMode === 'all' ? pagesList : [pagesList[activePageIndex] || pagesList[0]]).map((pageObj, pIdx) => {
            const actualPageNum = viewMode === 'all' ? pageObj.page_number : (activePageIndex + 1);
            const pageBoxes = visibleBoxes.filter(b => b.page === actualPageNum || !b.page);

            return (
              <div 
                key={pageObj.page_number || pIdx}
                style={{
                  position: 'relative',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 0 0 1px #E2E8F0',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}
              >
                {/* Page Number Label on Top Left for Multi-Page */}
                {totalPages > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '0',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#64748B',
                    letterSpacing: '0.04em'
                  }}>
                    PAGE {actualPageNum} OF {totalPages}
                  </div>
                )}

                {/* Base Page Raster Image */}
                <img 
                  src={pageObj.preview_image_url} 
                  alt={`Page ${actualPageNum}`}
                  draggable={false}
                  style={{
                    display: 'block',
                    maxWidth: '820px',
                    height: 'auto',
                    borderRadius: '6px',
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }} 
                />

                {/* ELA Heatmap Overlay for this page */}
                {isSplicingActive && pageObj.heatmap_data_url && (
                  <img
                    src={pageObj.heatmap_data_url}
                    alt="Splicing Heatmap"
                    draggable={false}
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

                {/* SVG Overlays for this page */}
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
                  {pageBoxes.map((box, idx) => {
                    const isHovered = hoveredFindingId === box.target_finding_id;
                    const isSelected = selectedFindingId === box.target_finding_id;
                    const strokeColor = box.color || (box.layer_type === 'math' ? '#EF4444' : box.layer_type === 'copy_paste' ? '#06B6D4' : '#F97316');
                    
                    return (
                      <g 
                        key={box.id || idx}
                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                        onMouseEnter={() => onHoverFinding && onHoverFinding(box.target_finding_id)}
                        onMouseLeave={() => onHoverFinding && onHoverFinding(null)}
                        onClick={() => {
                          if (onSelectFinding && box.target_finding_id) {
                            onSelectFinding(box.target_finding_id);
                            const cardEl = document.getElementById(`card-${box.target_finding_id}`);
                            if (cardEl) {
                              cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }
                        }}
                      >
                        {/* Outer Glow on Hover */}
                        {(isHovered || isSelected) && (
                          <rect
                            x={`${box.x}%`}
                            y={`${box.y}%`}
                            width={`${box.width}%`}
                            height={`${box.height}%`}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="6"
                            opacity="0.3"
                            rx="4"
                          />
                        )}

                        {/* Main Bounding Box */}
                        <rect
                          x={`${box.x}%`}
                          y={`${box.y}%`}
                          width={`${box.width}%`}
                          height={`${box.height}%`}
                          fill={isHovered || isSelected ? `${strokeColor}30` : `${strokeColor}14`}
                          stroke={strokeColor}
                          strokeWidth={isHovered || isSelected ? '2.5' : '1.8'}
                          strokeDasharray={box.layer_type === 'font' ? '4,4' : 'none'}
                          rx="3"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })
        ) : (
          /* Fallback Sample Rich Vector View (if offline / sample) */
          <div style={{
            position: 'relative',
            width: '840px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 0 0 1px #E2E8F0',
            borderRadius: '6px',
            padding: '38px 48px'
          }}>
            {/* Sample document layout */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '28px', fontWeight: '900', color: '#0A2540' }}>
                  <span style={{ color: '#D92D20', marginRight: '1px' }}>us</span>bank.
                </div>
                <div style={{ marginTop: '22px', fontSize: '11px', lineHeight: '1.5', color: '#1E293B', fontWeight: '500' }}>
                  <div style={{ fontWeight: '700' }}>JOHN DOE</div>
                  <div>1234 MAPLE STREET</div>
                  <div>SAN DIEGO, CA 92101</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569', lineHeight: '1.6' }}>
                <div><span>Account Number:</span> <strong style={{ color: '#0F172A', marginLeft: '8px' }}>1234 5678 9012 3456</strong></div>
                <div><span>Statement Period:</span> <strong style={{ color: '#0F172A', marginLeft: '8px' }}>Mar 01, 2024 - Mar 31, 2024</strong></div>
                <div><span>Page:</span> <span style={{ color: '#0F172A', marginLeft: '8px' }}>1 of 3</span></div>
              </div>
            </div>

            <div style={{ width: '400px', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '11.5px', fontWeight: '800', color: '#0A2540', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1.5px solid #0A2540', paddingBottom: '4px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '4px', position: 'relative' }}>
                  <span>Current Balance</span>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    {isSplicingActive && (
                      <div className="heatmap-glow" style={{ position: 'absolute', top: '-14px', left: '-24px', width: '145px', height: '52px', borderRadius: '16px', background: 'radial-gradient(ellipse at center, rgba(249, 115, 22, 0.85) 0%, rgba(245, 158, 11, 0.55) 45%, rgba(239, 68, 68, 0.25) 75%, transparent 100%)', opacity: layerOpacity, pointerEvents: 'none', zIndex: 1 }} />
                    )}
                    {(isMathActive || hoveredFindingId === 'finding-math-1') && (
                      <div style={{ position: 'absolute', top: '-4px', left: '-8px', width: '110px', height: '28px', border: '2px solid #EF4444', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.12)', pointerEvents: 'none', zIndex: 3 }}>
                        <div style={{ position: 'absolute', top: '-18px', right: '0', backgroundColor: '#EF4444', color: '#FFFFFF', fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px' }}>MATH ERROR</div>
                      </div>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#0F172A', padding: '2px 8px', borderRadius: '4px', position: 'relative', zIndex: 2 }}>$ 5,164.39</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Multi-Page Navigator (Appears when document has multiple pages) */}
      {totalPages > 1 && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #E2E8F0',
          borderRadius: '24px',
          padding: '4px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          zIndex: 40
        }}>
          <button
            onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
            disabled={activePageIndex === 0 || viewMode === 'all'}
            style={{
              background: 'none',
              border: 'none',
              cursor: (activePageIndex === 0 || viewMode === 'all') ? 'not-allowed' : 'pointer',
              color: (activePageIndex === 0 || viewMode === 'all') ? '#CBD5E1' : '#1E293B',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '12px', fontWeight: '600', color: '#1E293B', minWidth: '80px', textAlign: 'center' }}>
            {viewMode === 'all' ? `All ${totalPages} Pages` : `Page ${activePageIndex + 1} of ${totalPages}`}
          </span>

          <button
            onClick={() => setActivePageIndex(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={activePageIndex === totalPages - 1 || viewMode === 'all'}
            style={{
              background: 'none',
              border: 'none',
              cursor: (activePageIndex === totalPages - 1 || viewMode === 'all') ? 'not-allowed' : 'pointer',
              color: (activePageIndex === totalPages - 1 || viewMode === 'all') ? '#CBD5E1' : '#1E293B',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={16} />
          </button>

          <div style={{ width: '1px', height: '16px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

          <button
            onClick={() => setViewMode(prev => prev === 'single' ? 'all' : 'single')}
            style={{
              background: viewMode === 'all' ? '#EFF6FF' : '#F8FAFC',
              border: `1px solid ${viewMode === 'all' ? '#3B82F6' : '#E2E8F0'}`,
              borderRadius: '12px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: '600',
              color: viewMode === 'all' ? '#2563EB' : '#475569',
              cursor: 'pointer'
            }}
          >
            {viewMode === 'all' ? 'Single Page' : 'Show All Pages'}
          </button>
        </div>
      )}

      {/* Floating Canvas Zoom Toolbar on Bottom Right */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(6px)',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '3px 6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        zIndex: 40
      }}>
        <button
          onClick={() => setZoomLevel(prev => Math.max(0.3, +(prev - 0.1).toFixed(2)))}
          title="Zoom Out"
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#475569', display: 'flex' }}
        >
          <Minus size={14} />
        </button>
        <span 
          onClick={() => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); }}
          title="Reset Zoom & Pan"
          style={{ fontSize: '11.5px', fontWeight: '700', color: '#1E293B', minWidth: '42px', textAlign: 'center', cursor: 'pointer' }}
        >
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => setZoomLevel(prev => Math.min(4.0, +(prev + 0.1).toFixed(2)))}
          title="Zoom In"
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#475569', display: 'flex' }}
        >
          <Plus size={14} />
        </button>
        <div style={{ width: '1px', height: '14px', backgroundColor: '#E2E8F0', margin: '0 2px' }} />
        <button
          onClick={() => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); }}
          title="Fit & Reset"
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#475569', display: 'flex' }}
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </main>
  );
}
