import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  children: React.ReactNode
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
}

const colors = {
  info: 'var(--accent)',
  warning: '#f59e0b',
  error: '#ef4444',
  success: '#10b981',
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const Icon = icons[type]
  const color = colors[type]

  return (
    <div 
      className="callout"
      style={{
        border: `1px solid ${color}`,
        borderLeft: `4px solid ${color}`,
        backgroundColor: 'var(--background-alt)',
        padding: '16px',
        margin: '24px 0',
        borderRadius: '4px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Icon 
          style={{ 
            color, 
            marginTop: '2px',
            flexShrink: 0,
            width: '20px',
            height: '20px'
          }} 
        />
        <div style={{ flex: 1 }}>
          {title && (
            <div 
              style={{ 
                fontWeight: 'bold', 
                color,
                marginBottom: '8px' 
              }}
            >
              {title}
            </div>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  )
}