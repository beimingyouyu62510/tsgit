//本脚本功能主要把连接分发至多个worker，实现负载均衡机制，建议主副worker使用pages部署
//////////////////////////////////////////////////////////////////////////配置区块////////////////////////////////////////////////////////////////////////
let 哎呀呀这是我的ID啊 = "511622"; //实际上这是你的订阅路径，同时也是副WORKER的验证密码【主副worker需一样】支持任意大小写字母和数字，[域名/ID]进入订阅页面
let 哎呀呀这是我的VL密钥 = "aa6afb24-210c-4fdc-979e-58f71a6f779f"; //这是真实的UUID，通用订阅会进行验证，建议修改为自己的规范化UUID

let 隐藏订阅 = false; //选择是否隐藏订阅页面，false不隐藏，true隐藏，当然隐藏后自己也无法订阅，因为配置固定，适合自己订阅后就隐藏，防止被爬订阅，并且可以到下方添加嘲讽语^_^
let 嘲讽语 = "哎呀你找到了我，但是我就是不给你看，气不气，嘿嘿嘿"; //隐藏订阅后，真实的订阅页面就会显示这段话，想写啥写啥

let 启用反代功能 = true; //选择是否启用反代功能，false，true，现在你可以自由的选择是否启用反代功能了
let 反代IP = [
  'git.jisucf.cloudns.ch',
]; //反代IP或域名，支持多反代，会随机挑选一个发往副worker，反代IP端口一般情况下不用填写，如果你非要用非标反代的话，可以填'ts.hpc.tw:443'这样

let 我的节点名字 = 'ts-git'; //自己的节点名字
//////////////////////////////////////////////////////////////////////////转发配置////////////////////////////////////////////////////////////////////////
//以下是副worker的地址，不需要绑自定义域，直接使用dev最快，支持多路并发【建议1-3】，请求数会指数级增长【同账号下的情况】，如果不想并发只想负载均衡的话，并发数量设置1就行
//并发的作用仅限于返回最快握手成功的连接，并不是同时返回数据之类的，副worker部署5-10个以上可以明显改善网络质量，适量部署以防出事哦^_^
const 并发数量 = 2;
const 转发地址 = [
    "one01.chenmo62510.workers.dev",
    "one02.chenmo62510.workers.dev",
    "one03.chenmo62510.workers.dev",
    "one04.chenmo62510.workers.dev",
    "two01.chenmo62511.workers.dev",
    "two02.chenmo62511.workers.dev",
    "two03.chenmo62511.workers.dev",
    "two04.chenmo62511.workers.dev",
    "three01.chenmo62512.workers.dev",
    "three02.chenmo62512.workers.dev",
    "three03.chenmo62512.workers.dev",
    "three04.chenmo62512.workers.dev"
  ];
//////////////////////////////////////////////////////////////////////////网页入口////////////////////////////////////////////////////////////////////////
let 转码 = 'vl', 转码2 = 'ess', 符号 = '://';

export default {
  async fetch(访问请求) {
    const 读取我的请求标头 = 访问请求.headers.get('Upgrade');
    const 订阅地址 = new URL(访问请求.url);
    if (!读取我的请求标头 || 读取我的请求标头 !== 'websocket') {
      switch (订阅地址.pathname) {
        case `/${哎呀呀这是我的ID啊}`: {
          const 订阅页面 = 给我订阅页面(哎呀呀这是我的ID啊, 订阅地址.hostname);
          return new Response(`${订阅页面}`, {
            status: 200,
            headers: { "Content-Type": "text/plain;charset=utf-8" }
          });
        }
        case `/${哎呀呀这是我的ID啊}/${转码}${转码2}`: {
          if (隐藏订阅) {
            return new Response (`${嘲讽语}`, {
              status: 200,
              headers: { "Content-Type": "text/plain;charset=utf-8" }
            });
          } else {
            const 通用配置文件 = 给我通用配置文件(订阅地址.hostname);
            return new Response(`${通用配置文件}`, {
              status: 200,
              headers: { "Content-Type": "text/plain;charset=utf-8" }
            });
          }
        }
        default:
          return new Response('Forbidden', { status: 403 });
      }
    } else if (读取我的请求标头 === 'websocket'){
      return await 负载均衡(访问请求);
    }
  }
};

