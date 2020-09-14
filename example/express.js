const Express = require('express');
const Wechater = require('../dist/index');
const bodyParser = require('body-parser')

let accessToken = ''; // accessToken 应该从中心服务器获取,千万不要单个服务器获取accessToken，从而导致accessToken失效
let expireTimestamp = 0;

const wechat = new Wechater({
  appId: 'wxAppId',
  appSecret: 'wxAppSecret',
  accessTokenFunc: async()=>{
    const nowTime = Math.floor((new Date().getTime())/1000);
    if(nowTime >= expireTimestamp){
      const data = await wechat.getAccessToken();
      if(data.errcode){
        throw new Error(`Get AccessToken Error, ${data.errmsg}`)
      }
      accessToken = data.access_token;
      expireTimestamp = nowTime + data.expires_in - 120;
    }
    return accessToken;
  }
});

const app = new Express();
app.use(bodyParser.json());
app.post('/menuCreate', async (req, res)=>{
  const result = await wechat.menuInfo()
  res.send(result)
});

app.listen(1728, ()=>{console.info('Listen 1728')});