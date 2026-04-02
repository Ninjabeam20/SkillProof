import { useMemo, useState, useEffect } from 'react'
import ReactFlow, { Background, Controls, Handle, MiniMap, Position } from 'reactflow'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Lock, Play } from 'lucide-react'
import { useSkillProofStore } from '../state/useSkillProofStore.js'

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const pageVariants = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ---------------------------------------------------------------------------
// Status constants & helpers
// ---------------------------------------------------------------------------
const STATUSES = {
  VERIFIED: 'VERIFIED',
  PARTIAL: 'PARTIAL',
  OVERCLAIM: 'OVERCLAIM',
  BASIC_VERIFIED: 'BASIC_VERIFIED',
  BASIC_UNVERIFIED: 'BASIC_UNVERIFIED',
  UNTESTED: 'UNTESTED',
  NO_QUESTIONS: 'NO_QUESTIONS',
}

function statusColor(status) {
  switch (status) {
    case STATUSES.VERIFIED:
    case STATUSES.BASIC_VERIFIED:
      return 'var(--color-verified)'
    case STATUSES.PARTIAL:
      return 'var(--color-partial)'
    case STATUSES.OVERCLAIM:
    case STATUSES.BASIC_UNVERIFIED:
      return 'var(--color-overclaim)'
    case STATUSES.UNTESTED:
    case STATUSES.NO_QUESTIONS:
    default:
      return 'var(--color-untested)'
  }
}

// ---------------------------------------------------------------------------
// ReactFlow custom node with sunset glow accents
// ---------------------------------------------------------------------------
function SkillNode({ data }) {
  const { label, status, blocked } = data
  return (
    <div
      className={clsx(
        'rounded-lg border px-3 py-2 shadow-sm transition-all duration-200',
        blocked
          ? 'border-[color:var(--color-border)] bg-[color:var(--color-bg-tertiary)]'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-secondary)] hover:shadow-md hover:scale-105',
      )}
      style={{
        boxShadow: blocked
          ? '0 0 0 1px var(--color-border)'
          : `0 0 0 2px color-mix(in srgb, ${statusColor(status)} 30%, transparent), 0 4px 12px -4px rgba(244,63,94,.12)`,
      }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
            style={{ background: statusColor(status) }}
          />
          <div className="truncate text-sm font-medium text-[color:var(--color-text-primary)]">
            {label}
          </div>
        </div>
        {blocked ? <Lock className="h-4 w-4 text-[color:var(--color-text-tertiary)]" /> : null}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  )
}

const nodeTypes = { skill: SkillNode }

// ---------------------------------------------------------------------------
// Graph layout helpers
// ---------------------------------------------------------------------------
function computeDepth(queue, id, memo, visiting) {
  if (memo[id] != null) return memo[id]
  if (visiting.has(id)) return 0
  visiting.add(id)

  const item = queue.find((q) => q.skill_id === id)
  const prereqs = item?._prereqs || []
  if (!prereqs.length) {
    memo[id] = 0
    visiting.delete(id)
    return 0
  }
  const d = 1 + Math.max(...prereqs.map((p) => computeDepth(queue, p, memo, visiting)))
  memo[id] = d
  visiting.delete(id)
  return d
}

