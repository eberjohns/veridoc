const API_BASE_URL = 'http://localhost:8000/api';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline or unreachable, using client state:', err);
    return null;
  }
}

export async function fetchCaseDetails(caseId = 'Fraud Investigation #1047') {
  try {
    const res = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Falling back to default case details');
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
