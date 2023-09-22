import fetch from 'node-fetch'

export async function msTTS(
  message: string,
  speaker: string = 'zh-CN-XiaoyanNeural',
  style: string = 'chat',
  role: string = 'default'
) {
  const apiKey = process.env.MS_SPEECH_KEY || ''
  const resourceRegion = process.env.MS_SPEECH_REGION || ''

  const url = `https://${resourceRegion}.tts.speech.microsoft.com/cognitiveservices/v1`

  const headers = {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Content-Type': 'application/ssml+xml; charset=utf-8',
    'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
    'User-Agent': 'typescript-fetch',
  }

  const data = `
        <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts"
        xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="zh-CN">
            <voice name="${speaker}">
                <p>
                    <mstts:express-as role="${role}" style="${style}">${message}</mstts:express-as>
                </p>
            </voice>
        </speak>
    `

  const ttsRes = await fetch(url, {
    method: 'POST',
    body: data,
    headers: headers,
  })

  if (!ttsRes.ok) {
    throw new Error(`TTS request failed: ${ttsRes.status} ${ttsRes.statusText}`)
  }

  const audio = await ttsRes.arrayBuffer()

  // Convert ArrayBuffer to Base64
  const audioBase64 = Buffer.from(audio).toString('base64')

  return { audio: audioBase64 }
}
