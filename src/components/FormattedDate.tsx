import { format } from 'date-fns'

interface FormattedDateProps {
  date: string | Date
  className?: string
}

export function FormattedDate({ date, className }: FormattedDateProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formattedDate = format(dateObj, 'yyyy-MM-dd')
  
  return (
    <time dateTime={dateObj.toISOString()} className={className}>
      {formattedDate}
    </time>
  )
}