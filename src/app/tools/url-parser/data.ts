export interface StatusInfo {
    code: number
    name: string
    category: '信息' | '成功' | '重定向' | '客户端错误' | '服务端错误'
    description: string
    commonCause: string
  }
  
  export const statusCodes: StatusInfo[] = [
    { code: 200, name: 'OK', category: '成功', description: '请求成功', commonCause: '正常返回' },
    { code: 201, name: 'Created', category: '成功', description: '资源创建成功', commonCause: 'POST 创建数据' },
    { code: 204, name: 'No Content', category: '成功', description: '成功但无返回体', commonCause: 'DELETE 成功' },
    { code: 301, name: 'Moved Permanently', category: '重定向', description: '永久重定向', commonCause: '域名迁移' },
    { code: 302, name: 'Found', category: '重定向', description: '临时重定向', commonCause: '登录后跳首页' },
    { code: 304, name: 'Not Modified', category: '重定向', description: '缓存命中', commonCause: '协商缓存' },
    { code: 400, name: 'Bad Request', category: '客户端错误', description: '参数错误', commonCause: 'JSON 格式错/必填缺失' },
    { code: 401, name: 'Unauthorized', category: '客户端错误', description: '未登录', commonCause: 'Token 过期/缺失' },
    { code: 403, name: 'Forbidden', category: '客户端错误', description: '无权限', commonCause: '角色不对/admin 接口' },
    { code: 404, name: 'Not Found', category: '客户端错误', description: '接口不存在', commonCause: '路径拼错/未部署' },
    { code: 405, name: 'Method Not Allowed', category: '客户端错误', description: '方法不允许', commonCause: 'GET 访问了 POST 接口' },
    { code: 408, name: 'Request Timeout', category: '客户端错误', description: '请求超时', commonCause: '网络慢/服务端处理太久' },
    { code: 409, name: 'Conflict', category: '客户端错误', description: '资源冲突', commonCause: '重复创建/版本号不对' },
    { code: 422, name: 'Unprocessable Entity', category: '客户端错误', description: '参数校验失败', commonCause: '业务校验不通过' },
    { code: 429, name: 'Too Many Requests', category: '客户端错误', description: '限流', commonCause: '刷接口/没做防抖' },
    { code: 500, name: 'Internal Server Error', category: '服务端错误', description: '服务器内部错误', commonCause: '代码抛异常/DB 挂了' },
    { code: 502, name: 'Bad Gateway', category: '服务端错误', description: '网关错误', commonCause: '上游服务挂了' },
    { code: 503, name: 'Service Unavailable', category: '服务端错误', description: '服务不可用', commonCause: '熔断/维护中' },
    { code: 504, name: 'Gateway Timeout', category: '服务端错误', description: '网关超时', commonCause: '上游响应太慢' },
  ]
  
  // 常见参数名 → 安全风险提示
  export const suspiciousParams: Record<string, string> = {
    redirect: '开放重定向风险',
    next: '开放重定向风险',
    url: '开放重定向/SSRF 风险',
    callback: 'OAuth 回调劫持风险',
    file: '任意文件读取风险',
    path: '路径遍历风险',
    template: 'SSTI 风险',
    cmd: '命令注入风险',
    exec: '命令注入风险',
    debug: '调试模式泄露风险',
    token: 'Token 泄露风险（不要放 URL 里）',
    password: '密码不应放 URL（会进日志）',
  }