export async function getXiaoweiChatResponse(msg: string,type:string) {
    const wukong_url = 'http://192.168.31.98:5001/';

    const params = new URLSearchParams();
    params.append('validate', 'f4bde2a342c7c75aa276f78b26cfbd8a');
    params.append('query', msg);
    params.append('uuid', 'test');
    params.append('type', type);
  
    const response = await fetch(wukong_url+"chat",{
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
 
        method: "POST",
        body: params.toString()
      });
    const res = await response.json();
    if (res.message!='ok') {
        throw new Error('Xiaowei request failed')
    }
    console.log(res)    
    const resp = res["resp"]
    const audio = res["audio"]
    
    return { message: resp,audio:audio }

  }