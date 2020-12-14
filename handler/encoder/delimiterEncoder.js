const channelEncoderHandler = require('./channelEncoderHandler');

class delimiterEncoder extends channelEncoderHandler {

  /** 分隔符 */
  delimiter;
  /** 记录buffer最大长度 字节数byte */
  maxSize = 0;

  constructor(delimiter,maxSize) {
    super();
    this.delimiter = delimiter;
    this.maxSize = maxSize;
  }

  encode(channelHandlerContext, data) {
    let encodeData = Buffer.concat([data,this.delimiter]);
    channelHandlerContext.fireWrite(this,encodeData);
  }
}

module.exports = delimiterEncoder;
