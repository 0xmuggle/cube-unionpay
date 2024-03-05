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
  Key,
  Algorith
} from './params';
import fs from 'fs';
import path, { resolve } from 'path';
import Base from './base';

interface OpenOptions {
  frontUrl?: string;
  accNo?: string;
  phoneNo?: string;
  certifTp?: string;
  customerNm?: string;
  certifId?: string;
  txnTime?: string;
  orderId?: string;
  reqReserved?: string;
}

interface TransOptions {
  accNo: string;
  txnAmt: string;
  phoneNo?: string;
  cvn2?: string;
  expired?: string;
  smsCode?: string;
  numberOfInstallments?: '03' | '06' | '12' | '24' | '36';
  pin?: string;
  certifTp?: string;
  certifId?: string;
  customerNm?: string;
  txnTime?: string;
  orderId?: string;
  reqReserved?: string;
  reserved?: string
}

interface QueryOptions {
  txnTime: string;
  orderId: string;
}

interface UndoOptions {
  accNo: string;
  txnAmt: string;
  origQryId: string;
  txnTime?: string;
  orderId?: string;
  reqReserved?: string;
}

interface UnionPayOptions {
  readonly version?: Version;
  readonly encoding?: Encoding;
  readonly signMethod?: SignMethod;
  readonly accessType?: AccessType;
  readonly bizType?: BizType;
  readonly channelType?: ChannelType;
  readonly accType?: AccType;
  readonly ifValidateCNName?: boolean;
  readonly ifValidateRemoteCert?: boolean;
  readonly frontUrl?: string;
  readonly backUrl: string;
  readonly frontTransUrl?: string;
  readonly encryptCertId?: string;
  readonly signCert: string;
  readonly encryptCert: string;
  readonly merId: string;
  readonly certId: string;
  readonly payTimeout?: number;
  readonly openEncryptData?: Boolean;
}

class UnionPay extends Base {
  public readonly options: any = {
    currencyCode: '156',
    reqReserved: '{}',
    frontTransUrl: 'https://gateway.95516.com/gateway/api/frontTransReq.do',
    backTransUrl: 'https://gateway.95516.com/gateway/api/backTransReq.do',
    singleQueryUrl: 'https://gatewa.95516.com/gateway/api/queryTrans.do',
    batchTransUrl: 'https://gateway.95516.com/gateway/api/batchTrans.do',
    fileTransUrl: 'https://filedownload.95516.com',
    appTransUrl: 'https://gateway.95516.com/gateway/api/appTransReq.do',
    cardTransUrl: 'https://gateway.95516.com/gateway/api/cardTransReq.do'
  };

  constructor(options: UnionPayOptions) {
    super();
    this.options.version = options.version || '5.1.0';
    this.options.encoding = options.encoding || 'UTF-8';
    this.options.signMethod = options.signMethod || '01';
    this.options.accessType = options.accessType || '0';
    this.options.bizType = options.bizType || '000301'; // 默认无跳转互联网银行卡支付标准版
    this.options.channelType = options.channelType || '07';
    this.options.accType = options.accType || '01';
    this.options.encryptCertId = options.encryptCertId || '68759622183'; // test 68759622183 prod 69042905377
    this.options.merId = options.merId || '777290058110097';
    this.options.certId = options.certId || '68759663125';
    this.options.payTimeout = options.payTimeout || 15 * 60 * 1000;
    this.options.openEncryptData = options.openEncryptData || true;
    this.options.ifValidateCNName = options.ifValidateCNName || true;
    this.options.ifValidateRemoteCert = options.ifValidateRemoteCert || true;
    this.options.signCert = fs.readFileSync(
      options.signCert || path.join(__dirname, './asset/acp_test_sign.pem'),
      'utf8'
    );
    this.options.encryptCert = fs.readFileSync(
      options.encryptCert || path.join(__dirname, './asset/acp_test_enc.cer'),
      'utf8'
    );
    this.options.frontUrl = options.frontUrl;
    this.options.backUrl = options.backUrl;
    this.options.openEncryptData = options.openEncryptData;
  }

