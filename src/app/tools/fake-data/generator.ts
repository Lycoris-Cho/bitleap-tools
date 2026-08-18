// 简单的伪随机数生成器（mulberry32）—— 相同 seed = 相同序列
function mulberry32(seed: number) {
    let t = seed >>> 0
    return function () {
      t = (t + 0x6D2B79F5) >>> 0
      let r = t
      r = Math.imul(r ^ (r >>> 15), r | 1)
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }
  
  function hashSeed(str: string): number {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }
  
  export interface GeneratorOptions {
    seed: string
    count: number
  }
  
  const FIRST_NAMES = ['伟','芳','娜','敏','静','强','磊','洋','艳','勇','军','杰','娟','涛','明','超','秀英','帅','雪','飞']
  const LAST_NAMES = ['王','李','张','刘','陈','杨','黄','赵','周','吴','徐','孙','马','朱','胡','郭','何','林','高','罗']
  const DOMAINS = ['example.com','test.com','demo.io','bitleap.dev','mail.com','dev.cn']
  const COMPANIES = ['科技有限公司','贸易有限公司','网络科技','电子商务','文化传媒','咨询公司','教育科技','生物科技']
  const STREETS = ['中山路','人民路','解放路','建设路','新华路','和平路','朝阳街','胜利路','青年路','文化路']
  const CITIES = ['北京','上海','广州','深圳','杭州','成都','武汉','南京','西安','重庆']
  const BOOLEANS = [true, false]
  
  function pick<T>(rng: () => number, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)]
  }
  
  function randomString(rng: () => number, len: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let s = ''
    for (let i = 0; i < len; i++) s += chars[Math.floor(rng() * chars.length)]
    return s
  }
  
  export function generateData(opts: GeneratorOptions) {
    const seedNum = hashSeed(opts.seed || 'bitleap')
    const rng = mulberry32(seedNum)
    const results: Record<string, string>[] = []
  
    for (let i = 0; i < opts.count; i++) {
      const row: Record<string, string> = {}
  
      row['姓名'] = pick(rng, LAST_NAMES) + pick(rng, FIRST_NAMES)
      row['邮箱'] = `${randomString(rng, 6)}@${pick(rng, DOMAINS)}`
      row['手机号'] = `1${['3','5','7','8','9'][Math.floor(rng() * 5)]}${String(Math.floor(rng() * 100000000)).padStart(8, '0')}`
      row['用户名'] = randomString(rng, 8)
      row['密码'] = `${randomString(rng, 10)}!A1`
      row['UUID'] = crypto.randomUUID ? crypto.randomUUID() : `${randomString(rng, 8)}-${randomString(rng, 4)}-${randomString(rng, 4)}-${randomString(rng, 4)}-${randomString(rng, 12)}`
      row['地址'] = `${pick(rng, CITIES)}${pick(rng, STREETS)}${Math.floor(rng() * 999) + 1}号`
      row['公司'] = pick(rng, LAST_NAMES) + pick(rng, COMPANIES)
      row['订单号'] = `ORD${Date.now().toString(36).toUpperCase()}${Math.floor(rng() * 9999)}`
      row['日期时间'] = new Date(Date.now() - Math.floor(rng() * 365 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 19).replace('T', ' ')
      row['金额'] = (rng() * 9999 + 0.01).toFixed(2)
      row['布尔值'] = String(pick(rng, BOOLEANS))
  
      results.push(row)
    }
  
    return results
  }
  
  export const FIELD_OPTIONS = [
    { key: '姓名', label: '姓名' },
    { key: '邮箱', label: '邮箱' },
    { key: '手机号', label: '手机号' },
    { key: '用户名', label: '用户名' },
    { key: '密码', label: '密码' },
    { key: 'UUID', label: 'UUID' },
    { key: '地址', label: '地址' },
    { key: '公司', label: '公司' },
    { key: '订单号', label: '订单号' },
    { key: '日期时间', label: '日期时间' },
    { key: '金额', label: '金额' },
    { key: '布尔值', label: '布尔值' },
  ]