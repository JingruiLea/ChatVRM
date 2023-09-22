import { msTTS } from '@/features/mstts/mstts'

import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  audio: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | { error: string }>
) {
  const message = req.body.message
  const speaker = req.body.speaker
  const style = req.body.style
  const role = req.body.role

  try {
    const voice = await msTTS(message, speaker, style, role)
    res.status(200).json(voice)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
