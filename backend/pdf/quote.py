"""PDF A4 de cotizaciones con diseño profesional verde original.
JSON por stdin, PDF binario por stdout.
"""
import io
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape
from decimal import Decimal
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, LongTable, KeepTogether

import base64

GREEN = colors.HexColor('#12594f')
INK = colors.HexColor('#233c3a')
MUTED = colors.HexColor('#6a7e7b')
LIGHT = colors.HexColor('#eef5f2')
WIDTH = 499.27


def currency(value):
    return '$' + format(Decimal(str(value)), ',.0f').replace(',', '.')

from safe_images import fetch_image_bytes

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

def resolve_image(img_str, max_w=140, max_h=50):
    raw_bytes = fetch_image_bytes(img_str)
    if not raw_bytes:
        return None
    try:
        from reportlab.platypus import Image
        return Image(io.BytesIO(raw_bytes), width=max_w, height=max_h)
    except Exception:
        pass
    return None

def build_pdf(q, output):
    normal = ParagraphStyle('Body', fontName='Helvetica', fontSize=9, leading=14, textColor=INK, spaceAfter=4, splitLongWords=True)
    small = ParagraphStyle('Small', parent=normal, fontSize=8, leading=12, textColor=MUTED)
    label = ParagraphStyle('Label', parent=small, fontName='Helvetica-Bold', fontSize=7, textColor=GREEN, spaceAfter=7)
    heading = ParagraphStyle('Heading', parent=normal, fontName='Helvetica-Bold', fontSize=11, spaceBefore=18, spaceAfter=10, keepWithNext=True)
    right = ParagraphStyle('Right', parent=normal, alignment=TA_RIGHT)
    
    def p(text, style=normal):
        return Paragraph(escape(str(text or '')).replace('\n', '<br/>'), style)
        
    company, customer, vehicle = q['companySnapshot'], q['customerSnapshot'], q['vehicleSnapshot']
    number = str(q['number']).zfill(5)
    date = datetime.fromisoformat(q['date'].replace('Z', '+00:00')).strftime('%d/%m/%Y')
    
    def page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(GREEN)
        canvas.rect(0, 830, 595.27, 12, fill=1, stroke=0)
        
        img_reader = get_canvas_image(company.get('logoUrl'))
        if img_reader:
            canvas.drawImage(img_reader, 48, 711, width=220, height=110, preserveAspectRatio=True, mask='auto')
        else:
            name = p(company['name'], heading)
            _, h = name.wrap(260, 70)
            name.drawOn(canvas, 48, 780 - h)
            
        canvas.setFont('Helvetica-Bold', 9)
        canvas.setFillColor(GREEN)
        canvas.drawRightString(547, 790, 'COTIZACIÓN DE REPARACIÓN')
        canvas.setFont('Helvetica-Bold', 22)
        canvas.drawRightString(547, 763, f'N.º {number}')
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(547, 746, f'Emisión: {date}')
        canvas.setStrokeColor(colors.HexColor('#d6e3dc'))
        canvas.line(48, 699, 547, 699)
        canvas.line(48, 48, 547, 48)
        canvas.setFont('Helvetica', 7)
        canvas.drawString(48, 33, f'Cotización {number} | Documento comercial - no válido como factura')
        canvas.drawRightString(547, 33, f'Página {doc.page}')
        canvas.restoreState()
        
    doc = SimpleDocTemplate(output, pagesize=(595.27, 841.89), leftMargin=48, rightMargin=48, topMargin=158, bottomMargin=64, title=f'Cotización {number} - {company["name"]}', author=company['name'])
    story = []
    
    company_details = []
    if company.get('ownerName'): company_details.append(company['ownerName'])
    if company.get('taxId'): company_details.append(company['taxId'])
    if company.get('address'): company_details.append(company['address'])
    if company.get('phone'): company_details.append(company['phone'])
    if company.get('email'): company_details.append(company['email'])

    if any(company_details):
        story += [p(' | '.join(company_details), small), Spacer(1, 12)]

    cust_info = [p('PREPARADA PARA', label), p(customer['name']), p(f'RUT / ID: {customer["taxId"]}', small)]
    if customer.get('address'): cust_info.append(p(f'Dirección: {customer["address"]}', small))
    if customer.get('phone'): cust_info.append(p(f'Teléfono: {customer["phone"]}', small))

    veh_info = [
        p('VEHÍCULO', label),
        p(f'{vehicle.get("brand","")} {vehicle.get("model","")} · {vehicle.get("year","")}'),
        p(f'Patente: {vehicle.get("plate","")} | Color: {vehicle.get("color") or "Sin especificar"}', small)
    ]
    if vehicle.get('vin'): veh_info.append(p(f'VIN: {vehicle["vin"]}', small))

    info_table = Table([[cust_info, veh_info]], colWidths=[WIDTH / 2] * 2, hAlign='LEFT')
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10)
    ]))
    story += [info_table, p('Detalle de trabajos y materiales', heading)]

    header_style = ParagraphStyle('TableHead', parent=small, textColor=colors.white, fontName='Helvetica-Bold', fontSize=7, leading=10)
    rows = [[p(t, header_style) for t in ['DESCRIPCIÓN', 'CANT.', 'PRECIO NETO', 'TOTAL NETO']]]
    categories = {'REPUESTO': 'REPUESTO', 'INSUMO': 'INSUMO', 'MANO_OBRA': 'MANO DE OBRA'}

    for line in q['lines']:
        content = [p(line['name']), p(categories.get(line['category'], ''), label)]
        if line.get('description'): content.append(p(line['description'], small))
        rows.append([content, p(str(Decimal(str(line['quantity'])).normalize()), right), p(currency(line['unitPrice']), right), p(currency(line['lineTotal']), right)])

    table = LongTable(rows, colWidths=[244.27, 45, 105, 105], repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7f9f8')]),
        ('LINEBELOW', (0, 1), (-1, -1), .35, colors.HexColor('#e0e8e4'))
    ]))
    story += [table, Spacer(1, 16)]

    total_style = ParagraphStyle('Total', parent=right, fontName='Helvetica-Bold', fontSize=15, leading=20, textColor=colors.white)
    
    totals_rows = [
        [p('Subtotal neto'), p(currency(q['subtotal']), right)],
        [p(f'IVA ({Decimal(str(q["taxRate"])).normalize()}%)'), p(currency(q['tax']), right)],
        [p('TOTAL CLP', ParagraphStyle('TotalLabel', parent=total_style, fontSize=10, leading=14)), p(currency(q['total']), total_style)],
    ]

    total_paid = Decimal(str(q.get('totalPaid', 0)))
    if total_paid > 0:
        rem_bal = Decimal(str(q.get('remainingBalance', 0)))
        totals_rows.append([p('Total Abonado', ParagraphStyle('PaidLbl', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor('#15803d'))), p(currency(total_paid), ParagraphStyle('PaidVal', parent=right, fontName='Helvetica-Bold', leading=12, textColor=colors.HexColor('#15803d')))])
        totals_rows.append([p('Saldo Pendiente', ParagraphStyle('BalLbl', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=colors.HexColor('#b91c1c'))), p(currency(rem_bal), ParagraphStyle('BalVal', parent=right, fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=colors.HexColor('#b91c1c')))])

    totals = Table(totals_rows, colWidths=[140, 135], hAlign='RIGHT')
    t_styles = [
        ('BACKGROUND', (0, 2), (-1, 2), GREEN),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12)
    ]
    if total_paid > 0:
        t_styles.append(('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#f0fdf4')))
        t_styles.append(('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#fef2f2')))

    totals.setStyle(TableStyle(t_styles))
    story.append(KeepTogether([totals]))

    for title, text in [('Observaciones y plazo estimado', q.get('observations')), ('Términos y condiciones', q.get('terms'))]:
        if text:
            story.append(p(title, heading))
            story.extend(p(part) for part in text.split('\n') if part.strip())

    story += [Spacer(1, 24), p(f'Gracias por confiar en {company["name"]}.', small)]
    doc.build(story, onFirstPage=page, onLaterPages=page)

if __name__ == '__main__':
    quote = json.loads(sys.stdin.buffer.read().decode('utf-8-sig'))
    result = io.BytesIO()
    build_pdf(quote, result)
    sys.stdout.buffer.write(result.getvalue())
