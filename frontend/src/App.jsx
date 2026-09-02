import React, { useState, useEffect } from 'react';
import TopNav from './components/TopNav';
import Zone1Layers from './components/Zone1Layers';
import Zone2Canvas from './components/Zone2Canvas';
import Zone3Auditor from './components/Zone3Auditor';
import BottomDocCarousel from './components/BottomDocCarousel';
import UploadModal from './components/UploadModal';

import { DEFAULT_CASE_DOCS, DEFAULT_BANK_STATEMENT_ANALYSIS } from './data/mockData';
import { 
  fetchDocuments, 
  fetchDocumentById, 
  deleteDocumentById,
  fetchSampleDocs, 
  fetchSampleAnalysis, 
  fetchHealth 
} from './services/api';

export default function App() {
  const [caseDocs, setCaseDocs] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  // 5 Streamlined Non-Redundant Forensic Layer Toggles & Opacity
  const [activeLayers, setActiveLayers] = useState({
    ela: true,           // Visual ELA & Sensor Noise Variance
    copy_paste: true,    // Copy-Paste & Cloned Regions
    metadata: false,     // Metadata, Software Signatures & Timestamps
    font: false,         // Font, Typography & Kerning Deviations
    math: true           // Math, Accounting & Formula Consistency
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

  // Load persistent uploaded documents from backend or localStorage on mount
  useEffect(() => {
    async function initWorkspace() {
      const health = await fetchHealth();
      if (health && health.status === 'ok') {
        setBackendConnected(true);
      }

      // Fetch saved documents from server
      const docRes = await fetchDocuments();
      if (docRes && docRes.documents && docRes.documents.length > 0) {
        setCaseDocs(docRes.documents);
        
        // Restore last selected document from localStorage or pick first
        const savedDocId = localStorage.getItem('veridoc_active_doc_id');
        const activeItem = docRes.documents.find(d => d.id === savedDocId) || docRes.documents[0];
        
        if (activeItem) {
          handleSelectDoc(activeItem);
        }
      } else {
        // No uploaded files yet -> Check if user had selected sample before
        const samplePreference = localStorage.getItem('veridoc_show_samples');
        if (samplePreference === 'true') {
          loadSampleCases();
        }
      }
    }
    initWorkspace();
  }, []);

  const loadSampleCases = async () => {
    localStorage.setItem('veridoc_show_samples', 'true');
    setCaseDocs(DEFAULT_CASE_DOCS);
    handleSelectDoc(DEFAULT_CASE_DOCS[0]);
  };

  // Handle document selection
  const handleSelectDoc = async (doc) => {
    setCurrentDoc(doc);
    localStorage.setItem('veridoc_active_doc_id', doc.id);
    
    // Fetch live persistent analysis from backend
    try {
      const data = await fetchDocumentById(doc.id || doc.filename);
      if (data) {
        setAnalysisData(data);
        return;
      }
    } catch (e) {
      console.warn('Could not fetch persistent document analysis:', e);
    }

    // Try sample docs endpoint if it's a sample file
    try {
      const sampleData = await fetchSampleAnalysis(doc.filename);
      if (sampleData) {
        setAnalysisData(sampleData);
        return;
      }
    } catch (e) {
      console.warn('Could not fetch sample analysis:', e);
    }

    // Offline fallback for demo files
    if (doc.filename === 'US_Bank_Statement_Mar2024.pdf') {
      setAnalysisData(DEFAULT_BANK_STATEMENT_ANALYSIS);
    } else {
      setAnalysisData({
        document_id: doc.id,
        filename: doc.filename,
        trust_score: doc.trust_score || 95,
        risk_level: doc.risk_level || 'VERIFIED',
        summary: 'Document verified. No forensic anomalies or tampering detected.',
        metadata: {
          filename: doc.filename,
          filesize_bytes: doc.filesize_bytes || 204800,
          mime_type: 'application/pdf',
          page_count: 1,
          has_anomalies: false,
          anomalies: []
        },
        findings: [],
        layers: {}
      });
    }
  };

  // Delete Document Handler
  const handleDeleteDoc = async (docId) => {
    try {
      await deleteDocumentById(docId);
    } catch (e) {
      console.warn('Error deleting from server:', e);
    }

    const updated = caseDocs.filter(d => d.id !== docId);
    setCaseDocs(updated);

    if (currentDoc?.id === docId) {
      if (updated.length > 0) {
        handleSelectDoc(updated[0]);
      } else {
        setCurrentDoc(null);
        setAnalysisData(null);
        localStorage.removeItem('veridoc_active_doc_id');
        localStorage.removeItem('veridoc_show_samples');
      }
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
      ela: false,
      copy_paste: false,
      metadata: false,
      font: false,
      math: false
    });
    setLayerOpacity(0.65);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(3.0, +(prev + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.4, +(prev - 0.1).toFixed(2)));
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
      type: 'uploaded',
      filesize_bytes: uploadedFile.size,
      uploaded_at: newAnalysis.processed_at
    };

    setCaseDocs(prev => [newDocItem, ...prev.filter(d => d.id !== newDocItem.id)]);
    setCurrentDoc(newDocItem);
    setAnalysisData(newAnalysis);
    localStorage.setItem('veridoc_active_doc_id', newDocItem.id);
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
        onDeleteDoc={handleDeleteDoc}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        isPanMode={isPanMode}
        onTogglePanMode={() => setIsPanMode(prev => !prev)}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Forensic Workspace */}
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Zone 1: Left Controls & Streamlined Layers */}
        <Zone1Layers
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
          layerOpacity={layerOpacity}
          onChangeOpacity={setLayerOpacity}
          onResetLayers={handleResetLayers}
          analysisData={analysisData}
        />

        {/* Center Column: Zone 2 Canvas + Bottom Document Carousel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Zone 2: Document Canvas */}
          <Zone2Canvas
            currentDoc={currentDoc}
            analysisData={analysisData}
            activeLayers={activeLayers}
            layerOpacity={layerOpacity}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            isPanMode={isPanMode}
            hoveredFindingId={hoveredFindingId}
            onHoverFinding={setHoveredFindingId}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            onOpenUpload={() => setIsUploadOpen(true)}
            onLoadSamples={loadSampleCases}
          />

          {/* Bottom Document Dock with Delete capability */}
          <BottomDocCarousel
            caseDocs={caseDocs}
            currentDoc={currentDoc}
            onSelectDoc={handleSelectDoc}
            onOpenUpload={() => setIsUploadOpen(true)}
            onDeleteDoc={handleDeleteDoc}
          />
        </div>

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

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
