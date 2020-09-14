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
### 公众号SDK
[微信官方文档 - 公众号](https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html)

#### [自定义菜单](https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Creating_Custom-Defined_Menu.html)
1. `menuCreate` 自定义菜单-创建接口
2. `menuInfo` 自定义菜单-查询接口
3. `menuDelete` 自定义菜单-删除接口
4. `menuAddConditional` 自定义菜单-创建个性化菜单
5. `menuDelConditional` 自定义菜单-删除个性化菜单
6. `menuTryMatch` 自定义菜单-测试个性化菜单匹配结果
7. `menuGet` 自定义菜单-获取自定义菜单配置


#### [消息管理-接收与被动回复](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Receiving_standard_messages.html)
> 使用 `wechater.accessWxKoa` 或 `wechater.accessWxExpress` 中间件，获取到hanler, 使用handler进行消息接收与被动回复信息`
1. `replyText` 回复文本
2. `replyImage` 回复图片
3. `replyVoice` 回复语音
4. `replyVideo` 回复视频
5. `replyMusic` 回复音乐
6. `replyToCustomer` 转发到客服系统
7. `replyNews` 发送图文信息
#### [消息管理-模版消息](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html)
1. `industrySet` 消息管理-设置所属行业
2. `industryGet` 消息管理-获取设置的行业信息
3. `templateId` 消息管理-获得模板ID
4. `templateInfo` 消息管理-获得模板列表
5. `templateDelete` 消息管理-删除模板
6. `templateSend` 消息管理-发送模版消息


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