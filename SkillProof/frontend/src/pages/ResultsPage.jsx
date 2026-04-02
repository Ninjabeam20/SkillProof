import { useMemo, useState, useEffect } from 'react'
import clsx from 'clsx'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { ChevronDown, Loader2 } from 'lucide-react'
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
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ---------------------------------------------------------------------------
// Status & level helpers
// ---------------------------------------------------------------------------
function statusBadge(verdict) {
  switch (verdict) {
    case 'VERIFIED':
      return { label: 'Verified', tone: 'verified' }
    case 'PARTIAL':
      return { label: 'Partial', tone: 'partial' }
    case 'OVERCLAIM':
      return { label: 'Overclaim', tone: 'overclaim' }
    case 'BASIC_VERIFIED':
      return { label: 'Basic Verified', tone: 'verified' }
    case 'BASIC_UNVERIFIED':
      return { label: 'Basic Unverified', tone: 'overclaim' }
    default:
      return { label: 'Untested', tone: 'muted' }
  }
}

function toneStyles(tone) {
  switch (tone) {
    case 'verified':
      return {
        borderColor: 'var(--color-verified-border)',
        background: 'var(--color-verified-dim)',
        color: 'var(--color-verified)',
      }
    case 'partial':
      return {
        borderColor: 'var(--color-partial-border)',
        background: 'var(--color-partial-dim)',
        color: 'var(--color-partial)',
      }
    case 'overclaim':
      return {
        borderColor: 'var(--color-overclaim-border)',
        background: 'var(--color-overclaim-dim)',
        color: 'var(--color-overclaim)',
      }
    default:
      return {
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-secondary)',
      }
  }
}

function claimLevelToPct(level) {
  switch (level) {
    case 'EXPERT': return 100
    case 'INTERMEDIATE': return 70
    case 'BEGINNER': return 35
    default: return 0
  }
}

function ruleLabel(ruleId) {
  switch (ruleId) {
    case 'R01': return 'R01: Tier 2 & composite ≥ 0.60 → BASIC_VERIFIED'
    case 'R02': return 'R02: Tier 2 & composite < 0.60 → BASIC_UNVERIFIED'
    case 'R03': return 'R03: Tier 1 & composite ≥ 0.70 → VERIFIED'
    case 'R04': return 'R04: Tier 1 & composite 0.50–0.69 → PARTIAL'
    case 'R05': return 'R05: Tier 1 & claimed EXPERT & composite < 0.60 → OVERCLAIM'
    case 'R06': return 'R06: Tier 1 & claimed INTERMEDIATE & composite < 0.45 → OVERCLAIM'
    default: return ruleId
  }
}

export function ResultsPage() {
  const evaluationQueue = useSkillProofStore((s) => s.evaluationQueue)
  const userId = useSkillProofStore((s) => s.userId)

  const [open, setOpen] = useState(() => new Set())
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

  const sessionsMap = useMemo(() => {
    const map = {}
    for (const s of evaluations) map[s.skill_id] = s
    return map
  }, [evaluations])

  const rows = useMemo(() => {
    if (!evaluationQueue.length && !evaluations.length) return []

    const result = evaluationQueue.map((q) => {
      const session = sessionsMap[q.skill_id]
      return {
        skillId: q.skill_id,
        skillName: q.canonical_name || q.skill_id,
        claimedLevel: q.claimed_level,
        verifiedScore: session ? Math.round(session.composite_score * 100) : null,
        verdict: session?.verdict ?? 'UNTESTED',
        session,
        hasQuestions: q.has_questions,
        missingPrereqs: q.missing_prerequisites || [],
      }
    })

    return result.sort((a, b) => a.skillName.localeCompare(b.skillName))
  }, [evaluationQueue, sessionsMap])

  const radarData = useMemo(() => {
    return rows
      .filter((r) => r.session)
      .map((r) => ({
        skill: r.skillName,
        Claimed: claimLevelToPct(r.claimedLevel),
        Verified: r.verifiedScore ?? 0,
      }))
  }, [rows])

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
          <div className="text-sm">No evaluation data yet. Extract skills and run evaluations first.</div>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="py-2" variants={pageVariants} initial="initial" animate="animate">
      <header
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
              Results Dashboard
            </div>
            <h1
              className="mt-3 text-3xl font-bold tracking-tight md:text-4xl"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
            >
              Claim vs Reality
            </h1>
            <p className="mt-2 max-w-[78ch] text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Every number below is reproducible. Expand a skill to see the audit
              trail: scores, rule firings, and misconception tags.
            </p>
          </div>
          <div
            className="text-xs font-semibold px-3 py-1.5 rounded"
            style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
          >
            Fully Deterministic
          </div>
        </div>
      </header>

      {loading && (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border p-12"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
        >
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading results from database…</span>
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
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_480px]">
          <section
            className="rounded-xl border p-6"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
          >
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                A. Claim vs Reality Table
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Expand rows for audit details
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full border-collapse text-left text-sm">
                <thead
                  className="text-xs font-semibold"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                >
                  <tr>
                    <th className="px-4 py-3 font-semibold">Skill</th>
                    <th className="px-4 py-3 font-semibold">Claimed</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Verdict</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <LayoutGroup>
                  <motion.tbody variants={staggerContainer} initial="initial" animate="animate">
                    {rows.map((r) => {
                      const b = statusBadge(r.verdict)
                      const isOpen = open.has(r.skillId)
                      return (
                        <FragmentRow
                          key={r.skillId}
                          row={r}
                          badge={b}
                          isOpen={isOpen}
                          onToggle={() => {
                            setOpen((prev) => {
                              const next = new Set(prev)
                              if (next.has(r.skillId)) next.delete(r.skillId)
                              else next.add(r.skillId)
                              return next
                            })
                          }}
                        />
                      )
                    })}
                  </motion.tbody>
                </LayoutGroup>
              </table>
            </div>
          </section>

          <section
            className="rounded-xl border p-6"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
          >
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              B. Radar (Claimed vs Verified)
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Claimed maps to 0–100; Verified is your composite score × 100.
            </div>

            <div
              className="mt-4 h-[340px] rounded-lg border p-3"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
            >
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(16,185,129,.12)" />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                      }}
                    />
                    <Radar
                      name="Claimed"
                      dataKey="Claimed"
                      stroke="var(--color-partial)"
                      fill="var(--color-partial-dim)"
                      strokeWidth={2}
                      animationBegin={200}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                    <Radar
                      name="Verified"
                      dataKey="Verified"
                      stroke="var(--color-verified)"
                      fill="var(--color-verified-dim)"
                      strokeWidth={2}
                      animationBegin={400}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  Complete evaluations to see radar data
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </motion.div>
  )
}

