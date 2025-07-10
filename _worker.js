import { connect } from 'cloudflare:sockets';

// === ⚙️ 你的配置 ===
let 哎呀呀这是我的ID啊 = '511622';  // 订阅ID
let 哎呀呀这是我的VL密钥 = 'aa6afb24-210c-4fdc-979e-58f71a6f779f'; // UUID
let 我的优选 = [
  'laji.jisucf.cloudns.biz',
];
let 我的优选TXT = [];
let 我的NAT64 = '';  // '2001:67c:2960:6464::' // 德国 - level66.services// 主 NAT64 前缀
let 备用NAT64 = ''; // '2001:67c:2b0:db32::', // 芬兰 - Trex// 可选备用 NAT64 前缀
let 反代IP = 'git.jisucf.cloudns.ch';
let 我的节点名字 = 'TS-git';
let 通 = 'vl', 用 = 'ess', 猫 = 'cla', 咪 = 'sh', 符号 = '://';

export default {
  async fetch(访问请求, env) {
    const 升级标头 = 访问请求.headers.get('Upgrade');
    const 请求URL = new URL(访问请求.url);

    if (!升级标头 || 升级标头 !== 'websocket') {
      switch (请求URL.pathname) {
        case `/${哎呀呀这是我的ID啊}`:
          return new Response(生成订阅页面(哎呀呀这是我的ID啊, 访问请求.headers.get('Host')), {
            status: 200,
            headers: { 'Content-Type': 'text/html;charset=utf-8' },
          });
        case `/${哎呀呀这是我的ID啊}/${通}${用}`:
          return new Response(生成通用配置文件(访问请求.headers.get('Host'), await 获取合并节点列表()), {
            status: 200,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          });
        case `/${哎呀呀这是我的ID啊}/${猫}${咪}`:
          return new Response(生成猫咪配置文件(访问请求.headers.get('Host'), await 获取合并节点列表()), {
            status: 200,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          });
        default:
          return new Response('Hello World!', { status: 200 });
      }
    }

    // WebSocket 代理升级
    const 协议头 = 访问请求.headers.get('sec-websocket-protocol');
    const 数据 = 使用Base64解码(协议头);
    if (验证VL密钥(new Uint8Array(数据.slice(1, 17))) !== 哎呀呀这是我的VL密钥) {
      return new Response('无效的UUID', { status: 403 });
    }
    const { TCP套接字, 初始数据 } = await 解析VL协议头(数据);
    return await 升级WebSocket请求(访问请求, TCP套接字, 初始数据);
  },
};

// === 节点处理 ===
async function 获取合并节点列表() {
  if (!我的优选TXT.length) return 我的优选;
  const 所有 = [...我的优选];
  for (const url of 我的优选TXT) {
    try {
      const res = await fetch(url);
      const txt = await res.text();
      所有.push(...txt.split('\n').map(x => x.trim()).filter(Boolean));
    } catch {}
  }
  return 所有;
}

function 转换到NAT64的IPv6(ip) {
  const 段 = ip.split('.').map(x => Number(x).toString(16).padStart(2, '0'));
  return `[${我的NAT64}${段[0]}${段[1]}:${段[2]}${段[3]}]`;
}

async function 获取IPv6代理地址(域名) {
  const res = await fetch(`https://1.1.1.1/dns-query?name=${域名}&type=A`, {
    headers: { Accept: 'application/dns-json' },
  });
  const json = await res.json();
  const ans = json.Answer?.find(x => x.type === 1);
  if (!ans) throw new Error('DNS解析失败');
  return 转换到NAT64的IPv6(ans.data);
}

// === 升级 WebSocket ===
async function 升级WebSocket请求(req, tcp, initial) {
  const [client, server] = new WebSocketPair();
  server.accept();
  建立数据传输管道(server, tcp, initial);
  return new Response(null, { status: 101, webSocket: client });
}

function 使用Base64解码(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(str), c => c.charCodeAt(0)).buffer;
}

