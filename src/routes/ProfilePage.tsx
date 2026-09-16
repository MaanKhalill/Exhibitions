import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, saveProfile } from '../api/profile'
import { emptyProfile, type Profile } from '../types'
import { Field, Page, Spinner, ErrorNote } from '../components/ui'

export function ProfilePage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['profile'], queryFn: () => getProfile() })
  const [p, setP] = useState<Profile>(emptyProfile())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setP(data)
  }, [data])

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setP((prev) => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  const save = useMutation({
    mutationFn: () => saveProfile(p),
    onSuccess: (r) => {
      setP(r)
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  if (isLoading) return <Page title="My profile"><Spinner /></Page>

  return (
    <Page title="My profile" subtitle="Shown to suppliers on the form & signs your messages" back>
      <p className="hint" style={{ marginTop: 0 }}>
        This is you, the sender. Suppliers see it on the invitation form so they know who's inviting
        them, and it's added to your WhatsApp/email messages.
      </p>

      <div className="detail-section">
        <h3>You</h3>
        <Field label="Your name"><input value={p.owner_name} onChange={(e) => set('owner_name', e.target.value)} /></Field>
        <Field label="Company"><input value={p.company_name} onChange={(e) => set('company_name', e.target.value)} /></Field>
        <Field label="Country of operation"><input value={p.country} onChange={(e) => set('country', e.target.value)} /></Field>
        <Field label="Address"><textarea value={p.address} onChange={(e) => set('address', e.target.value)} /></Field>
      </div>

      <div className="detail-section">
        <h3>Contact</h3>
        <Field label="Email"><input type="email" value={p.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <div className="row2">
          <Field label="WhatsApp"><input value={p.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+971…" /></Field>
          <Field label="WeChat"><input value={p.wechat} onChange={(e) => set('wechat', e.target.value)} /></Field>
        </div>
        <div className="row2">
          <Field label="Phone"><input value={p.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Website"><input value={p.website} onChange={(e) => set('website', e.target.value)} /></Field>
        </div>
      </div>

      <div className="detail-section">
        <h3>Short profile</h3>
        <Field label="About you / your company" hint="A couple of lines suppliers will see.">
          <textarea value={p.bio} onChange={(e) => set('bio', e.target.value)} />
        </Field>
      </div>

      <ErrorNote error={save.error} />
      <button className="btn primary block" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save profile'}
      </button>
    </Page>
  )
}
