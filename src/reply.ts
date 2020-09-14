const { encryptWrap, compiled } = require('./tpl');

class Reply{
  private readonly query: {encrypt_type: string};
  readonly data: WechatData; 
  private readonly options: Options
  constructor(query:{encrypt_type: string}, wechatData: WechatData, options:Options){
    this.query = query;
    this.data = wechatData;
    this.options = options;
  }
  /**
   * 回复文本
   * @param {*} text 文本消息
   */
  replyText(text:string) {
    const { ToUserName, FromUserName } = this.data;
    const info = {
      msgType: 'text',
      createTime: new Date().getTime(),
      toUsername: FromUserName,
      fromUsername: ToUserName,
      content: text,
    };
    return this.warpXml(info);
  }

  /**
   * 回复图片
   * @param imageId 
   */
  replyImage(imageId: string) {
    const { ToUserName, FromUserName } = this.data;
    const info = {
      msgType: 'image',
      createTime: new Date().getTime(),
            toUsername: FromUserName,
      fromUsername: ToUserName,
      content: imageId,
    };
    return this.warpXml(info);
  }

  /**
   * 回复语音
   * @param voiceId 
   */
  replyVoice(voiceId: string) {
    const { ToUserName, FromUserName } = this.data;
    const info = {
      msgType: 'voice',
      createTime: new Date().getTime(),
            toUsername: FromUserName,
      fromUsername: ToUserName,
      content: voiceId,
    };
    return this.warpXml(info);
  }

  /**
   * 回复视频
   * @param video 
   */
  replyVideo(video: VideoEntity) {
    const { ToUserName, FromUserName } = this.data;
    const info = {
      msgType: 'video',
      createTime: new Date().getTime(),
            toUsername: FromUserName,
      fromUsername: ToUserName,
      content: video,
    };
    return this.warpXml(info);
  }

  /**
   * 回复音乐

   * @param music 
   */
  replyMusic(music: MusicEntity) {
    const { ToUserName, FromUserName } = this.data;
    const info = {
      msgType: 'music',
      createTime: new Date().getTime(),
            toUsername: FromUserName,
      fromUsername: ToUserName,
      content: music,
    };
    return this.warpXml(info);
  }

  /**
   * 转发到客服系统
   * @param kfAccount 客服ID
   */
  replyToCustomer(kfAccount?: string) {
    const { ToUserName, FromUserName } = this.data;
    const info = {
      msgType: 'transfer_customer_service',
      createTime: new Date().getTime(),
            toUsername: FromUserName,
      fromUsername: ToUserName,
      kfAccount,
      content: {},
    };
    return this.warpXml(info);
  }

  /**
   * 发送图文信息
   * @param news 
   */
  replyNews(news: NewsEntity[]) {
    const { ToUserName, FromUserName } = this.data;
    const info = {
      msgType: 'news',
      createTime: new Date().getTime(),
            toUsername: FromUserName,
      fromUsername: ToUserName,
      content: news,
    };
    return this.warpXml(info);
  }

  private warpXml(data: any){
    let info = compiled(data)
    const { encrypt_type } = this.query;
    if (!this.options.isDebug && encrypt_type && encrypt_type !== 'raw'){
      const wrap = {
        encrypt: this.options.cryptor.encrypt(info),
        nonce: parseInt((Math.random() * 100000000000).toString(), 10),
        timestamp: new Date().getTime(),
        signature: ''
      };
      wrap.signature = this.options.cryptor.getSignature(wrap.timestamp, wrap.nonce, wrap.encrypt);
      info = encryptWrap(wrap);
    }
    if(this.options.koa){
      this.options.koa.body = data
    }
    if(this.options.express){
      this.options.express.send(data)
    }
    return data;
  }
}

export default Reply;


interface NewsEntity{
  title: string,
  description: string,
  picUrl: string,
  url: string,
}

interface VideoEntity{
  title: string,
  description: string,
  mediaId: string
}

interface MusicEntity{
  title: string,
  description: string,
  musicUrl: string,
  hqMusicUrl: string,
}

interface WechatData{
  ToUserName: string,
  FromUserName: string,
  CreateTime: string,
  MsgType: string,
  Content?: string,
  MsgId?: string,
  Event?:string,
  EventKey?:string,
  MenuId?:string,
}

interface Options {
  isDebug: boolean,
  cryptor: any,
  koa?:any, // koa 使用 koa.ctx
  express?:any, // express 使用 express.res
}