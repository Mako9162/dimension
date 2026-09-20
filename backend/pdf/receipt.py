"""PDF A4 de Recibos de Dinero / Comprobantes de Pago (Taller Dimensión).
JSON por stdin, PDF binario por stdout.
"""
import io
import json
import sys
import base64
from pathlib import Path
from decimal import Decimal
from xml.sax.saxutils import escape
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image

# Paleta de colores oficial Taller Dimensión
BRAND_DARK = colors.HexColor('#18191d')     # Carbón profundo
BRAND_ACTION = colors.HexColor('#a84200')   # Naranja terracota / acción
BRAND_ACCENT = colors.HexColor('#ff790d')   # Naranja brillante / acento
BRAND_SOFT = colors.HexColor('#fff2e7')     # Fondo naranja suave
BRAND_BORDER = colors.HexColor('#f4d5ba')   # Borde naranja tenue
MUTED = colors.HexColor('#62626b')          # Gris medio
LINE = colors.HexColor('#dedee2')           # Línea divisoria
LIGHT_BG = colors.HexColor('#f9fafb')       # Superficie clara

GREEN_BG = colors.HexColor('#f0fdf4')
GREEN_TEXT = colors.HexColor('#15803d')
WIDTH = 499.27


def currency(value):
    return '$' + format(Decimal(str(value)), ',.0f').replace(',', '.')


def p(text, style):
    return Paragraph(escape(str(text or '')).replace('\n', '<br/>'), style)


from safe_images import fetch_image_bytes

FALLBACK_LOGO_BYTES = None

def get_canvas_image(img_str):
    global FALLBACK_LOGO_BYTES
    raw_bytes = fetch_image_bytes(img_str)
    if not raw_bytes:
        if FALLBACK_LOGO_BYTES is None:
            fallback_path = Path(__file__).resolve().parents[1] / 'brand/taller-dimension.png'
            if fallback_path.exists():
                FALLBACK_LOGO_BYTES = fallback_path.read_bytes()
        raw_bytes = FALLBACK_LOGO_BYTES
    if raw_bytes:
        try:
            return ImageReader(io.BytesIO(raw_bytes))
        except Exception:
            pass
    return None


from PIL import Image as PILImage


def make_signature_transparent(img_bytes):
    try:
        img = PILImage.open(io.BytesIO(img_bytes)).convert('RGBA')
        # OPTIMIZACIÓN CRÍTICA: Thumbnail a 350x140 max para iterar en milisegundos
        img.thumbnail((350, 140), PILImage.Resampling.LANCZOS)
        pixels = list(img.getdata())
        has_alpha = any(p[3] < 200 for p in pixels)
        if has_alpha:
            out = io.BytesIO()
            img.save(out, format='PNG')
            return out.getvalue()
        lums = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b, _ in pixels]
        max_lum = max(lums) if lums else 255
        threshold = max(110, min(165, max_lum * 0.78))
        new_pixels = [
            (255, 255, 255, 0) if lum >= threshold else (int(r * 0.8), int(g * 0.8), int(b * 0.8), 255)
            for (r, g, b, a), lum in zip(pixels, lums)
        ]
        img.putdata(new_pixels)
        out = io.BytesIO()
        img.save(out, format='PNG')
        return out.getvalue()
    except Exception:
        return img_bytes


def resolve_image(img_str, max_w=140, max_h=50, is_signature=False):
    raw_bytes = fetch_image_bytes(img_str)
    if not raw_bytes:
        return None
    try:
        if is_signature:
            raw_bytes = make_signature_transparent(raw_bytes)
        return Image(io.BytesIO(raw_bytes), width=max_w, height=max_h)
    except Exception:
        pass
    return None


