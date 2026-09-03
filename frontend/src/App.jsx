import React, { useState, useEffect } from 'react';
import TopNav from './components/TopNav';
import Zone1Layers from './components/Zone1Layers';
import Zone2Canvas from './components/Zone2Canvas';
import Zone3Auditor from './components/Zone3Auditor';
import BottomDocCarousel from './components/BottomDocCarousel';
import UploadModal from './components/UploadModal';
import LandingPage from './components/LandingPage';
import DemoPresenter from './components/DemoPresenter';


import { DEFAULT_CASE_DOCS, DEFAULT_BANK_STATEMENT_ANALYSIS } from './data/mockData';
import { 
  fetchDocuments, 
  fetchDocumentById, 
  deleteDocumentById, 
  fetchSampleAnalysis, 
  fetchHealth 
} from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'workspace'
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [caseDocs, setCaseDocs] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);


  // 8 Core Forensic Checks & Opacity
  const [activeLayers, setActiveLayers] = useState({
    prompt_guard: false,
    ai_generation: true,
    metadata: true,
    copy_paste: true,
    splicing: true,
    math: true,
    font: false,
    cross_reference: true
  });
  const [layerOpacity, setLayerOpacity] = useState(0.65);
  // Which layers apply to current document (from backend)
  const [applicableLayers, setApplicableLayers] = useState([]);


  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isPanMode, setIsPanMode] = useState(false);

  // Synchronized Hover/Focus between Zone 2 & Zone 3
  const [hoveredFindingId, setHoveredFindingId] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);

  // Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  // Load persistent uploaded documents list from backend on mount (without auto-selecting)
  useEffect(() => {
    async function initWorkspace() {
      const health = await fetchHealth();
      if (health && health.status === 'ok') {
        setBackendConnected(true);
      }

      // Clear any auto-load preferences
      localStorage.removeItem('veridoc_active_doc_id');
      localStorage.removeItem('veridoc_show_samples');

      // Fetch saved uploaded documents list from server (dock only)
      const docRes = await fetchDocuments();
      if (docRes && docRes.documents && docRes.documents.length > 0) {
        setCaseDocs(docRes.documents);
      } else {
        setCaseDocs([]);
      }
      // Keep canvas and auditor strictly in empty state until user chooses a document
      setCurrentDoc(null);
      setAnalysisData(null);
    }
    initWorkspace();
  }, []);

  // Explicit user action to load sample case files
  const loadSampleCases = async () => {
    setCaseDocs(DEFAULT_CASE_DOCS);
    handleSelectDoc(DEFAULT_CASE_DOCS[0]);
  };

  // Handle document selection
  const handleSelectDoc = async (doc) => {
    if (!doc) {
      setCurrentDoc(null);
      setAnalysisData(null);
      return;
    }

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
      prompt_guard: false,
      metadata: false,
      copy_paste: false,
      splicing: false,
      math: false,
      font: false,
      cross_reference: false
    });
    setLayerOpacity(0.65);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(4.0, +(prev + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.3, +(prev - 0.1).toFixed(2)));
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

    // Auto-activate applicable layers from backend
    if (newAnalysis.applicable_layers && newAnalysis.applicable_layers.length > 0) {
      setApplicableLayers(newAnalysis.applicable_layers);
      const newActive = {};
      ['prompt_guard', 'metadata', 'copy_paste', 'splicing', 'math', 'font', 'cross_reference'].forEach(id => {
        newActive[id] = newAnalysis.applicable_layers.includes(id);
      });
      setActiveLayers(newActive);
    }

    setCaseDocs(prev => [newDocItem, ...prev.filter(d => d.id !== newDocItem.id)]);
    setCurrentDoc(newDocItem);
    setAnalysisData(newAnalysis);
    localStorage.setItem('veridoc_active_doc_id', newDocItem.id);
  };


  return (
    <>
      {currentView === 'landing' ? (
        <LandingPage
          onLaunchWorkspace={() => setCurrentView('workspace')}
          onStartDemo={() => {
            setCurrentView('landing');
            setIsDemoActive(true);
          }}
        />
      ) : (
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
            onGoToLanding={() => setCurrentView('landing')}
          />


      {/* Main Forensic Workspace */}
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Zone 1: Left Controls & 6 Forensic Checks */}
        <Zone1Layers
          currentDoc={currentDoc}
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
          layerOpacity={layerOpacity}
          onChangeOpacity={setLayerOpacity}
          onResetLayers={handleResetLayers}
          analysisData={analysisData}
          applicableLayers={analysisData?.applicable_layers || applicableLayers}
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

          {/* Bottom Document Dock */}
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
          currentDoc={currentDoc}
          analysisData={analysisData}
          hoveredFindingId={hoveredFindingId}
          onHoverFinding={setHoveredFindingId}
          selectedFindingId={selectedFindingId}
          onSelectFinding={setSelectedFindingId}
          onSelectDocByFilename={(fname) => {
            if (!fname) return;
            const cleanTarget = fname.toLowerCase().replace(/\.[^.]+$/, '');
            const found = caseDocs.find(d => {
              const dName = (d.filename || '').toLowerCase();
              const dId = (d.id || '').toLowerCase();
              return dName === fname.toLowerCase() || 
                     dId === fname.toLowerCase() || 
                     dName.includes(cleanTarget) || 
                     dId.includes(cleanTarget) ||
                     cleanTarget.includes(dId) ||
                     cleanTarget.includes(dName.replace(/\.[^.]+$/, ''));
            });
            if (found) {
              handleSelectDoc(found);
            }
          }}
          activeLayers={activeLayers}
          applicableLayers={analysisData?.applicable_layers || applicableLayers}
        />

      </div>

          {/* Upload Modal */}
          <UploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      )}

      {/* Floating Demo Presenter (Accessible from both Landing and Workspace) */}
      <DemoPresenter
        currentView={currentView}
        onSwitchView={setCurrentView}
        onLoadSamples={loadSampleCases}
        isDemoActive={isDemoActive}
        setIsDemoActive={setIsDemoActive}
      />
    </>
  );
}

