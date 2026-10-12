"""Generate fixed lesson recordings before publication. No runtime TTS is needed."""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist" / "assets" / "audio"
CATALOG = ROOT / "dist" / "assets" / "audio-catalog.js"
ENGLISH = ["block", "This is a block.", "I have a block.", "B. L. O. C. K.", "B", "L", "O", "C", "K"]
CHINESE = [
    "今天的新朋友，方块。它的英语名字是",
    "听一听，找到", "听一次，再跟着说", "指着一个方块，跟着说",
    "拿起一个方块，跟着说", "用字母拼出", "用手指或者纸笔，写下",
    "找对了！", "再试试，找到", "你说出来啦！", "两句都会用了！",
    "认真写过啦，做得好！", "探险完成！你好，方块小达人。",
    "今天的新朋友，方块。我们一起听一听。",
]
# The course data is the shared source for all future audio generations.
LIBRARY = json.loads((ROOT / "dist/assets/lessons.json").read_text(encoding="utf-8"))
CHINESE += ["和妈妈一起说这句话", "和妈妈做完小任务，再写一次单词。", "探险完成，今天学得很认真！"]
for course in LIBRARY["lessons"]:
    if course["type"] == "word":
        word = course["word"]
        ENGLISH += [word, ". ".join(word.upper()) + ".", *word.upper()]
        ENGLISH += [phrase["text"] for phrase in course["phrases"]]
        CHINESE.append(f"今天的新朋友，{course['meaning']}。它的英语名字是")
    elif course["type"] == "review":
        ENGLISH += [question["speak"] for question in course["questions"]]
        CHINESE += [question["prompt"] for question in course["questions"]]
ENGLISH = list(dict.fromkeys(ENGLISH))
CHINESE = list(dict.fromkeys(CHINESE))
PROFILES = {"jenny": ("en-US-JennyNeural", ENGLISH), "aria": ("en-US-AriaNeural", ENGLISH), "xiaoxiao": ("zh-CN-XiaoxiaoNeural", CHINESE)}


def filename(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16] + ".mp3"


def jobs():
    return [(profile, voice, text, OUT / profile / filename(text)) for profile, (voice, texts) in PROFILES.items() for text in texts]


async def generate():
    import edge_tts
    from edge_tts import communicate as edge_communicate
    from edge_tts.constants import TRUSTED_CLIENT_TOKEN

    # edge-tts 7.2.8 still targets Microsoft's retired legacy synthesis host,
    # which began returning 403 globally in October 2026. This is the focused
    # endpoint change from upstream PR #491; remove it after a fixed release.
    edge_communicate.WSS_URL = (
        "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"
        f"?Ocp-Apim-Subscription-Key={TRUSTED_CLIENT_TOKEN}"
    )

    gate = asyncio.Semaphore(2)

    async def render(profile, voice, text, path):
        # Cached or manually supplied recordings can be reused verbatim.
        if path.is_file() and path.stat().st_size > 1000:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix(".part.mp3")
        rate = "-8%" if profile != "xiaoxiao" else "-3%"
        spoken = text + "." if len(text) == 1 and text.isascii() else text
        async with gate:
            for attempt in range(3):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(text=spoken, voice=voice, rate=rate).save(str(temp)), timeout=40)
                    if temp.stat().st_size < 1000:
                        raise RuntimeError("Audio file is unexpectedly small")
                    temp.replace(path)
                    return
                except Exception:
                    temp.unlink(missing_ok=True)
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 * (attempt + 1))

    # Leave the previous catalog unchanged if any recording fails.
    await asyncio.gather(*(render(*job) for job in jobs()))
    catalog = {"ready": True, "english": {"jenny": {}, "aria": {}}, "chinese": {}}
    for profile, _, text, path in jobs():
        if not path.is_file() or path.stat().st_size <= 1000:
            raise RuntimeError(f"Missing recording: {profile} / {text}")
        url = path.relative_to(ROOT / "dist").as_posix()
        target = catalog["chinese"] if profile == "xiaoxiao" else catalog["english"][profile]
        target[text] = url
    temp_catalog = CATALOG.with_suffix(".tmp")
    temp_catalog.write_text("window.LESSON_AUDIO = " + json.dumps(catalog, ensure_ascii=False) + ";\n", encoding="utf-8")
    temp_catalog.replace(CATALOG)
    print(f"Ready: {len(jobs())} MP3 recordings; fixed English and Chinese voices.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", action="store_true", help="Print recording plan without making network calls")
    parser.add_argument("--list-texts", action="store_true", help="Print all texts for offline coverage checks")
    options = parser.parse_args()
    if options.list_texts:
        print(json.dumps({"english": ENGLISH, "chinese": CHINESE}, ensure_ascii=False))
    elif options.plan:
        print(json.dumps({"recordings": len(jobs()), "voices": {k: v[0] for k, v in PROFILES.items()}}, ensure_ascii=False))
    else:
        asyncio.run(generate())

