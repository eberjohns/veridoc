import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  UserCheck, 
  CreditCard 
} from 'lucide-react';

export default function BottomDocCarousel({
  caseDocs,
  currentDoc,
  onSelectDoc,
  onOpenUpload
}) {
  return (
    <div style={{
      height: '115px',
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '14px',
      overflowX: 'auto',
      userSelect: 'none',
      zIndex: 40
    }}>
      {caseDocs.map(doc => {
        const isSelected = currentDoc?.id === doc.id;
        const isFlagged = doc.status === 'flagged';
        const isWarning = doc.id === 'doc-inv-003';

        return (
          <div
            key={doc.id}
            id={`carousel-doc-${doc.id}`}
            onClick={() => onSelectDoc(doc)}
            style={{
              minWidth: '115px',
              maxWidth: '125px',
              height: '88px',
              backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF',
              border: isSelected 
                ? '2px solid #2563EB' 
                : isWarning 
                  ? '1.5px solid #EF4444' 
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
            onMouseEnter={e => {
              if (!isSelected) e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = isWarning ? '#EF4444' : '#E2E8F0';
              }
            }}
          >
            {/* Status Badge in Top Right */}
            <div style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 5 }}>
              {isFlagged ? (
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  !
                </div>
              ) : (
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle2 size={12} strokeWidth={3} />
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
              {doc.type === 'id_card' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '18px', height: '22px', backgroundColor: '#CBD5E1', borderRadius: '2px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ width: '28px', height: '3px', backgroundColor: '#94A3B8', borderRadius: '1px' }} />
                    <div style={{ width: '20px', height: '3px', backgroundColor: '#CBD5E1', borderRadius: '1px' }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '80%' }}>
                  <div style={{ width: '50%', height: '4px', backgroundColor: isFlagged ? '#FCA5A5' : '#CBD5E1', borderRadius: '1px' }} />
                  <div style={{ width: '100%', height: '3px', backgroundColor: '#E2E8F0', borderRadius: '1px' }} />
                  <div style={{ width: '80%', height: '3px', backgroundColor: '#E2E8F0', borderRadius: '1px' }} />
                  <div style={{ width: '90%', height: '3px', backgroundColor: '#E2E8F0', borderRadius: '1px' }} />
                </div>
              )}
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
          height: '88px',
          border: '1.5px dashed #CBD5E1',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
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
        <Plus size={20} />
        <span style={{ fontSize: '11px', fontWeight: '600' }}>Add Files</span>
      </div>
    </div>
  );
}