def build_pdf(r, output):
    normal = ParagraphStyle('Body', fontName='Helvetica', fontSize=9, leading=13, textColor=BRAND_DARK)
    bold = ParagraphStyle('Bold', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=BRAND_DARK)
    small = ParagraphStyle('Small', parent=normal, fontSize=8, leading=11, textColor=MUTED)
    right = ParagraphStyle('Right', parent=normal, alignment=TA_RIGHT)
    heading = ParagraphStyle('Heading', parent=normal, fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=BRAND_ACTION, spaceBefore=14, spaceAfter=8)

    quote = r.get('quote', {})
    company = quote.get('companySnapshot', {})
    customer = quote.get('customerSnapshot', {})
    vehicle = quote.get('vehicleSnapshot', {})
    
    receipt_num = str(r.get('number', 0)).zfill(5)
    quote_num = str(quote.get('number', 0)).zfill(5)
    
    date_raw = r.get('date', '')
    try:
        date_str = datetime.fromisoformat(date_raw.replace('Z', '+00:00')).strftime('%d/%m/%Y %H:%M')
    except Exception:
        date_str = date_raw

    def page(canvas, doc):
        canvas.saveState()
        
        # Barra superior naranja acento
        canvas.setFillColor(BRAND_ACCENT)
        canvas.rect(0, 832, 595.27, 10, fill=1, stroke=0)
        
        img_reader = get_canvas_image(company.get('logoUrl'))
        if img_reader:
            canvas.drawImage(img_reader, 48, 715, width=210, height=95, preserveAspectRatio=True, mask='auto')
        else:
            name_p = p(company.get('name', 'TALLER DIMENSIÓN'), ParagraphStyle('HHead', fontName='Helvetica-Bold', fontSize=15, textColor=BRAND_DARK))
            _, h = name_p.wrap(250, 70)
            name_p.drawOn(canvas, 48, 780 - h)
            
        canvas.setFont('Helvetica-Bold', 9)
        canvas.setFillColor(BRAND_ACTION)
        canvas.drawRightString(547, 792, 'RECIBO DE DINERO')
        
        canvas.setFont('Helvetica-Bold', 22)
        canvas.setFillColor(BRAND_DARK)
        canvas.drawRightString(547, 765, f'N.º {receipt_num}')
        
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(547, 748, f'Fecha: {date_str}')
        
        canvas.setFont('Helvetica-Bold', 8.5)
        canvas.setFillColor(BRAND_ACTION)
        canvas.drawRightString(547, 734, f'Cotización N.º {quote_num}')
        
        canvas.setStrokeColor(BRAND_BORDER)
        canvas.setLineWidth(1)
        canvas.line(48, 702, 547, 702)
        
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(48, 48, 547, 48)
        
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(48, 33, f'Recibo N.º {receipt_num} · Comprobante de pago Taller Dimensión')
        canvas.drawRightString(547, 33, f'Página {doc.page}')
        canvas.restoreState()

    doc = SimpleDocTemplate(
        output, pagesize=(595.27, 841.89), leftMargin=48, rightMargin=48, topMargin=152, bottomMargin=64,
        title=f'Recibo N.º {receipt_num} - {company.get("name","Taller Dimensión")}'
    )

    story = []

    # Datos del Taller
    company_details = []
    if company.get('ownerName'): company_details.append(company['ownerName'])
    if company.get('taxId'): company_details.append(f"RUT: {company['taxId']}")
    if company.get('address'): company_details.append(company['address'])
    if company.get('phone'): company_details.append(f"Tel: {company['phone']}")
    if company.get('email'): company_details.append(company['email'])

    if any(company_details):
        story += [p(' | '.join(company_details), small), Spacer(1, 10)]

    # Datos del cliente / vehículo
    client_rows = [
        [p('Cliente:', bold), p(customer.get('name', ''), normal)],
    ]
    if customer.get('taxId'):
        client_rows.append([p('RUT / ID:', bold), p(customer['taxId'], normal)])
    if customer.get('address'):
        client_rows.append([p('Dirección:', bold), p(customer['address'], normal)])
    if customer.get('phone'):
        client_rows.append([p('Teléfono:', bold), p(customer['phone'], normal)])

    veh_text = f"{vehicle.get('brand','')} {vehicle.get('model','')} {vehicle.get('year','')}".strip()
    if vehicle.get('plate'):
        veh_text += f" (Patente: {vehicle['plate']})"
    if veh_text:
        client_rows.append([p('Vehículo:', bold), p(veh_text, bold)])

    client_info = Table(client_rows, colWidths=[80, 419.27], hAlign='LEFT')
    client_info.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_SOFT),
        ('BOX', (0, 0), (-1, -1), 1, BRAND_BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, BRAND_BORDER),
    ]))
    story += [client_info, Spacer(1, 12)]

    # Detalle del Pago
    story.append(p('Detalle del Abono', heading))

    methods_map = {
        'EFECTIVO': 'Efectivo', 'TRANSFERENCIA': 'Transferencia bancaria',
        'TARJETA_DEBITO': 'Tarjeta de débito', 'TARJETA_CREDITO': 'Tarjeta de crédito',
        'CHEQUE': 'Cheque', 'OTRO': 'Otro medio de pago'
    }

    amount_val = Decimal(str(r.get('amount', 0)))
    paid_by = r.get('paidBy') or customer.get('name') or '-'
    received_by = r.get('receivedBy') or company.get('ownerName') or company.get('name') or '-'

    pay_details = Table([
        [p('MONTO RECIBIDO', ParagraphStyle('PayLbl', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=GREEN_TEXT)),
         p(currency(amount_val), ParagraphStyle('PayVal', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=GREEN_TEXT, alignment=TA_RIGHT))],
        [p('Entregado por:', bold), p(paid_by, right)],
        [p('Recibido por:', bold), p(received_by, ParagraphStyle('RecBy', parent=right, fontName='Helvetica-Bold'))],
        [p('Medio de pago:', bold), p(methods_map.get(r.get('paymentMethod'), r.get('paymentMethod', '')), right)],
        [p('Observaciones / N.º:', bold), p(r.get('notes') or 'Sin observaciones', right)],
    ], colWidths=[150, 349.27], hAlign='LEFT')

    pay_details.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN_BG),
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, LINE),
    ]))
    story += [pay_details, Spacer(1, 14)]

    # Resumen Estado Financiero
    tot = Decimal(str(quote.get('total', 0)))
    tot_paid = Decimal(str(quote.get('totalPaid', 0)))
    rem_bal = Decimal(str(quote.get('remainingBalance', max(0, tot - tot_paid))))

    fin_rows = [
        [p('Total Cotización:', normal), p(currency(tot), right)],
        [p('Total Acumulado Abonado:', ParagraphStyle('P2', parent=normal, fontName='Helvetica-Bold', textColor=GREEN_TEXT)),
         p(currency(tot_paid), ParagraphStyle('P3', parent=right, fontName='Helvetica-Bold', textColor=GREEN_TEXT))],
        [p('Saldo Pendiente:', ParagraphStyle('P4', parent=normal, fontName='Helvetica-Bold', textColor=colors.HexColor('#b91c1c') if rem_bal > 0 else GREEN_TEXT)),
         p(currency(rem_bal), ParagraphStyle('P5', parent=right, fontName='Helvetica-Bold', textColor=colors.HexColor('#b91c1c') if rem_bal > 0 else GREEN_TEXT))]
    ]
    fin_table = Table(fin_rows, colWidths=[200, 299.27], hAlign='LEFT')
    fin_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 0.5, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, LINE),
    ]))
    story += [p('Estado Financiero de la Cotización', heading), fin_table, Spacer(1, 25)]

    # Firmas
    sig_empresa = resolve_image(company.get('signatureUrl'), max_w=150, max_h=55, is_signature=True)
    sig_cliente = resolve_image(r.get('clientSignatureUrl'), max_w=150, max_h=55, is_signature=True)

    c_name = customer.get('name', 'Cliente')
    rec_by = received_by

    sig_row_img = [
        sig_cliente if sig_cliente else Spacer(1, 55),
        sig_empresa if sig_empresa else Spacer(1, 55)
    ]
    sig_row_text = [
        Paragraph(f'_______________________<br/><b>Firma Entregado por</b><br/>{escape(str(c_name))}', ParagraphStyle('Sig1', parent=normal, alignment=TA_CENTER)),
        Paragraph(f'_______________________<br/><b>Firma Recibido por</b><br/>{escape(str(rec_by))}', ParagraphStyle('Sig2', parent=normal, alignment=TA_CENTER))
    ]

    sig_table = Table([sig_row_img, sig_row_text], colWidths=[WIDTH / 2] * 2, hAlign='CENTER')
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(KeepTogether([sig_table]))

    doc.build(story, onFirstPage=page, onLaterPages=page)


if __name__ == '__main__':
    receipt = json.loads(sys.stdin.buffer.read().decode('utf-8-sig'))
    result = io.BytesIO()
    build_pdf(receipt, result)
    sys.stdout.buffer.write(result.getvalue())
