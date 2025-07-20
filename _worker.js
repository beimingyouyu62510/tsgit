import { connect } from 'cloudflare:sockets';

////////////////////////////////////////////////////////////////////////// 配置区块 ////////////////////////////////////////////////////////////////////////

let 哎呀呀这是我的ID啊 = "511622";
let 哎呀呀这是我的VL密钥 = "aa6afb24-210c-4fdc-979e-58f71a6f779f";

let 私钥开关 = false;
let 咦这是我的私钥哎 = "";

let 隐藏订阅 = false;
let 嘲讽语 = "哎呀你找到了我，但是我就是不给你看，气不气，嘿嘿嘿";

let 我的优选 = ['laji.jisucf.cloudns.biz',];
let 我的优选TXT = [];

let 启用反代功能 = true;
let 反代IP = '129.213.202.222'; // <<<< 你的固定美国 Oracle 出口 IP

let 启用NAT64反代 = false;
let 我的NAT64地址 = '[2602:fc59:b0:9e::]:64';

let 启用SOCKS5反代 = false;
let 启用SOCKS5全局反代 = false;
let 我的SOCKS5账号 = '12349:12349@23.231.215.4:10000';

let 我的节点名字 = 'ts-git';

let 启动控流机制 = false;

let DOH服务器列表 = [
  "https://dns.google/dns-query",
  "https://cloudflare-dns.com/dns-query",
  "https://1.1.1.1/dns-query",
  "https://dns.quad9.net/dns-query",
];

////////////////////////////////////////////////////////////////////////// 网页入口 ////////////////////////////////////////////////////////////////////////
export default {
  async fetch(访问请求, env) {
    const 读取我的请求标头 = 访问请求.headers.get('Upgrade');
    const url = new URL(访问请求.url);

    if (!读取我的请求标头 || 读取我的请求标头 !== 'websocket') {
      if (我的优选TXT) {
        const 链接数组 = Array.isArray(我的优选TXT) ? 我的优选TXT : [我的优选TXT];
        const 所有节点 = [];
        for (const 链接 of 链接数组) {
          try {
            const 响应 = await fetch(链接);
            const 文本 = await 响应.text();
            const 节点 = 文本.split('\n').map(line => line.trim()).filter(line => line);
            所有节点.push(...节点);
          } catch (e) {
            console.warn(`无法获取或解析链接: ${链接}`, e);
          }
        }
        if (所有节点.length > 0) {
          我的优选 = 所有节点;
        }
      }

      switch (url.pathname) {
        case `/${哎呀呀这是我的ID啊}`:
          if (隐藏订阅) {
            return new Response(`${嘲讽语}`, { status: 200 });
          } else {
            const 订阅页面 = 给我订阅页面(哎呀呀这是我的ID啊, 访问请求.headers.get('Host'));
            return new Response(`${订阅页面}`, {
              status: 200,
              headers: { "Content-Type": "text/plain;charset=utf-8" }
            });
          }
        default:
          return new Response('Hello World!', { status: 200 });
      }
    } else if (读取我的请求标头 === 'websocket') {
      const 读取环境变量 = (name, fallback, env) => {
        const raw = import.meta?.env?.[name] ?? env?.[name];
        if (raw === undefined || raw === null || raw === '') return fallback;
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          if (trimmed === 'true') return true;
          if (trimmed === 'false') return false;
          if (trimmed.includes('\n')) {
            return trimmed.split('\n').map(item => item.trim()).filter(Boolean);
          }
          if (!isNaN(trimmed) && trimmed !== '') return Number(trimmed);
          return trimmed;
        }
        return raw;
      };

      反代IP = 读取环境变量('PROXYIP', 反代IP, env);

      if (私钥开关) {
        const 验证我的私钥 = 访问请求.headers.get('my-key');
        if (验证我的私钥 === 咦这是我的私钥哎) {
          return await 升级WS请求(访问请求);
        }
      } else {
        return await 升级WS请求(访问请求);
      }
    }
  }
};

////////////////////////////////////////////////////////////////////////// TCP & WS 主流程 ////////////////////////////////////////////////////////////////////////

