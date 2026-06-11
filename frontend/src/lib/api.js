const API_BASE = '/api'

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  if (response.status === 204) {
    return null
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.detail || 'Erreur API')
    error.status = response.status
    throw error
  }

  return data
}

export async function fetchStats() {
  return apiFetch('/stats')
}

export async function fetchRandomQuestion(category, excludedIds = []) {
  const params = new URLSearchParams()
  if (category) {
    params.set('categorie', category)
  }
  if (excludedIds.length > 0) {
    params.set('exclude', excludedIds.join(','))
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/question${query}`)
}

export async function submitAnswer(questionId, answer) {
  return apiFetch('/answer', {
    method: 'POST',
    body: JSON.stringify({ id: questionId, answer }),
  })
}

export async function submitExplanation(questionId, explanation, playerName) {
  return apiFetch('/explanation', {
    method: 'POST',
    body: JSON.stringify({ id: questionId, explanation, playerName }),
  })
}

export async function fetchPublicExplanations(limit = 24) {
  return apiFetch(`/explanations?limit=${limit}`)
}

export async function voteExplanation(explanationId, voterName, approve) {
  return apiFetch(`/explanations/${explanationId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ voterName, approve }),
  })
}

export async function fetchLeaderboard(limit = 20) {
  return apiFetch(`/leaderboard?limit=${limit}`)
}

export async function fetchProgress() {
  return apiFetch('/progress')
}

export async function saveScore(score) {
  return apiFetch('/scores', {
    method: 'POST',
    body: JSON.stringify(score),
  })
}

export async function registerUser({ pseudo, password, email }) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ pseudo, password, email: email || null }),
  })
}

export async function loginUser({ pseudo, password }) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ pseudo, password }),
  })
}

export async function fetchMe() {
  return apiFetch('/auth/me')
}

export async function logoutUser() {
  return apiFetch('/auth/logout', { method: 'POST' })
}

export async function fetchProfile() {
  return apiFetch('/profile')
}

export async function fetchBadgeCatalogue() {
  return apiFetch('/badges')
}

// L'admin s'authentifie comme n'importe quel utilisateur : le serveur
// vérifie role='admin' sur chaque endpoint /admin/* (401/403 sinon).
export async function fetchAdminQuestions() {
  return apiFetch('/admin/questions')
}

export async function fetchAdminCategories() {
  return apiFetch('/admin/categories')
}

export async function createCategory(name) {
  return apiFetch('/admin/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function updateCategory(categoryId, name) {
  return apiFetch(`/admin/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

export async function deleteCategory(categoryId) {
  return apiFetch(`/admin/categories/${categoryId}`, {
    method: 'DELETE',
  })
}

export async function createQuestion(question) {
  return apiFetch('/admin/questions', {
    method: 'POST',
    body: JSON.stringify(question),
  })
}

export async function updateQuestion(questionId, question) {
  return apiFetch(`/admin/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(question),
  })
}

export async function deleteQuestion(questionId) {
  return apiFetch(`/admin/questions/${questionId}`, {
    method: 'DELETE',
  })
}

export async function resetAdminQuestions() {
  return apiFetch('/admin/reset', {
    method: 'POST',
  })
}

export async function importAdminQuestions(questions) {
  return apiFetch('/admin/import', {
    method: 'POST',
    body: JSON.stringify(questions),
  })
}
