import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'pdf'))
from safe_images import fetch_image_bytes, normalize_image


class ImageSecurityTests(unittest.TestCase):
    def test_never_loads_network_or_arbitrary_files(self):
        for value in ('http://127.0.0.1/private', 'https://example.com/logo.png',
                      'file:///etc/passwd', '/brand/../../.env', '../.env',
                      '/uploads/x.svg', 'C:/Windows/win.ini'):
            self.assertIsNone(fetch_image_bytes(value), value)

    def test_rejects_disguised_images(self):
        for value in ('data:image/png;base64,bm90IGFuIGltYWdl',
                      'data:image/svg+xml;base64,PHN2Zy8+'):
            with self.assertRaises((ValueError, OSError)):
                normalize_image(value)

    def test_bundled_brand_is_available(self):
        self.assertTrue(fetch_image_bytes('/brand/taller-dimension.png').startswith(b'\x89PNG'))


if __name__ == '__main__':
    unittest.main()
