const channelEncoderHandler = require('./encoder/channelEncoderHandler');

class channelHandlerContext{
  channelInitializer;
  constructor(channelInitializer) {
    this.channelInitializer = channelInitializer;
  }

  fireClose(channelHandler,hadError){
    for (let i = 0; i < this.channelInitializer.channelHandlers.length; i++) {
      let currentChannelHandler = this.channelInitializer.channelHandlers[i];
      if(channelHandler === currentChannelHandler){
        if((i+1) !== this.channelInitializer.channelHandlers.length){
          this.channelInitializer.closeIndex = (i+1);
          this.channelInitializer.channelHandlers[i+1].close(this,hadError);
        }
      }
    }
  }

  fireData(channelHandler,data){
    for (let i = 0; i < this.channelInitializer.channelHandlers.length; i++) {
      let currentChannelHandler = this.channelInitializer.channelHandlers[i];
      if(channelHandler === currentChannelHandler){
        if((i+1) !== this.channelInitializer.channelHandlers.length){
          this.channelInitializer.dataIndex = (i+1);
          this.channelInitializer.channelHandlers[i+1].data(this,data);
        }
      }
    }
  }

  fireConnect(channelHandler,data){
    for (let i = 0; i < this.channelInitializer.channelHandlers.length; i++) {
      let currentChannelHandler = this.channelInitializer.channelHandlers[i];
      if(channelHandler === currentChannelHandler){
        if((i+1) !== this.channelInitializer.channelHandlers.length){
          this.channelInitializer.connectIndex = (i+1);
          this.channelInitializer.channelHandlers[i+1].connect(this,data);
        }
      }
    }
  }

  fireEnd(channelHandler){
    for (let i = 0; i < this.channelInitializer.channelHandlers.length; i++) {
      let currentChannelHandler = this.channelInitializer.channelHandlers[i];
      if(channelHandler === currentChannelHandler){
        if((i+1) !== this.channelInitializer.channelHandlers.length){
          this.channelInitializer.endIndex = (i+1);
          this.channelInitializer.channelHandlers[i+1].end(this);
        }
      }
    }
  }

  fireError(channelHandler,err){
    for (let i = 0; i < this.channelInitializer.channelHandlers.length; i++) {
      let currentChannelHandler = this.channelInitializer.channelHandlers[i];
      if(channelHandler === currentChannelHandler){
        if((i+1) !== this.channelInitializer.channelHandlers.length){
          this.channelInitializer.errorIndex = (i+1);
          this.channelInitializer.channelHandlers[i+1].error(this,err);
        }
      }
    }
  }

  write(channelHandler,data){
    if(this.channelInitializer.encodeHandlers.length === 0){
      this.channelInitializer.socket.write(data);
    }else{
      this.channelInitializer.encodeHandlers[this.channelInitializer.encodeHandlers.length-1].write(this,data);
    }
  }

  fireWrite(channelHandler,data){
    for (let i = this.channelInitializer.encodeHandlers.length - 1; i >= 0; i--) {
      let currentChannelHandler = this.channelInitializer.encodeHandlers[i];
      if(channelHandler === currentChannelHandler){
        if((i-1) >= 0){
          this.channelInitializer.encodeHandlers[i-1].write(this,data);
        }else if((i-1) === -1){
          this.channelInitializer.socket.write(data);
        }
      }
    }
  }
}

module.exports = channelHandlerContext;