async function 负载均衡(访问请求) {
  const 读取我的加密访问内容数据头 = 访问请求.headers.get('sec-websocket-protocol');
  const 坻 = 使用64位加解密(读取我的加密访问内容数据头);
  await 验证VL密钥(坻);
  try {
    const 坼 = await 构建新请求(访问请求);
    const 坽 = await Promise.any(
      坼.map(async (坾) => {
        const 坿 = await fetch(坾);
        return 坿.status === 101 ? 坿 : Promise.reject('状态码不是101');
      })
    );
    return 坽;
  } catch {
    return new Response('无可用WORKER, 检查地址', { status: 400 });
  }
}

function 使用64位加解密(还原混淆字符) {
  还原混淆字符 = 还原混淆字符.replace(/-/g, '+').replace(/_/g, '/');
  const 解密数据 = atob(还原混淆字符);
  const 解密_你_个_丁咚_咙_咚呛 = Uint8Array.from(解密数据, (c) => c.charCodeAt(0));
  return 解密_你_个_丁咚_咙_咚呛.buffer;
}

async function 验证VL密钥(垇) {
  if (验证VL的密钥(new Uint8Array(垇.slice(1, 17))) !== 哎呀呀这是我的VL密钥) {
    return new Response('Forbidden', { status: 403 });
  }
}

function 验证VL的密钥(垈, 垉 = 0) {
  const 垊 = (
    转换密钥格式[垈[垉 + 0]] + 转换密钥格式[垈[垉 + 1]] +
    转换密钥格式[垈[垉 + 2]] + 转换密钥格式[垈[垉 + 3]] + "-" +
    转换密钥格式[垈[垉 + 4]] + 转换密钥格式[垈[垉 + 5]] + "-" +
    转换密钥格式[垈[垉 + 6]] + 转换密钥格式[垈[垉 + 7]] + "-" +
    转换密钥格式[垈[垉 + 8]] + 转换密钥格式[垈[垉 + 9]] + "-" +
    转换密钥格式[垈[垉 + 10]] + 转换密钥格式[垈[垉 + 11]] +
    转换密钥格式[垈[垉 + 12]] + 转换密钥格式[垈[垉 + 13]] +
    转换密钥格式[垈[垉 + 14]] + 转换密钥格式[垈[垉 + 15]]
  ).toLowerCase();
  return 垊;
}

const 转换密钥格式 = [];
for (let 垍 = 0; 垍 < 256; ++垍) {
  转换密钥格式.push((垍 + 256).toString(16).slice(1));
}

async function 构建新请求(访问请求) {
  const 读取我的加密访问内容数据头 = 访问请求.headers.get('sec-websocket-protocol');
  const 垎 = new Headers();
  垎.set('sec-websocket-protocol', 读取我的加密访问内容数据头);
  垎.set('proxyip-open', 启用反代功能 ? 'true' : 'false');
  垎.set('safe-key', 哎呀呀这是我的ID啊);
  垎.set('Connection', 'Upgrade');
  垎.set('Upgrade', 'websocket');
  
  const 垏 = [];
  const 垐 = new Set();
  const 垑 = Math.min(并发数量, 转发地址.length);
  
  const 垒 = (垓) => {
    const 垔 = Array.isArray(垓) ? 垓 : [垓];
    return 垔[Math.floor(Math.random() * 垔.length)];
  };
  
  while (垏.length < 垑) {
    const 垕 = 垒(反代IP);
    const 垗 = new Headers(垎);
    垗.set('proxyip', 垕);
    const 垘 = Math.floor(Math.random() * 转发地址.length);
    
    if (!垐.has(垘)) {
      const 垙 = `https://${转发地址[垘]}`;
      const 垚 = new Request(垙, {
        headers: 垗
      });
      垏.push(垚);
      垐.add(垘);
    }
  }
  return 垏;
}

//////////////////////////////////////////////////////////////////////////订阅页面////////////////////////////////////////////////////////////////////////
function 给我订阅页面(哎呀呀这是我的ID啊, hostName) {
  return `
  优先使用clash/v2ray，其他app不能保证正常使用！
通用的：https${符号}${hostName}/${哎呀呀这是我的ID啊}/${转码}${转码2}
`;
}

function 给我通用配置文件(hostName) {
  return `${转码}${转码2}${符号}${哎呀呀这是我的VL密钥}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&type=ws&host=${hostName}&path=%2F%3Fed%3D2560#${encodeURIComponent(我的节点名字)}`;
}
