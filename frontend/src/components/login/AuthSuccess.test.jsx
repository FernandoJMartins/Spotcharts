import React from 'react'
import { render, screen } from '@testing-library/react'
import { expect, test, vi, beforeEach, describe } from 'vitest'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import AuthSuccess from './AuthSuccess'
import { notifyAuthChanged } from '../../utils/appClient'

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

// Mock appClient
vi.mock('../../utils/appClient', () => ({
  notifyAuthChanged: vi.fn(),
}))

describe('AuthSuccess', () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useNavigate.mockReturnValue(mockNavigate)
    
    // Better mock for localStorage
    const store = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value }),
      clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]) }),
      removeItem: vi.fn((key) => { delete store[key] }),
    })
  })

  test('handles successful token in URL', () => {
    // Use Object.defineProperty to mock window.location
    const originalLocation = window.location
    delete window.location
    window.location = new URL('http://localhost:3000/auth/success?token=test-token')

    render(
      <MemoryRouter>
        <AuthSuccess />
      </MemoryRouter>
    )

    expect(localStorage.getItem('token')).toBe('test-token')
    expect(notifyAuthChanged).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    
    window.location = originalLocation
  })

  test('redirects to login if no token', () => {
    const originalLocation = window.location
    delete window.location
    window.location = new URL('http://localhost:3000/auth/success')

    render(
      <MemoryRouter>
        <AuthSuccess />
      </MemoryRouter>
    )

    expect(localStorage.getItem('token')).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
    
    window.location = originalLocation
  })
})
