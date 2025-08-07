import CryptoJS from 'crypto-js';

export const Platform = 'testone';

/**
 * 将字符串转为定长字符串
 * @param str 输入字符串
 * @param options 可选项
 * @returns 固定长度的哈希值
 */
const createHash = (
  str: string,
  options: {
    length?: number;
    algorithm?: string;
  } = {}
) => {
  const { length = 11, algorithm = 'sha256' } = options;
  let hash: string;
  // 只支持 sha256/sha1/md5
  if (algorithm === 'sha256') {
    hash = CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
  } else if (algorithm === 'sha1') {
    hash = CryptoJS.SHA1(str).toString(CryptoJS.enc.Hex);
  } else if (algorithm === 'md5') {
    hash = CryptoJS.MD5(str).toString(CryptoJS.enc.Hex);
  } else {
    throw new Error('只支持 sha256/sha1/md5');
  }
  return hash.slice(0, length);
};

/**
 * 使用用户的哈希键
 * @param event
 * @returns
 */
export const useUserHashKey = (event: { Platform: string; UserId: string }) => {
  return createHash(`${event.Platform}:${event.UserId}`);
};
