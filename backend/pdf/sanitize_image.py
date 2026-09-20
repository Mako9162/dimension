import json
import sys
from safe_images import normalize_image
try:
    data = json.loads(sys.stdin.buffer.read().decode('utf-8'))
    sys.stdout.buffer.write(normalize_image(data['image']))
except Exception:
    sys.stderr.write('Imagen inválida. Usa PNG, JPG o WebP de hasta 5 MB y 16 megapíxeles.')
    sys.exit(1)
