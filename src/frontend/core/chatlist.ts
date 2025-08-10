import * as flattedJSON from 'flatted';
import {
  LOCAL_STORAGE_KEY,
  PATH_CHAT_CODE,
  PATH_CHAT_PRIVATE_CODE,
  PATH_CHATS
} from './config';

// ---------------- 配置 & 动态调整 ----------------
let CFG = {
  MAX_MESSAGES: 300,
  SOFT_CHAT_BYTES: 1.5 * 1024 * 1024,
  HARD_CHAT_BYTES: 2.5 * 1024 * 1024,
  LOW_WATER_RATIO: 0.6,
  GLOBAL_SOFT_RATIO: 0.7,
  GLOBAL_HARD_RATIO: 0.9,
  TARGET_FREE_AFTER_EVICT: 300 * 1024,
  COMPRESS: false,
  INDEX_KEY: `${LOCAL_STORAGE_KEY}:__index__`,
  GLOBAL_QUOTA_BYTES: 5 * 1024 * 1024 // 估算总配额（可覆盖）
};
type PartialConfig = Partial<typeof CFG>;
export function setChatListConfig(partial: PartialConfig) {
  Object.keys(partial).forEach(k => {
    if (k in CFG) {
      // @ts-ignore 受控覆盖
      CFG[k] = partial[k];
    }
  });
  // 自洽：软限制不得高于硬限制
  if (CFG.SOFT_CHAT_BYTES > CFG.HARD_CHAT_BYTES) {
    CFG.SOFT_CHAT_BYTES = Math.max(
      Math.floor(CFG.HARD_CHAT_BYTES * 0.7),
      CFG.HARD_CHAT_BYTES - 256 * 1024
    );
  }
}

export interface ChatListKeyOptions {
  host: string;
  port: number;
  type: 'public' | 'private';
  chatId: string;
}

interface ChatIndexItem {
  key: string;
  updatedAt: number;
  size: number;
  count?: number;
}

type ChatIndex = ChatIndexItem[];

/* Hooks */
export interface SaveChatListResult {
  key: string;
  success: boolean;
  originalBytes: number;
  finalBytes: number;
  originalCount?: number;
  finalCount?: number;
  trimmedByCount: boolean;
  trimmedBySoft: boolean;
  trimmedByHard: boolean;
  evictedChats: number;
  evictedBytes: number;
  quotaExceeded: boolean;
  quotaFinalFailure: boolean;
  proactiveEvict: boolean;
}

interface ChatListHooks {
  onTrim?(info: {
    key: string;
    reason: 'count' | 'soft' | 'hard';
    beforeBytes: number;
    afterBytes: number;
    beforeCount?: number;
    afterCount?: number;
    softLimit: number;
    hardLimit: number;
  }): void;
  onEvict?(info: {
    proactive: boolean;
    requestedFreeBytes: number;
    freedBytes: number;
    freedChats: number;
    freedKeys: string[];
  }): void;
  onQuotaExceeded?(info: {
    key: string;
    attempt: 1 | 2;
    error: any;
    finalFailure: boolean;
  }): void;
  onSave?(info: SaveChatListResult): void;
}

let hooks: Partial<ChatListHooks> = {};

let lastSaveResult: SaveChatListResult | null = null;
let _legacyImagePurgeDone = false; // 迁移标记：删除旧 base64 image localStorage 键（img:前缀）

// ---------------- 内部缓存 ----------------
let _indexCache: ChatIndex | null = null;
let _indexDirty = false;
let _pendingIndexFlush = false;
const _lastWrittenMap = new Map<string, string>(); // 内容去重
const _savingKeys = new Set<string>(); // 防止并发重入

function scheduleIndexFlush() {
  if (_pendingIndexFlush) {
    return;
  }
  _pendingIndexFlush = true;
  Promise.resolve().then(() => {
    _pendingIndexFlush = false;
    if (_indexDirty && _indexCache) {
      try {
        localStorage.setItem(CFG.INDEX_KEY, JSON.stringify(_indexCache));
      } catch (e) {
        console.warn('[chatlist] 保存索引失败，可能存储已满', e);
      }
      _indexDirty = false;
    }
  });
}

