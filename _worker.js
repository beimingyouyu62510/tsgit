import { connect } from 'cloudflare:sockets';

// 订阅配置参数
let 哎呀呀这是我的ID啊 = '511622'; // 订阅路径
let 哎呀呀这是我的VL密钥 = 'aa6afb24-210c-4fdc-979e-58f71a6f779f'; // UUID
let 我的优选 = [
  'laji.jisucf.cloudns.biz',
];
let 我的优选TXT = [
  // 'https://raw.githubusercontent.com/shulng/shulng/refs/heads/main/ip.txt', // 测试地址
  // 'https://raw.githubusercontent.com/cmliu/CFcdnVmess2sub/main/addressesapi.txt', // 测试地址
];
// 并发所有反代IP和NAT64连接优先握手
let 反代IP = [
  'git.jisucf.cloudns.ch', // 美国
];
let 我的NAT64 = [
  // '2602:fc59:11:64::', // 美国 - ZTVI
  // '2602:fc59:20:64::', // 美国 - ZTVI
  // '2602:fc59:b0:64::', // 美国 - ZTVI
  // '2001:67c:2b0:db32::', // 芬兰 - Trex
  // '2001:67c:2960:6464::' // 德国 - level66.services
];
let 我的节点名字 = 'TS-git';
let 通 = 'vl', 用 = 'ess', 猫 = 'cla', 咪 = 'sh', 符号 = '://';