// === ⚙️ 核心解析 & 兜底 ===
async function 解析VL协议头(buf) {
  const arr = new Uint8Array(buf);
  const typeIdx = arr[17];
  const port = new DataView(buf).getUint16(18 + typeIdx + 1);
  let offset = 18 + typeIdx + 4;
  let host;
  if (arr[offset - 1] === 1) {
    host = Array.from(arr.slice(offset, offset + 4)).join('.');
    offset += 4;
  } else if (arr[offset - 1] === 2) {
    const len = arr[offset];
    host = new TextDecoder().decode(arr.slice(offset + 1, offset + 1 + len));
    offset += 1 + len;
  } else {
    const dv = new DataView(buf);
    host = Array(8).fill().map((_, i) =>
      dv.getUint16(offset + i * 2).toString(16).padStart(4, '0')).join(':');
    offset += 16;
  }
  const 初始数据 = buf.slice(offset);

  try {
    const s = await connect({ hostname: host, port });
    await s.opened;
    return { TCP套接字: s, 初始数据 };
  } catch {}

  try {
    let nat64h = '';
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) nat64h = 转换到NAT64的IPv6(host);
    else if (host.includes(':')) throw new Error();
    else nat64h = await 获取IPv6代理地址(host);
    const s = await connect({ hostname: nat64h.replace(/^["']|["']$/g, ''), port });
    await s.opened;
    return { TCP套接字: s, 初始数据 };
  } catch {}

  if (备用NAT64) {
    try {
      let alt = '';
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        const 段 = host.split('.').map(x => Number(x).toString(16).padStart(2, '0'));
        alt = `[${备用NAT64}${段[0]}${段[1]}:${段[2]}${段[3]}]`;
      } else {
        alt = `[${备用NAT64}${await 获取IPv6代理地址(host)}]`;
      }
      const s = await connect({ hostname: alt, port });
      await s.opened;
      return { TCP套接字: s, 初始数据 };
    } catch {}
  }

  if (!反代IP) throw new Error('全部出口连接失败');
  const [ip, p] = 反代IP.split(':');
  const s = await connect({ hostname: ip, port: Number(p) || port });
  await s.opened;
  return { TCP套接字: s, 初始数据 };
}

// === WS ⇄ TCP 双向传输 + 心跳 ===
async function 建立数据传输管道(ws, tcp, initial) {
  ws.send(new Uint8Array([0, 0]));
  const w = tcp.writable.getWriter();
  const r = tcp.readable.getReader();
  if (initial) await w.write(initial);

  ws.addEventListener('message', async (e) => {
    try { await w.write(e.data); } catch {}
  });

  const hb = setInterval(async () => {
    try { await w.write(new Uint8Array([])); } catch { clearInterval(hb); }
  }, 40000);

  try {
    while (true) {
      const { value, done } = await r.read();
      if (done) break;
      try { await ws.send(value); } catch {}
    }
  } finally {
    clearInterval(hb);
    try { ws.close(); } catch {}
    try { r.cancel(); } catch {}
    try { w.releaseLock(); } catch {}
    try { tcp.close(); } catch {}
  }
}

// === 验证 UUID ===
function 验证VL密钥(arr) {
  return Array.from(arr, b => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
}

// === 生成订阅页面 ===
function 生成订阅页面(id, host) {
  return `<p>天书TG订阅中心</p>
订阅链接<br>
----------------<br>
通用：https${符号}${host}/${id}/${通}${用}<br>
猫咪：https${符号}${host}/${id}/${猫}${咪}<br><br>
使用说明<br>
----------------<br>
1. 通用：V2RayN、Shadowrocket等<br>
2. 猫咪：Clash 系列客户端
`;
}

// === 通用订阅生成 ===
function 解析节点项(项, 计数, 默认) {
  const [主, flag] = 项.split('@');
  let [addr, name = 默认] = 主.split('#');
  if (计数[name] === undefined) 计数[name] = 0;
  else name = `${name}-${++计数[name]}`;
  const parts = addr.split(':');
  const port = parts.length > 1 ? Number(parts.pop()) : 443;
  const host = parts.join(':');
  return { host, port, name, flag };
}

function 生成通用配置文件(host, 列表) {
  if (!列表.length) 列表.push(`${host}:443#备用`);
  const 计 = {};
  return 列表.map(x => {
    const { host: h, port: p, name, flag } = 解析节点项(x, 计, 我的节点名字);
    const sec = flag === 'notls' ? 'security=none' : 'security=tls';
    return `${通}${用}${符号}${哎呀呀这是我的VL密钥}@${h}:${p}?encryption=none&${sec}&sni=${host}&type=ws&host=${host}&path=%2F%3Fed%3D2560#${name}`;
  }).join('\n');
}

function 生成猫咪配置文件(host, 列表) {
  if (!列表.length) 列表.push(`${host}:443#备用`);
  const 计 = {};
  const arr = 列表.map(x => {
    const { host: h, port: p, name, flag } = 解析节点项(x, 计, 我的节点名字);
    let addr = h.includes(':') ? `"${h}"` : h;
    return {
      节点: `- name: ${name}
  type: ${通}${用}
  server: ${addr}
  port: ${p}
  uuid: ${哎呀呀这是我的VL密钥}
  udp: false
  tls: ${flag === 'notls' ? 'false' : 'true'}
  sni: ${host}
  network: ws
  ws-opts:
    path: "/?ed=2560"
    headers:
      Host: ${host}`,
      名称: `    - ${name}`
    };
  });
  return `port: 7890
allow-lan: true
mode: rule
log-level: info
unified-delay: true
dns:
  enable: true
  listen: :53
  ipv6: true
  enhanced-mode: fake-ip
  nameserver:
    - https://dns.alidns.com/dns-query
proxies:
${arr.map(x => x.节点).join('\n')}
proxy-groups:
- name: 节点选择
  type: select
  proxies:
    - 自动选择
    - DIRECT
${arr.map(x => x.名称).join('\n')}
- name: 自动选择
  type: url-test
  url: http://www.gstatic.com/generate_204
  interval: 60
  tolerance: 30
  proxies:
${arr.map(x => x.名称).join('\n')}
- name: 漏网之鱼
  type: select
  proxies:
    - 节点选择
    - DIRECT
rules:
- GEOIP,LAN,DIRECT
- GEOIP,CN,DIRECT
- MATCH,漏网之鱼`;
}
