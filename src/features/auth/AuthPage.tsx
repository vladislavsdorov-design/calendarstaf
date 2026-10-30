import { useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { Icon, Segmented, Spinner, type IconName } from '../../components/ui'

const ERR: Record<string, string> = {
  'auth/invalid-credential': 'Nieprawidłowy email lub hasło',
  'auth/wrong-password': 'Nieprawidłowy email lub hasło',
  'auth/user-not-found': 'Nie znaleziono użytkownika',
  'auth/email-already-in-use': 'Ten email jest już zarejestrowany',
  'auth/weak-password': 'Hasło musi mieć co najmniej 6 znaków',
  'auth/invalid-email': 'Nieprawidłowy adres email',
  'auth/missing-email': 'Podaj adres email',
  'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie później',
  'auth/network-request-failed': 'Brak połączenia z internetem',
}
const errText = (e: unknown) => ERR[(e as { code?: string }).code ?? ''] ?? 'Coś poszło nie tak. Spróbuj ponownie'

type Mode = 'login' | 'register'
const MODES = [
  { id: 'login' as const, label: 'Logowanie' },
  { id: 'register' as const, label: 'Rejestracja' },
]

function Field({ icon, ...props }: { icon: IconName } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <Icon name={icon} />
      <input className="input" {...props} />
    </label>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }))

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setInfo('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    const email = f.email.trim()
    const firstName = f.firstName.trim()
    const lastName = f.lastName.trim()
    if (mode === 'register') {
      if (!firstName || !lastName) return setError('Podaj imię i nazwisko')
      if (firstName.length > 50 || lastName.length > 50) return setError('Imię i nazwisko — maks. 50 znaków')
      if (f.password.length < 6) return setError('Hasło musi mieć co najmniej 6 znaków')
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, f.password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, f.password)
        // Rola zawsze 'bartender' — reguły Firestore nie pozwolą utworzyć innej
        await setDoc(doc(db, 'users', cred.user.uid), {
          firstName,
          lastName,
          email: cred.user.email,
          role: 'bartender',
          createdAt: serverTimestamp(),
        })
      }
    } catch (err) {
      setError(errText(err))
      setBusy(false)
    }
  }

  async function reset() {
    setError('')
    setInfo('')
    if (!f.email.trim()) return setError('Podaj email, aby zresetować hasło')
    try {
      await sendPasswordResetEmail(auth, f.email.trim())
      setInfo('Wysłaliśmy link do zresetowania hasła')
    } catch (err) {
      setError(errText(err))
    }
  }

  return (
    <div className="auth-wrap">
      <form className="glass card auth" onSubmit={submit} noValidate>
        <div className="auth-logo">
          <span className="brand-mark lg"><Icon name="martini" size={26} /></span>
          <h1>LaPose</h1>
          <p>Grafik zmian barmanów</p>
        </div>

        <Segmented items={MODES} value={mode} onChange={switchMode} />

        <div className="fields" key={mode}>
          {mode === 'register' && (
            <div className="field-row">
              <Field icon="user" placeholder="Imię" autoComplete="given-name" value={f.firstName} onChange={set('firstName')} />
              <Field icon="user" placeholder="Nazwisko" autoComplete="family-name" value={f.lastName} onChange={set('lastName')} />
            </div>
          )}
          <Field icon="mail" type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={set('email')} />
          <Field
            icon="key"
            type="password"
            placeholder={mode === 'login' ? 'Hasło' : 'Hasło (min. 6 znaków)'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={f.password}
            onChange={set('password')}
          />
        </div>

        {error && <p className="msg err" key={error}><Icon name="alert" />{error}</p>}
        {info && <p className="msg ok" key={info}><Icon name="check" />{info}</p>}

        <button className="btn primary lg wide" disabled={busy}>
          {busy && <Spinner />}
          {mode === 'login' ? 'Zaloguj się' : 'Utwórz konto barmana'}
        </button>
        {mode === 'login' && (
          <button type="button" className="btn link" onClick={reset}>Nie pamiętasz hasła?</button>
        )}
      </form>
      <p className="foot">© {new Date().getFullYear()} LaPose</p>
    </div>
  )
}
