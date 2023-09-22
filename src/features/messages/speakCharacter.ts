import { wait } from '@/utils/wait'
import { synthesizeVoiceApi } from './synthesizeVoice'
import { Viewer } from '../vrmViewer/viewer'
import { Screenplay } from './messages'
import { Talk } from './messages'

const createSpeakCharacter = () => {
  let lastTime = 0
  let prevFetchPromise: Promise<unknown> = Promise.resolve()
  let prevSpeakPromise: Promise<unknown> = Promise.resolve()

  return (
    screenplay: Screenplay,
    viewer: Viewer,
    koeiroApiKey: string,
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    const fetchPromise = prevFetchPromise.then(async () => {
      const now = Date.now()
      if (now - lastTime < 1000) {
        await wait(1000 - (now - lastTime))
      }

      const buffer = await fetchAudio(screenplay.talk, koeiroApiKey).catch(
        () => null
      )
      lastTime = Date.now()
      return buffer
    })

    prevFetchPromise = fetchPromise
    prevSpeakPromise = Promise.all([fetchPromise, prevSpeakPromise]).then(
      ([audioBuffer]) => {
        onStart?.()
        if (!audioBuffer) {
          return
        }
        return viewer.model?.speak(audioBuffer, screenplay)
      }
    )
    prevSpeakPromise.then(() => {
      onComplete?.()
    })
  }
}

export const speakCharacter = createSpeakCharacter()

export const fetchAudio = async (
  talk: Talk,
  apiKey: string
): Promise<ArrayBuffer> => {
  const ttsVoice = await synthesizeVoiceApi(
    talk.message,
    talk.speakerX,
    talk.speakerY,
    talk.style,
    apiKey
  )

  const base64Audio = ttsVoice.audio

  if (base64Audio == null) {
    throw new Error('Something went wrong')
  }

  // Convert Base64 to ArrayBuffer
  const binaryString = window.atob(base64Audio)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}
