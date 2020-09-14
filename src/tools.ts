import * as crypto from 'crypto';
const xml2js = require('xml2js');

const getSignature = (timestamp: number, nonce: string, token: string): string => {
  const shasum = crypto.createHash('sha1');
  const arr = [token, timestamp, nonce].sort();
  shasum.update(arr.join(''));

  return shasum.digest('hex');
}

const parseXML = (xml: string): Promise<{xml?: any}> => {
return new Promise((resolve, reject) => {
  xml2js.parseString(xml, { trim: true }, (err: any, obj: object) => {
    if (err) {
      return reject(err);
    }
    return resolve(obj);
  });
});
}

const formatMessage = (result: any) => {
const message: AnyObject = {};
if (typeof result === 'object') {
  for (const key in result) {
    if (!(result[key] instanceof Array) || result[key].length === 0) {
      continue;
    }
    if (result[key].length === 1) {
      const val = result[key][0];
      if (typeof val === 'object') {
        message[key] = formatMessage(val);
      } else {
        message[key] = (val || '').trim();
      }
    } else {
      message[key] = result[key].map((item:any) => formatMessage(item));
    }
  }
}
return message;
}

interface AnyObject{
[key: string]: any
}

module.exports = {
  getSignature,
  parseXML,
  formatMessage
}