/** 消息头和数据长度一起发送的编码器 */
class lengthFieldEncoder{
  /** 消息头字节长度 */
  headerLength;
  /** 记录buffer最大长度 字节数byte */
  maxSize = 0;

  constructor(headerLength,maxSize) {
    this.headerLength = headerLength;
    this.maxSize = maxSize;
  }

  /** 编码 data 必须是byte数组 */
  encode(data){
    if(data.length > this.maxSize){
      throw new Error("数据超过编码最大长度");
    }
    let headerBytes = this.buildDataLengthBytes(data.length);
    let headerBuffer = Buffer.from(headerBytes);
    return Buffer.concat([headerBuffer,data]);
  }

  /**
   * 构建头部的字节数组数据
   * @param dataLength
   * @returns {[]}
   */
  buildDataLengthBytes(dataLength){
    let headerBytes = [];
    let binaryStr = dataLength.toString(2);
    let originalLength = binaryStr.length;
    for(let i = 0;i< this.headerLength*8 - originalLength ;i++){
      binaryStr = "0"+binaryStr;
    }
    for(let i = 0;i< this.headerLength ;i++){
      headerBytes.push(parseInt(binaryStr.substring((i*8),(i*8 + 8)),2));
    }
    return headerBytes;
  }

}

module.exports = lengthFieldEncoder;
