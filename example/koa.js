const KoaApplication = require('koa');
const Wechater = require('../dist/index');

let accessToken = '';
let expireTimestamp = 0;
const koa = new KoaApplication();

const wechat = new Wechater({
  appId: 'wxAppId',
  appSecret: 'wxAppSecret',
  token: 'wxToken',
  encodingAesKey: 'wxEncodingAesKey',
  isDebug: true,
  accessTokenFunc: async()=>{
    const nowTime = Math.floor((new Date().getTime())/1000);
    if(nowTime >= expireTimestamp){
      const data = await wechat.getAccessToken();
      accessToken = data.access_token;
      expireTimestamp = nowTime + data.expires_in - 120;
    }
    return accessToken;
  }
});

koa.use(wechat.accessWxKoa((reply, ctx, next) => {
  reply.replyText('hello koa wechater');
}));
koa.listen(1718,()=>{console.info('Listen 1718')});