async function 升级WS请求(访问请求) {
  const 创建WS接口 = new WebSocketPair();
  const [客户端, WS接口] = Object.values(创建WS接口);

  const 读取WS数据头 = 访问请求.headers.get('sec-websocket-protocol');
  const 转换二进制数据 = 转换WS数据头为二进制数据(读取WS数据头);

  await 解析VL标头(转换二进制数据, WS接口);

  return new Response(null, { status: 101, webSocket: 客户端 });
}

function 转换WS数据头为二进制数据(WS数据头) {
  const base64URL转换为标准base64 = WS数据头.replace(/-/g, '+').replace(/_/g, '/');
  const 解码base64 = atob(base64URL转换为标准base64);
  return Uint8Array.from(解码base64, c => c.charCodeAt(0));
}

async function 解析VL标头(二进制数据, WS接口) {
  let TCP接口;
  try {
    if (!私钥开关 && 验证VL的密钥(二进制数据.slice(1, 17)) !== 哎呀呀这是我的VL密钥) throw new Error('UUID验证失败');

    const 获取数据定位 = 二进制数据[17];
    const 提取端口索引 = 18 + 获取数据定位 + 1;
    const 访问端口 = new DataView(二进制数据.buffer, 提取端口索引, 2).getUint16(0);
    if (访问端口 === 53) throw new Error('拒绝DNS连接');

    const 提取地址索引 = 提取端口索引 + 2;
    const 识别地址类型 = 二进制数据[提取地址索引];
    let 访问地址;

    if (识别地址类型 === 1) {
      访问地址 = 二进制数据.slice(提取地址索引 + 1, 提取地址索引 + 5).join('.');
    } else {
      throw new Error('仅演示 IPv4');
    }

    // 👉 固定走你的美国反代出口
    let [反代IP地址, 反代IP端口] = 解析地址端口(反代IP);
    TCP接口 = connect({ hostname: 反代IP地址, port: 反代IP端口 });

    await TCP接口.opened;

    const 传输数据 = TCP接口.writable.getWriter();
    const 读取数据 = TCP接口.readable.getReader();

    await 传输数据.write(二进制数据.slice(提取地址索引 + 5));

    WS接口.accept();

    const 返回数据 = (await 读取数据.read()).value;
    WS接口.send(返回数据);

    建立传输管道(传输数据, 读取数据, WS接口);

  } catch (e) {
    return new Response(`连接失败: ${e}`, { status: 500 });
  }
}

function 验证VL的密钥(字节数组) {
  const 十六进制表 = Array.from({ length: 256 }, (_, 值) => (值 + 256).toString(16).slice(1));
  const 分段结构 = [4, 2, 2, 2, 6];
  let 当前索引 = 0;
  return 分段结构.map(段长度 =>
    Array.from({ length:  段长度 }, () => 十六进制表[字节数组[当前索引++]]).join('')
  ).join('-').toLowerCase();
}

function 解析地址端口(地址段) {
  let 地址, 端口;
  if (地址段.startsWith('[')) {
    [地址, 端口 = 443] = 地址段.slice(1, -1).split(']:');
  } else {
    [地址, 端口 = 443] = 地址段.split(':');
  }
  return [地址, 端口];
}

async function 建立传输管道(传输数据, 读取数据, WS接口) {
  WS接口.addEventListener('message', event => {
    const WS数据 = new Uint8Array(event.data);
    传输数据.write(WS数据);
  });

  while (true) {
    const { done, value } = await 读取数据.read();
    if (done) break;
    WS接口.send(value);
  }
}

////////////////////////////////////////////////////////////////////////// 订阅页面 ////////////////////////////////////////////////////////////////////////

let 转码 = 'vl', 转码2 = 'ess', 符号 = '://', 小猫 = 'cla', 咪 = 'sh', 我的私钥;
if (私钥开关) {
  我的私钥 = `my-key: ${咦这是我的私钥哎}`;
} else {
  我的私钥 = "";
}

function 给我订阅页面(哎呀呀这是我的ID啊, hostName) {
  return `
通用的：https${符号}${hostName}/${哎呀呀这是我的ID啊}/${转码}${转码2}
猫咪的：https${符号}${hostName}/${哎呀呀这是我的ID啊}/${小猫}${咪}
  `;
}
