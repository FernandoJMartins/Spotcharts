import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi, beforeEach, describe } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Header from './Header'
import { apiFetch } from '../../utils/appClient'

// Mock appClient
vi.mock('../../utils/appClient', () => ({
  apiFetch: vi.fn(),
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    const store = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value }),
      clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]) }),
      removeItem: vi.fn((key) => { delete store[key] }),
    })
  })

  test('renders login link when not authenticated', async () => {
    apiFetch.mockResolvedValue({ ok: false })

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Entrar/i)).toBeInTheDocument()
    })
  })

  test('renders protected links when authenticated', async () => {
    localStorage.setItem('token', 'valid-token')
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'testuser' })
    })

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Gráficos/i)).toBeInTheDocument()
      expect(screen.getByText(/Grid/i)).toBeInTheDocument()
      expect(screen.getByText(/Explore/i)).toBeInTheDocument()
      expect(screen.queryByText(/Entrar/i)).not.toBeInTheDocument()
    })
  })
})
