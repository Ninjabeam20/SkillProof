import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Persist helpers — save/restore key state to localStorage
// ---------------------------------------------------------------------------
const LS_KEY_CLAIMS = 'SkillProof_Claims'
const LS_KEY_QUEUE = 'SkillProof_Queue'
const LS_KEY_USER_ID = 'SkillProof_UserId'

function loadFromLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore quota errors */ }
}

export const useSkillProofStore = create((set, get) => ({
  claims: loadFromLS(LS_KEY_CLAIMS, []),
  evaluationQueue: loadFromLS(LS_KEY_QUEUE, []),
  evaluatedSkills: new Set(),
  userId: localStorage.getItem(LS_KEY_USER_ID) || null,

  /** Replace the entire claims array (used after resume extraction). */
  setClaims: (newClaims) => {
    saveToLS(LS_KEY_CLAIMS, newClaims)
    set({ claims: newClaims })
  },

  /** Set the evaluation queue returned by POST /api/skg/queue. */
  setEvaluationQueue: (queue) => {
    saveToLS(LS_KEY_QUEUE, queue)
    set({ evaluationQueue: queue })
  },

  /** Store the anonymous user ID (returned from first /api/evaluation/score). */
  setUserId: (id) => {
    localStorage.setItem(LS_KEY_USER_ID, id)
    set({ userId: id })
  },

  /** Mark a skill as evaluated. */
  markSkillEvaluated: (skillId) =>
    set((state) => ({
      evaluatedSkills: new Set([...state.evaluatedSkills, skillId]),
    })),

  /** Full reset — clears all persisted state. */
  reset: () => {
    localStorage.removeItem(LS_KEY_CLAIMS)
    localStorage.removeItem(LS_KEY_QUEUE)
    localStorage.removeItem(LS_KEY_USER_ID)
    set({
      claims: [],
      evaluationQueue: [],
      evaluatedSkills: new Set(),
      userId: null,
    })
  },
}))