const getChatListKeyFromOptions = (opts: ChatListKeyOptions) => {
  return `${LOCAL_STORAGE_KEY}:${opts.host}:${opts.port}:${opts.type}:${opts.chatId}`;
};

function loadIndex(): ChatIndex {
  if (_indexCache) {
    return _indexCache;
  }
  const raw = localStorage.getItem(CFG.INDEX_KEY);
  if (!raw) {
    _indexCache = [];
  } else {
    try {
      _indexCache = JSON.parse(raw);
    } catch {
      _indexCache = [];
    }
  }
  return _indexCache!;
}
function upsertIndex(item: ChatIndexItem) {
  const list = loadIndex();
  const idx = list.findIndex(x => x.key === item.key);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.push(item);
  }
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  _indexDirty = true;
  scheduleIndexFlush();
}
function removeIndex(key: string) {
  const list = loadIndex();
  const next = list.filter(i => i.key !== key);
  if (next.length !== list.length) {
    _indexCache = next;
    _indexDirty = true;
    scheduleIndexFlush();
  }
}

function stringSizeBytes(str: string): number {
  return str.length * 2; // UTF-16 估算
}
function roughUsageBytes(): number {
  const idx = loadIndex();
  if (idx.length) {
    let others = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k === CFG.INDEX_KEY) {
        continue;
      }
      if (!idx.find(it => it.key === k)) {
        const v = localStorage.getItem(k) || '';
        others += (k.length + v.length) * 2;
      }
    }
    const chats = idx.reduce((sum, c) => sum + c.size, 0);
    return chats + others;
  }
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    const v = localStorage.getItem(k) || '';
    total += (k.length + v.length) * 2;
  }
  return total;
}

function serialize(data: any): string {
  const raw = flattedJSON.stringify(data);
  if (!CFG.COMPRESS) {
    return raw; // 预留压缩点
  }
  return raw;
}

function deserialize(str: string | null) {
  if (!str) {
    return null;
  }
  if (CFG.COMPRESS && str.startsWith('C:')) {
    const body = str.slice(2);
    return flattedJSON.parse(body);
  }
  try {
    return flattedJSON.parse(str);
  } catch (e) {
    console.error('[chatlist] 解析失败', e);
    return null;
  }
}

function trimByCount(data: any): { data: any; trimmed: boolean } {
  if (!Array.isArray(data)) {
    return { data, trimmed: false };
  }
  if (data.length <= CFG.MAX_MESSAGES) {
    return { data, trimmed: false };
  }
  return { data: data.slice(-CFG.MAX_MESSAGES), trimmed: true };
}

function trimBySize(
  data: any,
  targetBytes: number
): { data: any; trimmed: boolean } {
  if (!Array.isArray(data)) {
    return { data, trimmed: false };
  }
  let arr = data;
  let serialized = serialize(arr);
  let size = stringSizeBytes(serialized);
  if (size <= targetBytes) {
    return { data: arr, trimmed: false };
  }
  // 初步依据比例估算保留数量（优先保留最新）
  const ratio = size / targetBytes;
  const keep = Math.max(
    Math.floor(arr.length / ratio) - 1,
    Math.min(50, arr.length - 1)
  );
  arr = arr.slice(-keep);
  serialized = serialize(arr);
  size = stringSizeBytes(serialized);
  // 二分递进裁剪
  let iterations = 0;
  while (size > targetBytes && arr.length > 20 && iterations < 8) {
    const drop = Math.ceil(arr.length / 3); // 丢弃更旧的三分之一
    arr = arr.slice(drop);
    serialized = serialize(arr);
    size = stringSizeBytes(serialized);
    iterations++;
  }
  // 微调线性裁剪
  while (size > targetBytes && arr.length > 20) {
    arr = arr.slice(10);
    serialized = serialize(arr);
    size = stringSizeBytes(serialized);
  }
  return { data: arr, trimmed: true };
}

