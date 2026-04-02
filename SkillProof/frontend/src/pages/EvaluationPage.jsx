import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle, ArrowRight, AlertTriangle, XCircle } from 'lucide-react'
import { useSkillProofStore } from '../state/useSkillProofStore.js'

const API_BASE = '/api'

const typeColors = {
  THEORY: { color: 'var(--color-info)', bg: 'var(--color-info-dim)', border: 'var(--color-info-border)' },
  PRACTICAL: { color: 'var(--color-verified)', bg: 'var(--color-verified-dim)', border: 'var(--color-verified-border)' },
  EDGE_CASE: { color: 'var(--color-partial)', bg: 'var(--color-partial-dim)', border: 'var(--color-partial-border)' },
}

export function EvaluationPage() {
  const { skillId } = useParams()
  const navigate = useNavigate()

  const claims = useSkillProofStore((s) => s.claims)
  const evaluationQueue = useSkillProofStore((s) => s.evaluationQueue)
  const markSkillEvaluated = useSkillProofStore((s) => s.markSkillEvaluated)
  const evaluatedSkills = useSkillProofStore((s) => s.evaluatedSkills)
  const userId = useSkillProofStore((s) => s.userId)
  const setUserId = useSkillProofStore((s) => s.setUserId)

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [error, setError] = useState(null)
  const [fetchError, setFetchError] = useState(null)

  // Find current claim for this skill
  const currentClaim = claims.find((c) => c.skillId === skillId)
  const claimedLevel = currentClaim?.claimedLevel || 'INTERMEDIATE'
  const queueItem = evaluationQueue.find((q) => q.skill_id === skillId)
  const displayName = queueItem?.canonical_name || currentClaim?.canonicalName || skillId

  // Reset all state when skillId changes
  useEffect(() => {
    setQuestions([])
    setCurrentIndex(0)
    setSelectedAnswers([])
    setLoading(true)
    setScoring(false)
    setError(null)
    setFetchError(null)
  }, [skillId])

  // Fetch questions on mount / skillId change
  useEffect(() => {
    let cancelled = false

    async function fetchQuestions() {
      setLoading(true)
      setFetchError(null)
      try {
        const res = await fetch(`${API_BASE}/evaluation/${skillId}/questions`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail || `Failed to load questions (${res.status})`)
        }
        const data = await res.json()
        if (!cancelled) {
          setQuestions(data.questions)
          setCurrentIndex(0)
          setSelectedAnswers([])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err.message)
          setLoading(false)
        }
      }
    }

    fetchQuestions()
    return () => { cancelled = true }
  }, [skillId])

  // Submit answers to backend score endpoint
  const submitScore = useCallback(async (answers) => {
    setScoring(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/evaluation/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: skillId,
          claimed_level: claimedLevel,
          answers: answers,
          user_id: userId || undefined,
        }),
      })

      if (!res.ok) throw new Error('Scoring failed')
      const session = await res.json()

      // Store the user_id from the first evaluation response
      if (!userId && session.user_id) {
        setUserId(session.user_id)
      }

      // Mark this skill as evaluated in store
      markSkillEvaluated(skillId)

      // Navigate to next unevaluated skill or results
      const nextSkill = evaluationQueue.find(
        (q) => q.has_questions && q.skill_id !== skillId && !evaluatedSkills.has(q.skill_id)
      )

      if (nextSkill) {
        navigate(`/evaluate/${nextSkill.skill_id}`, { replace: true })
      } else {
        navigate('/results', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Scoring failed')
      setScoring(false)
    }
  }, [skillId, claimedLevel, userId, evaluationQueue, evaluatedSkills, markSkillEvaluated, setUserId, navigate])

  // Handle option click — forward-only
  const handleAnswer = (questionId, optionId) => {
    const newAnswers = [...selectedAnswers, { question_id: questionId, selected_option_id: optionId }]
    setSelectedAnswers(newAnswers)

    const nextIndex = currentIndex + 1
    if (nextIndex < questions.length) {
      setTimeout(() => setCurrentIndex(nextIndex), 300)
    } else {
      submitScore(newAnswers)
    }
  }

  const q = questions[currentIndex]
  const progress = questions.length ? Math.round(((currentIndex) / questions.length) * 100) : 0
  const typeStyle = q ? (typeColors[q.question_type] || typeColors.THEORY) : typeColors.THEORY

  const queueIndex = evaluationQueue.findIndex((s) => s.skill_id === skillId)
  const totalEvaluable = evaluationQueue.filter((s) => s.has_questions).length

  return (
    <motion.div
      className="mx-auto max-w-[880px] py-4"
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Header card */}
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Stage 3 — Evaluation
            </div>
            <h2
              className="mt-2 truncate text-2xl font-bold tracking-tight md:text-3xl"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {displayName}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {queueItem && (
              <span
                className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Skill {queueIndex + 1} of {totalEvaluable}
              </span>
            )}
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Claimed: {claimedLevel}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {!loading && !fetchError && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span>
                Question {Math.min(currentIndex + 1, questions.length)} of {questions.length}
              </span>
              <span>{progress}%</span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full border"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-tertiary)',
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--color-accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div
          className="mt-4 flex items-center justify-center gap-3 rounded-xl border p-12"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-secondary)',
          }}
        >
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Loading questions…
          </span>
        </div>
      )}

      {/* Fetch error */}
      {fetchError && (
        <div
          className="mt-4 rounded-xl border p-6"
          style={{
            borderColor: 'var(--color-overclaim-border)',
            background: 'var(--color-overclaim-dim)',
          }}
        >
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5" style={{ color: 'var(--color-overclaim)' }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-overclaim)' }}>
                {fetchError}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                This skill may not have questions in the question bank yet.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextSkill = evaluationQueue.find(
                (q) => q.has_questions && q.skill_id !== skillId && !evaluatedSkills.has(q.skill_id)
              )
              if (nextSkill) {
                navigate(`/evaluate/${nextSkill.skill_id}`, { replace: true })
              } else {
                navigate('/results', { replace: true })
              }
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{
              borderColor: 'var(--color-accent-border)',
              background: 'var(--color-accent-dim)',
              color: 'var(--color-accent)',
            }}
          >
            Skip to Next Skill
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Scoring overlay */}
      {scoring && (
        <motion.div
          className="mt-4 flex items-center justify-center gap-3 rounded-xl border p-12"
          style={{
            borderColor: 'var(--color-verified-border)',
            background: 'var(--color-verified-dim)',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-verified)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-verified)' }}>
            Computing score & firing verdict rules…
          </span>
        </motion.div>
      )}

      {/* Score error */}
      {error && (
        <div
          className="mt-4 rounded-xl border p-4 text-sm"
          style={{
            borderColor: 'var(--color-overclaim-border)',
            background: 'var(--color-overclaim-dim)',
            color: 'var(--color-overclaim)',
          }}
        >
          {error}
        </div>
      )}

      {/* Question card */}
      {!loading && !fetchError && !scoring && q && (
        <AnimatePresence mode="wait">
          <motion.div
            key={q.question_id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div
              className="mt-4 rounded-xl border p-6"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-secondary)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Question {currentIndex + 1} of {questions.length}
                </div>
                <span
                  className="rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    borderColor: typeStyle.border,
                    background: typeStyle.bg,
                    color: typeStyle.color,
                  }}
                >
                  {q.question_type.replace('_', ' ')}
                </span>
              </div>
              <div
                className="mt-4 text-pretty text-lg font-semibold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {q.question_text}
              </div>
            </div>

            {/* Options */}
            <div className="mt-3 grid grid-cols-1 gap-2">
              {q.options.map((opt, optIdx) => (
                <motion.button
                  key={opt.id}
                  type="button"
                  className="group flex w-full items-center gap-4 rounded-lg border px-5 py-4 text-left transition-all duration-200"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-secondary)',
                  }}
                  onClick={() => handleAnswer(q.question_id, opt.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: optIdx * 0.06 }}
                  whileHover={{
                    borderColor: 'var(--color-accent-border)',
                    background: 'var(--color-accent-dim)',
                    scale: 1.01,
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {opt.id.toUpperCase()}
                  </span>
                  <span
                    className="text-sm font-medium leading-snug"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {opt.text}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Forward-only notice */}
            <div className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Forward-only evaluation — clicking an answer immediately advances to the next question. No back navigation.
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
