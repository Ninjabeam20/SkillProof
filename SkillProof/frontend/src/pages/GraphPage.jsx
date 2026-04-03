import { useMemo, useState, useEffect } from 'react'
import ReactFlow, { Background, Controls, Handle, MiniMap, Position } from 'reactflow'
import clsx from 'clsx'
import dagre from 'dagre'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
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
// Dagre Layout Engine — Left-to-Right Hierarchy
// ---------------------------------------------------------------------------
const NODE_WIDTH = 180
const NODE_HEIGHT = 60

function getLayoutedElements(nodes, edges, direction = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// ---------------------------------------------------------------------------
// ReactFlow custom node — open evaluation, no locks
// ---------------------------------------------------------------------------
function SkillNode({ data }) {
  const { label, status } = data
  return (
    <div
      className={clsx(
        'rounded-lg border px-3 py-2 shadow-sm transition-all duration-200',
        'border-[color:var(--color-border)] bg-[color:var(--color-bg-secondary)] hover:shadow-md hover:scale-105',
      )}
      style={{
        boxShadow: `0 0 0 2px color-mix(in srgb, ${statusColor(status)} 30%, transparent), 0 4px 12px -4px rgba(244,63,94,.12)`,
        minWidth: NODE_WIDTH,
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
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  )
}

const nodeTypes = { skill: SkillNode }

// ---------------------------------------------------------------------------
// GraphPage Component
// ---------------------------------------------------------------------------
export function GraphPage() {
  const navigate = useNavigate()
  const evaluationQueue = useSkillProofStore((s) => s.evaluationQueue)
  const userId = useSkillProofStore((s) => s.userId)

  const [selectedId, setSelectedId] = useState(null)
  const [evaluations, setEvaluations] = useState([])
  const [skillGraph, setSkillGraph] = useState([])

  // Fetch skill_graph.json for visual edges
  useEffect(() => {
    fetch('/api/skg/graph')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setSkillGraph(data.nodes || data || []))
      .catch(() => {
        // Fallback: load from static data endpoint if graph API doesn't exist
        setSkillGraph([])
      })
  }, [])

  // Fetch evaluations from Postgres for node status
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    fetch(`/api/report/${userId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setEvaluations(data.evaluations || [])
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
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

    // Build a set of all skill IDs in queue
    const allIds = new Set(evaluationQueue.map((q) => q.skill_id))

    // Build SKG lookup for prerequisite edges
    const skgById = {}
    for (const node of skillGraph) {
      skgById[node.skill_id] = node
    }

    // Build metadata map
    const metaById = {}
    const rawNodes = []

    for (const q of evaluationQueue) {
      const id = q.skill_id
      const label = q.canonical_name || id
      const session = sessions[id]
      const hasQuestions = q.has_questions ?? false

      let status = STATUSES.UNTESTED
      if (session) status = session.verdict
      else if (!hasQuestions) status = STATUSES.NO_QUESTIONS

      metaById[id] = {
        id,
        label,
        hasQuestions,
        status,
        session,
        claimedLevel: q.claimed_level ?? null,
        tier: q.tier ?? 1,
        domain: q.domain ?? 'Unknown',
      }

      rawNodes.push({
        id,
        type: 'skill',
        position: { x: 0, y: 0 }, // Dagre will set these
        data: { label, status },
      })
    }

    // Build edges from skill_graph.json prerequisites
    const rawEdges = []
    for (const id of allIds) {
      const skgNode = skgById[id]
      if (!skgNode) continue
      for (const prereq of skgNode.prerequisites || []) {
        if (allIds.has(prereq)) {
          rawEdges.push({
            id: `e-${prereq}-${id}`,
            source: prereq,
            target: id,
            animated: true,
            style: {
              stroke: 'var(--color-graph-warm, #f97316)',
              strokeWidth: 2,
              opacity: 0.6,
            },
          })
        }
      }
    }

    // Apply Dagre layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      rawNodes,
      rawEdges,
      'LR',
    )

    return { nodes: layoutedNodes, edges: layoutedEdges, metaById }
  }, [evaluationQueue, sessions, skillGraph])

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
              Left-to-right hierarchy. Edges show prerequisites. Click any node to inspect.
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
            Select a node to see claim, eligibility, and verdict.
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

              {/* --- Test Status --- */}
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Test Status</div>
                <div
                  className="text-sm font-semibold"
                  style={{
                    color: selected.session
                      ? 'var(--color-verified)'
                      : 'var(--color-text-secondary)',
                  }}
                >
                  {selected.session ? 'Tested' : 'Untested'}
                </div>
              </div>

              {/* --- Questions Answered --- */}
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Questions Answered</div>
                <div className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
                  {selected.session ? '3' : '0'}
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
                disabled={!selected.hasQuestions || !!selected.session}
                onClick={() => navigate(`/evaluate/${selected.id}`)}
                className={clsx(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                  !selected.hasQuestions || !!selected.session
                    ? 'cursor-not-allowed'
                    : '',
                )}
                style={{
                  borderColor: !selected.hasQuestions || !!selected.session
                    ? 'var(--color-border)'
                    : 'var(--color-accent-border)',
                  background: !selected.hasQuestions || !!selected.session
                    ? 'var(--color-bg-tertiary)'
                    : 'var(--color-accent-dim)',
                  color: !selected.hasQuestions || !!selected.session
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-accent)',
                }}
                whileHover={
                  !selected.hasQuestions || !!selected.session
                    ? {}
                    : { scale: 1.05 }
                }
                whileTap={
                  !selected.hasQuestions || !!selected.session
                    ? {}
                    : { scale: 0.95 }
                }
              >
                <Play className="h-4 w-4" />
                {selected.session ? 'Evaluated' : 'Evaluate'}
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
