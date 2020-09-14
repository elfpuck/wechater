declare module 'koa' {
  interface BaseContext {
    dataLoader(): any;
    query: {
      signature: string,
      timestamp: number,
      nonce: string,
      echostr: string, 
      encrypt_type: string,
      msg_signature : string,
    };
    method: string;
    body: any;
    req: {
      headers: any
    },
    request: {
      length: number,
      charset: string,
    },
    wechatXml: string,
    wechatData: {},
    type: string,
  }
}