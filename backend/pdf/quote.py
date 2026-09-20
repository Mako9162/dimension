"""PDF A4 de cotizaciones con diseño profesional Taller Dimensión (Carbón y Naranja).
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
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, LongTable, KeepTogether

import base64

# Paleta de colores oficial Taller Dimensión
BRAND_DARK = colors.HexColor('#18191d')     # Carbón profundo
BRAND_ACTION = colors.HexColor('#a84200')   # Naranja terracota / acción
BRAND_ACCENT = colors.HexColor('#ff790d')   # Naranja brillante / acento
BRAND_SOFT = colors.HexColor('#fff2e7')     # Fondo naranja suave
BRAND_BORDER = colors.HexColor('#f4d5ba')   # Borde naranja tenue
MUTED = colors.HexColor('#62626b')          # Gris medio
LINE = colors.HexColor('#dedee2')           # Línea divisoria
LIGHT_BG = colors.HexColor('#f9fafb')       # Superficie clara

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


def build_pdf(q, output):
    normal = ParagraphStyle('Body', fontName='Helvetica', fontSize=9, leading=14, textColor=BRAND_DARK, spaceAfter=4, splitLongWords=True)
    bold_text = ParagraphStyle('BoldText', parent=normal, fontName='Helvetica-Bold')
    small = ParagraphStyle('Small', parent=normal, fontSize=8, leading=12, textColor=MUTED)
    label = ParagraphStyle('Label', parent=small, fontName='Helvetica-Bold', fontSize=8, textColor=BRAND_ACTION, spaceAfter=4)
    heading = ParagraphStyle('Heading', parent=normal, fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=BRAND_DARK, spaceBefore=16, spaceAfter=8, keepWithNext=True)
    right = ParagraphStyle('Right', parent=normal, alignment=TA_RIGHT)

    def p(text, style=normal):
        return Paragraph(escape(str(text or '')).replace('\n', '<br/>'), style)

    company = q.get('companySnapshot', {})
    customer = q.get('customerSnapshot', {})
    vehicle = q.get('vehicleSnapshot', {})
    number = str(q.get('number', 0)).zfill(5)
    
    date_raw = q.get('date', '')
    try:
        date = datetime.fromisoformat(date_raw.replace('Z', '+00:00')).strftime('%d/%m/%Y')
    except Exception:
        date = date_raw

    def page(canvas, doc):
        canvas.saveState()
        
        # Barra superior color naranja acento
        canvas.setFillColor(BRAND_ACCENT)
        canvas.rect(0, 832, 595.27, 10, fill=1, stroke=0)

        # Logo de la empresa (o nombre fallback)
        img_reader = get_canvas_image(company.get('logoUrl'))
        if img_reader:
            canvas.drawImage(img_reader, 48, 715, width=210, height=95, preserveAspectRatio=True, mask='auto')
        else:
            name_p = p(company.get('name', 'TALLER DIMENSIÓN'), ParagraphStyle('CompTitle', fontName='Helvetica-Bold', fontSize=16, textColor=BRAND_DARK))
            _, h = name_p.wrap(250, 70)
            name_p.drawOn(canvas, 48, 780 - h)

        # Encabezado derecho
        canvas.setFont('Helvetica-Bold', 9)
        canvas.setFillColor(BRAND_ACTION)
        canvas.drawRightString(547, 792, 'COTIZACIÓN DE REPARACIÓN')
        
        canvas.setFont('Helvetica-Bold', 22)
        canvas.setFillColor(BRAND_DARK)
        canvas.drawRightString(547, 765, f'N.º {number}')
        
        canvas.setFont('Helvetica', 8.5)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(547, 748, f'Fecha de Emisión: {date}')
        
        # Línea divisoria de encabezado
        canvas.setStrokeColor(BRAND_BORDER)
        canvas.setLineWidth(1)
        canvas.line(48, 702, 547, 702)

        # Pie de página
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(48, 48, 547, 48)
        
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(48, 33, f'Cotización N.º {number} · Documento comercial no válido como factura')
        canvas.drawRightString(547, 33, f'Página {doc.page}')
        canvas.restoreState()

    doc = SimpleDocTemplate(
        output,
        pagesize=(595.27, 841.89),
        leftMargin=48, rightMargin=48,
        topMargin=152, bottomMargin=64,
        title=f'Cotización {number} - {company.get("name","Taller Dimensión")}',
        author=company.get('name', 'Taller Dimensión')
    )
    
    story = []

    # Detalles de la empresa en línea
    company_details = []
    if company.get('ownerName'): company_details.append(company['ownerName'])
    if company.get('taxId'): company_details.append(f"RUT: {company['taxId']}")
    if company.get('address'): company_details.append(company['address'])
    if company.get('phone'): company_details.append(f"Tel: {company['phone']}")
    if company.get('email'): company_details.append(company['email'])

    if any(company_details):
        story += [p(' | '.join(company_details), small), Spacer(1, 10)]

    # Bloque Datos del Cliente y Vehículo
    cust_info = [
        p('PREPARADA PARA', label),
        p(customer.get('name', ''), bold_text),
        p(f'RUT / ID: {customer.get("taxId", "-")}', small)
    ]
    if customer.get('address'): cust_info.append(p(f'Dirección: {customer["address"]}', small))
    if customer.get('phone'): cust_info.append(p(f'Teléfono: {customer["phone"]}', small))
    if customer.get('email'): cust_info.append(p(f'Email: {customer["email"]}', small))

    veh_brand_model = f"{vehicle.get('brand','')} {vehicle.get('model','')} {vehicle.get('year','')}".strip()
    veh_info = [
        p('VEHÍCULO A REPARAR', label),
        p(veh_brand_model if veh_brand_model else 'Sin especificar', bold_text),
        p(f'Patente: {vehicle.get("plate","S/I")} | Color: {vehicle.get("color") or "S/I"}', small)
    ]
    if vehicle.get('vin'): veh_info.append(p(f'VIN: {vehicle["vin"]}', small))

    info_table = Table([[cust_info, veh_info]], colWidths=[WIDTH / 2] * 2, hAlign='LEFT')
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_SOFT),
        ('BOX', (0, 0), (-1, -1), 1, BRAND_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10)
    ]))
    story += [info_table, Spacer(1, 14), p('Detalle de Trabajos y Repuestos', heading)]

    # Tabla de Detalle
    header_style = ParagraphStyle('TableHead', parent=small, textColor=colors.white, fontName='Helvetica-Bold', fontSize=7.5, leading=10)
    rows = [[p(t, header_style) for t in ['DESCRIPCIÓN', 'CANT.', 'PRECIO NETO', 'TOTAL NETO']]]
    categories = {'REPUESTO': 'REPUESTO', 'INSUMO': 'INSUMO', 'MANO_OBRA': 'MANO DE OBRA'}

    tag_style = ParagraphStyle('TagStyle', parent=small, fontName='Helvetica-Bold', fontSize=7, textColor=BRAND_ACTION)

    for line in q.get('lines', []):
        cat_label = categories.get(line.get('category'), line.get('category', ''))
        content = [p(line.get('name', '')), p(cat_label, tag_style)]
        if line.get('description'):
            content.append(p(line['description'], small))
        
        rows.append([
            content,
            p(str(Decimal(str(line.get('quantity', 1))).normalize()), right),
            p(currency(line.get('unitPrice', 0)), right),
            p(currency(line.get('lineTotal', 0)), right)
        ])

    table = LongTable(rows, colWidths=[244.27, 45, 105, 105], repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_DARK),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, LINE)
    ]))
    story += [table, Spacer(1, 14)]

    # Totales
    total_style = ParagraphStyle('TotalVal', parent=right, fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.white)
    total_lbl_style = ParagraphStyle('TotalLbl', parent=normal, fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=colors.white)

    totals_rows = [
        [p('Subtotal neto', normal), p(currency(q.get('subtotal', 0)), right)],
        [p(f'IVA ({Decimal(str(q.get("taxRate", 19))).normalize()}%)', normal), p(currency(q.get('tax', 0)), right)],
        [p('TOTAL CLP', total_lbl_style), p(currency(q.get('total', 0)), total_style)],
    ]

    total_paid = Decimal(str(q.get('totalPaid', 0)))
    if total_paid > 0:
        rem_bal = Decimal(str(q.get('remainingBalance', 0)))
        totals_rows.append([
            p('Total Abonado', ParagraphStyle('PaidLbl', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor('#15803d'))),
            p(currency(total_paid), ParagraphStyle('PaidVal', parent=right, fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor('#15803d')))
        ])
        totals_rows.append([
            p('Saldo Pendiente', ParagraphStyle('BalLbl', fontName='Helvetica-Bold', fontSize=9.5, leading=13, textColor=colors.HexColor('#b91c1c'))),
            p(currency(rem_bal), ParagraphStyle('BalVal', parent=right, fontName='Helvetica-Bold', fontSize=10.5, leading=14, textColor=colors.HexColor('#b91c1c')))
        ])

    totals = Table(totals_rows, colWidths=[140, 135], hAlign='RIGHT')
    t_styles = [
        ('BACKGROUND', (0, 2), (-1, 2), BRAND_ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, 1), 0.5, LINE),
    ]
    if total_paid > 0:
        t_styles.append(('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#f0fdf4')))
        t_styles.append(('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#fef2f2')))
        t_styles.append(('LINEABOVE', (0, 3), (-1, 3), 0.5, colors.HexColor('#bbf7d0')))
        t_styles.append(('LINEABOVE', (0, 4), (-1, 4), 0.5, colors.HexColor('#fecaca')))

    totals.setStyle(TableStyle(t_styles))
    story.append(KeepTogether([totals]))

    for title, text in [('Observaciones y Plazo Estimado', q.get('observations')), ('Términos y Condiciones', q.get('terms'))]:
        if text:
            story.append(p(title, heading))
            story.extend(p(part) for part in text.split('\n') if part.strip())

    story += [Spacer(1, 22), p(f'Gracias por confiar en {company.get("name","Taller Dimensión")}.', small)]
    doc.build(story, onFirstPage=page, onLaterPages=page)


if __name__ == '__main__':
    quote = json.loads(sys.stdin.buffer.read().decode('utf-8-sig'))
    result = io.BytesIO()
    build_pdf(quote, result)
    sys.stdout.buffer.write(result.getvalue())