// 主请求处理函数：处理HTTP请求和WebSocket升级
export default {
  async fetch(访问请求, env) {
    const 升级标头 = 访问请求.headers.get('Upgrade');
    const 请求URL = new URL(访问请求.url);
    if (!升级标头 || 升级标头 !== 'websocket') {
      switch (请求URL.pathname) {
        case `/${哎呀呀这是我的ID啊}`:
          return new Response(生成订阅页面(哎呀呀这是我的ID啊, 访问请求.headers.get('Host')), {
            status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8' }
          });
        case `/${哎呀呀这是我的ID啊}/${通}${用}`: {
          const 节点列表 = await 获取合并节点列表();
          return new Response(生成通用配置文件(访问请求.headers.get('Host'), 节点列表), {
            status: 200, headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
        }
        case `/${哎呀呀这是我的ID啊}/${猫}${咪}`: {
          const 节点列表 = await 获取合并节点列表();
          return new Response(生成猫咪配置文件(访问请求.headers.get('Host'), 节点列表), {
            status: 200, headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
        }
        default:
          return new Response('Hello World!', { status: 200 });
      }
    }

    // 处理WebSocket连接请求
    const 加密协议 = 访问请求.headers.get('sec-websocket-protocol');
    const 解密数据 = 使用Base64解码(加密协议);
    if (验证VL密钥(new Uint8Array(解密数据.slice(1, 17))) !== 哎呀呀这是我的VL密钥) {
      return new Response('无效的UUID', { status: 403 });
    }
    const { TCP套接字, 初始数据 } = await 解析VL协议头(解密数据);
    return await 升级WebSocket请求(访问请求, TCP套接字, 初始数据);
  }
};

// 合并静态节点和TXT节点
async function 获取合并节点列表() {
  if (!我的优选TXT || 我的优选TXT.length === 0) return 我的优选;
  const 所有节点 = [...我的优选];
  for (const 链接 of 我的优选TXT) {
    try {
      const 响应 = await fetch(链接);
      const 文本内容 = await 响应.text();
      const 节点列表 = 文本内容.split('\n').map(行 => 行.trim()).filter(行 => 行);
      所有节点.push(...节点列表);
    } catch { }
  }
  return 所有节点;
}

// 将IPv4地址转换为NAT64格式的IPv6地址
function 转换到NAT64的IPv6(IPv4地址, 前缀) {
  const 地址段 = IPv4地址.split('.');
  if (地址段.length !== 4) throw new Error('无效的IPv4地址');
  const 十六进制段 = 地址段.map(段 => Number(段).toString(16).padStart(2, '0'));
  return `[${前缀}${十六进制段[0]}${十六进制段[1]}:${十六进制段[2]}${十六进制段[3]}]`;
}

// 升级HTTP请求到WebSocket连接
async function 升级WebSocket请求(访问请求, TCP套接字, 初始数据) {
  const [客户端, 服务端] = new WebSocketPair();
  服务端.accept();
  建立数据传输管道(服务端, TCP套接字, 初始数据);
  return new Response(null, { status: 101, webSocket: 客户端 });
}

// Base64解码处理
function 使用Base64解码(字符串) {
  字符串 = 字符串.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(字符串), 字符 => 字符.charCodeAt(0)).buffer;
}

// 解析VLESS协议头部信息
async function 解析VL协议头(缓冲区) {
  const 字节数组 = new Uint8Array(缓冲区);
  const 地址类型索引 = 字节数组[17];
  const 端口号 = new DataView(缓冲区).getUint16(18 + 地址类型索引 + 1);
  let 偏移量 = 18 + 地址类型索引 + 4;
  let 目标主机;
  if (字节数组[偏移量 - 1] === 1) {  // IPv4地址
    目标主机 = Array.from(字节数组.slice(偏移量, 偏移量 + 4)).join('.');
    偏移量 += 4;
  } else if (字节数组[偏移量 - 1] === 2) {  // 域名
    const 域名长度 = 字节数组[偏移量];
    目标主机 = new TextDecoder().decode(字节数组.slice(偏移量 + 1, 偏移量 + 1 + 域名长度));
    偏移量 += 域名长度 + 1;
  } else {  // IPv6地址
    const IPv6视图 = new DataView(缓冲区);
    目标主机 = Array(8).fill().map((_, i) =>
      IPv6视图.getUint16(偏移量 + 2 * i).toString(16).padStart(4, '0')
    ).join(':');
    偏移量 += 16;
  }
  const 初始数据 = 缓冲区.slice(偏移量);

  // 尝试直连目标
  try {
    const 直连套接字 = await connect({ hostname: 目标主机, port: 端口号 });
    await 直连套接字.opened;
    return { TCP套接字: 直连套接字, 初始数据 };
  } catch { }

  // 并发尝试所有反代IP和NAT64
  const 连接尝试数组 = [];

  // 添加反代IP尝试
  for (const 代理地址 of 反代IP) {
    const [代理主机, 代理端口] = 代理地址.split(':');
    连接尝试数组.push(
      (async () => {
        try {
          const 反代套接字 = await connect({
            hostname: 代理主机,
            port: Number(代理端口) || 端口号
          });
          await 反代套接字.opened;
          return { TCP套接字: 反代套接字, 初始数据 };
        } catch {
          return null;
        }
      })()
    );
  }

  // 添加NAT64尝试
  for (const nat64前缀 of 我的NAT64) {
    连接尝试数组.push(
      (async () => {
        try {
          let NAT64目标;
          if (/^\d+\.\d+\.\d+\.\d+$/.test(目标主机)) {
            NAT64目标 = 转换到NAT64的IPv6(目标主机, nat64前缀);
          } else if (目标主机.includes(':')) {
            throw new Error('IPv6地址无需转换');
          } else {
            const DNS响应 = await fetch(`https://1.1.1.1/dns-query?name=${目标主机}&type=A`, {
              headers: { 'Accept': 'application/dns-json' }
            });
            const DNS数据 = await DNS响应.json();
            const 解析记录 = DNS数据.Answer?.find(记录 => 记录.type === 1);
            if (!解析记录) throw new Error('无法解析域名的IPv4地址');
            NAT64目标 = 转换到NAT64的IPv6(解析记录.data, nat64前缀);
          }
          const NAT64套接字 = await connect({
            hostname: NAT64目标.replace(/^["'`]+|["'`]+$/g, ''),
            port: 端口号
          });
          await NAT64套接字.opened;
          return { TCP套接字: NAT64套接字, 初始数据 };
        } catch {
          return null;
        }
      })()
    );
  }

  const 结果 = await Promise.any(连接尝试数组.map(p => p.catch(e => null)));
  if (结果) return 结果;
  throw new Error('所有连接方式均失败');
}

// 建立WebSocket与TCP套接字之间的双向数据传输
async function 建立数据传输管道(WebSocket接口, TCP套接字, 初始数据) {
  WebSocket接口.send(new Uint8Array([0, 0]));
  const 写入器 = TCP套接字.writable.getWriter();
  const 读取器 = TCP套接字.readable.getReader();

  // 写入初始数据
  if (初始数据) await 写入器.write(初始数据);

  // WebSocket消息写入TCP
  WebSocket接口.addEventListener('message', async (事件) => {
    try {
      await 写入器.write(事件.data);
    } catch {
      // 错误处理，避免中断
    }
  });

  try {
    // 从TCP读取数据并发送到WebSocket
    while (true) {
      const { value: 数据块, done: 读取完成 } = await 读取器.read();
      if (读取完成) break;
      try {
        await WebSocket接口.send(数据块);
      } catch {
        // 错误处理，避免中断
      }
    }
  } finally {
    // 清理资源
    try { WebSocket接口.close(); } catch {}
    try { 读取器.cancel(); } catch {}
    try { 写入器.releaseLock(); } catch {}
    try { TCP套接字.close(); } catch {}
  }
}

// 验证VLESS协议UUID有效性
function 验证VL密钥(字节数组) {
  return Array.from(字节数组, 字节 => 字节.toString(16).padStart(2, '0')).join('').replace(
    /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5'
  );
}

// 生成订阅页面HTML
function 生成订阅页面(订阅ID, 主机名) {
  return `<p>天书TG订阅中心</p>
订阅链接<br>
----------------<br>
通用：https${符号}${主机名}/${订阅ID}/${通}${用}<br>
猫咪：https${符号}${主机名}/${订阅ID}/${猫}${咪}<br><br>
使用说明<br>
----------------<br>
1. 通用订阅：支持V2RayN、Shadowrocket等客户端<br>
2. 猫咪订阅：专为Clash系列客户端设计
`;
}

// 解析节点配置项
function 解析节点项(节点项, 节点计数, 默认节点名) {
  const [主要部分, TLS标志] = 节点项.split('@');
  let [地址端口, 节点名称 = 默认节点名] = 主要部分.split('#');
  if (节点计数[节点名称] === undefined) 节点计数[节点名称] = 0;
  else 节点名称 = `${节点名称}-${++节点计数[节点名称]}`;
  const 分割数组 = 地址端口.split(':');
  const 端口号 = 分割数组.length > 1 ? Number(分割数组.pop()) : 443;
  const 主机地址 = 分割数组.join(':');
  return { 主机地址, 端口号, 节点名称, TLS标志 };
}

// 生成通用订阅配置
function 生成通用配置文件(主机名, 节点列表) {
  if (节点列表.length === 0) 节点列表.push(`${主机名}:443#备用节点`);
  const 节点计数 = {};
  return 节点列表.map(节点项 => {
    const { 主机地址, 端口号, 节点名称, TLS标志 } = 解析节点项(节点项, 节点计数, 我的节点名字);
    const 安全选项 = TLS标志 === 'notls' ? 'security=none' : 'security=tls';
    return `${通}${用}${符号}${哎呀呀这是我的VL密钥}@${主机地址}:${端口号}?` +
      `encryption=none&${安全选项}&sni=${主机名}&type=ws&host=${主机名}&path=%2F%3Fed%3D2560#${节点名称}`;
  }).join('\n');
}

// 生成Clash订阅配置
function 生成猫咪配置文件(主机名, 节点列表) {
  if (节点列表.length === 0) 节点列表.push(`${主机名}:443#备用节点`);
  const 节点计数 = {};
  const 节点配置数组 = 节点列表.map(节点项 => {
    const { 主机地址, 端口号, 节点名称, TLS标志 } = 解析节点项(节点项, 节点计数, 我的节点名字);
    let 格式化地址 = 主机地址.replace(/^\[|\]$/g, '');
    if (格式化地址.includes(':')) 格式化地址 = `"${格式化地址}"`;
    return {
      节点配置: `- name: ${节点名称}
  type: ${通}${用}
  server: ${格式化地址}
  port: ${端口号}
  uuid: ${哎呀呀这是我的VL密钥}
  udp: false
  tls: ${TLS标志 === 'notls' ? 'false' : 'true'}
  sni: ${主机名}
  network: ws
  ws-opts:
    path: "/?ed=2560"
    headers:
      Host: ${主机名}`,
      代理配置: `    - ${节点名称}`
    };
  });
  const 节点配置字符串 = 节点配置数组.map(节点 => 节点.节点配置).join('\n');
  const 代理配置字符串 = 节点配置数组.map(节点 => 节点.代理配置).join('\n');
  return `port: 7890
allow-lan: true
mode: rule
log-level: info
unified-delay: true
global-client-fingerprint: chrome
dns:
  enable: true
  listen: :53
  ipv6: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  nameserver:
    - https://dns.alidns.com/dns-query
    - https://doh.pub/dns-query
  fallback:
    - tls://8.8.8.8
    - tls://1.0.0.1
  fallback-filter:
    geoip: true
    geoip-code: CN
    geosite:
      - gfw
    ipcidr:
      - 240.0.0.0/4
proxies:
${节点配置字符串}
proxy-groups:
- name: 节点选择
  type: select
  proxies:
    - 自动选择
    - DIRECT
${代理配置字符串}
- name: 自动选择
  type: url-test
  url: http://www.gstatic.com/generate_204
  interval: 60
  tolerance: 30
  proxies:
${代理配置字符串}
- name: 漏网之鱼
  type: select
  proxies:
    - 节点选择
    - DIRECT
rules:
- GEOIP,LAN,DIRECT
- GEOIP,CN,DIRECT
- MATCH,漏网之鱼
`;
}
