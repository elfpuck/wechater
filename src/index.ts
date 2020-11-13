import * as axios from 'axios';
import Reply from './reply';
const merge  = require('lodash.merge');
const WXBizMsgCrypt = require('wechat-crypto');
const urljoin = require('url-join');
import * as koa from 'koa';
import assert from 'assert';
const { getSignature, parseXML, formatMessage } = require('./tools');
const getRawBody = require('raw-body');
const contentType = require('content-type')
import * as crypto from 'crypto';


class Wechater{
  options: Options
  private host: string;
  private isDebug: boolean;
  private accessTokenFunc?: ()=>Promise<string>;
  cryptor: any;
  constructor(options: Options) {
    this.options = options;
    this.host = options.host || 'https://api.weixin.qq.com/';
    this.isDebug = options.isDebug || false;
    this.accessTokenFunc = options.accessTokenFunc;
    this.cryptor = new WXBizMsgCrypt(this.options.token || 'token', this.options.encodingAesKey || 'ewqdjFqRy84PmppxG4Z2JZsjnNIbe1aBiz6F994fcks', this.options.appId || 'appId')
  }

  /**
   * 获取AccessToken
   */
  async getAccessToken():Promise<{access_token: string, expires_in: number}>{
    assert(this.options.appId, 'Lost Wechater Options appId')
    assert(this.options.appSecret, 'Lost Wechater Options appSecret')
    const result = await axios.default({
      url: urljoin(this.host, 'cgi-bin/token'),
      method: 'get',
      params: {
        grant_type: 'client_credential',
        appid: this.options.appId,
        secret: this.options.appSecret,
      }
    })
    return result.data;
  }

  /**
   * Koa 中间件，服务验证、被动回复消息
   * @param handler 
   */
  accessWxKoa(handler:(reply:Reply,ctx:koa.BaseContext, next:()=>{})=>{}){
    assert(this.options.appId, 'Lost Wechater Options appId')
    assert(this.options.encodingAesKey, 'Lost Wechater Options encodingAesKey')
    assert(this.options.token, 'Lost Wechater Options token')
    return async (ctx: koa.BaseContext, next: () => Promise<any>)=>{
      const { query, method } = ctx;
      const { signature, timestamp, nonce, echostr, encrypt_type, msg_signature } = query;
  
      // 加密模式
      const encrypted = !!(encrypt_type && encrypt_type === 'aes' && msg_signature);
      if (!this.isDebug && !encrypted) {
        if (signature !== getSignature(timestamp, nonce, this.options.token)) {
          throw new Error('Invalid signature')
        }
      }
      if (method === 'GET') {
        return ctx.body = echostr;
      }
      const xml = await getRawBody(ctx.req, {
        length: ctx.req.headers['content-length'],
        limit: '1mb',
        encoding: contentType.parse(ctx.req).parameters.charset || 'utf-8',
      });
      // 保存原始xml
      ctx.wechatXml = xml;
      // 解析xml
      const result = await parseXML(xml);
      let formatted = formatMessage(result.xml);
      if (!this.isDebug && encrypted) {
        if (query.msg_signature !== this.cryptor.getSignature(timestamp, nonce, formatted.Encrypt)) {
          throw new Error('Invalid signature')
        }
        const decryptedXML = this.cryptor.decrypt(formatted.Encrypt);
        if (decryptedXML.message === '') {
          throw new Error('Invalid signature')
        }
        const decodedXML = await parseXML(decryptedXML.message);
        formatted = formatMessage(decodedXML.xml);
      }
      ctx.wechatData = formatted;
      const reply = new Reply(ctx.query, formatted, {
        isDebug: this.isDebug,
        cryptor: this.cryptor,
        koa: ctx,
      });
      handler(reply, ctx, next)
      ctx.type = 'application/xml';
      return next()
    }
  }


