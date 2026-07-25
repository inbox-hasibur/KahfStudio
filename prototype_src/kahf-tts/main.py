from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import edge_tts
import asyncio
import io

app = FastAPI(title="Kahf TTS Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Available Bangla voices
VOICES = {
    "female": "bn-BD-NabanitaNeural",
    "male":   "bn-BD-PradeepNeural",
}

class TTSRequest(BaseModel):
    text: str
    voice: str = "female"
    rate: str = "-5%"    # একটু slow = news এর জন্য ভালো
    volume: str = "+0%"

@app.post("/generate")
async def generate_tts(req: TTSRequest):

    if len(req.text) > 15000:
        raise HTTPException(400, "Text too long")

    voice_name = VOICES.get(req.voice, VOICES["female"])

    try:
        # Edge-TTS generate করো
        communicate = edge_tts.Communicate(
            text=req.text,
            voice=voice_name,
            rate=req.rate,
            volume=req.volume
        )

        # Memory তে রাখো (file system নয়)
        audio_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])

        audio_buffer.seek(0)

        return StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=kahf_news.mp3"
            }
        )

    except Exception as e:
        raise HTTPException(500, f"TTS failed: {str(e)}")

@app.get("/voices")
def get_voices():
    return {"available": list(VOICES.keys())}

@app.get("/health")
def health():
    return {"status": "ok", "service": "Kahf TTS"}