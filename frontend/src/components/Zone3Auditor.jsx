import React, { useState } from 'react';
import { 
  Info, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  FileText, 
  Calculator, 
  Copy, 
  Flame, 
  FileCode, 
  Type,
  ExternalLink,
  History,
  AlertCircle
} from 'lucide-react';

export default function Zone3Auditor({
  analysisData,
  hoveredFindingId,
  onHoverFinding,
  selectedFindingId,
  onSelectFinding,
  onSelectDocByFilename
}) {
  const [activeTab, setActiveTab] = useState('findings'); // 'findings' or 'history'
  const [expandedCards, setExpandedCards] = useState({
    'finding-cp-1': true,
    'finding-math-1': true
  });

  const trustScore = analysisData?.trust_score ?? 24;
  const riskLevel = analysisData?.risk_level ?? 'CRITICAL';
  const summary = analysisData?.summary ?? 'High probability of tampering detected. Review all findings.';
  const findings = analysisData?.findings ?? [];

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Circular gauge calculations (Circumference = 2 * PI * r = 2 * 3.14159 * 52 ≈ 326.7)
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (trustScore / 100) * circumference;

  const getScoreColor = (score) => {
    if (score <= 30) return '#EF4444'; // Red
    if (score <= 65) return '#F59E0B'; // Amber
    if (score <= 85) return '#3B82F6'; // Blue
    return '#10B981'; // Emerald
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'High':
      case 'Critical':
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FEE2E2' };
      case 'Medium':
        return { bg: '#FFFBEB', color: '#D97706', border: '#FEF3C7' };
      default:
        return { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
    }
  };

  const getFindingIcon = (type) => {
    switch (type) {
      case 'math':
        return <span style={{ color: '#EF4444', fontWeight: 'bold' }}>Σ</span>;
      case 'copy_paste':
        return <Copy size={16} color="#06B6D4" />;
      case 'ela':
        return <Flame size={16} color="#F97316" />;
      case 'metadata':
        return <FileCode size={16} color="#8B5CF6" />;
      case 'font':
        return <Type size={16} color="#EC4899" />;
      default:
        return <AlertCircle size={16} color="#64748B" />;
    }
  };

  return (
    <aside style={{
      width: '320px',
      minWidth: '300px',
      maxWidth: '360px',
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderLeft: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflowY: 'auto'
    }}>
      {/* 1. AGGREGATE TRUST SCORE SECTION */}
      <div style={{
        padding: '20px 20px 16px 20px',
        borderBottom: '1px solid #F1F5F9',
        textAlign: 'center'
      }}>
        {/* Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '11.5px',
          fontWeight: '700',
          letterSpacing: '0.05em',
          color: '#64748B',
          textTransform: 'uppercase',
          marginBottom: '16px'
        }}>
          <span>Aggregate Trust Score</span>
          <Info size={13} color="#94A3B8" />
        </div>

        {/* Circular Radial Gauge */}
        <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 12px auto' }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background Track */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="10"
            />
            {/* Progress Arc */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="transparent"
              stroke={getScoreColor(trustScore)}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>

          {/* Centered Score Label */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: '800',
              color: getScoreColor(trustScore),
              lineHeight: 1
            }}>
              {trustScore}%
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.08em',
              color: getScoreColor(trustScore),
              marginTop: '4px'
            }}>
              {riskLevel}
            </span>
          </div>
        </div>

        {/* Subtitle */}
        <p style={{
          fontSize: '11.5px',
          color: '#64748B',
          lineHeight: '1.4',
          maxWidth: '240px',
          margin: '0 auto'
        }}>
          {summary}
        </p>
      </div>

      {/* 2. TAB SWITCHER (FINDINGS vs HISTORY) */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: '#FAFAFA'
      }}>
        <button
          onClick={() => setActiveTab('findings')}
          style={{
            flex: 1,
            padding: '10px 0',
            fontSize: '11.5px',
            fontWeight: '700',
            letterSpacing: '0.04em',
            border: 'none',
            backgroundColor: activeTab === 'findings' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'findings' ? '#2563EB' : '#64748B',
            borderBottom: activeTab === 'findings' ? '2px solid #2563EB' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          FINDINGS ({findings.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '10px 0',
            fontSize: '11.5px',
            fontWeight: '700',
            letterSpacing: '0.04em',
            border: 'none',
            backgroundColor: activeTab === 'history' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'history' ? '#2563EB' : '#64748B',
            borderBottom: activeTab === 'history' ? '2px solid #2563EB' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          HISTORY
        </button>
      </div>

      {/* 3. FINDINGS LIST OR HISTORY CONTENT */}
      <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activeTab === 'findings' ? (
          findings.map(finding => {
            const isExpanded = !!expandedCards[finding.id];
            const isHovered = hoveredFindingId === finding.id;
            const badge = getSeverityBadge(finding.severity);

            return (
              <div
                key={finding.id}
                id={`card-${finding.id}`}
                onMouseEnter={() => onHoverFinding(finding.id)}
                onMouseLeave={() => onHoverFinding(null)}
                style={{
                  border: isHovered ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  boxShadow: isHovered ? '0 4px 12px rgba(59, 130, 246, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Header */}
                <div
                  onClick={() => toggleExpand(finding.id)}
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: isHovered ? '#F8FAFC' : '#FFFFFF'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '5px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      {getFindingIcon(finding.layer_type)}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>
                      {finding.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`
                    }}>
                      {finding.severity}
                    </span>
                    {isExpanded ? <ChevronUp size={14} color="#94A3B8" /> : <ChevronDown size={14} color="#94A3B8" />}
                  </div>
                </div>

                {/* Expanded Card Body */}
                {isExpanded && (
                  <div style={{
                    padding: '0 12px 12px 12px',
                    fontSize: '12px',
                    color: '#475569',
                    lineHeight: '1.5',
                    borderTop: '1px solid #F1F5F9',
                    paddingTop: '8px'
                  }}>
                    <p style={{ marginBottom: '8px', color: '#334155' }}>
                      {finding.description}
                    </p>

                    {/* Specific breakdown for Math Error */}
                    {finding.expected_value && finding.found_value && (
                      <div style={{
                        backgroundColor: '#F8FAFC',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px'
                      }}>
                        <div>
                          <span style={{ color: '#64748B' }}>Expected: </span>
                          <strong style={{ color: '#10B981', fontFamily: 'var(--font-mono)' }}>{finding.expected_value}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748B' }}>Found: </span>
                          <strong style={{ color: '#EF4444', fontFamily: 'var(--font-mono)' }}>{finding.found_value}</strong>
                        </div>
                      </div>
                    )}

                    {/* Specific breakdown for Copy-Paste Detection */}
                    {finding.source_doc && (
                      <div style={{
                        backgroundColor: '#F8FAFC',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        border: '1px solid #E2E8F0'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '6px' }}>
                          Source Document Identified:
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={14} color="#EC4899" />
                            <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#1E293B' }}>
                              {finding.source_doc}
                            </span>
                          </div>

                          <button
                            onClick={() => onSelectDocByFilename && onSelectDocByFilename(finding.source_doc)}
                            style={{
                              padding: '3px 8px',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              border: '1px solid #BFDBFE',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            View Source
                          </button>
                        </div>

                        <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '4px' }}>
                          Page {finding.source_page || 1} • {finding.match_percentage || 87}% Match
                        </div>
                      </div>
                    )}

                    {/* View Details Link */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#2563EB',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}>
                      <span>View Details</span>
                      <ChevronRight size={13} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* History Tab */
          <div style={{ padding: '8px 0', fontSize: '12px', color: '#64748B' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB', marginTop: '4px' }} />
              <div>
                <div style={{ fontWeight: '600', color: '#1E293B' }}>Analysis Run Completed</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Today at 02:45 PM by Automated Forensics Engine</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#CBD5E1', marginTop: '4px' }} />
              <div>
                <div style={{ fontWeight: '600', color: '#1E293B' }}>Document Ingested</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Case #1047 intake upload</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