  /**
   * Express 中间件，服务验证、被动回复消息
   * @param handler 
   */
  accessWxExpress(handler:(reply: Reply, req:any, res:any, next:()=>{})=>{}) {
    assert(this.options.appId, 'Lost Wechater Options appId')
    assert(this.options.encodingAesKey, 'Lost Wechater Options encodingAesKey')
    assert(this.options.token, 'Lost Wechater Options token')
    return async (req:any, res:any, next:() => Promise<any>)=>{
      const { query, method } = req;
      const { signature, timestamp, nonce, echostr, encrypt_type, msg_signature } = query;
  
      // 加密模式
      const encrypted = !!(encrypt_type && encrypt_type === 'aes' && msg_signature);
      if (!this.isDebug && !encrypted) {
        if (signature !== getSignature(timestamp, nonce, this.options.token)) {
          throw new Error('Invalid signature')
        }
      }
      if (method === 'GET') {
        return res.body = echostr;
      }
      const xml = await getRawBody(req, {
        length: req.headers['content-length'],
        limit: '1mb',
        encoding: contentType.parse(req).parameters.charset || 'utf-8',
      });
      // 保存原始xml
      req.wechatXml = xml;
      // 解析xml
      const result = await parseXML(xml);
      let formatted = formatMessage(result.xml);
      if (!this.isDebug && encrypted) {
        if (query.msg_signature !== this.cryptor.getSignature(timestamp, nonce, formatted.Encrypt)) {
          throw new Error('Invalid signature')
        }
        const decryptedXML = this.cryptor.decrypt(formatted.Encrypt);
        if (decryptedXML.message === '') {
          throw new Error('Invalid signature')
        }
        const decodedXML = await parseXML(decryptedXML.message);
        formatted = formatMessage(decodedXML.xml);
      }
      req.wechatData = formatted;
      const reply = new Reply(req.query, formatted, {
        isDebug: this.isDebug,
        cryptor: this.cryptor,
        express: res,
      });
      res.type('application/xml')
      handler(reply, req, res, next);
      return next()
    }
  }

  /**
   * 解析数据
   * @param sessionKey 
   * @param encryptedData 
   * @param iv 
   */
  decryptData(sessionKey: string, encryptedData:string, iv:string) {
    const sessionKeyBase64 = Buffer.from( sessionKey, 'base64');
    const encryptedBase64 = Buffer.from(encryptedData, 'base64');
    const ivBase64 = Buffer.from(iv, 'base64');
    let decoded;
    try {
      // 解密
      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBase64, ivBase64);
      // 设置自动 padding 为 true，删除填充补位
      decipher.setAutoPadding(true);
      decoded = decipher.update(encryptedBase64, 'binary', 'utf8');
      decoded += decipher.final('utf8');

      decoded = JSON.parse(decoded);

    } catch (err) {
      throw new Error('Illegal Buffer');
    }

    if (decoded.watermark.appid !== this.options.appId) {
      throw new Error('Illegal Buffer');
    }
    return decoded;
  }
  
  /**
   * 登录
   * @param js_code 
   */
  async jscode2session(js_code: string){
    const data = await axios.default(merge({
      url: urljoin(this.host, 'sns/jscode2session'),
      params: {
        appid: this.options.appId,
        secret: this.options.appSecret,
        js_code,
        grant_type: 'authorization_code'
      },
      method: 'get',
    }))
    return data.data;
  }
  /**
   * 基础请求体
   * @param url 
   * @param options 
   */
  async request(url: string, options: axios.AxiosRequestConfig): Promise<any>{
    assert(typeof this.options.accessTokenFunc === 'function', 'Lost Wechater Options accessTokenFunc')
    const access_token = await this.accessTokenFunc?.();
    const data = await axios.default(merge({
      url: urljoin(this.host, url),
      params: {
        access_token,
      },
      method: 'post',
    }, options))
    return data.data;
  }
}
export = Wechater;

interface Options {
  appId?: string;
  appSecret?: string;
  token?: string;
  encodingAesKey?: string;
  host?: string;
  isDebug?: boolean;
  accessTokenFunc?: () => Promise<string>;
}

module.exports