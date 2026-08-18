export interface PayloadItem {
  label: string
  value: string
  description?: string
}

export interface PayloadGroup {
  label: string
  items: PayloadItem[]
}

export const groups: PayloadGroup[] = [
  {
    label: '空值 / 缺省',
    items: [
      { label: '空字符串', value: '', description: '前端校验拦截' },
      { label: '纯空格', value: '   ', description: 'trim 处理' },
      { label: 'null', value: 'null', description: '字符串 "null"' },
      { label: 'undefined', value: 'undefined', description: '字符串 "undefined"' },
    ],
  },
  {
    label: '长度边界',
    items: [
      { label: '单字符', value: 'a', description: 'min 边界' },
      { label: '18字符(max)', value: 'a'.repeat(18), description: 'max 边界' },
      { label: '19字符(max+1)', value: 'a'.repeat(19), description: '超长截断/报错' },
      { label: '1000字符', value: 'a'.repeat(1000), description: '压力测试' },
    ],
  },
  {
    label: 'SQL 注入',
    items: [
      { label: '经典 OR', value: "' OR 1=1--", description: '绕过认证' },
      { label: 'admin 注释', value: "admin'--", description: '跳过密码' },
      { label: 'UNION', value: "' UNION SELECT 1,2,3--", description: '数据泄露' },
      { label: '时间盲注', value: "' AND SLEEP(5)--", description: '响应延迟检测' },
      { label: '堆叠注入', value: "'; DROP TABLE users;--", description: '破坏性测试' },
    ],
  },
  {
    label: 'XSS 跨站',
    items: [
      { label: 'script 标签', value: '<script>alert(1)</script>', description: '反射/存储 XSS' },
      { label: 'img onerror', value: '<img src=x onerror=alert(1)>', description: 'HTML 注入' },
      { label: 'svg onload', value: '<svg onload=alert(1)>', description: 'SVG 注入' },
      { label: '事件注入', value: '" onmouseover="alert(1)', description: '属性注入' },
    ],
  },
  {
    label: '逻辑绕过',
    items: [
      { label: '弱口令 admin/admin', value: 'admin', description: '用户名 admin，密码 admin' },
      { label: '弱口令 123456', value: '123456', description: '常见弱密码' },
      { label: '大小写绕过', value: 'Admin', description: '大小写不敏感？' },
      { label: '前后空格', value: ' admin ', description: 'trim 逻辑' },
    ],
  },
  {
    label: '编码 / Unicode',
    items: [
      { label: 'URL 编码', value: '%27+OR+1%3D1--', description: '编码绕过' },
      { label: '西里尔伪装', value: 'аdmin', description: 'U+0430 视觉欺骗' },
      { label: '全角字符', value: 'ａｄｍｉｎ', description: '全角半角转换' },
      { label: '零宽字符', value: 'user\u200B123', description: '不可见字符' },
    ],
  },
]