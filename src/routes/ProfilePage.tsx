import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, saveProfile } from '../api/profile'
import { getEmailSettings, saveEmailSettings } from '../api/emailSettings'
import { emptyEmailSettings, emptyProfile, type EmailSettings, type Profile } from '../types'
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

      <EmailSettingsSection />
    </Page>
  )
}

/** Per-user SMTP so "Send email now" goes out from your own mailbox. */
function EmailSettingsSection() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['email-settings'], queryFn: () => getEmailSettings() })
  const [s, setS] = useState<EmailSettings>(emptyEmailSettings())
  const [pw, setPw] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setS(data)
  }, [data])

  const set = <K extends keyof EmailSettings>(k: K, v: EmailSettings[K]) => {
    setS((prev) => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  const save = useMutation({
    mutationFn: () => saveEmailSettings(s, pw),
    onSuccess: (r) => {
      setS(r)
      setPw('')
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['email-settings'] })
    },
  })

  return (
    <div className="detail-section" style={{ marginTop: 18 }}>
      <h3>Send from my mailbox (SMTP)</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Optional. Set this to send invitation emails straight from your own mailbox (the “Send email now”
        button on an invitation). Without it, the email buttons still open your mail app instead.
        Your details are private to your account — the password is stored write-only and never shown back.
      </p>

      <div className="row2">
        <Field label="Sender name" hint="e.g. your company">
          <input value={s.from_name} onChange={(e) => set('from_name', e.target.value)} placeholder="Your Company" />
        </Field>
        <Field label="From email">
          <input type="email" value={s.from_email} onChange={(e) => set('from_email', e.target.value)} placeholder="you@company.com" />
        </Field>
      </div>
      <Field label="SMTP host" hint="Gmail: smtp.gmail.com">
        <input value={s.host} onChange={(e) => set('host', e.target.value)} placeholder="smtp.gmail.com" />
      </Field>
      <div className="row2">
        <Field label="Port" hint="465 (SSL) or 587">
          <input type="number" value={s.port} onChange={(e) => set('port', Number(e.target.value) || 465)} />
        </Field>
        <Field label="SMTP username" hint="usually your email">
          <input value={s.username} onChange={(e) => set('username', e.target.value)} placeholder="you@company.com" />
        </Field>
      </div>
      <Field
        label="Password / app password"
        hint={s.password_set ? 'A password is saved. Type a new one only to change it.' : 'Gmail needs an App Password (not your login password).'}
      >
        <input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setSaved(false) }}
          placeholder={s.password_set ? '•••••••• (saved)' : 'app password'}
          autoComplete="new-password"
        />
      </Field>
      <label className="checkrow">
        <input type="checkbox" checked={s.secure} onChange={(e) => set('secure', e.target.checked)} />
        <span>Use SSL/TLS (on for port 465, off for 587 STARTTLS)</span>
      </label>

      <ErrorNote error={save.error} />
      <button className="btn primary block" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save email settings'}
      </button>
      {s.password_set && <p className="hint" style={{ marginBottom: 0 }}>✓ Mailbox configured — “Send email now” will use it.</p>}
    </div>
  )
}
