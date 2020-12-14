/**
 * 通道基础处理器
 */
class channelHandler{

  close(channelHandlerContext,hadError){
    channelHandlerContext.fireClose(this,hadError);
  }

  data(channelHandlerContext,data){
    channelHandlerContext.fireData(this,data);
  }

  connect(channelHandlerContext,data){
    channelHandlerContext.fireConnect(this,data)
  }

  end(channelHandlerContext){
    channelHandlerContext.fireEnd(this);
  }

  error(channelHandlerContext,err){
    channelHandlerContext.fireError(this,err);
  }

}
module.exports = channelHandler;
