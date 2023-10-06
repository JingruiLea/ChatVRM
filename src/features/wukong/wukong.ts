export async function getXiaoweiChatResponse(msg: string, type: string) {
  const wukong_host = process.env.WUKONG_HOST || window.location.hostname
  const wukong_port = process.env.WUKONG_PORT || '5001'
  console.log(wukong_host, wukong_port)
  const wukong_url = `http://${wukong_host}:${wukong_port}/`

  const params = new URLSearchParams()
  params.append('validate', 'f4bde2a342c7c75aa276f78b26cfbd8a')
  params.append('query', msg)
  params.append('uuid', 'test')
  params.append('type', type)

  const response = await fetch(wukong_url + 'chat', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },

    method: 'POST',
    body: params.toString(),
  })
  const res = await response.json()
  if (res.message != 'ok') {
    throw new Error('Xiaowei request failed')
  }
  console.log(res)
  const resp = res['resp']
  const audio = res['audio']

  return { message: resp, audio: audio }
}
