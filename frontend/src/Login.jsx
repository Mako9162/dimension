export default function Login({ username, setUsername, password, setPassword, busy, error, onSubmit }) {
  return <main className="login"><form className="panel" onSubmit={onSubmit}>
    <img src="/brand/taller-dimension.png" className="login-logo" alt="Taller Dimensión"/>
    <span className="eyebrow">DESABOLLADURA Y PINTURA</span>
    <h1>Bienvenido a tu taller.</h1><p className="hint">Ingresa para gestionar tus clientes y cotizaciones.</p>
    <label className="mt-6">Usuario<input name="username" autoComplete="username" required maxLength={80} value={username} onChange={e => setUsername(e.target.value)}/></label>
    <label className="my-5">Contraseña<input name="password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e => setPassword(e.target.value)}/></label>
    {error && <p className="error" role="alert">{error}</p>}<button className="primary w-full" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar →'}</button>
  </form></main>;
}