function FragmentRow({ row, badge, isOpen, onToggle }) {
  const ts = toneStyles(badge.tone)
  return (
    <>
      <motion.tr
        layout
        variants={staggerItem}
        className="border-t transition-colors"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
      >
        <td className="px-4 py-3">
          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.skillName}</div>
          {row.missingPrereqs.length > 0 && (
            <div
              className="mt-1 text-xs px-2 py-0.5 rounded inline-block"
              style={{ background: 'var(--color-overclaim-dim)', color: 'var(--color-overclaim)' }}
            >
              Missing: {row.missingPrereqs.join(', ')}
            </div>
          )}
        </td>
        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.claimedLevel}</td>
        <td className="px-4 py-3 font-mono text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          {row.verifiedScore == null ? '—' : `${row.verifiedScore}%`}
        </td>
        <td className="px-4 py-3">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={ts}
          >
            {badge.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {row.session && (
            <motion.button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
              }}
              whileHover={{ scale: 1.05, borderColor: 'var(--color-interact-border)' }}
              whileTap={{ scale: 0.97 }}
            >
              Audit
              <ChevronDown className={clsx('h-4 w-4 transition', isOpen && 'rotate-180')} />
            </motion.button>
          )}
        </td>
      </motion.tr>

      <AnimatePresence initial={false}>
        {isOpen && row.session ? (
          <motion.tr
            layout
            className="border-t"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <td colSpan={5} className="px-4 py-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="py-4">
                  <AuditTrail session={row.session} missingPrereqs={row.missingPrereqs} />
                </div>
              </motion.div>
            </td>
          </motion.tr>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function AuditTrail({ session, missingPrereqs }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <motion.div
          className="rounded-lg border p-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
            Score breakdown
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3" style={{ color: 'var(--color-text-secondary)' }}>
            <Metric label="Theory" value={Math.round(session.theory_score * 100)} />
            <Metric label="Practical" value={Math.round(session.practical_score * 100)} />
            <Metric label="Edge Case" value={Math.round(session.edge_case_score * 100)} />
          </div>
          <div className="mt-3 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Composite: {Math.round(session.composite_score * 100)}%
          </div>
        </motion.div>

        <motion.div
          className="rounded-lg border p-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
            Verdict & Rule
          </div>
          <div className="mt-3 space-y-2">
            <div
              className="rounded-lg border px-3 py-2 text-xs font-medium"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {ruleLabel(session.rule_fired)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              This result is fully deterministic and reproducible.
            </div>
          </div>
        </motion.div>
      </div>

      <div className="space-y-3">
        {session.misconception_tags && session.misconception_tags.length > 0 && (
          <motion.div
            className="rounded-lg border p-4"
            style={{ borderColor: 'var(--color-partial-border)', background: 'var(--color-partial-dim)' }}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-partial)' }}>
              Misconception Tags
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {session.misconception_tags.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    borderColor: 'var(--color-partial-border)',
                    color: 'var(--color-partial)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {missingPrereqs.length > 0 && (
          <motion.div
            className="rounded-lg border p-4"
            style={{ borderColor: 'var(--color-overclaim-border)', background: 'var(--color-overclaim-dim)' }}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-overclaim)' }}>
              Prerequisite gaps
            </div>
            <div className="mt-2 font-mono text-xs" style={{ color: 'var(--color-overclaim)' }}>
              {missingPrereqs.join(', ')}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
    >
      <div className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {value == null ? '—' : `${value}%`}
      </div>
    </div>
  )
}