export function GraphPage() {
  const navigate = useNavigate()
  const evaluationQueue = useSkillProofStore((s) => s.evaluationQueue)
  const userId = useSkillProofStore((s) => s.userId)

  const [selectedId, setSelectedId] = useState(null)
  const [evaluations, setEvaluations] = useState([])

  // Fetch evaluations from Postgres for node status
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    fetch(`/api/report/${userId}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        if (!cancelled) setEvaluations(data.evaluations || [])
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [userId])

  const sessions = useMemo(() => {
    const map = {}
    for (const s of evaluations) map[s.skill_id] = s
    return map
  }, [evaluations])

  const { nodes, edges, metaById } = useMemo(() => {
    if (!evaluationQueue.length) return { nodes: [], edges: [], metaById: {} }

    const queueById = {}
    for (const q of evaluationQueue) {
      queueById[q.skill_id] = q
    }

    const allIds = new Set()
    for (const q of evaluationQueue) {
      allIds.add(q.skill_id)
      for (const mp of q.missing_prerequisites || []) allIds.add(mp)
    }

    const enrichedQueue = evaluationQueue.map((q) => ({
      ...q,
      _prereqs: q.missing_prerequisites || [],
    }))

    const depthMemo = {}
    const depth = (id) => computeDepth(enrichedQueue, id, depthMemo, new Set())

    const idsSorted = Array.from(allIds).sort((a, b) => {
      const da = depth(a)
      const db = depth(b)
      if (da !== db) return da - db
      return a.localeCompare(b)
    })

    const byDepth = new Map()
    for (const id of idsSorted) {
      const d = depth(id)
      byDepth.set(d, [...(byDepth.get(d) ?? []), id])
    }

    const metaById = {}
    const nodes = []
    for (const [d, list] of Array.from(byDepth.entries()).sort((a, b) => a[0] - b[0])) {
      list.forEach((id, idx) => {
        const qItem = queueById[id]
        const label = qItem?.canonical_name || id
        const session = sessions[id]
        const hasQuestions = qItem?.has_questions ?? false
        const blocked = qItem ? !qItem.prerequisites_met : false

        let status = STATUSES.UNTESTED
        if (session) status = session.verdict
        else if (!hasQuestions) status = STATUSES.NO_QUESTIONS

        metaById[id] = {
          id,
          label,
          hasQuestions,
          blocked,
          status,
          session,
          claimedLevel: qItem?.claimed_level ?? null,
          missingPrereqs: qItem?.missing_prerequisites ?? [],
          tier: qItem?.tier ?? 1,
          domain: qItem?.domain ?? 'Unknown',
        }

        nodes.push({
          id,
          type: 'skill',
          position: { x: d * 280, y: idx * 104 },
          data: { label, status, blocked },
        })
      })
    }

    const edges = []
    for (const q of evaluationQueue) {
      for (const prereq of q.missing_prerequisites || []) {
        if (allIds.has(prereq)) {
          edges.push({
            id: `${prereq}->${q.skill_id}`,
            source: prereq,
            target: q.skill_id,
            animated: false,
            style: { stroke: 'rgba(244,63,94,.25)' },
          })
        }
      }
    }

    return { nodes, edges, metaById }
  }, [evaluationQueue, sessions])

  const selected = selectedId ? metaById[selectedId] : null

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
    <motion.div
      className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <section
        className="rounded-xl border p-4 relative overflow-hidden"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
      >
        {/* Sunset gradient bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, var(--color-graph-glow), var(--color-graph-warm))' }}
        />
        <div className="flex items-end justify-between gap-4 px-2 pb-3">
          <div className="min-w-0">
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Skill Knowledge Graph
            </div>
            <div className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Nodes are skills. Edges show prerequisites. Locked skills are blocked.
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {[
                { label: 'Untested', color: 'var(--color-untested)' },
                { label: 'Verified', color: 'var(--color-verified)' },
                { label: 'Partial', color: 'var(--color-partial)' },
                { label: 'Overclaim', color: 'var(--color-overclaim)' },
              ].map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-2 rounded-full border px-2 py-1"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden text-xs md:block" style={{ color: 'var(--color-text-tertiary)' }}>
            Click a node to inspect
          </div>
        </div>

        <div
          className="h-[74dvh] overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            fitView
            fitViewOptions={{ padding: 0.25 }}
          >
            <Background gap={16} size={1} color="rgba(244,63,94,.04)" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => statusColor(n.data?.status)}
              maskColor="rgba(0,0,0,.1)"
              style={{ background: 'var(--color-bg-tertiary)', borderRadius: 8, border: '1px solid var(--color-border)' }}
            />
            <Controls />
          </ReactFlow>
        </div>
      </section>

      <aside
        className="rounded-xl border p-5"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
      >
        {!selected ? (
          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Select a node to see claim, prerequisites, eligibility, and verdict.
          </div>
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            key={selected.id}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Node Inspector
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="truncate text-lg font-bold tracking-tight"
                    style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
                  >
                    {selected.label}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    ID: <span className="font-mono">{selected.id}</span>
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    borderColor: `color-mix(in srgb, ${statusColor(selected.status)} 30%, transparent)`,
                    background: `color-mix(in srgb, ${statusColor(selected.status)} 10%, transparent)`,
                    color: statusColor(selected.status),
                  }}
                >
                  {selected.status}
                </span>
              </div>
            </div>

            <motion.div
              className="rounded-lg border p-4"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Claimed level</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {selected.claimedLevel ?? '—'}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Tier / Domain</div>
                <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {selected.tier} / {selected.domain}
                </div>
              </div>
              {selected.session && (
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Composite Score</div>
                  <div className="text-sm font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {(selected.session.composite_score * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {selected.missingPrereqs.length > 0 && (
                <div
                  className="mt-3 rounded-lg border p-3 text-xs"
                  style={{
                    borderColor: 'var(--color-overclaim-border)',
                    background: 'var(--color-overclaim-dim)',
                    color: 'var(--color-overclaim)',
                  }}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <Lock className="h-4 w-4" />
                    Blocked: missing prerequisite(s)
                  </div>
                  <div className="mt-2 font-mono text-[11px]">
                    {selected.missingPrereqs.join(', ')}
                  </div>
                </div>
              )}
            </motion.div>

            {selected.session && (
              <motion.div
                className="rounded-lg border p-4"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Verdict
                </div>
                <div className="mt-2 space-y-2">
                  <div
                    className="rounded-lg border px-3 py-2 text-xs font-medium"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Rule {selected.session.rule_fired}: {selected.session.verdict}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    This result is fully deterministic and reproducible.
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                disabled={!selected.hasQuestions || selected.blocked || !!selected.session}
                onClick={() => navigate(`/evaluate/${selected.id}`)}
                className={clsx(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                  !selected.hasQuestions || selected.blocked || !!selected.session
                    ? 'cursor-not-allowed'
                    : '',
                )}
                style={{
                  borderColor: !selected.hasQuestions || selected.blocked || !!selected.session
                    ? 'var(--color-border)'
                    : 'var(--color-accent-border)',
                  background: !selected.hasQuestions || selected.blocked || !!selected.session
                    ? 'var(--color-bg-tertiary)'
                    : 'var(--color-accent-dim)',
                  color: !selected.hasQuestions || selected.blocked || !!selected.session
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-accent)',
                }}
                whileHover={
                  !selected.hasQuestions || selected.blocked || !!selected.session
                    ? {}
                    : { scale: 1.05 }
                }
                whileTap={
                  !selected.hasQuestions || selected.blocked || !!selected.session
                    ? {}
                    : { scale: 0.95 }
                }
              >
                <Play className="h-4 w-4" />
                {selected.session ? 'Evaluated' : 'Start Evaluation'}
              </motion.button>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg border px-3 py-2.5 text-sm transition-all duration-200"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Clear
              </button>
            </div>

            {!selected.hasQuestions && (
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                No question bank defined for this skill yet.
              </div>
            )}
          </motion.div>
        )}
      </aside>
    </motion.div>
  )
}
