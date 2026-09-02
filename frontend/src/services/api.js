const API_BASE_URL = 'http://localhost:8000/api';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline or unreachable:', err);
    return null;
  }
}

export async function fetchDocuments() {
  try {
    const res = await fetch(`${API_BASE_URL}/documents`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Could not fetch documents:', err);
  }
  return null;
}

export async function fetchDocumentById(docId) {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(docId)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Could not fetch document ${docId}:`, err);
  }
  return null;
}

export async function deleteDocumentById(docId) {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE'
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Could not delete document ${docId}:`, err);
  }
  return null;
}

export async function fetchSampleDocs() {
  try {
    const res = await fetch(`${API_BASE_URL}/sample-docs`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Falling back to default sample docs');
  }
  return null;
}

export async function fetchSampleAnalysis(filename) {
  try {
    const res = await fetch(`${API_BASE_URL}/sample-docs/${encodeURIComponent(filename)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Could not fetch analysis for ${filename}:`, err);
  }
  return null;
}

export async function uploadAndAnalyzeDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Analysis request failed');
  }

  return await res.json();
}
