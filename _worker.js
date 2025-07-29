/* 配置区块 */
const 配置 = {
  安全密钥: "511622", // 主副Worker共享的订阅路径和验证密码
  VL密钥: "aa6afb24-210c-4fdc-979e-58f71a6f779f", // VLESS UUID
  隐藏订阅: false, // 是否隐藏订阅页面
  嘲讽语: "哎呀你找到了我，但是我就是不给你看，气不气，嘿嘿嘿", // 隐藏订阅时的提示
  启用反代: true, // 是否启用反向代理
  反代IP: [
    "git.jisucf.cloudns.ch",
    // 可添加更多反代IP或域名，格式如 "ts.hpc.tw:443"
  ],
  节点名字: "ts-git", // 节点名称
  并发数量: 2, // 并发请求的副Worker数量
  转发地址: [
    "one01.chenmo62510.workers.dev",
    "one02.chenmo62510.workers.dev",
    "one03.chenmo62510.workers.dev",
    "one04.chenmo62510.workers.dev",
    "two01.chenmo62511.workers.dev",
    "two02.chenmo62511.workers.dev",
    "two03.chenmo62511.workers.dev",
    "two04.chenmo62511.workers.dev",
  ],
  健康检测间隔: 30 * 1000, // 健康检查间隔（毫秒）
  缓存有效期: 5 * 60 * 1000, // 健康缓存有效期（5分钟）
};
const 转码 = "vl", 转码2 = "ess", 符号 = "://";

// 健康检查缓存
const 健康缓存 = new Map();
健康检查();
setInterval(健康检查, 配置.健康检测间隔);

