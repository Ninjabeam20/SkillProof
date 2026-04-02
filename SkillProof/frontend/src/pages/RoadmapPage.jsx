import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useSkillProofStore } from '../state/useSkillProofStore.js'

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const pageVariants = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const staggerItem = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function claimLevelToPct(level) {
  switch (level) {
    case 'EXPERT': return 100
    case 'INTERMEDIATE': return 70
    case 'BEGINNER': return 35
    default: return 0
  }
}

export function RoadmapPage() {
  const evaluationQueue = useSkillProofStore((s) => s.evaluationQueue)
  const userId = useSkillProofStore((s) => s.userId)

  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  // Fetch evaluations from Postgres via report API
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    setLoading(true)
    setFetchError(null)

    fetch(`/api/report/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load report')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setEvaluations(data.evaluations || [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [userId])

  const sessions = useMemo(() => {
    const map = {}
    for (const s of evaluations) map[s.skill_id] = s
    return map
  }, [evaluations])

  const items = useMemo(() => {
    const raw = evaluationQueue
      .map((q) => {
        const session = sessions[q.skill_id]
        const claimed = claimLevelToPct(q.claimed_level)
        const verified = session ? Math.round(session.composite_score * 100) : 0
        const gap = Math.max(0, claimed - verified)

        const misconceptions = session?.misconception_tags ?? []

        return {
          skillId: q.skill_id,
          name: q.canonical_name || q.skill_id,
          gap,
          claimedLevel: q.claimed_level,
          verified,
          missingPrereqs: q.missing_prerequisites || [],
          misconceptions,
          verdict: session?.verdict ?? 'UNTESTED',
          hasSession: !!session,
        }
      })

    const pinned = raw
      .filter((x) => x.missingPrereqs.length > 0)
      .sort((a, b) => b.missingPrereqs.length - a.missingPrereqs.length || b.gap - a.gap)
    const ranked = raw
      .filter((x) => x.missingPrereqs.length === 0)
      .sort((a, b) => b.gap - a.gap || a.name.localeCompare(b.name))

    return { pinned, ranked }
  }, [evaluationQueue, sessions])

  if (!evaluationQueue.length) {
    return (
      <div className="py-4">
        <div
          className="rounded-xl border p-8 text-center"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div className="text-sm">No skills extracted yet. Go to Resume Input to start.</div>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="py-2" variants={pageVariants} initial="initial" animate="animate">
      <header
        className="rounded-xl border p-6 relative overflow-hidden"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
      >
        {/* Gradient accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, var(--color-roadmap-start), var(--color-roadmap-end))' }}
        />
        <div
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Improvement Roadmap
        </div>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight md:text-4xl"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
        >
          Structured, rule-ranked gaps
        </h1>
        <p className="mt-2 max-w-[78ch] text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          This roadmap is not AI-generated. It ranks the largest claim-to-score
          gaps first, and pins prerequisite gaps at the top because they block
          downstream evaluation.
        </p>
      </header>

      {loading && (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border p-12"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
        >
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading roadmap data…</span>
        </div>
      )}

      {fetchError && (
        <div className="mt-6 rounded-xl border p-4 text-sm"
          style={{ borderColor: 'var(--color-overclaim-border)', background: 'var(--color-overclaim-dim)', color: 'var(--color-overclaim)' }}
        >
          {fetchError}
        </div>
      )}

      {!loading && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section
            className="rounded-xl border p-6 relative overflow-hidden"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
          >
            {/* Subtle gradient accent */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: 'linear-gradient(90deg, var(--color-overclaim), var(--color-partial))' }}
            />
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Prerequisites pinned (blocking)
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Fix these first to unlock eligibility.
            </div>

            {items.pinned.length === 0 ? (
              <div
                className="mt-4 rounded-lg border border-dashed p-6 text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                No prerequisite gaps detected for your claimed skills.
              </div>
            ) : (
              <motion.div className="mt-4 space-y-3" variants={staggerContainer} initial="initial" animate="animate">
                {items.pinned.map((it) => (
                  <motion.div
                    key={it.skillId}
                    layout
                    variants={staggerItem}
                    className="rounded-lg border p-4"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
                    whileHover={{ scale: 1.02, boxShadow: '0 4px 20px -4px rgba(248,113,113,.15)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {it.name}
                        </div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--color-overclaim)' }}>
                          Missing: {it.missingPrereqs.join(', ')}
                        </div>
                      </div>
                      <div className="text-right text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Gap
                        <div
                          className="mt-1 font-mono text-[13px] font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {Math.round(it.gap)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>

          <section
            className="rounded-xl border p-6 relative overflow-hidden"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
          >
            {/* Aurora gradient accent */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: 'linear-gradient(90deg, var(--color-roadmap-alt-start), var(--color-roadmap-alt-end))' }}
            />
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Ranked improvements (largest gap first)
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Based on claim level vs verified composite score.
            </div>

            {items.ranked.length === 0 ? (
              <div
                className="mt-4 rounded-lg border border-dashed p-6 text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Run some evaluations to generate a roadmap.
              </div>
            ) : (
              <motion.ol className="mt-4 space-y-3" variants={staggerContainer} initial="initial" animate="animate">
                {items.ranked.map((it, i) => (
                  <motion.li
                    key={it.skillId}
                    layout
                    variants={staggerItem}
                    className="rounded-lg border p-4"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
                    whileHover={{ scale: 1.02, boxShadow: '0 4px 20px -4px rgba(139,92,246,.15)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <div className="text-xs font-semibold" style={{ color: 'var(--color-roadmap-alt-start)' }}>
                            #{i + 1}
                          </div>
                          <div className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {it.name}
                          </div>
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Claimed:{' '}
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {it.claimedLevel}
                          </span>{' '}
                          · Verified:{' '}
                          <span className="font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {it.verified}%
                          </span>
                          {it.verdict !== 'UNTESTED' && (
                            <>
                              {' '}· Verdict:{' '}
                              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {it.verdict}
                              </span>
                            </>
                          )}
                        </div>

                        {it.misconceptions.length > 0 && (
                          <div className="mt-3">
                            <div className="text-[11px] font-medium mb-1" style={{ color: 'var(--color-partial)' }}>
                              Misconceptions to address:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {it.misconceptions.map((tag, idx) => (
                                <span
                                  key={`${tag}-${idx}`}
                                  className="rounded-full border px-2 py-0.5 text-[11px]"
                                  style={{
                                    borderColor: 'var(--color-partial-border)',
                                    color: 'var(--color-partial)',
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Gap
                        <div
                          className="mt-1 font-mono text-[13px] font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {Math.round(it.gap)}
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            )}
          </section>
        </div>
      )}
    </motion.div>
  )
}
