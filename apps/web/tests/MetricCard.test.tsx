import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { MetricCard } from '../src/components/MetricCard'

describe('MetricCard', () => {
  test('renders label and value', () => {
    render(<MetricCard label="Total" value="42" />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
