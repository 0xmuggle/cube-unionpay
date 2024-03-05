export type Version = '5.0.0' | '5.1.0';
export type BizType = '000000' | '000201' | '000301' | '000302' | '000401' | '000501' | '000601' | '000801' | '000902' | '001001' | '000202';
export type SignMethod = '01' | '11' | '12';
export type AccessType = '0' | '1' | '2';
export type ChannelType = '05' | '07' | '08';
export type AccType = '01' | '02' | '03' | '04';
export type TxnType = '00' | '01' | '02' | '03' | '04' | '05' | '11' | '12' | '13' | '14' | '21' | '22' | '31' | '32' | '33' | '71' | '73' | '76' | '77' | '78' | '79' | '94' | '95';
export type TxnSubType = '00' | '01' | '02' | '03' | '04' | '05';
export type Encoding = 'UTF-8' | 'GBK' | 'GB2312' | 'GB18030'; 
export type Key = 'version' | 'encoding' | 'signMethod' | 'accessType' | 'encryptCertId' |
  'bizType' | 'channelType' | 'accType' | 'currencyCode' | 'ifValidateCNName' |
  'ifValidateRemoteCert' | 'frontUrl' | 'backUrl' | 'frontTransUrl' | 'signCert' |
  'encryptCert' |'certId';
export enum Algorith {
  '01' = 'sha1WithRSAEncryption'
}