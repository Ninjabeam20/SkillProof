/**
 * App.test.jsx — Smoke test for SkillInputPage
 *
 * Mounts the component inside a MemoryRouter (required by react-router-dom)
 * and verifies the component tree renders without crashing.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SkillInputPage } from '../pages/SkillInputPage.jsx'

describe('SkillInputPage', () => {
  it('renders the resume textarea and heading without crashing', () => {
    render(
      <MemoryRouter>
        <SkillInputPage />
      </MemoryRouter>
    )

    // Check that the main heading is present
    expect(screen.getByText('Paste your resume')).toBeInTheDocument()

    // Check that the textarea is present with the default resume text
    const textarea = screen.getByPlaceholderText('Paste your resume text here…')
    expect(textarea).toBeInTheDocument()
    expect(textarea.value).toContain('React')

    // Check that the Extract Claims button exists
    expect(screen.getByText('Extract Claims')).toBeInTheDocument()
  })

  it('has the correct stage label', () => {
    render(
      <MemoryRouter>
        <SkillInputPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Stage 1 — Ingestion')).toBeInTheDocument()
  })
})
