"""Build a standalone preview without changing the split source files."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
font = base64.b64encode((root / 'assets/fonts/ZCOOLKuaiLe-Regular.ttf').read_bytes()).decode()
css = css.replace('url("assets/fonts/ZCOOLKuaiLe-Regular.ttf")', f'url("data:font/ttf;base64,{font}")')
html = html.replace('  <link rel="preload" href="assets/fonts/ZCOOLKuaiLe-Regular.ttf" as="font" type="font/ttf" crossorigin>\n', '')
html = html.replace('<link rel="stylesheet" href="style.css?v=matcha-20261022-2">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="main.js" defer></script>', '')
html = html.replace('</body>', '<script>\n' + (root / 'main.js').read_text() + '\n</script>\n</body>')
(root / 'preview.html').write_text(html)
print('Built preview.html (embedded CSS, font and JavaScript)')