/* 主函数 */
export default {
  async fetch(访问请求) {
    const 订阅地址 = new URL(访问请求.url);
    const 读取请求标头 = 访问请求.headers.get("Upgrade");

    // 处理非WebSocket请求（订阅页面）
    if (!读取请求标头 || 读取请求标头 !== "websocket") {
      switch (订阅地址.pathname) {
        case `/${配置.安全密钥}`:
          return new Response(给我订阅页面(配置.安全密钥, 订阅地址.hostname), {
            status: 200,
            headers: { "Content-Type": "text/plain;charset=utf-8" },
          });
        case `/${配置.安全密钥}/${转码}${转码2}`:
          if (配置.隐藏订阅) {
            return new Response(配置.嘲讽语, {
              status: 200,
              headers: { "Content-Type": "text/plain;charset=utf-8" },
            });
          }
          return new Response(给我通用配置文件(订阅地址.hostname), {
            status: 200,
            headers: { "Content-Type": "text/plain;charset=utf-8" },
          });
        default:
          return new Response(JSON.stringify({ error: "无效的路径" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
      }
    }

    // 处理WebSocket请求
    return await 负载均衡(访问请求);
  },
};

/* 负载均衡逻辑 */
async function 负载均衡(访问请求) {
  const 加密数据头 = 访问请求.headers.get("sec-websocket-protocol");
  if (!加密数据头) {
    return new Response(JSON.stringify({ error: "缺失WebSocket协议头" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let 解密数据;
  try {
    解密数据 = 使用64位加解密(加密数据头);
    await 验证VL密钥(解密数据);
  } catch (e) {
    return new Response(JSON.stringify({ error: "VLESS密钥验证失败", details: e.message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const 请求列表 = await 构建新请求(访问请求);
  try {
    const 响应 = await Promise.any(
      请求列表.map(async (请求) => {
        const 开始时间 = Date.now();
        const 响应 = await fetch(请求);
        if (响应.status === 101) {
          // 更新健康缓存
          const 副本URL = new URL(请求.url).hostname;
          健康缓存.set(副本URL, {
            正常: true,
            延迟: Date.now() - 开始时间,
            时间戳: Date.now(),
          });
          return 响应;
        }
        throw new Error(`副本 ${请求.url} 返回状态码 ${响应.status}`);
      })
    );
    return 响应;
  } catch (e) {
    return new Response(JSON.stringify({
      error: "无可用副Worker",
      details: e.message,
      availableReplicas: 健康缓存.size,
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/* Base64解码 */
function 使用64位加解密(混淆字符) {
  try {
    混淆字符 = 混淆字符.replace(/-/g, "+").replace(/_/g, "/");
    const 解密数据 = atob(混淆字符);
    const 数据字节 = Uint8Array.from(解密数据, (c) => c.charCodeAt(0));
    return 数据字节.buffer;
  } catch (e) {
    throw new Error(`Base64解码失败: ${e.message}`);
  }
}

/* 验证VLESS密钥 */
async function 验证VL密钥(数据) {
  const 密钥字节 = new Uint8Array(数据.slice(1, 17));
  const 验证结果 = 验证VL的密钥(密钥字节);
  if (验证结果 !== 配置.VL密钥.toLowerCase()) {
    throw new Error("VLESS UUID不匹配");
  }
}

/* UUID格式化 */
function 验证VL的密钥(字节, 偏移 = 0) {
  const 格式 = [];
  for (let i = 0; i < 256; ++i) {
    格式.push((i + 256).toString(16).slice(1));
  }
  return (
    格式[字节[偏移 + 0]] +
    格式[字节[偏移 + 1]] +
    格式[字节[偏移 + 2]] +
    格式[字节[偏移 + 3]] +
    "-" +
    格式[字节[偏移 + 4]] +
    格式[字节[偏移 + 5]] +
    "-" +
    格式[字节[偏移 + 6]] +
    格式[字节[偏移 + 7]] +
    "-" +
    格式[字节[偏移 + 8]] +
    格式[字节[偏移 + 9]] +
    "-" +
    格式[字节[偏移 + 10]] +
    格式[字节[偏移 + 11]] +
    格式[字节[偏移 + 12]] +
    格式[字节[偏移 + 13]] +
    格式[字节[偏移 + 14]] +
    格式[字节[偏移 + 15]]
  ).toLowerCase();
}

/* 健康检查 */
async function 健康检查() {
  for (const 地址 of 配置.转发地址) {
    const 副本URL = `https://${地址}/ping`;
    const 开始时间 = Date.now();
    try {
      const 响应 = await fetch(副本URL, {
        method: "GET",
        headers: { "safe-key": 配置.安全密钥 },
      });
      if (响应.ok) {
        const 延迟 = Date.now() - 开始时间;
        健康缓存.set(地址, {
          正常: true,
          延迟,
          时间戳: Date.now(),
        });
      } else {
        throw new Error(`状态码 ${响应.status}`);
      }
    } catch (e) {
      健康缓存.set(地址, {
        正常: false,
        延迟: 9999,
        时间戳: Date.now(),
      });
    }
  }
}

/* 构建转发请求 */
async function 构建新请求(访问请求) {
  const 加密数据头 = 访问请求.headers.get("sec-websocket-protocol");
  const 标头 = new Headers({
    "sec-websocket-protocol": 加密数据头,
    "safe-key": 配置.安全密钥,
    "Connection": "Upgrade",
    "Upgrade": "websocket",
    "proxyip-open": 配置.启用反代 ? "true" : "false",
  });

  if (配置.启用反代) {
    const 反代 = 随机选择(配置.反代IP);
    if (!反代.match(/^[\w.-]+(:[0-9]+)?$/)) {
      throw new Error(`无效的反代IP格式: ${反代}`);
    }
    标头.set("proxyip", 反代);
  }

  const 请求列表 = [];
  const 已选副本 = new Set();
  const 并发数 = Math.min(配置.并发数量, 配置.转发地址.length);

  // 优先选择健康副本
  const now = Date.now();
  const 健康副本 = 配置.转发地址
    .filter((地址) => {
      const 状态 = 健康缓存.get(地址);
      return 状态?.正常 && now - 状态.时间戳 < 配置.缓存有效期;
    })
    .sort((a, b) => (健康缓存.get(a)?.延迟 || 9999) - (健康缓存.get(b)?.延迟 || 9999));

  const 候选副本 = 健康副本.length >= 并发数 ? 健康副本 : 配置.转发地址;

  while (请求列表.length < 并发数) {
    const 索引 = Math.floor(Math.random() * 候选副本.length);
    const 地址 = 候选副本[索引];
    if (!已选副本.has(地址)) {
      已选副本.add(地址);
      const 请求 = new Request(`https://${地址}`, {
        headers: 标头,
        method: 访问请求.method,
        body: 访问请求.body,
      });
      请求列表.push(请求);
    }
  }
  return 请求列表;
}

/* 随机选择 */
function 随机选择(数组) {
  return 数组[Math.floor(Math.random() * 数组.length)];
}

/* 订阅页面 */
function 给我订阅页面(安全密钥, 主机名) {
  return `
优先使用Clash/V2Ray，其他客户端可能不完全兼容！
通用订阅链接：https${符号}${主机名}/${安全密钥}/${转码}${转码2}
说明：请确保客户端支持VLESS协议，TLS启用，WebSocket路径为/?ed=2560
`;
}

/* 通用配置文件 */
function 给我通用配置文件(主机名) {
  return `${转码}${转码2}${符号}${配置.VL密钥}@${主机名}:443?encryption=none&security=tls&sni=${主机名}&type=ws&host=${主机名}&path=%2F%3Fed%3D2560#${encodeURIComponent(配置.节点名字)}`;
}
