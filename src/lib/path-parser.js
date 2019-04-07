import { getGlobalLogger } from './debug';
import url from 'url';
import path from 'path';

// evaluate history fallback file path.
export function parseHistoryFilePath({ folder, index, history }, logger = getGlobalLogger()) {
  let filePath;
  if (history) {
    filePath = history === true ? index : history;
    filePath = `/${filePath}`;
    filePath = path.join(folder, filePath);
    logger.debug('none-exist directory resorts to: ', filePath);
  }
  return filePath;
}

// convert request url to file system path.
export function parseUrl(requestUrl, root, logger = getGlobalLogger()) {
  const parsedUrl = url.parse(requestUrl, true);
  let { pathname } = parsedUrl;
  // remove 'root' directory, which is the mount point of our application in the domain.
  if (root && pathname.startsWith(root)) {
    pathname = pathname.substr(root.length);
  }
  // normalize for easy matching.
  if (pathname.endsWith('/')) {
    pathname = pathname.substr(0, pathname.length - 1);
  }
  pathname += parsedUrl.search || ''; // 'null' in windows
  logger.debug('parsed url', pathname);
  return pathname;
}
