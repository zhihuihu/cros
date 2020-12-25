/** 指定分隔符解码器 */
class delimiterDecoder{
  /** 分隔符 */
  delimiter;
  /** 完整数据包处理 */
  completeDataExecute;
  /** 传入的数据 buffer */
  chunks = [];
  /** 记录buffer最大长度 字节数byte */
  maxSize = 0;
  constructor(delimiter,maxSize,completeDataExecute) {
    this.delimiter = delimiter;
    this.maxSize = maxSize;
    this.completeDataExecute = completeDataExecute;
  }

  /**
   * 接收到数据
   * @param data
   */
  read(data){
    if(this.chunks.length === 0){
      this.chunks = data;
    }else{
      this.chunks = Buffer.concat([this.chunks,data]);
    }

    while (true){
      let index = this.chunks.indexOf(this.delimiter);
      if(index <= -1){
        if(this.chunks.length >= this.maxSize){
          console.debug("---> discard message")
          this.chunks = [];
        }
        break;
      }else if(index > this.maxSize){
        console.debug("---> discard message")
        this.chunks = this.chunks.slice(index + this.delimiter.length);
        continue;
      }
      let completeData = this.chunks.slice(0,index);
      let removeLength = index + this.delimiter.length;
      this.chunks = this.chunks.slice(removeLength);
      this.completeDataExecute(completeData);
    }
  }
}
module.exports = delimiterDecoder;
