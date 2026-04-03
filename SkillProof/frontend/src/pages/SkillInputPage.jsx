import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Sparkles, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import { useSkillProofStore } from '../state/useSkillProofStore.js'

const DEFAULT_RESUME = `I am a Web Developer. I have 3 years of experience in React (Expert), and basic exposure to SQL and Docker.`

const API_BASE = '/api'

const levelBadge = {
  EXPERT: {
    color: 'var(--color-verified)',
    bg: 'var(--color-verified-dim)',
    border: 'var(--color-verified-border)',
    icon: CheckCircle,
    label: 'Expert',
  },
  INTERMEDIATE: {
    color: 'var(--color-partial)',
    bg: 'var(--color-partial-dim)',
    border: 'var(--color-partial-border)',
    icon: AlertTriangle,
    label: 'Intermediate',
  },
  BEGINNER: {
    color: 'var(--color-info)',
    bg: 'var(--color-info-dim)',
    border: 'var(--color-info-border)',
    icon: AlertTriangle,
    label: 'Beginner',
  },
}

export function SkillInputPage() {
  const setClaims = useSkillProofStore((s) => s.setClaims)
  const setEvaluationQueue = useSkillProofStore((s) => s.setEvaluationQueue)
  const claims = useSkillProofStore((s) => s.claims)
  const navigate = useNavigate()

  const [resumeText, setResumeText] = useState(DEFAULT_RESUME)
  const [extracted, setExtracted] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState(null)
  const [evaluationQueue, setLocalQueue] = useState([])
  const [loadingQueue, setLoadingQueue] = useState(false)

  const handleExtract = async () => {
    if (!resumeText.trim()) return
    setExtracting(true)
    setError(null)

    try {
      // Step 1: Extract skills from resume text
      const extractRes = await fetch(`${API_BASE}/resume/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: resumeText }),
      })

      if (!extractRes.ok) throw new Error('Extraction failed')
      const extractData = await extractRes.json()

      // Map backend response to store format
      const mappedClaims = extractData.profiles.map((p) => ({
        skillId: p.skill_id,
        canonicalName: p.canonical_name,
        claimedLevel: p.claimed_level,
      }))

      setClaims(mappedClaims)

      // Step 2: Get the evaluation queue from SKG
      setLoadingQueue(true)
      const queueRes = await fetch(`${API_BASE}/skg/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claims: extractData.profiles.map((p) => ({
            skill_id: p.skill_id,
            claimed_level: p.claimed_level,
          })),
        }),
      })

      if (!queueRes.ok) throw new Error('Failed to build evaluation queue')
      const queueData = await queueRes.json()

      setLocalQueue(queueData.queue)
      setEvaluationQueue(queueData.queue)

      setExtracted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setExtracting(false)
      setLoadingQueue(false)
    }
  }

  const handleBeginEvaluation = () => {
    // Find first skill in queue that has questions
    const firstEvaluable = evaluationQueue.find((s) => s.has_questions)
    if (firstEvaluable) {
      navigate(`/evaluate/${firstEvaluable.skill_id}`)
    }
  }

  const evaluableCount = evaluationQueue.filter((s) => s.has_questions).length

  return (
    <div className="py-2">
      {/* Page header */}
      <header
        className="rounded-xl border p-6"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
      >
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
          Stage 1 — Ingestion
        </div>
        <h1
          className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
        >
          Paste your resume
        </h1>
        <p className="mt-2 max-w-[70ch] text-base" style={{ color: 'var(--color-text-secondary)' }}>
          We'll extract your claimed skills and proficiency levels, then verify each one with our deterministic evaluation engine.
        </p>
      </header>

      {/* Resume textarea */}
      <motion.section
        className="mt-6 rounded-xl border p-6"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
          >
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Resume Text
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Paste raw resume text — we'll match skills from our taxonomy
            </div>
          </div>
        </div>

        <textarea
          id="resume-input"
          value={resumeText}
          onChange={(e) => {
            setResumeText(e.target.value)
            if (extracted) {
              setExtracted(false)
              setError(null)
            }
          }}
          placeholder="Paste your resume text here…"
          rows={8}
          className="w-full resize-y rounded-lg border p-4 text-sm leading-relaxed outline-none transition-all duration-200"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {resumeText.trim().split(/\s+/).filter(Boolean).length} words
          </div>
          <button
            id="extract-claims-btn"
            type="button"
            onClick={handleExtract}
            disabled={extracting || !resumeText.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              borderColor: 'var(--color-accent-border)',
              background: 'var(--color-accent-dim)',
              color: 'var(--color-accent)',
            }}
          >
            {extracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {extracting ? 'Extracting…' : 'Extract Claims'}
          </button>
        </div>

        {error && (
          <div
            className="mt-3 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: 'var(--color-overclaim-border)',
              background: 'var(--color-overclaim-dim)',
              color: 'var(--color-overclaim)',
            }}
          >
            {error}
          </div>
        )}
      </motion.section>

      {/* Extracted claims */}
      <AnimatePresence>
        {extracted && claims.length > 0 && (
          <motion.section
            className="mt-6 rounded-xl border p-6"
            style={{
              borderColor: 'var(--color-verified-border)',
              background: 'var(--color-bg-secondary)',
            }}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Extracted Claims
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Skills detected from resume text — ordered by evaluation priority
                </div>
              </div>
              <div
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{
                  background: 'var(--color-verified-dim)',
                  color: 'var(--color-verified)',
                }}
              >
                {claims.length} found
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {evaluationQueue.map((skill, index) => {
                const badge = levelBadge[skill.claimed_level] || levelBadge.INTERMEDIATE
                const BadgeIcon = badge.icon
                return (
                  <motion.div
                    key={skill.skill_id}
                    className="rounded-lg border p-4 transition-all duration-200"
                    style={{
                      borderColor: badge.border,
                      background: 'var(--color-bg-primary)',
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div
                          className="text-sm font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {skill.canonical_name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: 'var(--color-bg-tertiary)',
                              color: 'var(--color-text-tertiary)',
                            }}
                          >
                            Tier {skill.tier}
                          </span>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: 'var(--color-bg-tertiary)',
                              color: 'var(--color-text-tertiary)',
                            }}
                          >
                            {skill.domain}
                          </span>
                          {!skill.has_questions && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{
                                background: 'var(--color-partial-dim)',
                                color: 'var(--color-partial)',
                              }}
                            >
                              No questions
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={{
                          borderColor: badge.border,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </div>
                    </div>


                  </motion.div>
                )
              })}
            </div>

            {/* Begin Evaluation CTA */}
            {evaluableCount > 0 && (
              <motion.div
                className="mt-6 flex justify-end"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <button
                  id="begin-evaluation-btn"
                  type="button"
                  onClick={handleBeginEvaluation}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-8 py-3.5 text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    borderColor: 'var(--color-verified-border)',
                    background: 'var(--color-verified-dim)',
                    color: 'var(--color-verified)',
                  }}
                >
                  Begin Evaluation
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
