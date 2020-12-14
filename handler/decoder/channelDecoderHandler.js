const channelHandler = require('../channelHandler');
/**
 * 基础解码器
 */
class channelDecoderHandler extends channelHandler{



  data(channelHandlerContext, data) {
    this.decode(channelHandlerContext,data);
  }

  /**
   * 解码方法
   * @param data      传入的数据
   */
  decode(channelHandlerContext,data){
    channelHandlerContext.fireData(this,data);
  }

}

module.exports = channelDecoderHandler;
