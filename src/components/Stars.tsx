interface Props {
  value: number
  onChange?: (v: number) => void
  size?: 'sm' | 'lg'
}

export function Stars({ value, onChange, size = 'sm' }: Props) {
  if (onChange) {
    return (
      <div className="rating" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={n <= value ? 'on' : ''}
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n === value ? 0 : n)}
          >
            {n <= value ? '★' : '☆'}
          </span>
        ))}
      </div>
    )
  }
  if (!value) return null
  return (
    <div className="stars" aria-label={`${value} of 5`} style={size === 'lg' ? { fontSize: 18 } : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? '' : 'off'}>
          ★
        </span>
      ))}
    </div>
  )
}
