/**
 * Music Remover — Background music সরিয়ে শুধু vocal রাখে
 * 
 * Flow:
 * Browser audio → Chrome Extension → HF Space API → MDX-Net → Vocal only
 * 
 * আপাতত দুটো model test করবো:
 * 
 * | Model | Size | Source |
 * |-------|------|--------|
 * | UVR-MDX-NET-Inst_HQ_3 | ~80MB | ultimatevocalremover.org |
 * | MDX23C-8KFFT-InstVoc_HQ | ~150MB | GitHub MDX23 |
 * 
 * Test method:
 * 1. একটা Bangla news audio নাও যেখানে background music আছে
 * 2. দুটো দিয়েই process করো
 * 3. যেটার vocal বেশি clear সেটা final এ use করবো
 */

// HuggingFace Inference API দিয়ে test
export async function removeMusic(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const hfToken = process.env.HF_TOKEN;
  
  if (!hfToken) {
    console.warn('HF_TOKEN not set, returning original audio');
    return audioBuffer;
  }

  // Try UVR model first (smaller, faster)
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/KahfNews/uvr-mdx-net-inst-hq-3",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "audio/wav"
        },
        body: audioBuffer
      }
    );

    if (response.ok) {
      console.log('✅ UVR-MDX-NET model succeeded');
      return response.arrayBuffer();
    }

    // Fallback to Demucs (larger, more accurate)
    console.log('UVR failed, trying Demucs...');
    const fallbackRes = await fetch(
      "https://api-inference.huggingface.co/models/facebook/demucs",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "audio/wav"
        },
        body: audioBuffer
      }
    );

    if (fallbackRes.ok) {
      console.log('✅ Demucs model succeeded');
      return fallbackRes.arrayBuffer();
    }

    throw new Error('Both models failed');
  } catch (error) {
    console.error('Music removal error:', error);
    return audioBuffer; // Fallback: original audio
  }
}

/**
 * MDX Model URLs for HuggingFace deployment
 * 
 * UVR-MDX-NET-Inst_HQ_3:
 *   - Source: https://huggingface.co/KahfNews/uvr-mdx-net-inst-hq-3
 *   - Size: ~80MB
 *   - Best for: General music removal
 * 
 * MDX23C-8KFFT-InstVoc_HQ:
 *   - Source: https://huggingface.co/KahfNews/mdx23c-8kfft-instvoc-hq
 *   - Size: ~150MB
 *   - Best for: High quality vocal extraction
 * 
 * Deploy to HuggingFace Space:
 * 1. Create Space with Docker SDK
 * 2. Upload model files
 * 3. Create inference API
 * 4. Update MUSIC_REMOVER_URL in .env.local
 */
