# PV の作り方

[mp4mp3](https://github.com/cadmium2525/mp4mp3) の「つなぐ」（動画）と「かなでる」（BGM）で作っています。

1. ゲームを `python3 -m http.server 8123` で起動し、`node pv/capture.js` でプレイ映像を撮影
   （ゲーム内時間を1/30秒ずつ進めて撮るので、重い環境でもなめらか）。
   `frames/` の連番画像を ffmpeg で `media/s1_r1.mp4` などにする
2. `node pv/song.gen.mjs` で `song.json` を作り、`node <mp4mp3>/daw/tools/render.mjs song.json media/bgm.wav` でBGMを書き出す
   （128BPM・13小節。9小節目の頭＝16.875秒が羽化の瞬間）
3. 結果カードの画像を `media/card.png` に置き、
   `node <mp4mp3>/editor/tools/render.mjs pv/project.json media out.mp4 --short 1080` で書き出す
4. X向けに音声をAACにする：`ffmpeg -i out.mp4 -c:v copy -c:a aac -b:a 192k -movflags +faststart antlion_pv.mp4`