function shouldProactiveEvict(incomingBytes: number): boolean {
  const quota = CFG.GLOBAL_QUOTA_BYTES;
  const usage = roughUsageBytes();
  const future = usage + incomingBytes;
  const ratio = future / quota;
  return ratio >= CFG.GLOBAL_HARD_RATIO || ratio >= CFG.GLOBAL_SOFT_RATIO;
}

function evictChats(requiredFreeBytes: number, proactive: boolean) {
  const idx = loadIndex();
  if (!idx.length) {
    return { freedBytes: 0, freedChats: 0, freedKeys: [] as string[] };
  }
  const sorted = idx.slice().sort((a, b) => a.updatedAt - b.updatedAt);
  let freed = 0;
  const removed: string[] = [];
  for (const item of sorted) {
    if (freed >= requiredFreeBytes) {
      break;
    }
    localStorage.removeItem(item.key);
    freed += item.size;
    removed.push(item.key);
    removeIndex(item.key);
  }
  if (freed > 0) {
    hooks.onEvict?.({
      proactive,
      requestedFreeBytes: requiredFreeBytes,
      freedBytes: freed,
      freedChats: removed.length,
      freedKeys: removed
    });
    console.warn(`[chatlist] 已清理旧聊天约 ${freed} bytes`);
  }
  return { freedBytes: freed, freedChats: removed.length, freedKeys: removed };
}

export function getChatList(opts: ChatListKeyOptions): any {
  if ((window as any).vscode) {
    (window as any).vscode.postMessage({
      type: 'fs.readFile',
      payload: {
        type: opts.type === 'public' ? PATH_CHAT_CODE : PATH_CHAT_PRIVATE_CODE,
        path: `${PATH_CHATS}/${opts.type}/${opts.chatId}.json`
      }
    });
    return;
  }
  const key = getChatListKeyFromOptions(opts);
  return deserialize(localStorage.getItem(key));
}

/**
 * 保存聊天列表（统一裁剪逻辑，无论是否在 VS Code webview 环境）
 * 返回裁剪后的最终数组（或原数据）供调用方同步 Redux/UI
 */
