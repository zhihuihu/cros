const channelDecoderHandler = require('./decoder/channelDecoderHandler');
const channelEncoderHandler = require('./encoder/channelEncoderHandler');
const channelHandler = require('./channelHandler');
const channelHandlerContext = require('./channelHandlerContext');

/**
 * 通道初始化方法
 * 所有的请求都从这里进行处理
 */
class channelInitializer {
  /** 传入的数据 */
  chunks = [];
  /** 当前socket连接 */
  socket;
  /** socket通道处理器 */
  channelHandlers = [];
  /** 消息解码器 */
  decoderHandlers = [];
  /** 消息编码器 */
  encodeHandlers = [];
  /** 业务处理器 */
  businessHandlers = [];
  /** 上下文 */
  channelHandlerContext;

  /** 接收消息处理的index位置 */
  dataIndex = 0;
  /** 返回消息处理的index位置 */
  closeIndex = 0;
  /** 返回消息处理的index位置 */
  connectIndex = 0;
  /** 返回消息处理的index位置 */
  endIndex = 0;
  /** 返回消息处理的index位置 */
  errorIndex = 0;

  constructor(socket) {
    this.socket = socket;
  }

  /**
   * 初始化
   */
  init(){
    this.channelHandlerContext = new channelHandlerContext(this);
    // 监听close事件  一旦 socket 完全关闭就发出该事件
    this.socket.on('close',(hadError)=>{
      this.close(hadError);
    })

    // 监听connect事件  当一个 socket 连接成功建立的时候触发该事件
    this.socket.on('connect',()=>{
      this.connect();
    })

    // 监听data事件  当接收到数据的时触发该事件
    this.socket.on('data', (data) => {
      this.data(data);
    });

    // 监听end事件  当 socket 的另一端发送一个 FIN 包的时候触发
    this.socket.on('end', () => {
      this.end();
    });

    // 监听error事件  当错误发生时触发
    this.socket.on('error', (err) => {
      this.error(err);
    });
  }
  /**
   * 新增通道处理器
   * @param channelHandler
   */
  addChannelHandler(handler){
    if(handler instanceof channelHandler){

    }
    this.channelHandlers.push(handler);
    if(handler instanceof channelDecoderHandler){
      this.decoderHandlers.push(handler);
    }
    if(handler instanceof channelEncoderHandler){
      this.encodeHandlers.push(handler);
    }
    if(handler instanceof channelHandler){
      this.businessHandlers.push(handler);
    }
  }

  close(hadError){
    this.closeIndex = 0;
    this.channelHandlers[this.closeIndex].close(this.channelHandlerContext,hadError);
  }

  data(data){
    this.dataIndex = 0;
    this.channelHandlers[this.dataIndex].data(this.channelHandlerContext,data);
  }

  connect(data){
    this.connectIndex = 0;
    this.channelHandlers[this.connectIndex].connect(this.channelHandlerContext,data);
  }

  end(){
    this.endIndex = 0;
    this.channelHandlers[this.endIndex].end(this.channelHandlerContext);
  }

  error(err){
    this.errorIndex = 0;
    this.channelHandlers[this.errorIndex].error(this.channelHandlerContext,err);
  }
}

module.exports = channelInitializer;
