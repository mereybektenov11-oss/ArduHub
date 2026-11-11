from pathlib import Path
import json
import subprocess
import cv2
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
out = Path('public/videos/landing')
out.mkdir(parents=True, exist_ok=True)
rows=[]
for name in ['editor','review','lessons']:
    source=Path('outputs/landing-neuralese/raw')/f'{name}.webm'
    target=out/f'{name}.mp4'
    subprocess.run([ffmpeg,'-nostdin','-n','-ss','1.1','-i',str(source),'-t','7','-an','-vf','scale=1280:800,fps=24','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(target)], check=True, capture_output=True)
    subprocess.run([ffmpeg,'-nostdin','-n','-ss','0.8','-i',str(target),'-frames:v','1','-vf','scale=960:600','-c:v','libwebp','-quality','86',str(out/f'{name}.webp')], check=True,capture_output=True)
    capture=cv2.VideoCapture(str(target))
    rows.append({'name':name,'source':str(source),'bytes':target.stat().st_size,'seconds':capture.get(cv2.CAP_PROP_FRAME_COUNT)/capture.get(cv2.CAP_PROP_FPS),'size':[int(capture.get(3)),int(capture.get(4))]})
    capture.release()
Path('outputs/landing-neuralese/media-manifest.json').write_text(json.dumps({'provenance':'Own ArduHub interface recorded locally in isolated guest sessions, example learner progress. review is a scripted illustrative circuit example. No Neuralese media is included. No AI API, email, compilation or real-account data used.','files':rows},indent=2),encoding='utf-8')
print(json.dumps(rows,indent=2))
