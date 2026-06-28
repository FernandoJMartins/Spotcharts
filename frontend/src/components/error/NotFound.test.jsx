import React from 'react'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import NotFound from './NotFound'

test('renders 404 message', () => {
  render(<NotFound />)
  expect(screen.getByText(/404 - Página não encontrada/i)).toBeInTheDocument()
})
