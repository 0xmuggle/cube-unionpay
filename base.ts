import {
  Version,
  BizType,
  SignMethod,
  AccessType,
  ChannelType,
  AccType,
  TxnType,
  TxnSubType,
  Encoding,
  Key
} from './params';

import crypto from 'crypto';
import { URLSearchParams } from 'url';
import moment from 'moment';
import axios from 'axios';
import querystring from 'querystring';
import iconv from 'iconv-lite';

interface CustomerInfo {
  phoneNo?: string,
  cvn2?: string,
  expired?: string,
  certifTp?: string,
  customerNm?: string,
  certifId?: string,
  smsCode?: string,
  pin?: string,
}

class Base {

  public genRandom(bit: number) {
    return bit;
  }

  public genTxnTime() {
    return `${moment().format('YYYYMMDDhhmmss')}`;
  }

  public genOrderId() {
    return `${moment().format('YYYYMMDDhhmmssSSS')}`;
  }

  private getEncodingData(data: string, encoding: Encoding): string {
    if(encoding !== 'UTF-8') {
      return iconv.encode(data, encoding).toString();
    }
    return data;
  }
  
  public genURLSearchParams(data: { [key: string]: string }, percentEncoded: boolean = true): string {
    const params = new URLSearchParams(data);
    params.sort();
    if(percentEncoded) {
      return params.toString();
    }
    const arr: Array<string> = [];
    params.forEach((value, name) => arr.push(`${name}=${value}`));
    return arr.join('&');
  }

  public parseURLSearchParams(data: string): object {
    const params = new URLSearchParams(data);
    params.sort();
    const obj: any = {};
    for (const [name, value] of params.entries()) {
      obj[name] = value;
    }
    return obj;
  }

  public encryptData(data: string, cert: string,
    openEncryptData: Boolean=true, encoding: Encoding,): string {
    let encodingData: string;
    if(openEncryptData) {
      encodingData = crypto.publicEncrypt({
        key: cert,
        // @ts-ignore
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, new Buffer(data)).toString('base64');
    } else {
      encodingData = data;
    }
    return encodingData; // this.getEncodingData(encodingData, encoding);
  }

  public decryptData(data: string, cert: string): string {
    return crypto.privateEncrypt(cert, new Buffer(data, 'utf8')).toString('utf8');
  }

  public sign(data: string, cert: string,
    algorith: string = 'sha1WithRSAEncryption', encoding: Encoding): string {
    const sign = crypto.createSign(algorith);
    sign.update(data);
    const signature = sign.sign(cert).toString('base64');
    console.log(data, signature);
    return signature; // this.getEncodingData(signature, encoding);
  }

  // cert is public key
  public validate(data:  { [key: string]: string }, signature: string, cert: string, algorith: string = 'sha1WithRSAEncryption'): boolean {
    const params = this.genURLSearchParams(data);
    const shax = this.shax(params);
    const verify = crypto.createVerify(algorith);
    verify.update(shax);
    return verify.verify(cert, signature, 'hex');
  }

  public shax = (data: string|Buffer, algorithm='sha1', encoding: crypto.HexBase64Latin1Encoding='hex'): string => {
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest(encoding);
  }

  public async post(url: string, data: object|string, contentType: 'json' | 'string' | 'stream' = 'json'): Promise<any> {
    const res = await axios.post(url, querystring.stringify(data), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    if(contentType === 'json') {
      return this.parseURLSearchParams(res.data);
    }
    if(contentType === 'string') {
      return res.data;
    }
    if(contentType === 'stream') {
      return res;
    }
  }

  public getCustomerInfo(data: CustomerInfo, cert: string,
    openEncryptData: boolean=true, encoding: Encoding): string {
    const encryptedInfos: any = {};
    const customerInfos: any = {};
    for(let key in data) {
        if(['phoneNo', 'cvn2', 'expired'].includes(key)) {
            // @ts-ignore
            encryptedInfos[key] = data[key];
        }
        if(['certifTp', 'customerNm', 'certifId', 'smsCode', 'pin'].includes(key)) {
            // @ts-ignore
            customerInfos[key] = data[key];
        }
    }
    if(openEncryptData) {
      const encryptedInfo = this.genURLSearchParams(encryptedInfos, false);
      customerInfos['encryptedInfo'] = this.encryptData(encryptedInfo, cert, openEncryptData, encoding);
  
      const customerInfo = this.genURLSearchParams(customerInfos);
      return new Buffer(`{${customerInfo}}`).toString('base64'); //this.getEncodingData(`{${customerInfo}}`, encoding);
    }
    return new Buffer(JSON.stringify(encryptedInfos)).toString('base64');
  }
}

export default Base;