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
  超时时间: 5000, // fetch超时（毫秒）
};
const 转码 = "vl", 转码2 = "ess", 符号 = "://";

// 健康检查缓存
const 健康缓存 = new Map();

/* 主函数 */
export default {
  async fetch(访问请求, env, ctx) {
    const 订阅地址 = new URL(访问请求.url);
    const 读取请求标头 = 访问请求.headers.get("Upgrade");
    console.log(`收到请求: ${访问请求.method} ${订阅地址.pathname}`);

    // 手动触发健康检查接口
    if (访问请求.method === "GET" && 订阅地址.pathname === "/health") {
      const 验证 = 访问请求.headers.get("safe-key");
      console.log(`健康检查请求，safe-key: ${验证}`);
      if (验证 !== 配置.安全密钥) {
        console.error("健康检查失败：无效的安全密钥");
        return new Response(JSON.stringify({ error: "无效的安全密钥" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      await 健康检查();
      const 状态 = Object.fromEntries(健康缓存);
      console.log(`健康检查完成: ${JSON.stringify(状态)}`);
      return new Response(JSON.stringify({
        status: "健康检查完成",
        副本状态: 状态,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 测试反代IP连通性
    if (访问请求.method === "GET" && 订阅地址.pathname === "/test-proxy") {
      const 验证 = 访问请求.headers.get("safe-key");
      console.log(`反代IP测试请求，safe-key: ${验证}`);
      if (验证 !== 配置.安全密钥) {
        console.error("反代测试失败：无效的安全密钥");
        return new Response(JSON.stringify({ error: "无效的安全密钥" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      const 结果 = await 测试反代IP();
      console.log(`反代IP测试结果: ${JSON.stringify(结果)}`);
      return new Response(JSON.stringify(结果), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 处理非WebSocket请求（订阅页面）
    if (!读取请求标头 || 读取请求标头 !== "websocket") {
      console.log(`非WebSocket请求: ${订阅地址.pathname}`);
      switch (订阅地址.pathname) {
        case `/${配置.安全密钥}`:
          console.log("返回订阅页面");
          return new Response(给我订阅页面(配置.安全密钥, 订阅地址.hostname), {
            status: 200,
            headers: { "Content-Type": "text/plain;charset=utf-8" },
          });
        case `/${配置.安全密钥}/${转码}${转码2}`:
          console.log("返回VLESS配置文件");
          if (配置.隐藏订阅) {
            console.log("订阅页面隐藏，返回嘲讽语");
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
          console.error(`无效路径: ${订阅地址.pathname}`);
          return new Response(JSON.stringify({ error: "无效的路径" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
      }
    }

    // 触发首次健康检查（仅在缓存为空时）
    if (健康缓存.size === 0) {
      console.log("缓存为空，触发首次健康检查");
      await 健康检查();
    }

    // 处理WebSocket请求
    console.log("处理WebSocket请求");
    return await 负载均衡(访问请求);
  },

  async scheduled(event, env, ctx) {
    console.log("执行定期健康检查");
    await 健康检查();
  },
};

/* 负载均衡逻辑 */
async function 负载均衡(访问请求) {
  const 加密数据头 = 访问请求.headers.get("sec-websocket-protocol");
  console.log(`WebSocket协议头: ${加密数据头}`);
  if (!加密数据头) {
    console.error("缺失WebSocket协议头");
    return new Response(JSON.stringify({ error: "缺失WebSocket协议头" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let 解密数据;
  try {
    解密数据 = 使用64位加解密(加密数据头);
    console.log("Base64解码成功");
    await 验证VL密钥(解密数据);
    console.log("VLESS密钥验证通过");
    // 记录目标地址和端口
    const { 访问地址, 访问端口 } = await 解析VL头部简单(解密数据);
    console.log(`VLESS目标: ${访问地址}:${访问端口}`);
  } catch (e) {
    console.error(`VLESS密钥验证失败: ${e.message}`);
    return new Response(JSON.stringify({ error: "VLESS密钥验证失败", details: e.message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const 请求列表 = await 构建新请求(访问请求);
  console.log(`构建请求列表: ${请求列表.map(r => r.url).join(", ")}`);
  try {
    const 响应 = await Promise.any(
      请求列表.map(async (请求) => {
        const 开始时间 = Date.now();
        console.log(`发送请求到: ${请求.url}`);
        const 响应 = await fetch(请求, { signal: AbortSignal.timeout(配置.超时时间) });
        if (响应.status === 101) {
          const 副本URL = new URL(请求.url).hostname;
          const 延迟 = Date.now() - 开始时间;
          健康缓存.set(副本URL, {
            正常: true,
            延迟,
            时间戳: Date.now(),
          });
          console.log(`副Worker ${副本URL} 响应成功，延迟: ${延迟}ms`);
          return 响应;
        }
        throw new Error(`副本 ${请求.url} 返回状态码 ${响应.status}`);
      })
    );
    return 响应;
  } catch (e) {
    console.error(`负载均衡失败: ${e.message}`);
    return new Response(JSON.stringify({
      error: "无可用副Worker",
      details: e.message,
      availableReplicas: 健康缓存.size,
      副本状态: Object.fromEntries(健康缓存),
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

/* 简单解析VLESS头部（仅用于日志） */
async function 解析VL头部简单(VL数据) {
  const 数据视图 = new Uint8Array(VL数据);
  if (数据视图.length < 18) {
    throw new Error("VLESS头部长度不足");
  }

  const 获取数据定位 = 数据视图[17];
  const 提取端口索引 = 18 + 获取数据定位 + 1;
  if (提取端口索引 + 2 > 数据视图.length) {
    throw new Error("端口数据不完整");
  }

  const 建立端口缓存 = VL数据.slice(提取端口索引, 提取端口索引 + 2);
  const 访问端口 = new DataView(建立端口缓存).getUint16(0);
  const 提取地址索引 = 提取端口索引 + 2;
  if (提取地址索引 >= 数据视图.length) {
    throw new Error("地址类型数据缺失");
  }

  const 地址类型 = 数据视图[提取地址索引];
  let 地址长度 = 0;
  let 地址信息索引 = 提取地址索引 + 1;
  let 访问地址;

  switch (地址类型) {
    case 1: // IPv4
      地址长度 = 4;
      if (地址信息索引 + 地址长度 > 数据视图.length) {
        throw new Error("IPv4地址数据不完整");
      }
      访问地址 = new Uint8Array(VL数据.slice(地址信息索引, 地址信息索引 + 地址长度)).join(".");
      break;
    case 2: // 域名
      地址长度 = 数据视图[地址信息索引];
      地址信息索引 += 1;
      if (地址信息索引 + 地址长度 > 数据视图.length) {
        throw new Error("域名数据不完整");
      }
      访问地址 = new TextDecoder().decode(VL数据.slice(地址信息索引, 地址信息索引 + 地址长度));
      break;
    case 3: // IPv6
      地址长度 = 16;
      if (地址信息索引 + 地址长度 > 数据视图.length) {
        throw new Error("IPv6地址数据不完整");
      }
      const dataView = new DataView(VL数据.slice(地址信息索引, 地址信息索引 + 地址长度));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) ipv6.push(dataView.getUint16(i * 2).toString(16));
      访问地址 = ipv6.join(":");
      break;
    default:
      throw new Error("无效的地址类型");
  }

  return { 访问地址, 访问端口 };
}

/* 健康检查 */
async function 健康检查() {
  console.log("开始健康检查");
  for (const 地址 of 配置.转发地址) {
    const 副本URL = `https://${地址}/ping`;
    console.log(`检查副Worker: ${副本URL}`);
    const 开始时间 = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 配置.超时时间);
      const 响应 = await fetch(副本URL, {
        method: "GET",
        headers: { "safe-key": 配置.安全密钥 },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const 数据 = await 响应.json();
      if (响应.ok && 数据.status === "pong") {
        const 延迟 = Date.now() - 开始时间;
        健康缓存.set(地址, {
          正常: true,
          延迟,
          时间戳: Date.now(),
        });
        console.log(`副Worker ${地址} 正常，延迟: ${延迟}ms，响应: ${JSON.stringify(数据)}`);
      } else {
        throw new Error(`状态码 ${响应.status}，响应: ${JSON.stringify(数据)}`);
      }
    } catch (e) {
      健康缓存.set(地址, {
        正常: false,
        延迟: 9999,
        时间戳: Date.now(),
      });
      console.error(`副Worker ${地址} 不可用: ${e.message}`);
    }
  }
}

/* 测试反代IP连通性 */
async function 测试反代IP() {
  const 结果 = {};
  for (const ip of 配置.反代IP) {
    console.log(`测试反代IP: ${ip}`);
    try {
      const [主机, 端口 = "443"] = ip.split(":");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 配置.超时时间);
      await fetch(`https://${主机}:${端口}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      结果[ip] = { 正常: true, 错误: null };
      console.log(`反代IP ${ip} 正常`);
    } catch (e) {
      结果[ip] = { 正常: false, 错误: e.message };
      console.error(`反代IP ${ip} 不可用: ${e.message}`);
    }
  }
  return 结果;
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
      console.error(`无效的反代IP格式: ${反代}`);
      throw new Error(`无效的反代IP格式: ${反代}`);
    }
    标头.set("proxyip", 反代);
    console.log(`使用反代IP: ${反代}`);
  }

  const 请求列表 = [];
  const 已选副本 = new Set();
  const 并发数 = Math.min(配置.并发数量, 配置.转发地址.length);

  // 优先选择健康副本，若无健康副本，使用所有副本
  const now = Date.now();
  const 健康副本 = 配置.转发地址
    .filter((地址) => {
      const 状态 = 健康缓存.get(地址);
      return 状态?.正常 && now - 状态.时间戳 < 配置.缓存有效期;
    })
    .sort((a, b) => (健康缓存.get(a)?.延迟 || 9999) - (健康缓存.get(b)?.延迟 || 9999));

  const 候选副本 = 健康副本.length > 0 ? 健康副本 : 配置.转发地址;
  console.log(`候选副本: ${候选副本.join(", ")}`);

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
  console.log(`生成订阅页面: ${主机名}/${安全密钥}`);
  return `
优先使用Clash/V2Ray，其他客户端可能不完全兼容！
通用订阅链接：https${符号}${主机名}/${安全密钥}/${转码}${转码2}
说明：请确保客户端支持VLESS协议，TLS启用，WebSocket路径为/?ed=2560
`;
}

/* 通用配置文件 */
function 给我通用配置文件(主机名) {
  console.log(`生成VLESS配置文件: ${主机名}`);
  return `${转码}${转码2}${符号}${配置.VL密钥}@${主机名}:443?encryption=none&security=tls&sni=${主机名}&type=ws&host=${主机名}&path=%2F%3Fed%3D2560#${encodeURIComponent(配置.节点名字)}`;
}
