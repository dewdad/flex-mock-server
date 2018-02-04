import { STATUS_CODES } from 'http';
import { getGlobalLogger } from './debug';

const customHandlers = {
  301(req, res, code, args) {
    res.statusCode = 301;
    res.setHeader('location', args.url);
    res.statusMessage = STATUS_CODES[code];
    return res.statusMessage;
  },
  302(req, res, code, args) {
    res.statusCode = 302;
    res.setHeader('location', args.url);
    res.statusMessage = STATUS_CODES[code];
    return res.statusMessage;
  },
};

function defaultHandler(req, res, code) {
  res.statusCode = code;
  res.statusMessage = STATUS_CODES[code];
  return res.statusMessage;
}

export default function StandardCodeHander(
  request,
  response,
  code,
  args,
  logger = getGlobalLogger(),
) {
  logger.debug('call standard code handler for', code);
  const handler = customHandlers[code] || defaultHandler;
  return handler(request, response, code, args);
}