export function saveChatList(
  opts: ChatListKeyOptions,
  data: any
): { data: any; changed: boolean; meta: SaveChatListResult | null } {
  // 一次性清理旧版本残留的 base64 图片键，释放空间（Blob 方案下不再需要）
  if (!_legacyImagePurgeDone) {
    try {
      const toDel: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith('img:')) {
          toDel.push(k);
        }
      }
      if (toDel.length) {
        toDel.forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch {
            /* ignore */
          }
        });
        console.info('[chatlist] purged legacy image keys', toDel.length);
      }
    } catch {}
    _legacyImagePurgeDone = true;
  }
  const originalRef = data;
  const key = getChatListKeyFromOptions(opts);
  const originalCount = Array.isArray(data) ? data.length : undefined;
  const originalStr = serialize(data);
  const originalBytes = stringSizeBytes(originalStr);

  let currentData = data;
  let trimmedByCount = false;
  let trimmedBySoft = false;
  let trimmedByHard = false;
  let evictedChats = 0;
  let evictedBytes = 0;
  let proactiveEvict = false;
  let quotaExceeded = false;
  let quotaFinalFailure = false;

  // 1. 条数裁剪
  if (Array.isArray(currentData)) {
    const { data: d1, trimmed } = trimByCount(currentData);
    if (trimmed) {
      hooks.onTrim?.({
        key,
        reason: 'count',
        beforeBytes: originalBytes,
        afterBytes: stringSizeBytes(serialize(d1)),
        beforeCount: originalCount,
        afterCount: d1.length,
        softLimit: CFG.SOFT_CHAT_BYTES,
        hardLimit: CFG.HARD_CHAT_BYTES
      });
      trimmedByCount = true;
    }
    currentData = d1;
  }

  // 2. 软限制裁剪
  let str = serialize(currentData);
  let bytes = stringSizeBytes(str);
  if (bytes > CFG.SOFT_CHAT_BYTES) {
    // 如果超出软限制不多(< 2x) 且主要是 ImageRef（没有内联大图），则放宽一次：跳过本轮裁剪
    try {
      if (Array.isArray(currentData) && bytes < CFG.SOFT_CHAT_BYTES * 2) {
        let imageRefItems = 0;
        let totalItems = 0;
        for (const msg of currentData) {
          if (msg && typeof msg === 'object' && Array.isArray(msg.data)) {
            for (const part of msg.data) {
              if (part && typeof part === 'object') {
                totalItems++;
                const t = (part.type || '').toString();
                if (t === 'ImageRef') {
                  imageRefItems++;
                }
                if (imageRefItems >= 20 && totalItems >= 40) {
                  break;
                } // 采样提前终止
              }
            }
          }
        }
        if (
          imageRefItems > 0 &&
          imageRefItems / Math.max(1, totalItems) > 0.3
        ) {
          // 认为图片已转引用，本次放过
          bytes = CFG.SOFT_CHAT_BYTES; // 人为压回阈值以避免进入裁剪分支
        }
      }
    } catch {}
  }
  if (bytes > CFG.SOFT_CHAT_BYTES) {
    const beforeBytes = bytes;
    const beforeCount = Array.isArray(currentData)
      ? currentData.length
      : undefined;
    const lowTarget = Math.floor(
      (CFG.SOFT_CHAT_BYTES || 1.5 * 1024 * 1024) * (CFG.LOW_WATER_RATIO || 0.6)
    );
    const { data: d2, trimmed } = trimBySize(currentData, lowTarget);
    if (trimmed) {
      currentData = d2;
      str = serialize(currentData);
      bytes = stringSizeBytes(str);
      trimmedBySoft = true;
      hooks.onTrim?.({
        key,
        reason: 'soft',
        beforeBytes,
        afterBytes: bytes,
        beforeCount,
        afterCount: Array.isArray(currentData) ? currentData.length : undefined,
        softLimit: CFG.SOFT_CHAT_BYTES,
        hardLimit: CFG.HARD_CHAT_BYTES
      });
    }
  }

  // 3. 硬限制裁剪
  if (bytes > CFG.HARD_CHAT_BYTES) {
    const beforeBytes = bytes;
    const beforeCount = Array.isArray(currentData)
      ? currentData.length
      : undefined;
    const { data: d3, trimmed } = trimBySize(currentData, CFG.HARD_CHAT_BYTES);
    if (trimmed) {
      currentData = d3;
      str = serialize(currentData);
      bytes = stringSizeBytes(str);
      trimmedByHard = true;
      hooks.onTrim?.({
        key,
        reason: 'hard',
        beforeBytes,
        afterBytes: bytes,
        beforeCount,
        afterCount: Array.isArray(currentData) ? currentData.length : undefined,
        softLimit: CFG.SOFT_CHAT_BYTES,
        hardLimit: CFG.HARD_CHAT_BYTES
      });
    }
  }

  // 4. 预判全局回收
  if (shouldProactiveEvict(bytes)) {
    proactiveEvict = true;
    const need = bytes + CFG.TARGET_FREE_AFTER_EVICT;
    const evictRes = evictChats(need, true);
    evictedBytes += evictRes.freedBytes;
    evictedChats += evictRes.freedChats;
  }

  function attemptWrite(attempt: 1 | 2) {
    try {
      if (_lastWrittenMap.get(key) === str) {
        // 内容未变化，刷新索引时间即可
        upsertIndex({
          key,
          updatedAt: Date.now(),
          size: bytes,
          count: Array.isArray(currentData) ? currentData.length : undefined
        });
        return true;
      }
      if (_savingKeys.has(key)) {
        // 已有写入在途，跳过；后续 action 会再次触发
        return true;
      }
      _savingKeys.add(key);
      localStorage.setItem(key, str);
      _lastWrittenMap.set(key, str);
      _savingKeys.delete(key);
      upsertIndex({
        key,
        updatedAt: Date.now(),
        size: bytes,
        count: Array.isArray(currentData) ? currentData.length : undefined
      });
      return true;
    } catch (e: any) {
      _savingKeys.delete(key);
      if (e?.name === 'QuotaExceededError') {
        quotaExceeded = true;
        hooks.onQuotaExceeded?.({
          key,
          attempt,
          error: e,
          finalFailure: false
        });
        if (attempt === 1) {
          const need = bytes + CFG.TARGET_FREE_AFTER_EVICT;
          const evictRes = evictChats(need, false);
          evictedBytes += evictRes.freedBytes;
          evictedChats += evictRes.freedChats;
        } else {
          quotaFinalFailure = true;
          hooks.onQuotaExceeded?.({
            key,
            attempt,
            error: e,
            finalFailure: true
          });
        }
        return false;
      } else {
        console.error('[chatlist] 保存失败：', e);
        return false;
      }
    }
  }

  let success = attemptWrite(1);
  if (!success && quotaExceeded && !quotaFinalFailure) {
    success = attemptWrite(2);
  }

  lastSaveResult = {
    key,
    success,
    originalBytes,
    finalBytes: bytes,
    originalCount,
    finalCount: Array.isArray(currentData) ? currentData.length : undefined,
    trimmedByCount,
    trimmedBySoft,
    trimmedByHard,
    evictedChats,
    evictedBytes,
    quotaExceeded,
    quotaFinalFailure,
    proactiveEvict
  };
  hooks.onSave?.(lastSaveResult);

  // 写入存储（根据环境）
  try {
    const persistPayload = flattedJSON.stringify(currentData);
    if ((window as any).vscode) {
      (window as any).vscode.postMessage({
        type: 'fs.writeFile',
        payload: {
          code:
            opts.type === 'public' ? PATH_CHAT_CODE : PATH_CHAT_PRIVATE_CODE,
          path: `${PATH_CHATS}/${opts.type}/${opts.chatId}.json`,
          data: persistPayload
        }
      });
    } else {
      localStorage.setItem(key, persistPayload);
    }
  } catch (e) {
    console.warn('[chatlist] 最终写入失败', e);
  }

  const changed =
    originalRef !== currentData ||
    trimmedByCount ||
    trimmedBySoft ||
    trimmedByHard ||
    evictedChats > 0;
  return { data: currentData, changed, meta: lastSaveResult };
}

