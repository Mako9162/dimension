"""Image loading without outbound requests or arbitrary filesystem access."""
import base64
import io
import re
import warnings
import urllib.request
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 16_000_000
warnings.simplefilter('ignore', Image.DecompressionBombWarning)
MAX_BYTES = 5 * 1024 * 1024
BACKEND = Path(__file__).resolve().parents[1]
PUBLIC = BACKEND.parent / 'frontend/public'

def decode_image(value):
    match = re.fullmatch(r'data:image/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)', value or '')
    if not match or len(match[1]) > MAX_BYTES * 4 // 3 + 4:
        raise ValueError('Usa una imagen PNG, JPG o WebP de hasta 5 MB')
    raw = base64.b64decode(match[1], validate=True)
    if len(raw) > MAX_BYTES:
        raise ValueError('La imagen supera 5 MB')
    return raw

@lru_cache(maxsize=64)
def fetch_image_bytes(value):
    if not value:
        return None
    try:
        if value.startswith('data:'):
            return decode_image(value)
            
        if value.startswith(('http://', 'https://')):
            try:
                req = urllib.request.Request(value, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=2.5) as response:
                    data = response.read()
                    if len(data) <= MAX_BYTES:
                        return data
            except Exception:
                pass
            return None

        clean_path = value.lstrip('/')
        for root in (PUBLIC, BACKEND):
            candidate = (root / clean_path).resolve()
            if candidate.is_file() and candidate.stat().st_size <= MAX_BYTES:
                return candidate.read_bytes()
    except Exception:
        return None
    return None

def normalize_image(value):
    raw = decode_image(value)
    with Image.open(io.BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image).convert('RGBA')
        image.thumbnail((1200, 1200))
        output = io.BytesIO()
        image.save(output, format='PNG', optimize=True)
        if output.tell() > 2 * 1024 * 1024:
            raise ValueError('La imagen es demasiado compleja. Reduce su tamaño.')
        return output.getvalue()
