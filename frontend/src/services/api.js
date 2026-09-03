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

export async function submitAgentContext(docId, userContext, referenceUrls = []) {
  const res = await fetch(`${API_BASE_URL}/agent/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      doc_id: docId,
      user_context: userContext,
      reference_urls: referenceUrls
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Agent context analysis failed');
  }

  return await res.json();
}

export async function submitShieldQuery({ docId, prompt, documentText = null, model = 'qwen/qwen-2.5-32b', apiKeys = null }) {
  const res = await fetch(`${API_BASE_URL}/agent/shield-query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      doc_id: docId,
      document_text: documentText,
      prompt: prompt,
      model: model,
      api_keys: apiKeys
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Shield query execution failed');
  }

  return await res.json();
}

export async function preScanDocument({ docId = null, text = null }) {
  const res = await fetch(`${API_BASE_URL}/agent/pre-scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      doc_id: docId,
      text: text
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Pre-scan failed');
  }

  return await res.json();
}

export async function fetchLearnedThreats() {
  try {
    const res = await fetch(`${API_BASE_URL}/agent/threats`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Could not fetch learned threats:', err);
  }
  return { threats: [] };
}

export async function addLearnedThreat(pattern, category = 'Learned Micro-Constraint', severity = 'High') {
  const res = await fetch(`${API_BASE_URL}/agent/threats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pattern,
      category,
      severity,
      source: 'User Manual Entry'
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to add threat pattern');
  }

  return await res.json();
}

export async function deleteLearnedThreat(threatId) {
  const res = await fetch(`${API_BASE_URL}/agent/threats/${threatId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to delete threat pattern');
  }

  return await res.json();
}

export async function resetLearnedThreats() {
  const res = await fetch(`${API_BASE_URL}/agent/threats/reset`, {
    method: 'POST'
  });
  if (res.ok) return await res.json();
  return null;
}