/**
 * 运行时快速裁剪：供前端追加消息后即时限制（与持久化策略一致，避免 UI 与存储不一致）
 */
export function runtimeTrimArray(arr: any[]): any[] {
  if (!Array.isArray(arr)) {
    return arr;
  }
  let out = arr;
  // 条数裁剪（最新 MAX_MESSAGES 条）
  if (out.length > CFG.MAX_MESSAGES) {
    out = out.slice(-CFG.MAX_MESSAGES);
  }
  // 软硬大小裁剪（与 saveChatList 相同逻辑简化版本）
  let serialized = serialize(out);
  let bytes = stringSizeBytes(serialized);
  if (bytes > CFG.SOFT_CHAT_BYTES) {
    // 使用低水位目标，减少频繁抖动
    const lowTarget = Math.floor(
      (CFG.SOFT_CHAT_BYTES || 1.5 * 1024 * 1024) * (CFG.LOW_WATER_RATIO || 0.6)
    );
    const soft = trimBySize(out, lowTarget);
    if (soft.trimmed) {
      out = soft.data;
      serialized = serialize(out);
      bytes = stringSizeBytes(serialized);
    }
  }
  if (bytes > CFG.HARD_CHAT_BYTES) {
    const hard = trimBySize(out, CFG.HARD_CHAT_BYTES);
    if (hard.trimmed) {
      out = hard.data;
    }
  }
  return out;
}

/* ---- delChatList ---- */
export function delChatList(opts: ChatListKeyOptions): void {
  if ((window as any).vscode) {
    (window as any).vscode.postMessage({
      type: 'fs.deleteFile',
      payload: {
        path: `${PATH_CHATS}/${opts.type}/${opts.chatId}.json`
      }
    });
    return;
  }
  const key = getChatListKeyFromOptions(opts);
  localStorage.removeItem(key);
  removeIndex(key);
  _lastWrittenMap.delete(key);
}

// -------- 额外导出，便于调试/监控（不影响原用法） --------
export function getLastSaveResult() {
  return lastSaveResult;
}

export function registerChatListHooks(h: Partial<ChatListHooks>) {
  hooks = { ...hooks, ...h };
}
