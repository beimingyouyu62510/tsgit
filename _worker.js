import { connect } from 'cloudflare:sockets';

let 我的ID = '511622';
let 我的UUID = 'aa6afb24-210c-4fdc-979e-58f71a6f779f';
let 反代IP = 'git.jisucf.cloudns.ch';
let NAT64前缀 = '2602:fc59:11:64::';

export default {
  async fetch(req, env) {
    const 升级 = req.headers.get('Upgrade');
    if (升级 !== 'websocket') {
      return new Response(`Hello from ${我的ID}`, { status: 200 });
    }

    const 协议 = req.headers.get('sec-websocket-protocol');
    const raw = 解码B64(协议);

    if (验证UUID(new Uint8Array(raw.slice(1, 17))) !== 我的UUID) {
      return new Response('UUID无效', { status: 403 });
    }

    try {
      const { TCP, 初包 } = await 解析头(raw);
      return await 建立WS(req, TCP, 初包);
    } catch (err) {
      return new Response(`连接失败: ${err.message}`, { status: 504 });
    }
  },
};

async function 解析头(buf) {
  const u = new Uint8Array(buf);
  const typ = u[17], port = new DataView(buf).getUint16(18 + typ + 1);

  if (port < 1 || port > 65535) throw new Error('端口不合法');

  let i = 18 + typ + 4, host = '';

  if (u[i - 1] === 1) {
    host = Array.from(u.slice(i, i + 4)).join('.');
    i += 4;
  } else if (u[i - 1] === 2) {
    const len = u[i];
    host = new TextDecoder().decode(u.slice(i + 1, i + 1 + len));
    i += 1 + len;
  } else {
    const dv = new DataView(buf);
    host = Array(8).fill().map((_, idx) => dv.getUint16(i + 2 * idx).toString(16)).join(':');
    i += 16;
  }

  const 初包 = buf.slice(i);

  // === 稳妥链路 ===
  let TCP = await 尝试连接(() => 安全连接({ host, port }));
  if (!TCP && 反代IP) TCP = await 尝试连接(() => 安全连接({ host: 反代IP, port }));
  if (!TCP && NAT64前缀) TCP = await 尝试连接(() => NAT64连接(host, port));

  if (!TCP) throw new Error('全部连接失败');

  return { TCP, 初包 };
}

async function 建立WS(req, TCP, 初包) {
  const [client, server] = new WebSocketPair();
  server.accept();
  管道(server, TCP, 初包);
  return new Response(null, { status: 101, webSocket: client });
}

// === 加超时的安全连接 ===
async function 尝试连接(fn) {
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('连接超时')), 3000))
    ]);
  } catch {
    return null;
  }
}

async function 安全连接({ host, port }) {
  const sock = await connect({ hostname: host, port });
  await sock.opened;
  return sock;
}

async function NAT64连接(host, port) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    host = 转NAT64(host);
  } else if (!host.includes(':')) {
    host = await DNS转NAT64(host);
  }
  return await 安全连接({ host, port });
}

function 转NAT64(ipv4) {
  const p = ipv4.split('.').map(x => parseInt(x).toString(16).padStart(2, '0'));
  return `[${NAT64前缀}${p[0]}${p[1]}:${p[2]}${p[3]}]`;
}

async function DNS转NAT64(name) {
  const r = await fetch(`https://1.1.1.1/dns-query?name=${name}&type=A`, {
    headers: { 'accept': 'application/dns-json' },
  }).then(r => r.json());
  const a = r.Answer?.find(x => x.type === 1)?.data;
  if (!a) throw new Error('DNS失败');
  return 转NAT64(a);
}

async function 管道(ws, tcp, 初包) {
  ws.send(new Uint8Array([0, 0]));
  const w = tcp.writable.getWriter();
  const r = tcp.readable.getReader();
  if (初包) await w.write(初包);

  ws.addEventListener('message', async (e) => {
    try { await w.write(e.data); } catch {}
  });

  try {
    while (true) {
      const { value, done } = await r.read();
      if (done) break;
      ws.send(value);
    }
  } finally {
    ws.close();
    try { r.cancel(); } catch {}
    try { w.releaseLock(); } catch {}
    try { tcp.close(); } catch {}
  }
}

function 验证UUID(arr) {
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').replace(
    /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5'
  );
}

function 解码B64(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
}
