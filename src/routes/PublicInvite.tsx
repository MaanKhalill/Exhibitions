import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicInvitation, submitPublicInvitation, type PublicInvitationInfo } from '../api/invitations'
import { formatDateRange } from '../lib/format'

function BiLabel({ en, zh }: { en: string; zh: string }) {
  return (
    <label>
      {en} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>/ {zh}</span>
    </label>
  )
}

export function PublicInvite() {
  const { token } = useParams()
  const [info, setInfo] = useState<PublicInvitationInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // form state
  const [f, setF] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!token) return
    fetchPublicInvitation(token)
      .then((data) => {
        setInfo(data)
        setF((p) => ({
          ...p,
          company_name: data.invitation.company_name || '',
          contact_name: data.invitation.contact_name || '',
          email: data.invitation.email || '',
          phone: data.invitation.phone || '',
        }))
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load invitation'))
  }, [token])

  if (loadError) {
    return (
      <Shell>
        <div className="empty">
          <div className="big">🔗</div>
          <p style={{ fontWeight: 600 }}>{loadError}</p>
          <p className="hint">Please ask your contact for a new link. / 请向您的联系人索取新的链接。</p>
        </div>
      </Shell>
    )
  }
  if (!info) {
    return <Shell><div className="empty"><div className="spinner" /><p className="hint">Loading… / 加载中…</p></div></Shell>
  }
  if (info.expired) {
    return (
      <Shell>
        <div className="empty">
          <div className="big">⏳</div>
          <p style={{ fontWeight: 600 }}>This link has expired.</p>
          <p className="hint">Please ask your contact for a new link. / 链接已过期，请向您的联系人索取新链接。</p>
        </div>
      </Shell>
    )
  }
  if (done || info.invitation.already_responded) {
    return (
      <Shell>
        <div className="empty">
          <div className="big">✅</div>
          <p style={{ fontWeight: 600 }}>Thank you! Your information has been received.</p>
          <p className="hint">谢谢！我们已收到您的信息。</p>
        </div>
      </Shell>
    )
  }

  const purpose = info.invitation.purpose
  const wantsExhibition = purpose === 'exhibition' || purpose === 'both'
  const wantsFactory = purpose === 'factory' || purpose === 'both'
  const ex = info.exhibition

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setBusy(true)
    setSubmitError(null)
    try {
      const payload = { ...f }
      if (f.preferred_meeting) {
        const d = new Date(f.preferred_meeting)
        if (!isNaN(d.getTime())) payload.preferred_meeting = d.toISOString()
      }
      await submitPublicInvitation(token, payload)
      setDone(true)
    } catch (e2) {
      setSubmitError(e2 instanceof Error ? e2.message : 'Submission failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div className="logo-badge">🤝</div>
        <h1 style={{ margin: '6px 0 2px', fontSize: 20 }}>
          {ex ? `${ex.name}${ex.edition ? ' ' + ex.edition : ''}` : 'Meeting request'}
        </h1>
        {ex && formatDateRange(ex.start_date, ex.end_date) && (
          <p className="hint" style={{ marginTop: 0 }}>
            {ex.city ? ex.city + ' · ' : ''}{formatDateRange(ex.start_date, ex.end_date)}
          </p>
        )}
        <p className="hint">Please share your details below. No account needed.<br />请填写以下信息，无需注册。</p>
      </div>

      {info.inviter && (info.inviter.owner_name || info.inviter.company_name) && (
        <div className="detail-section">
          <h3>Invited by / 邀请方</h3>
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
            {[info.inviter.owner_name, info.inviter.company_name].filter(Boolean).join(' · ')}
          </p>
          {info.inviter.bio && <p className="hint" style={{ marginTop: 0 }}>{info.inviter.bio}</p>}
          <div className="card-meta">
            {info.inviter.country && <span>🌍 {info.inviter.country}</span>}
            {info.inviter.whatsapp && <span>💬 {info.inviter.whatsapp}</span>}
            {info.inviter.wechat && <span>WeChat {info.inviter.wechat}</span>}
            {info.inviter.email && <span>✉️ {info.inviter.email}</span>}
            {info.inviter.website && <span>🌐 {info.inviter.website}</span>}
          </div>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="detail-section">
          <h3>Company / 公司</h3>
          <div className="field"><BiLabel en="Company name" zh="公司名称" /><input value={f.company_name || ''} onChange={(e) => set('company_name', e.target.value)} required /></div>
          <div className="field"><BiLabel en="Products you manufacture / supply" zh="主营产品" /><textarea value={f.product_summary || ''} onChange={(e) => set('product_summary', e.target.value)} placeholder="Free text / 自由填写" /></div>
          <div className="field"><BiLabel en="Website" zh="网站" /><input value={f.website || ''} onChange={(e) => set('website', e.target.value)} /></div>
        </div>

        <div className="detail-section">
          <h3>Contact / 联系人</h3>
          <div className="field"><BiLabel en="Contact person" zh="联系人" /><input value={f.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} /></div>
          <div className="row2">
            <div className="field"><BiLabel en="Phone" zh="电话" /><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="field"><BiLabel en="WeChat" zh="微信" /><input value={f.wechat || ''} onChange={(e) => set('wechat', e.target.value)} /></div>
          </div>
          <div className="row2">
            <div className="field"><BiLabel en="WhatsApp" zh="WhatsApp" /><input value={f.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} /></div>
            <div className="field"><BiLabel en="Email" zh="邮箱" /><input type="email" value={f.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
          </div>
        </div>

        {wantsExhibition && (
          <div className="detail-section">
            <h3>Exhibition / 展会</h3>
            <div className="field">
              <BiLabel en="Will you exhibit?" zh="是否参展？" />
              <select value={f.participate || ''} onChange={(e) => set('participate', e.target.value)}>
                <option value="">—</option>
                <option value="Yes">Yes / 是</option>
                <option value="No">No / 否</option>
                <option value="Not yet confirmed">Not yet confirmed / 待定</option>
              </select>
            </div>
            <div className="row2">
              <div className="field"><BiLabel en="Hall" zh="展馆" /><input value={f.hall || ''} onChange={(e) => set('hall', e.target.value)} /></div>
              <div className="field"><BiLabel en="Booth" zh="展位号" /><input value={f.booth || ''} onChange={(e) => set('booth', e.target.value)} /></div>
            </div>
            <div className="field"><BiLabel en="Area / section" zh="展区" /><input value={f.area || ''} onChange={(e) => set('area', e.target.value)} /></div>
            <div className="row2">
              <div className="field"><BiLabel en="Person at booth" zh="展位负责人" /><input value={f.booth_contact_name || ''} onChange={(e) => set('booth_contact_name', e.target.value)} /></div>
              <div className="field"><BiLabel en="Booth phone/WeChat" zh="展位电话/微信" /><input value={f.booth_contact_phone || ''} onChange={(e) => set('booth_contact_phone', e.target.value)} /></div>
            </div>
            <div className="field"><BiLabel en="Preferred meeting time" zh="期望洽谈时间" /><input type="datetime-local" value={f.preferred_meeting || ''} onChange={(e) => set('preferred_meeting', e.target.value)} /></div>
          </div>
        )}

        {wantsFactory && (
          <div className="detail-section">
            <h3>Factory / 工厂</h3>
            <div className="field"><BiLabel en="Full factory address" zh="工厂详细地址" /><textarea value={f.factory_address || ''} onChange={(e) => set('factory_address', e.target.value)} /></div>
            <div className="row2">
              <div className="field"><BiLabel en="City" zh="城市" /><input value={f.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
              <div className="field"><BiLabel en="Province" zh="省份" /><input value={f.factory_province || ''} onChange={(e) => set('factory_province', e.target.value)} /></div>
            </div>
            <div className="row2">
              <div className="field"><BiLabel en="Nearest airport" zh="最近机场" /><input value={f.nearest_airport || ''} onChange={(e) => set('nearest_airport', e.target.value)} /></div>
              <div className="field"><BiLabel en="Nearest rail station" zh="最近高铁站" /><input value={f.nearest_rail || ''} onChange={(e) => set('nearest_rail', e.target.value)} /></div>
            </div>
            <div className="field">
              <BiLabel en="Can we visit your factory?" zh="是否可安排工厂参观？" />
              <select value={f.factory_visit || ''} onChange={(e) => set('factory_visit', e.target.value)}>
                <option value="">—</option>
                <option value="Yes">Yes / 是</option>
                <option value="No">No / 否</option>
                <option value="To be confirmed">To be confirmed / 待定</option>
              </select>
            </div>
            <div className="field"><BiLabel en="Preferred dates / notes" zh="可安排日期 / 备注" /><textarea value={f.factory_notes || ''} onChange={(e) => set('factory_notes', e.target.value)} /></div>
          </div>
        )}

        <div className="field"><BiLabel en="Anything else?" zh="其他备注" /><textarea value={f.remarks || ''} onChange={(e) => set('remarks', e.target.value)} /></div>

        {submitError && <p className="error">{submitError}</p>}
        <button className="btn primary block" type="submit" disabled={busy}>
          {busy ? 'Submitting… / 提交中…' : 'Submit / 提交'}
        </button>
        <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
          Your information is shared only with the requester. / 您的信息仅提供给邀请方。
        </p>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <div className="content" style={{ paddingTop: 20 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
      </div>
    </div>
  )
}