  private getTxnOptions(ins?: Array<Key>, exc?: Array<Key>) {
    const baseTxnOptions = {
      /* 银联全渠道系统，产品参数 */
      version: this.options.version,
      encoding: this.options.encoding,
      signMethod: this.options.signMethod,
      bizType: this.options.bizType,
      channelType: this.options.channelType,

      /* 商户接入参数 */
      merId: this.options.merId,
      accessType: this.options.accessType,
      accType: this.options.accType,

      currencyCode: this.options.currencyCode,
      certId: this.options.certId,
      encryptCertId: this.options.encryptCertId,
      reqReserved: this.options.reqReserved
    };
    if (exc) {
      exc.forEach((key: Key) => {
        // @ts-ignore
        if (baseTxnOptions[key]) {
          // @ts-ignore
          delete baseTxnOptions[key];
        }
      });
    }
    if (ins) {
      ins.forEach((key: Key) => {
        Object.assign(baseTxnOptions, {
          key: this.options[key]
        });
      });
    }
    return baseTxnOptions;
  }

  // 银联侧开通：前台交易，有前台通知后台通知
  public async openCardFront(options: OpenOptions): Promise<any> {
    const { accNo, txnTime, orderId, frontUrl: customerFrontUrl, reqReserved } = options;
    const {
      encryptCert,
      signCert,
      signMethod,
      encoding,
      openEncryptData,
      frontTransUrl,
      frontUrl,
      backUrl,
    } = this.options;
    const params: any = {};
    /**
     * fronUrl
     * 前台通知地址 （需设置为外网能访问 http https均可），支付成功后的页面 点击“返回商户”的时候将异步通知报文post到该地址
     * 如果想要实现过几秒中自动跳转回商户页面权限，需联系银联业务申请开通自动返回商户权限
     * 注：如果开通失败的“返回商户”按钮也是触发frontUrl地址，点击时是按照get方法返回的，没有通知数据返回商户
     *
     * backUrl
     * 需设置为外网能访问，否则收不到通知
     * http https均可
     * 收单后台通知后需要10秒内返回http200或302状态码
     * 如果银联通知服务器发送通知后10秒内未收到返回状态码或者应答码非http200，那么银联会间隔一段时间再次发送。总共发送5次，每次的间隔时间为0,1,2,4分钟。
     * 后台通知地址如果上送了带有？的参数，例如：http://abc/web?a=b&c=d 在后台通知处理程序验证签名之前需要编写逻辑将这些字段去掉再验签，否则将会验签失败
     */
    Object.assign(params, this.getTxnOptions(), {
      txnType: '79',
      txnSubType: '00',
      frontUrl: customerFrontUrl || frontUrl, // 如果开通失败的“返回商户”按钮也是触发frontUrl地址，点击时是按照get方法返回的，没有通知数据返回商户
      backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved) // <input type="hidden" name="reqReserved" id="reqReserved" value="{'a':'a'}"/> 这就是要转的愿意
    

    /* 选送卡号、手机号、证件类型+证件号、姓名, 也可以都不送,在界面输入这些要素 */
    accNo &&
      (params.accNo = this.encryptData(
        accNo,
        encryptCert,
        openEncryptData,
        encoding
      ));
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(frontTransUrl, params, 'string');
  }

  // 商户侧开通：后台交易，无通知
  public async openCardBack(options: OpenOptions): Promise<any> {
    const { accNo, txnTime, orderId, } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '79',
      txnSubType: '00',
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });

    /* 选送卡号、手机号、证件类型+证件号、姓名, 也可以都不送,在界面输入这些要素 */
    accNo &&
      (params.accNo = this.encryptData(
        accNo,
        encryptCert,
        openEncryptData,
        encoding
      ));
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 全渠道支付开通查询交易,用于查询银行卡是否已开通银联全渠道支付。
  public async openCardQueryBack(options: {
    accNo: string;
    [key: string]: string;
  }): Promise<any> {
    const { accNo, txnTime, orderId } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions([], ['currencyCode', 'accType']), {
      txnType: '78',
      txnSubType: '00',
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });

    params.accNo = this.encryptData(
      accNo,
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 开通短信：后台交易
  async openSMS(options: any) {
    const { accNo, txnTime, orderId } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '77',
      txnSubType: '00',
      orderId: orderId || this.genTxnTime(),
      txnTime: txnTime || this.genTxnTime()
    });

