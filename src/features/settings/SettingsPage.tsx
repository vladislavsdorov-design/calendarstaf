import { useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { cx, pl, plural, sv } from '../../lib/utils'
import { Icon, PageHeader, Spinner, Stepper, useAction } from '../../components/ui'
import { useData } from '../data/DataContext'
import { DAY_NAMES, DAY_ORDER, type ClubSettings } from '../../types'

export default function SettingsPage() {
  const { settings, settingsReady } = useData()
  const [draft, setDraft] = useState<ClubSettings | null>(null)
  const { busy, run } = useAction()
  const current = draft ?? settings

  function update(key: string, field: 'bars' | 'bartendersPerBar', value: number) {
    const base = draft ?? settings
    setDraft({ days: { ...base.days, [key]: { ...base.days[key], [field]: value } } })
  }

  const save = () =>
    run(async () => {
      await setDoc(doc(db, 'settings', 'club'), current)
      setDraft(null)
    }, 'Ustawienia zapisane')

  const week = DAY_ORDER.reduce((n, k) => n + current.days[k].bars * current.days[k].bartendersPerBar, 0)

  return (
    <>
      <PageHeader
        eyebrow="Ustawienia klubu"
        title="Bary i obsada"
        sub="Ile barów i barmanów potrzeba w każdy dzień tygodnia. Automatyczny grafik korzysta właśnie z tych wartości. Opublikowany grafik się nie zmienia."
      />

      <section className="glass card enter settings-card" style={sv({ '--d': '100ms' })}>
        <div className="s-head">
          <span>Dzień</span>
          <span>Bary</span>
          <span>Barmanów na bar</span>
          <span>Razem</span>
        </div>
        {!settingsReady ? (
          <div className="skeleton small" />
        ) : (
          DAY_ORDER.map((key, i) => {
            const cfg = current.days[key]
            const total = cfg.bars * cfg.bartendersPerBar
            const changed =
              !!draft &&
              (cfg.bars !== settings.days[key].bars || cfg.bartendersPerBar !== settings.days[key].bartendersPerBar)
            return (
              <div className={cx('s-row', (key === '5' || key === '6') && 'weekend', total === 0 && 'off', changed && 'changed')}
                key={key} style={sv({ '--i': i })}>
                <div className="s-day">
                  <b>{DAY_NAMES[key]}</b>
                  {(key === '5' || key === '6') && <span className="tag">weekend</span>}
                  {total === 0 && <span className="tag">nieczynne</span>}
                </div>
                <div className="s-ctrl"><small>Bary</small>
                  <Stepper value={cfg.bars} min={0} max={10} onChange={(v) => update(key, 'bars', v)} />
                </div>
                <div className="s-ctrl"><small>Na bar</small>
                  <Stepper value={cfg.bartendersPerBar} min={1} max={10} onChange={(v) => update(key, 'bartendersPerBar', v)} />
                </div>
                <div className="s-total"><b key={total}>{total}</b><small>{plural(total, ['osoba', 'osoby', 'osób'])}</small></div>
              </div>
            )
          })
        )}
        <div className="s-foot">
          <span className="muted">W tygodniu: <b>{pl(week, ['miejsce', 'miejsca', 'miejsc'])}</b></span>
        </div>
      </section>

      <div className={cx('savebar glass', draft && 'show')}>
        <span><Icon name="info" />Masz niezapisane zmiany</span>
        <div className="row-gap">
          <button className="btn ghost" onClick={() => setDraft(null)} disabled={busy}>Anuluj</button>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? <Spinner /> : <Icon name="save" />}Zapisz
          </button>
        </div>
      </div>
    </>
  )
}
