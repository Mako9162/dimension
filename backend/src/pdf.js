import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const quoteScript = fileURLToPath(new URL('../pdf/quote.py', import.meta.url));
const receiptScript = fileURLToPath(new URL('../pdf/receipt.py', import.meta.url));

let active = 0;

async function runPythonPdf(scriptPath, payload) {
  if (active >= 5) {
    const error = new Error('Hay varias descargas en curso. Intenta nuevamente en unos segundos.');
    error.status = 503;
    throw error;
  }
  active++;
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.env.PYTHON_BIN || 'python', [scriptPath], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      const chunks = []; let size = 0, errorText = '';
      const timeout = setTimeout(() => { child.kill(); reject(new Error('Tiempo de generación PDF agotado')); }, 30000);
      child.on('error', err => { clearTimeout(timeout); reject(err); });
      child.stdin.on('error', () => {});
      child.stdout.on('data', chunk => { size += chunk.length; if (size > 15 * 1024 * 1024) child.kill(); else chunks.push(chunk); });
      child.stderr.on('data', chunk => { errorText = (errorText + chunk).slice(-2000); });
      child.on('close', code => { clearTimeout(timeout); code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`No se pudo generar el PDF: ${errorText}`)); });
      child.stdin.end(JSON.stringify(payload));
    });
  } finally { active--; }
}

export async function renderQuotePdf(quote) {
  return runPythonPdf(quoteScript, quote);
}

export async function renderReceiptPdf(receiptData) {
  return runPythonPdf(receiptScript, receiptData);
}
