import { useState } from 'react';
import Icon from './components/Icon';
export default function Login({ username, setUsername, password, setPassword, busy, error, onSubmit }) {
  const [show, setShow] = useState(false);
  return <main className="login">
    <section className="login-story" aria-label="Taller Dimensión"><span className="eyebrow">DESABOLLADURA · PINTURA · CONFIANZA</span><h1>Grandes resultados.<br/><em>Desde el primer detalle.</em></h1><p>Todo tu taller conectado. Cotizaciones claras, clientes bien atendidos y cada trabajo bajo control.</p><div className="login-car"><Icon name="vehicles" size={130}/><span className="orbit orbit-one"/><span className="orbit orbit-two"/></div><div className="login-promise"><Icon name="shield"/><span>Precisión en el trabajo.<br/><strong>Confianza en cada entrega.</strong></span></div></section>
    <section className="login-access"><form className="login-card" onSubmit={onSubmit}>
      <img src="/brand/taller-dimension-v2.png" className="login-logo" alt="Taller Dimensión" width="415" height="151"/>
      <span className="eyebrow">TU ESPACIO DE TRABAJO</span><h2>Qué bueno verte.</h2><p className="hint">Ingresa a la administración de tu taller.</p>
      <label className="mt-6">Usuario<input name="username" autoComplete="username" autoCapitalize="none" spellCheck="false" placeholder="Tu nombre de usuario" required maxLength={80} value={username} onChange={e => setUsername(e.target.value)}/></label>
      <label className="my-5">Contraseña<div className="password-input"><input name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required maxLength={256} placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)}/><button type="button" className="icon-button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show} onClick={() => setShow(!show)}><Icon name="eye"/></button></div></label>
      {error && <p className="error" role="alert">{error}</p>}<button className="primary login-submit" disabled={busy}>{busy ? <><span className="spinner"/> Ingresando…</> : <>Entrar a mi taller <Icon name="arrow"/></>}</button>
      <p className="login-security"><Icon name="shield" size={16}/> Acceso exclusivo para personal autorizado</p>
    </form><span className="login-footer">Taller Dimensión · Cuidamos cada detalle</span></section>
  </main>;
}
