"""Create three separate review PDFs from an ignored, local profile file.

Dependencies: reportlab, pypdf, qrcode, pillow, pymupdf, zxing-cpp.
No upload or order is performed. Local profiles must never enter a web output.
"""
import argparse
import hashlib
import json
from pathlib import Path

import fitz
from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
import qrcode
import qrcode.image.svg
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
import zxingcpp

def make(profile, output):
    folder = output / profile['id']
    folder.mkdir(parents=True, exist_ok=True)
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4, box_size=12)
    qr.add_data(profile['url'])
    qr.make(fit=True)
    qr.make_image().save(folder / 'qr.png')
    qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(folder / 'qr.svg')
    pdf = folder / 'card-review.pdf'
    c = canvas.Canvas(str(pdf), pagesize=(97*mm, 61*mm), pageCompression=1, initialFontName='JP', initialFontSize=8, enforceColorSpace='CMYK')
    c.setTitle(profile['name'])
    c.setAuthor('')
    c.setCreator('')
    c.setSubject('')
    c.setFillColorCMYK(0,0,0,0)
    c.rect(0,0,97*mm,61*mm,fill=1,stroke=0)
    c.setFillColorCMYK(0,0,0,1)
    c.rect(9*mm,50*mm,9*mm,0.7*mm,fill=1,stroke=0)

    def text(line, x, y, size, font='JP', width=54):
        if pdfmetrics.stringWidth(line,font,size) > width*mm:
            raise ValueError('Text exceeds its safe region')
        c.setFont(font,size)
        c.drawString(x*mm,y*mm,line)

    text(profile['tagline'],9,46,7.2)
    text(profile['name'],9,35,profile.get('name_size',17),'JPB')
    for i, line in enumerate(profile['details']):
        text(line,9,28-i*4.2,7.2)
    text(profile['url'].removeprefix('https://').rstrip('/'),9,10,7.1,width=78)
    c.setFillColorCMYK(0,0,0,.72)
    text('ご案内サイトは準備中です',9,6.5,6.3,width=78)
    c.setFillColorCMYK(0,0,0,1)
    matrix = qr.get_matrix()
    size = 22*mm
    cell = size/len(matrix)
    x0,y0 = 68*mm,18*mm
    path = c.beginPath()
    for row, values in enumerate(matrix):
        for col, dark in enumerate(values):
            if dark: path.rect(x0+col*cell,y0+(len(matrix)-1-row)*cell,cell,cell)
    c.drawPath(path,fill=1,stroke=0)
    text('ご案内はこちら',69,15,6.2,width=23)
    c.showPage()
    c.save()
    reader = PdfReader(pdf)
    page = reader.pages[0]
    page.trimbox = RectangleObject([3*mm,3*mm,94*mm,58*mm])
    page.bleedbox = RectangleObject([0,0,97*mm,61*mm])
    writer = PdfWriter()
    writer.add_page(page)
    writer.add_metadata({'/Title':profile['name'],'/Author':'','/Subject':'','/Creator':'','/Producer':''})
    with pdf.open('wb') as f: writer.write(f)
    doc = fitz.open(pdf)
    page = doc[0]
    page.get_pixmap(dpi=300).save(folder / 'preview.png')
    # Trimmed raster, as the printer's final 91 x 55 mm product.
    clip = fitz.Rect(3*mm,3*mm,94*mm,58*mm)
    page.get_pixmap(dpi=300,clip=clip).save(folder / 'trim-preview.png')
    decoded = zxingcpp.read_barcodes(Image.open(folder / 'trim-preview.png'))
    if [d.text for d in decoded] != [profile['url']]:
        raise ValueError('Printed-size raster QR verification failed')
    final = PdfReader(pdf)
    for font in final.pages[0]['/Resources']['/Font'].values():
        desc = font.get_object().get('/FontDescriptor')
        if not desc or '/FontFile2' not in desc.get_object():
            raise ValueError('Unembedded font')
    return {'id':profile['id'],'url':profile['url'],'pdf':str(pdf),'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'qr_verified':'300 dpi trimmed raster decoded; physical scan pending','print_status':'REVIEW ONLY; no print approval'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--profiles',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    pdfmetrics.registerFont(TTFont('JP','C:/Windows/Fonts/meiryo.ttc',subfontIndex=0))
    pdfmetrics.registerFont(TTFont('JPB','C:/Windows/Fonts/meiryob.ttc',subfontIndex=0))
    profiles=json.loads(args.profiles.read_text(encoding='utf-8'))
    results=[make(p,args.output) for p in profiles]
    (args.output / 'verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Created and decoded 3 separate PDF cards; physical scan and print approval pending.')
