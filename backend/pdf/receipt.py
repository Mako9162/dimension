"""PDF A4 de Recibos de Dinero / Comprobantes de Pago.
JSON por stdin, PDF binario por stdout.
"""
import io
import json
import sys
import base64
from pathlib import Path
from decimal import Decimal
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image

GREEN = colors.HexColor('#12594f')
INK = colors.HexColor('#233c3a')
MUTED = colors.HexColor('#6a7e7b')
LIGHT_BG = colors.HexColor('#f7f9f8')
GREEN_BG = colors.HexColor('#f0fdf4')
GREEN_TEXT = colors.HexColor('#15803d')
WIDTH = 499.27
import urllib.request

def currency(value):
    return '$' + format(Decimal(str(value)), ',.0f').replace(',', '.')

def p(text, style):
    return Paragraph(str(text or '').replace('\n', '<br/>'), style)

def fetch_image_bytes(img_str):
    if not img_str:
        return None
    try:
        if img_str.startswith('data:image'):
            header, encoded = img_str.split(',', 1)
            return base64.b64decode(encoded)
        if img_str.startswith(('http://', 'https://')):
            req = urllib.request.Request(img_str, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                return response.read()

        paths_to_try = []
        if img_str.startswith('/'):
            paths_to_try.append(Path(__file__).resolve().parents[1] / img_str.lstrip('/'))
            paths_to_try.append(Path(__file__).resolve().parents[2] / 'frontend/public' / img_str.lstrip('/'))
        else:
            paths_to_try.append(Path(img_str))

        for p in paths_to_try:
            if p.exists() and p.is_file():
                return p.read_bytes()

        fallback = Path(__file__).resolve().parents[1] / 'brand/taller-dimension.png'
        if fallback.exists():
            return fallback.read_bytes()
    except Exception:
        pass
    return None

def get_canvas_image(img_str):
    raw_bytes = fetch_image_bytes(img_str)
    if not raw_bytes:
        fallback = Path(__file__).resolve().parents[1] / 'brand/taller-dimension.png'
        if fallback.exists():
            raw_bytes = fallback.read_bytes()
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
        pixels = list(img.getdata())
        has_alpha = any(p[3] < 200 for p in pixels)
        if has_alpha:
            return img_bytes
        lums = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b, _ in pixels]
        max_lum = max(lums) if lums else 255
        threshold = max(110, min(165, max_lum * 0.78))
        new_pixels = []
        for (r, g, b, a), lum in zip(pixels, lums):
            if lum >= threshold:
                new_pixels.append((255, 255, 255, 0))
            else:
                new_pixels.append((int(r * 0.8), int(g * 0.8), int(b * 0.8), 255))
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
    normal = ParagraphStyle('Body', fontName='Helvetica', fontSize=9, leading=13, textColor=INK)
    bold = ParagraphStyle('Bold', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=INK)
    small = ParagraphStyle('Small', parent=normal, fontSize=8, leading=11, textColor=MUTED)
    right = ParagraphStyle('Right', parent=normal, alignment=TA_RIGHT)
    heading = ParagraphStyle('Heading', parent=normal, fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=GREEN, spaceBefore=12, spaceAfter=6)

    quote = r['quote']
    company = quote['companySnapshot']
    customer = quote['customerSnapshot']
    vehicle = quote['vehicleSnapshot']
    
    receipt_num = str(r['number']).zfill(5)
    quote_num = str(quote['number']).zfill(5)
    date_str = datetime.fromisoformat(r['date'].replace('Z', '+00:00')).strftime('%d/%m/%Y %H:%M')

    def page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(GREEN)
        canvas.rect(0, 830, 595.27, 12, fill=1, stroke=0)
        
        img_reader = get_canvas_image(company.get('logoUrl'))
        if img_reader:
            canvas.drawImage(img_reader, 48, 743, width=220, height=75, preserveAspectRatio=True, mask='auto')
        else:
            name_p = p(company['name'], ParagraphStyle('HHead', fontName='Helvetica-Bold', fontSize=14, textColor=GREEN))
            _, h = name_p.wrap(260, 70)
            name_p.drawOn(canvas, 48, 780 - h)
            
        canvas.setFont('Helvetica-Bold', 9)
        canvas.setFillColor(GREEN)
        canvas.drawRightString(547, 790, 'RECIBO DE DINERO')
        canvas.setFont('Helvetica-Bold', 22)
        canvas.drawRightString(547, 763, f'N.º {receipt_num}')
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(547, 746, f'Fecha: {date_str}')
        canvas.setFont('Helvetica-Bold', 8)
        canvas.setFillColor(INK)
        canvas.drawRightString(547, 733, f'Cotización N.º {quote_num}')
        
        canvas.setStrokeColor(colors.HexColor('#d6e3dc'))
        canvas.line(48, 720, 547, 720)
        canvas.line(48, 48, 547, 48)
        canvas.setFont('Helvetica', 7)
        canvas.drawString(48, 33, f'Recibo N.º {receipt_num} | Comprobante de pago - Taller Dimensión')
        canvas.drawRightString(547, 33, f'Página {doc.page}')
        canvas.restoreState()

    doc = SimpleDocTemplate(
        output, pagesize=(595.27, 841.89), leftMargin=48, rightMargin=48, topMargin=126, bottomMargin=64,
        title=f'Recibo N.º {receipt_num} - {company["name"]}'
    )

    story = []

    # Datos del Taller (debajo de la línea divisoria del encabezado, omitiendo nombre redundante si hay logo)
    company_details = []
    if company.get('ownerName'): company_details.append(company['ownerName'])
    if company.get('taxId'): company_details.append(company['taxId'])
    if company.get('address'): company_details.append(company['address'])
    if company.get('phone'): company_details.append(company['phone'])
    if company.get('email'): company_details.append(company['email'])

    if any(company_details):
        story += [p(' | '.join(company_details), small), Spacer(1, 10)]

    # Datos del cliente / vehículo (filtrando filas vacías)
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
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    story += [client_info, Spacer(1, 10)]

    # Detalle del Pago
    story.append(p('Detalle del Abono', heading))

    methods_map = {
        'EFECTIVO': 'Efectivo', 'TRANSFERENCIA': 'Transferencia bancaria',
        'TARJETA_DEBITO': 'Tarjeta de débito', 'TARJETA_CREDITO': 'Tarjeta de crédito',
        'CHEQUE': 'Cheque', 'OTRO': 'Otro medio de pago'
    }

    amount_val = Decimal(str(r['amount']))
    paid_by = r.get('paidBy') or customer.get('name') or '-'
    received_by = r.get('receivedBy') or company.get('ownerName') or company.get('name') or '-'

    pay_details = Table([
        [p('MONTO RECIBIDO', ParagraphStyle('PayLbl', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=GREEN_TEXT)),
         p(currency(amount_val), ParagraphStyle('PayVal', fontName='Helvetica-Bold', fontSize=15, leading=18, textColor=GREEN_TEXT, alignment=TA_RIGHT))],
        [p('Entregado por:', bold), p(paid_by, right)],
        [p('Recibido por:', bold), p(received_by, ParagraphStyle('RecBy', parent=right, fontName='Helvetica-Bold'))],
        [p('Medio de pago:', bold), p(methods_map.get(r['paymentMethod'], r['paymentMethod']), right)],
        [p('Observaciones / N.º:', bold), p(r.get('notes') or 'Sin observaciones', right)],
    ], colWidths=[150, 349.27], hAlign='LEFT')
    pay_details.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREEN_BG),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#bbf7d0')),
    ]))
    story.append(pay_details)
    story.append(Spacer(1, 14))

    # Resumen de Saldo
    total_q = Decimal(str(quote['total']))
    paid_so_far = Decimal(str(r.get('totalPaidSoFar', amount_val)))
    rem_balance = max(Decimal('0'), total_q - paid_so_far)

    status_table = Table([
        [p('Total Cotización N.º ' + quote_num, normal), p(currency(total_q), right)],
        [p('Total Abonado a la Fecha', ParagraphStyle('G', fontName='Helvetica-Bold', fontSize=9, textColor=GREEN_TEXT)), p(currency(paid_so_far), ParagraphStyle('GV', fontName='Helvetica-Bold', fontSize=9, textColor=GREEN_TEXT, alignment=TA_RIGHT))],
        [p('SALDO PENDIENTE RESTANTE', ParagraphStyle('R', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#b91c1c'))),
         p(currency(rem_balance), ParagraphStyle('RV', fontName='Helvetica-Bold', fontSize=12, textColor=colors.HexColor('#b91c1c'), alignment=TA_RIGHT))]
    ], colWidths=[140, 135], hAlign='RIGHT')
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#fef2f2')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(KeepTogether([status_table]))

    # Cargar firma si existe
    signature_element = resolve_image(company.get('signatureUrl'), max_w=140, max_h=50, is_signature=True)

    # Firma en 2 filas: Fila 0 = Espacio / Imagen de firma arriba. Fila 1 = Texto abajo.
    story.append(Spacer(1, 25))
    row_top = ['', '', signature_element if signature_element else Spacer(1, 40)]
    row_bottom = [
        p('Entregado Conforme (Cliente)', ParagraphStyle('S1', parent=small, alignment=TA_CENTER)),
        '',
        p('Recibido Conforme (Taller)', ParagraphStyle('S2', parent=small, alignment=TA_CENTER))
    ]

    sign_table = Table([row_top, row_bottom], colWidths=[190, 119.27, 190], hAlign='LEFT')
    sign_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LINEABOVE', (0, 1), (0, 1), 1, colors.HexColor('#94a3b8')),
        ('LINEABOVE', (2, 1), (2, 1), 1, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0, 1), (-1, 1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
    ]))
    story.append(KeepTogether([sign_table]))

    doc.build(story, onFirstPage=page, onLaterPages=page)

if __name__ == '__main__':
    receipt_data = json.loads(sys.stdin.buffer.read().decode('utf-8-sig'))
    result = io.BytesIO()
    build_pdf(receipt_data, result)
    sys.stdout.buffer.write(result.getvalue())
