const channelHandler = require('../channelHandler');
/**
 * 基础编码器
 */
class channelEncoderHandler extends channelHandler{

  write(channelHandlerContext,data){
    this.encode(channelHandlerContext,data);
  }
  /**
   * 编码方法
   * @param data      传入的数
   */
  encode(channelHandlerContext,data){
    channelHandlerContext.fireWrite(this,data);
  }

}

module.exports = channelEncoderHandler;
