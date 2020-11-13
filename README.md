## Wechater 微信SDK
> 使用typescript, 结合微信提供的API，提供到一个完善到SDK,支持智能代码提醒、功能拓展。

## 导航🧭
- [Install](#Install)
- [QuickStart](#QuickStart)
  - [koa 接入wechat](#koa-接入wechat)
  - [express 接入wechat](#express-接入wechat)
  - [获取AccessToken 创建菜单接口](#获取AccessToken-创建菜单接口)
  - [Expand 自定义拓展SDK](#Expand-自定义拓展SDK)
  - [conifg](#config)
- [公众号SDK](#公众号SDK)
  - [用户管理](#用户管理)
  - [自定义菜单](#自定义菜单)
  - [消息管理-接收与被动回复](#消息管理-接收与被动回复)
  - [消息管理-模版消息](#消息管理-模版消息)
- [小程序SDK](#小程序SDK)
- [微信支付SDK](#微信支付SDK)
- [企业微信SDK](#企业微信SDK)

### Install

```
npm install wechater
```

### QuickStart
#### koa 接入wechat
```js
const KoaApplication = require('koa');
const Wechater = require('wechater');

const koa = new KoaApplication();

const wechat = new Wechater({
  appId: 'wxAppId',
  appSecret: 'wxAppSecret',
  token: 'wxToken',
  encodingAesKey: 'wxEncodingAesKey',
  isDebug: true,
});

koa.use(wechat.accessWxKoa((reply, ctx, next) => {
  reply.replyText('hello koa wechater');
}));
koa.listen(1718,()=>{console.info('Listen 1718')});
```
#### express 接入wechat
```js
const Express = require('express');
const Wechater = require('wechater');

const wechat = new Wechater({
  appId: 'wxAppId',
  appSecret: 'wxAppSecret',
  token: 'wxToken',
  encodingAesKey: 'wxEncodingAesKey',
  isDebug: true,
});

const app = new Express();
app.all('/', wechat.accessWxExpress((reply) => {
  reply.replyText('hello express wechater');
}));

app.listen(1728, ()=>{console.info('Listen 1728')});
```
#### 获取AccessToken 创建菜单接口

```js
const Express = require('express');
const Wechater = require('wechater');
const bodyParser = require('body-parser')

let accessToken = '';
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
  const result = await wechat.menuCreate(req.body);
  res.send(result)
});

app.listen(1728, ()=>{console.info('Listen 1728')});
```
**模拟请求**
> `POST` `ip:1728/menuCreate`, 公众号菜单会设置成功
```
{
     "button":[
     {	
          "type":"click",
          "name":"今日歌曲",
          "key":"V1001_TODAY_MUSIC"
      },
      {
           "name":"菜单",
           "sub_button":[
           {	
               "type":"view",
               "name":"搜索",
               "url":"http://www.soso.com/"
            },
            {
               "type":"click",
               "name":"赞一下我们",
               "key":"V1001_GOOD"
            }]
       }]
 }
```

#### Expand 自定义拓展SDK
> 由于SDK与微信存在一段时间更新期,我们建议用户自定义拓展SDK, 以新建菜单接口为例
```js
const Wechater = require('wechater');

class NewWechater extends Wechater{
  constructor(options){
    super(options);
  }
  menuCreate(data){
    return this.request('cgi-bin/menu/create',{
      method: 'post',
      data,
    })
  }
}

module.exports = NewWechater;
```
#### Config
```
interface Options {
  appId?: string;
  appSecret?: string;
  token?: string;
  encodingAesKey?: string;
  host?: string;
  isDebug?: boolean;
  accessTokenFunc?: () => Promise<string>;
}
```

### 常用功能
1. 登录
```js
const result = await wechater.jscode2session(js_code)
```
2. 获取access_token
```js
const result = await wechater.getAccessToken()
```
3. 解析数据
```js
const resuult = wechater.decryptData(sessionKey, encryptedData, iv)
```

4. 请求数据，根据access_token
```js
const result = await wechater.request('url', AxiosRequestConfig)  //url 为除去baseUrl路由部分
```

### 公众号SDK
[微信官方文档 - 公众号](https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html)

#### [用户管理](https://developers.weixin.qq.com/doc/offiaccount/User_Management/User_Tag_Management.html)
1. `user` 查看用户详情

#### [消息管理-接收与被动回复](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Receiving_standard_messages.html)
> 使用 `wechater.accessWxKoa` 或 `wechater.accessWxExpress` 中间件，获取到hanler, 使用handler进行消息接收与被动回复信息`
1. `replyText` 回复文本
2. `replyImage` 回复图片
3. `replyVoice` 回复语音
4. `replyVideo` 回复视频
5. `replyMusic` 回复音乐
6. `replyToCustomer` 转发到客服系统
7. `replyNews` 发送图文信息


### 小程序SDK
[微信官方文档 - 小程序](https://developers.weixin.qq.com/miniprogram/dev/framework/)
```

```

### 微信支付SDK
[微信官方文档 - 微信支付](https://pay.weixin.qq.com/wiki/doc/api/index.html)
```

```
### 企业微信SDK
[微信官方文档 - 企业微信](https://work.weixin.qq.com/api/doc)
```

```