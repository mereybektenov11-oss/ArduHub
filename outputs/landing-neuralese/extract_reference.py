from pathlib import Path
import cv2
from PIL import Image, ImageDraw

source = Path(r'C:\Users\User\OneDrive\Videos\Captures\Neuralese - Google Chrome 2026-11-08 11-33-37.mp4')
out = Path('outputs/landing-neuralese/reference')
out.mkdir(parents=True, exist_ok=True)
capture = cv2.VideoCapture(str(source))
sheet = Image.new('RGB', (1920, 4*282), '#eeeeee')
draw = ImageDraw.Draw(sheet)
for index, second in enumerate(range(0, 70, 5)):
    capture.set(cv2.CAP_PROP_POS_MSEC, second*1000)
    ok, frame = capture.read()
    if not ok:
        continue
    image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    image.save(out / f'{second:02d}s.jpg', quality=90)
    image.thumbnail((480, 255))
    x, y = (index % 4)*480, (index // 4)*282
    sheet.paste(image, (x, y+24))
    draw.text((x+8, y+5), f'{second}s', fill='#111111')
capture.release()
sheet.save(out/'contact-sheet.jpg', quality=94)
