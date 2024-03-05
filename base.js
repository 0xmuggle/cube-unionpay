"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const url_1 = require("url");
const moment_1 = __importDefault(require("moment"));
const axios_1 = __importDefault(require("axios"));
const querystring_1 = __importDefault(require("querystring"));
const iconv_lite_1 = __importDefault(require("iconv-lite"));
class Base {
    constructor() {
        this.shax = (data, algorithm = 'sha1', encoding = 'hex') => {
            const hash = crypto_1.default.createHash(algorithm);
            hash.update(data);
            return hash.digest(encoding);
        };
    }
    genRandom(bit) {
        return bit;
    }
    genTxnTime() {
        return `${moment_1.default().format('YYYYMMDDhhmmss')}`;
    }
    genOrderId() {
        return `${moment_1.default().format('YYYYMMDDhhmmssSSS')}`;
    }
    getEncodingData(data, encoding) {
        if (encoding !== 'UTF-8') {
            return iconv_lite_1.default.encode(data, encoding).toString();
        }
        return data;
    }
    genURLSearchParams(data, percentEncoded = true) {
        const params = new url_1.URLSearchParams(data);
        params.sort();
        if (percentEncoded) {
            return params.toString();
        }
        const arr = [];
        params.forEach((value, name) => arr.push(`${name}=${value}`));
        return arr.join('&');
    }
    parseURLSearchParams(data) {
        const params = new url_1.URLSearchParams(data);
        params.sort();
        const obj = {};
        for (const [name, value] of params.entries()) {
            obj[name] = value;
        }
        return obj;
    }
    encryptData(data, cert, openEncryptData = true, encoding) {
        let encodingData;
        if (openEncryptData) {
            encodingData = crypto_1.default.publicEncrypt({
                key: cert,
                // @ts-ignore
                padding: crypto_1.default.constants.RSA_PKCS1_PADDING
            }, new Buffer(data)).toString('base64');
        }
        else {
            encodingData = data;
        }
        return encodingData; // this.getEncodingData(encodingData, encoding);
    }
    decryptData(data, cert) {
        return crypto_1.default.privateEncrypt(cert, new Buffer(data, 'utf8')).toString('utf8');
    }
    sign(data, cert, algorith = 'sha1WithRSAEncryption', encoding) {
        const sign = crypto_1.default.createSign(algorith);
        sign.update(data);
        const signature = sign.sign(cert).toString('base64');
        console.log(data, signature);
        return signature; // this.getEncodingData(signature, encoding);
    }
    // cert is public key
    validate(data, signature, cert, algorith = 'sha1WithRSAEncryption') {
        const params = this.genURLSearchParams(data);
        const shax = this.shax(params);
        const verify = crypto_1.default.createVerify(algorith);
        verify.update(shax);
        return verify.verify(cert, signature, 'hex');
    }
    post(url, data, contentType = 'json') {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield axios_1.default.post(url, querystring_1.default.stringify(data), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            if (contentType === 'json') {
                return this.parseURLSearchParams(res.data);
            }
            if (contentType === 'string') {
                return res.data;
            }
            if (contentType === 'stream') {
                return res;
            }
        });
    }
    getCustomerInfo(data, cert, openEncryptData = true, encoding) {
        const encryptedInfos = {};
        const customerInfos = {};
        for (let key in data) {
            if (['phoneNo', 'cvn2', 'expired'].includes(key)) {
                // @ts-ignore
                encryptedInfos[key] = data[key];
            }
            if (['certifTp', 'customerNm', 'certifId', 'smsCode', 'pin'].includes(key)) {
                // @ts-ignore
                customerInfos[key] = data[key];
            }
        }
        if (openEncryptData) {
            const encryptedInfo = this.genURLSearchParams(encryptedInfos, false);
            customerInfos['encryptedInfo'] = this.encryptData(encryptedInfo, cert, openEncryptData, encoding);
            const customerInfo = this.genURLSearchParams(customerInfos);
            return new Buffer(`{${customerInfo}}`).toString('base64'); //this.getEncodingData(`{${customerInfo}}`, encoding);
        }
        return new Buffer(JSON.stringify(encryptedInfos)).toString('base64');
    }
}
exports.default = Base;
