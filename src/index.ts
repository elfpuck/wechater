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
   * 基础请求体
   * @param url 
   * @param options 
   */
  private async request(url: string, options: axios.AxiosRequestConfig): Promise<any>{
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
  
  /*********公众号SDK***********/
  /**
   * 自定义菜单-创建接口
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Creating_Custom-Defined_Menu.html}
   */
  async menuCreate(data: any){return this.request('cgi-bin/menu/create', {data})}
  
  /**
   * 自定义菜单-查询接口
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Querying_Custom_Menus.html}
   */
  async menuInfo(){return this.request('cgi-bin/get_current_selfmenu_info', {method:'get'})}

  /**
   * 自定义菜单-删除接口
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Deleting_Custom-Defined_Menu.html}
   */
  async menuDelete(){return this.request('cgi-bin/menu/delete', {method: 'get'})}

  /**
   * 自定义菜单-创建个性化菜单
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Personalized_menu_interface.html#0}
   */
  async menuAddConditional(data: any){return this.request('cgi-bin/menu/addconditional', {data})}

  /**
   * 自定义菜单-删除个性化菜单
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Personalized_menu_interface.html#1}
   */
  async menuDelConditional(data: any){return this.request('cgi-bin/menu/delconditional', {data})}

  /**
   * 自定义菜单-测试个性化菜单匹配结果
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Personalized_menu_interface.html#2}
   */
  async menuTryMatch(data: any){return this.request('cgi-bin/menu/trymatch', {data})}

  /**
   * 自定义菜单-获取自定义菜单配置
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Getting_Custom_Menu_Configurations.html}
   */
  async menuGet(data: any){return this.request('cgi-bin/menu/get', {data})}


  /**
   * 消息管理-设置所属行业
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html#0}
   */
  async industrySet(data: any){return this.request('cgi-bin/template/api_set_industry', {data})}

  /**
   * 消息管理-获取设置的行业信息
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html#1}
   */
  async industryGet(){return this.request('cgi-bin/template/get_industry', {method: 'get'})}

  /**
   * 消息管理-获得模板ID
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html#2}
   */
  async templateId(data: any){return this.request('cgi-bin/template/api_add_template', {method: 'post',data})}

    /**
   * 消息管理-获得模板列表
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html#3}
   */
  async templateInfo(){return this.request('cgi-bin/template/get_all_private_template', {method: 'get'})}
  
  /**
   * 消息管理-删除模板
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html#4}
   */
  async templateDelete(data: any){return this.request('cgi-bin/template/del_private_template', {method: 'post',data})}

  /**
   * 消息管理-发送模版消息
   * @param data
   * @remarks {@link https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html#5}
   */
  async templateSend(data: any){return this.request('cgi-bin/message/template/send', {data})}

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