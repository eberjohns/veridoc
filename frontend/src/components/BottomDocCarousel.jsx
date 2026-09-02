import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Trash2
} from 'lucide-react';

export default function BottomDocCarousel({
  caseDocs,
  currentDoc,
  onSelectDoc,
  onOpenUpload,
  onDeleteDoc
}) {
  const [hoveredDocId, setHoveredDocId] = useState(null);

  if (caseDocs.length === 0) return null;

  return (
    <div style={{
      height: '105px',
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '12px',
      overflowX: 'auto',
      userSelect: 'none',
      zIndex: 30,
      flexShrink: 0
    }}>
      {caseDocs.map(doc => {
        const isSelected = currentDoc?.id === doc.id;
        const isFlagged = doc.status === 'flagged' || doc.risk_level === 'CRITICAL';
        const isHovered = hoveredDocId === doc.id;

        return (
          <div
            key={doc.id}
            id={`carousel-doc-${doc.id}`}
            onClick={() => onSelectDoc(doc)}
            onMouseEnter={() => setHoveredDocId(doc.id)}
            onMouseLeave={() => setHoveredDocId(null)}
            style={{
              minWidth: '120px',
              maxWidth: '130px',
              height: '82px',
              backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
              border: isSelected 
                ? '2px solid #2563EB' 
                : isFlagged 
                  ? '1.5px solid #FCA5A5' 
                  : '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease',
              boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none'
            }}
          >
            {/* Delete Button (Visible on Hover or for non-empty doc) */}
            {onDeleteDoc && isHovered && (
              <button
                title="Remove Document"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDoc(doc.id);
                }}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '-6px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: '1.5px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                }}
              >
                <Trash2 size={11} strokeWidth={2.5} />
              </button>
            )}

            {/* Status Badge in Top Right */}
            <div style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 5 }}>
              {isFlagged ? (
                <div style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  !
                </div>
              ) : (
                <div style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle2 size={11} strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Thumbnail Mini Preview Frame */}
            <div style={{
              flex: 1,
              backgroundColor: '#F8FAFC',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #F1F5F9',
              padding: '4px',
              overflow: 'hidden'
            }}>
              <FileText size={18} color={isFlagged ? '#EF4444' : '#2563EB'} />
            </div>

            {/* Document Filename */}
            <div style={{
              fontSize: '10.5px',
              fontWeight: isSelected ? '600' : '500',
              color: isSelected ? '#1D4ED8' : '#334155',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}>
              {doc.filename}
            </div>
          </div>
        );
      })}

      {/* Add Files Card */}
      <div
        id="add-files-carousel-btn"
        onClick={onOpenUpload}
        style={{
          minWidth: '105px',
          height: '82px',
          border: '1.5px dashed #CBD5E1',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          color: '#64748B',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          backgroundColor: '#FAFAFA'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#2563EB';
          e.currentTarget.style.color = '#2563EB';
          e.currentTarget.style.backgroundColor = '#EFF6FF';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#CBD5E1';
          e.currentTarget.style.color = '#64748B';
          e.currentTarget.style.backgroundColor = '#FAFAFA';
        }}
      >
        <Plus size={18} />
        <span style={{ fontSize: '11px', fontWeight: '600' }}>Add Document</span>
      </div>
    </div>
  );
}
