"""Build a standalone preview without changing the split source files."""
from pathlib import Path
import base64
import re

root = Path(__file__).resolve().parent.parent
html = (root / 'period.html').read_text()
css = (root / 'period.css').read_text()
font = base64.b64encode((root / 'assets/fonts/ZCOOLKuaiLe-Regular.ttf').read_bytes()).decode()
css = css.replace('url("assets/fonts/ZCOOLKuaiLe-Regular.ttf")', f'url("data:font/ttf;base64,{font}")')
html = re.sub(r'<link rel="preload"[^>]*>\s*', '', html)
html = html.replace('<link rel="stylesheet" href="navigation.css?v=1">', '<style>' + (root / 'navigation.css').read_text() + '</style>')
html = re.sub(r'<link rel="stylesheet"[^>]*>', lambda _: '<style>\n' + css + '\n</style>', html)
html = html.replace('<script src="period.js" defer></script>', '')
html = html.replace('</body>', '<script>\n' + (root / 'period.js').read_text() + '\n</script>\n</body>')
(root / 'period-preview.html').write_text(html)
print('Built period-preview.html (embedded CSS, font and JavaScript)')
