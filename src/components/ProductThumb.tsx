import { useEffect, useState } from 'react'
import type { Product } from '../types'
import { photoUrl } from '../lib/store'

export function ProductThumb({ product }: { product: Product }) {
  const [url, setUrl] = useState<string | null>(product.pending_photo ?? null)

  useEffect(() => {
    let active = true
    if (product.pending_photo) {
      setUrl(product.pending_photo)
      return
    }
    if (product.photo_path) {
      photoUrl(product.photo_path).then((u) => {
        if (active) setUrl(u)
      })
    } else {
      setUrl(null)
    }
    return () => {
      active = false
    }
  }, [product.photo_path, product.pending_photo])

  if (url) return <img src={url} alt={product.name} />
  return <span className="noimg">📦</span>
}
