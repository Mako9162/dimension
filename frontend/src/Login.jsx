import { useState } from 'react';
import Icon from './components/Icon';
import { WORKSHOP_LOGO } from './brand';

const workflow = [
  { icon: 'quotes', title: 'Cotiza con claridad', detail: 'Trabajos, precios e IVA en una propuesta profesional.' },
  { icon: 'link', title: 'Comparte en segundos', detail: 'Envía el enlace de la cotización a tu cliente.' },
  { icon: 'check', title: 'Recibe su confirmación', detail: 'La aceptación del cliente queda registrada en tu taller.' },
];

export default function Login({ username, setUsername, password, setPassword, busy, error, onSubmit }) {
  const [show, setShow] = useState(false);
  return <main className="login">
    <div className="login-layout">
      <section className="login-story" aria-label="Taller Dimensión">
        <span className="eyebrow">DESABOLLADURA · PINTURA · CONFIANZA</span>
        <h2>Grandes resultados.<br/><em>Desde el primer detalle.</em></h2>
        <p>Todo tu taller conectado. Más orden para trabajar y más tiempo para tus clientes.</p>
        <ul className="login-workflow">{workflow.map(step => <li key={step.icon}>
          <span className="login-step-icon"><Icon name={step.icon} size={20}/></span>
          <div><strong>{step.title}</strong><p>{step.detail}</p></div>
        </li>)}</ul>
        <div className="login-promise"><Icon name="shield" size={20}/><span>Precisión en el trabajo.<br/><strong>Confianza en cada entrega.</strong></span></div>
      </section>
      <section className="login-access" aria-labelledby="login-title">
        <form className="login-card" onSubmit={onSubmit} aria-labelledby="login-title" aria-busy={busy}>
          <img src={WORKSHOP_LOGO} className="login-logo" alt="Taller Dimensión" width="1024" height="577" fetchPriority="high"/>
          <header className="login-heading">
            <span className="eyebrow">TU ESPACIO DE TRABAJO</span>
            <h1 id="login-title">Qué bueno verte.</h1>
            <p className="hint">Ingresa a la administración de tu taller.</p>
          </header>
          <div className="login-fields">
            <div><label htmlFor="login-username">Usuario</label><input id="login-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck="false" placeholder="Tu nombre de usuario" required maxLength={80} disabled={busy} value={username} onChange={e => setUsername(e.target.value)}/></div>
            <div><label htmlFor="login-password">Contraseña</label><div className="password-input"><input id="login-password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required maxLength={256} placeholder="Tu contraseña" disabled={busy} value={password} onChange={e => setPassword(e.target.value)}/><button type="button" className="icon-button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-controls="login-password" aria-pressed={show} onClick={() => setShow(!show)}><Icon name="eye"/></button></div></div>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="primary login-submit" disabled={busy}>{busy ? <><span className="spinner"/> Ingresando…</> : <>Entrar a mi taller <Icon name="arrow"/></>}</button>
          <p className="login-security"><Icon name="shield" size={16}/> Acceso exclusivo para personal autorizado</p>
        </form>
      </section>
    </div>
    <p className="login-footer">Taller Dimensión · Cuidamos cada detalle</p>
  </main>;
}
