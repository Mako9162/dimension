"""Image loading without outbound requests or arbitrary filesystem access."""
import base64
import io
import re
import warnings
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 16_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)
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
    with Image.open(io.BytesIO(raw)) as image:
        if image.format not in ('PNG', 'JPEG', 'WEBP'):
            raise ValueError('Formato de imagen no permitido')
        image.verify()
    return raw

@lru_cache(maxsize=8)
def fetch_image_bytes(value):
    if not value:
        return None
    try:
        if value.startswith('data:'):
            return decode_image(value)
        if not re.fullmatch(r'/(?:brand|uploads)/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)', value):
            return None
        for root in (PUBLIC, BACKEND):
            candidate = (root / value.lstrip('/')).resolve()
            if candidate.is_relative_to(root.resolve()) and candidate.is_file() and candidate.stat().st_size <= MAX_BYTES:
                raw = candidate.read_bytes()
                with Image.open(io.BytesIO(raw)) as image:
                    if image.format not in ('PNG', 'JPEG', 'WEBP'): return None
                    image.verify()
                return raw
    except (ValueError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return None
    return None

def normalize_image(value):
    raw = decode_image(value)
    with Image.open(io.BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image).convert('RGBA')
        image.thumbnail((1600, 1600))
        output = io.BytesIO()
        image.save(output, format='PNG', optimize=True)
        if output.tell() > 2 * 1024 * 1024:
            raise ValueError('La imagen es demasiado compleja. Reduce su tamaño.')
        return output.getvalue()
