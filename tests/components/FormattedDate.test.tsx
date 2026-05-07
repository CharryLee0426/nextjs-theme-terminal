import { render, screen } from '@testing-library/react'
import { FormattedDate } from '@/components/FormattedDate'

describe('FormattedDate', () => {
  it('renders formatted yyyy-MM-dd in time element', () => {
    render(<FormattedDate date="2024-06-15T12:00:00.000Z" />)
    const el = screen.getByRole('time')
    expect(el).toHaveTextContent('2024-06-15')
    expect(el).toHaveAttribute('dateTime')
  })

  it('accepts Date instance', () => {
    // Use noon UTC so calendar day is stable across local timezones.
    render(<FormattedDate date={new Date('2023-01-02T12:00:00.000Z')} />)
    expect(screen.getByRole('time')).toHaveTextContent('2023-01-02')
  })
})
