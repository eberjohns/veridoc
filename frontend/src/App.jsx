import React, { useState, useEffect } from 'react';
import TopNav from './components/TopNav';
import Zone1Layers from './components/Zone1Layers';
import Zone2Canvas from './components/Zone2Canvas';
import Zone3Auditor from './components/Zone3Auditor';
import BottomDocCarousel from './components/BottomDocCarousel';
import UploadModal from './components/UploadModal';

import { DEFAULT_CASE_DOCS, DEFAULT_BANK_STATEMENT_ANALYSIS } from './data/mockData';
import { fetchSampleAnalysis, fetchHealth } from './services/api';

export default function App() {
  const [caseDocs, setCaseDocs] = useState(DEFAULT_CASE_DOCS);
  const [currentDoc, setCurrentDoc] = useState(DEFAULT_CASE_DOCS[0]);
  const [analysisData, setAnalysisData] = useState(DEFAULT_BANK_STATEMENT_ANALYSIS);

  // Zone 1 Layer Toggles & Opacity
  const [activeLayers, setActiveLayers] = useState({
    noise: false,
    ela: true,
    cloning: false,
    copy_paste: true,
    splicing: false,
    metadata: false,
    font: false,
    math: false
  });
  const [layerOpacity, setLayerOpacity] = useState(0.65);

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isPanMode, setIsPanMode] = useState(false);

  // Synchronized Hover/Focus between Zone 2 & Zone 3
  const [hoveredFindingId, setHoveredFindingId] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);

  // Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    fetchHealth().then(res => {
      if (res && res.status === 'ok') {
        setBackendConnected(true);
      }
    });
  }, []);

  // Handle document selection from dropdown or bottom carousel
  const handleSelectDoc = async (doc) => {
    setCurrentDoc(doc);
    
    // Try fetching live analysis from backend if available
    try {
      const liveData = await fetchSampleAnalysis(doc.filename);
      if (liveData) {
        setAnalysisData(liveData);
        return;
      }
    } catch (e) {
      console.warn('Using client data for document');
    }

    // Default mock behavior for other documents
    if (doc.filename === 'US_Bank_Statement_Mar2024.pdf') {
      setAnalysisData(DEFAULT_BANK_STATEMENT_ANALYSIS);
    } else if (doc.filename === 'invoice_3.pdf') {
      setAnalysisData({
        document_id: doc.id,
        filename: doc.filename,
        case_id: "Fraud Investigation #1047",
        trust_score: 31,
        risk_level: "CRITICAL",
        summary: "Source document identified with duplicate line items transplant.",
        metadata: {
          filename: doc.filename,
          filesize_bytes: 231900,
          mime_type: "application/pdf",
          page_count: 1,
          has_anomalies: true,
          anomalies: ["Canva PDF generator metadata signature"]
        },
        findings: [
          {
            id: "finding-inv-1",
            layer_type: "copy_paste",
            severity: "High",
            title: "Source Document Match",
            description: "Invoice #INV-0021 contains identical amount $2,450.00 transplanted onto the bank statement.",
            confidence: 0.96,
            bounding_boxes: []
          }
        ],
        layers: {}
      });
    } else {
      // Verified clean documents
      setAnalysisData({
        document_id: doc.id,
        filename: doc.filename,
        case_id: "Fraud Investigation #1047",
        trust_score: doc.trust_score,
        risk_level: "VERIFIED",
        summary: "Document integrity verified. No forensic anomalies or tampering detected.",
        metadata: {
          filename: doc.filename,
          filesize_bytes: 312000,
          mime_type: "application/pdf",
          page_count: 1,
          has_anomalies: false,
          anomalies: []
        },
        findings: [],
        layers: {}
      });
    }
  };

  const handleToggleLayer = (layerId) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  const handleResetLayers = () => {
    setActiveLayers({
      noise: false,
      ela: false,
      cloning: false,
      copy_paste: false,
      splicing: false,
      metadata: false,
      font: false,
      math: false
    });
    setLayerOpacity(0.65);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(2.5, +(prev + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.5, +(prev - 0.1).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1.0);

  const handleUploadComplete = (newAnalysis, uploadedFile) => {
    const newDocItem = {
      id: newAnalysis.document_id,
      filename: newAnalysis.filename,
      title: newAnalysis.filename,
      status: newAnalysis.risk_level === 'CRITICAL' ? 'flagged' : 'verified',
      risk_level: newAnalysis.risk_level,
      trust_score: newAnalysis.trust_score,
      findings_count: newAnalysis.findings.length,
      type: 'uploaded'
    };

    setCaseDocs(prev => [newDocItem, ...prev]);
    setCurrentDoc(newDocItem);
    setAnalysisData(newAnalysis);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#F8FAFC'
    }}>
      {/* Top Navigation */}
      <TopNav
        currentDoc={currentDoc}
        caseDocs={caseDocs}
        onSelectDoc={handleSelectDoc}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        isPanMode={isPanMode}
        onTogglePanMode={() => setIsPanMode(prev => !prev)}
        onOpenUpload={() => setIsUploadOpen(true)}
        backendConnected={backendConnected}
      />

      {/* Main 3-Zone Master Detail Workspace */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Zone 1: Left Controls & Layers */}
        <Zone1Layers
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
          layerOpacity={layerOpacity}
          onChangeOpacity={setLayerOpacity}
          onResetLayers={handleResetLayers}
          analysisData={analysisData}
        />

        {/* Zone 2: Center Document Canvas & Overlays */}
        <Zone2Canvas
          currentDoc={currentDoc}
          analysisData={analysisData}
          activeLayers={activeLayers}
          layerOpacity={layerOpacity}
          zoomLevel={zoomLevel}
          isPanMode={isPanMode}
          hoveredFindingId={hoveredFindingId}
          onHoverFinding={setHoveredFindingId}
          selectedFindingId={selectedFindingId}
          onSelectFinding={setSelectedFindingId}
        />

        {/* Zone 3: Right Auditor Panel */}
        <Zone3Auditor
          analysisData={analysisData}
          hoveredFindingId={hoveredFindingId}
          onHoverFinding={setHoveredFindingId}
          selectedFindingId={selectedFindingId}
          onSelectFinding={setSelectedFindingId}
          onSelectDocByFilename={(fname) => {
            const found = caseDocs.find(d => d.filename.toLowerCase() === fname.toLowerCase());
            if (found) handleSelectDoc(found);
          }}
        />
      </div>

      {/* Bottom Batch Document Carousel */}
      <BottomDocCarousel
        caseDocs={caseDocs}
        currentDoc={currentDoc}
        onSelectDoc={handleSelectDoc}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Interactive Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
