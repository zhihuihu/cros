/** 消息头和数据长度一起发送的解码器 */
class lengthFieldDecoder{
  /** 消息头字节长度 */
  headerLength;
  /** 完整数据包处理 */
  completeDataExecute;
  /** 传入的数据 */
  chunks = [];
  /** 记录buffer最大长度 字节数byte */
  maxSize = 0;

  constructor(headerLength,maxSize,completeDataExecute) {
    this.headerLength = headerLength;
    this.maxSize = maxSize;
    this.completeDataExecute = completeDataExecute;
  }

  /**
   * 接收数据
   * @param data
   */
  read(data){
    this.chunks.push(...data);
    while(true){
      if(this.chunks.length < this.headerLength){
        break;
      }
      let headerBytes = this.chunks.slice(0,this.headerLength);
      // 实际传输的消息长度
      let dataLength = this.buildDataLengthFromHeader(headerBytes);
      let totalLength = this.headerLength + dataLength;
      if(this.chunks.length < totalLength){
        break;
      }
      let buf = Buffer.from(this.chunks);
      let completeData = buf.slice(this.headerLength,totalLength);
      this.chunks.splice(0,totalLength);
      this.completeDataExecute(completeData);
    }
  }

  /**
   * header字节数据转为十进制的数
   * @param headerBytes
   * @returns {number}
   */
  buildDataLengthFromHeader(headerBytes){
    let binaryStr = "";
    for(let i = 0 ;i< this.headerLength; i++){
      let cStr = headerBytes[i].toString(2);
      let originalCStr = cStr.length;
      for(let j=0;j<8-originalCStr;j++){
        cStr = "0" + cStr;
      }
      binaryStr = binaryStr + cStr;
    }
    return parseInt(binaryStr,2);
  }
}

module.exports = lengthFieldDecoder;