    params.accNo = this.encryptData(
      accNo,
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 消费短信：后台交易，无通知
  async consumeSMSCode(options: TransOptions) {
    const { accNo, txnTime, orderId, txnAmt } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '77',
      txnSubType: '02',
      txnAmt: txnAmt,
      orderId: orderId || this.genTxnTime(),
      txnTime: txnTime || this.genTxnTime()
    });

    params.accNo = this.encryptData(
      accNo,
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 实名认证前台交易
  async realAuthFront(options: TransOptions) {
    const { accNo, txnTime, orderId, txnAmt } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '72',
      txnSubType: '10',
      txnAmt: txnAmt,
      orderId: orderId || this.genTxnTime(),
      txnTime: txnTime || this.genTxnTime()
    });
    params.reserved = '{checkFlag=11100}';

    params.accNo = this.encryptData(
      accNo,
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 实名认证后台交易
  async realAuthBack(options: TransOptions) {
    const { accNo, txnTime, orderId, txnAmt } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '77',
      txnSubType: '01',
      txnAmt: txnAmt,
      orderId: orderId || this.genTxnTime(),
      txnTime: txnTime || this.genTxnTime()
    });

    params.accNo = this.encryptData(
      accNo,
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 消费：后台资金类交易，有同步应答和后台通知应答
  public async consumeBack(options: TransOptions) {
    const { accNo, txnTime, orderId, txnAmt, reqReserved } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl,
      backUrl
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '01',
      txnSubType: '01', //消费01, 分期03

      txnAmt: txnAmt,
      backUrl: backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved)

    params.accNo = this.encryptData(
      accNo, // 测试卡6216261000000000018, 短信码固定填111111
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 消费：后台资金类交易，有同步应答和后台通知应答
  public async openAndConsumeFront(options: TransOptions) {
    console.log('aaa')
    const { accNo, txnTime, orderId, txnAmt, reqReserved } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod='01',
      encoding,
      openEncryptData,
      frontTransUrl,
      backUrl
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '01',
      txnSubType: '01', //消费01, 分期03

      txnAmt: txnAmt,
      backUrl: backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved)

    // 开通并付款卡号必送
    params.accNo = this.encryptData(
      accNo,
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(frontTransUrl, params, 'stream');
  }

  async installBack(options: TransOptions) {
    const { accNo, txnTime, orderId, txnAmt, numberOfInstallments, reqReserved } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl,
      backUrl
    } = this.options;
    const params: any = {};
    // 【测试环境】固定使用测试卡号6221558812340000，测试金额固定在100-1000元之间，分期数固定填06
    Object.assign(params, this.getTxnOptions(), {
      txnType: '01',
      txnSubType: '03', //消费01, 分期03

      txnAmt: txnAmt,
      backUrl: backUrl,
      instalTransInfo: `{numberOfInstallments=${numberOfInstallments}}`,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved)

    params.accNo = this.encryptData(
      accNo,
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 消费撤销：后台资金类交易，有同步应答和后台通知应答
  async consumeUndoBack(options: UndoOptions): Promise<any> {
    const { txnTime, orderId, txnAmt, origQryId, reqReserved } = options;
    const {
      signCert,
      signMethod,
      encoding,
      backTransUrl,
      backUrl
    } = this.options;

    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '31',
      txnSubType: '00',

      txnAmt: txnAmt,
      origQryId: origQryId,
      backUrl: backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved)

    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 交易状态查询交易：只有同步应答
  // 消费同步返回00，如果未收到后台通知建议发起查询交易，可查询N次（不超过6次），每次时间间隔2N秒发起,即间隔1，2，4，8，16，32S查询（查询到03 04 05继续查询，否则终止查询）。【如果最终尚未确定交易是否成功请以对账文件为准】
  // 消费同步返03 04 05响应码及未得到银联响应（读超时）建议发起查询交易，可查询N次（不超过6次），每次时间间隔2N秒发起,即间隔1，2，4，8，16，32S查询（查询到03 04 05继续查询，否则终止查询）。如果最终尚未确定交易是否成功请以对账文件为准
  async tradeQueryBack(options: QueryOptions) {
    const { txnTime, orderId } = options;
    const { signCert, signMethod, encoding, backTransUrl, reqReserved } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '00',
      txnSubType: '00',

      txnTime: txnTime,
      orderId: orderId,
    });
    reqReserved && (params.reqReserved = reqReserved)

    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  //预授权类交易
  //预授权
  async authBack(options: TransOptions): Promise<any> {
    const { accNo, txnTime, orderId, txnAmt, reqReserved } = options;
    const {
      encryptCert,
      signCert,
      encryptCertId,
      signMethod,
      encoding,
      openEncryptData,
      backTransUrl,
      backUrl
    } = this.options;

    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '02',
      txnSubType: '01',
      bizType: '000301',

      txnAmt: txnAmt,
      backUrl: backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved)

    params.accNo = this.encryptData(
      accNo,
      encryptCert,
      openEncryptData,
      encoding
    );
    openEncryptData && (params.encryptCertId = encryptCertId);
    params.customerInfo = this.getCustomerInfo(
      options,
      encryptCert,
      openEncryptData,
      encoding
    );
    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );    
    return await this.post(backTransUrl, params);
  }

  //预授权撤销
  async authUndo(options: UndoOptions) {
    const { txnTime, orderId, txnAmt, origQryId, reqReserved } = options;
    const {
      signCert,
      signMethod,
      encoding,
      backTransUrl,
      backUrl
    } = this.options;

    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '32',
      txnSubType: '00',

      txnAmt: txnAmt,
      origQryId: origQryId,
      backUrl: backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved)

    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  //预授权完成
  async authFinish(options: UndoOptions) {
    const { txnTime, orderId, txnAmt, origQryId, reqReserved } = options;
    const {
      signCert,
      signMethod,
      encoding,
      backTransUrl,
      backUrl
    } = this.options;

    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '03',
      txnSubType: '00',

      txnAmt: txnAmt,
      origQryId: origQryId,
      backUrl: backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved)

    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  //预授权完成撤销
  async authFinishUndo(options: UndoOptions) {
    const { txnTime, orderId, txnAmt, origQryId, reqReserved } = options;
    const {
      signCert,
      signMethod,
      encoding,
      backTransUrl,
      backUrl
    } = this.options;

    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '33',
      txnSubType: '00',

      txnAmt: txnAmt,
      origQryId: origQryId,
      backUrl: backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    reqReserved && (params.reqReserved = reqReserved)

    params.signature = this.sign(
      this.shax(this.genURLSearchParams(params, false)),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 银联加密公钥更新查询(只适用于使用RSA证书加密的方式<即signMethod=01>，其他signMethod=11，12密钥加密用不到此交易)
  async encryptCerUpdateQuery(options: any) {
    const { txnTime, orderId } = options;
    const {
      signCert,
      signMethod,
      encoding,
      backTransUrl,
    } = this.options;
    const params: any = {};
    Object.assign(params, this.getTxnOptions([], ['accType', 'currencyCode', 'certId', 'encryptCertId']), {
      txnType: '95',
      txnSubType: '00',
      certType: '01', // 

      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    // params.bizType = '000000';

    params.signature = this.sign(
      this.genURLSearchParams(params, false),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

  // 退货交易：后台资金类交易，有同步应答和后台通知应答
  async refundBack(options: UndoOptions) {
    const { txnTime, orderId, txnAmt, origQryId } = options;
    const {
      signCert,
      signMethod,
      encoding,
      backTransUrl,
      backUrl
    } = this.options;

    const params: any = {};
    Object.assign(params, this.getTxnOptions(), {
      txnType: '34',
      txnSubType: '00',

      txnAmt: txnAmt,
      origQryId: origQryId,
      backUrl: backUrl,
      txnTime: txnTime || this.genTxnTime(),
      orderId: orderId || this.genOrderId()
    });
    params.signature = this.sign(
      this.genURLSearchParams(params, false),
      signCert,
      Algorith[signMethod],
      encoding
    );
    return await this.post(backTransUrl, params);
  }

}

export default UnionPay;
