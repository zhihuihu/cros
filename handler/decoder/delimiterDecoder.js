const channelDecoderHandler = require('./channelDecoderHandler');

class delimiterDecoder extends channelDecoderHandler{
  /** 分隔符 */
  delimiter;
  /** 传入的数据 */
  chunks = [];
  /** 记录buffer最大长度 字节数byte */
  maxSize = 0;

  constructor(delimiter,maxSize) {
    super();
    this.delimiter = delimiter;
    this.maxSize = maxSize;
  }

  decode(channelHandlerContext, data) {
    this.chunks.push(...data);
    while (true){
      let buf = Buffer.from(this.chunks);
      let index = buf.indexOf(this.delimiter);
      if(index <= -1){
        if(this.chunks.length >= this.maxSize){
          console.debug("---> discard message")
          this.chunks = [];
        }
        break;
      }else if(index > this.maxSize){
        console.debug("---> discard message")
        this.chunks.splice(0,index + this.delimiter.length);
        continue;
      }
      /** 完整的数据包消息 */
      let completeData = buf.slice(0,index);
      let removeLength = index + this.delimiter.length;
      this.chunks.splice(0,removeLength);
      channelHandlerContext.fireData(this,completeData);
    }
  }
}
module.exports = delimiterDecoder;
