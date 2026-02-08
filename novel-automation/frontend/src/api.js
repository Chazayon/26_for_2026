const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Projects
export const getProjects = () => request('/projects');
export const getProject = (id) => request(`/projects/${id}`);
export const createProject = (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) });
export const updateProject = (id, data) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteProject = (id) => request(`/projects/${id}`, { method: 'DELETE' });

// Books
export const getBooks = (projectId) => request(`/projects/${projectId}/books`);
export const getBook = (projectId, bookId) => request(`/projects/${projectId}/books/${bookId}`);
export const createBook = (projectId, data) => request(`/projects/${projectId}/books`, { method: 'POST', body: JSON.stringify(data) });
export const deleteBook = (projectId, bookId) => request(`/projects/${projectId}/books/${bookId}`, { method: 'DELETE' });

// Chapters
export const getChapters = (projectId, bookId) => request(`/projects/${projectId}/books/${bookId}/chapters`);
export const getChapter = (projectId, bookId, chapterId) => request(`/projects/${projectId}/books/${bookId}/chapters/${chapterId}`);
export const createChapter = (projectId, bookId, data) => request(`/projects/${projectId}/books/${bookId}/chapters`, { method: 'POST', body: JSON.stringify(data) });
export const updateChapter = (projectId, bookId, chapterId, data) => request(`/projects/${projectId}/books/${bookId}/chapters/${chapterId}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteChapter = (projectId, bookId, chapterId) => request(`/projects/${projectId}/books/${bookId}/chapters/${chapterId}`, { method: 'DELETE' });

// Voice Callsheets
export const getCallsheets = (projectId) => request(`/projects/${projectId}/callsheets`);
export const createCallsheet = (projectId, data) => request(`/projects/${projectId}/callsheets`, { method: 'POST', body: JSON.stringify(data) });
export const deleteCallsheet = (projectId, id) => request(`/projects/${projectId}/callsheets/${id}`, { method: 'DELETE' });

// Model Configs
export const getModelConfigs = () => request('/models/configs');
export const createModelConfig = (data) => request('/models/configs', { method: 'POST', body: JSON.stringify(data) });
export const updateModelConfig = (id, data) => request(`/models/configs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteModelConfig = (id) => request(`/models/configs/${id}`, { method: 'DELETE' });
export const getAvailableModels = () => request('/models/available');

// Workflow Runs
export const getRuns = (projectId) => request(`/runs${projectId ? `?project_id=${projectId}` : ''}`);
export const getRun = (id) => request(`/runs/${id}`);
export const cancelRun = (id) => request(`/runs/${id}/cancel`, { method: 'POST' });
export const startBrainstorm = (projectId) => request('/runs/brainstorm', { method: 'POST', body: JSON.stringify({ project_id: projectId }) });
export const startChapterRun = (projectId, bookId, chapterId) => request('/runs/chapter', { method: 'POST', body: JSON.stringify({ project_id: projectId, book_id: bookId, chapter_id: chapterId }) });
export const startBookRun = (projectId, bookId) => request('/runs/book', { method: 'POST', body: JSON.stringify({ project_id: projectId, book_id: bookId }) });

// Documents / RAG
export const uploadDocument = (projectId, docType, docName, content) => {
  const formData = new FormData();
  formData.append('doc_type', docType);
  formData.append('doc_name', docName);
  formData.append('content', content);
  return fetch(`${BASE}/projects/${projectId}/documents`, { method: 'POST', body: formData }).then(r => r.json());
};
export const searchRAG = (projectId, query, docType) => request(`/projects/${projectId}/rag/search?query=${encodeURIComponent(query)}${docType ? `&doc_type=${docType}` : ''}`);
