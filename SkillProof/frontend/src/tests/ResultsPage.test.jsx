/**
 * ResultsPage.test.jsx — Tests for ResultsPage component
 *
 * Mocks the fetch API and Zustand store to verify the ResultsPage
 * renders the Claim vs Reality table with data from the report API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock the store before importing the component
vi.mock('../state/useSkillProofStore.js', () => {
  const store = vi.fn()
  store.mockImplementation((selector) => {
    const state = {
      evaluationQueue: [
        {
          skill_id: 'react',
          canonical_name: 'React',
          claimed_level: 'EXPERT',
          tier: 1,
          domain: 'Web',
          has_questions: true,
          prerequisites_met: true,
          missing_prerequisites: [],
        },
        {
          skill_id: 'sql',
          canonical_name: 'SQL',
          claimed_level: 'BEGINNER',
          tier: 1,
          domain: 'DB',
          has_questions: true,
          prerequisites_met: true,
          missing_prerequisites: [],
        },
      ],
      userId: 'test-user-uuid-123',
    }
    return selector(state)
  })
  return { useSkillProofStore: store }
})

import { ResultsPage } from '../pages/ResultsPage.jsx'

const mockReportData = {
  user_id: 'test-user-uuid-123',
  evaluations: [
    {
      skill_id: 'react',
      canonical_name: 'React',
      claimed_level: 'EXPERT',
      composite_score: 1.0,
      theory_score: 1.0,
      practical_score: 1.0,
      edge_case_score: 1.0,
      verdict: 'VERIFIED',
      rule_fired: 'R03',
      misconception_tags: [],
      created_at: '2026-04-02T12:00:00',
    },
    {
      skill_id: 'sql',
      canonical_name: 'SQL',
      claimed_level: 'BEGINNER',
      composite_score: 0.0,
      theory_score: 0.0,
      practical_score: 0.0,
      edge_case_score: 0.0,
      verdict: 'OVERCLAIM',
      rule_fired: 'R05',
      misconception_tags: ['join-confusion'],
      created_at: '2026-04-02T12:01:00',
    },
  ],
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockReportData),
      })
    ))
  })

  it('renders the Claim vs Reality heading', async () => {
    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Claim vs Reality')).toBeInTheDocument()
  })

  it('renders skill names from the API data', async () => {
    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('SQL')).toBeInTheDocument()
    })
  })

  it('renders verdict badges correctly', async () => {
    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument()
      expect(screen.getByText('Overclaim')).toBeInTheDocument()
    })
  })

  it('calls the report API with the user ID', async () => {
    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/report/test-user-uuid-123')
    })
  })
})
