import stdHandler from './standard-code-handler';

export default class MapProcessor {
  listener = null;
  constructor(listener) {
    this.listener = listener;
    this.logger = listener.logger;
  }

  runBeforeHandlers(patnReg, setting, wrapper, context) {
    this.logger.debug('process pattern', patnReg.source, '-', setting);
    const { req, res } = context;
    let type = typeof setting;
    if (type === 'object' && Array.isArray(setting)) {
      type = 'array';
    }
    if (type === 'number' || type === 'array') {
      this.processMapResponse(patnReg, setting, wrapper, context);
    } else if (type === 'object') {
      if (setting.before) {
        this.logger.debug('found a "before" handler');
        setting.before(req, res);
      }
      return setting.passThrough;
    }
    return false;
  }

  processMapResponse(patnReg, setting, wrapper, context) {
    this.logger.debug('process pattern', patnReg.source, '-', setting);
    if ('data' in wrapper) {
      this.logger.debug('passed in data is', wrapper.data);
    }
    const { req, res } = context;
    let passThrough = false;
    let type = typeof setting;
    if (type === 'object' && Array.isArray(setting)) {
      type = 'array';
    }

    const parsers = {
      // standard code handlers
      number: () => {
        wrapper.data = stdHandler(req, res, setting, null, this.logger);
      },
      // standard code handlers
      array: () => {
        wrapper.data = stdHandler(req, res, setting[0], setting[1], this.logger);
      },
      // custom handler
      function: () => {
        wrapper.data = setting(req, res, wrapper.data, this.logger);
      },
      // file path;
      string: (target) => {
        const oriUrl = req.url;
        req.url = req.url.replace(patnReg, target || setting);
        this.logger.debug(`replace "${oriUrl}" with "${req.url}"`);
      },
      object: () => {
        if (setting.after) {
          this.logger.debug('store a "after" handler');
          res.afterHandlers.push(setting.after);
        }
        if (setting.path) {
          if (typeof setting.path === 'function') {
            this.logger.debug('call custom file path replacing function');
            const oriUrl = req.url;
            req.url = setting.path(req, res, this.logger);
            this.logger.debug(`replace "${oriUrl}" with "${req.url}"`);
          } else {
            parsers.string(setting.path);
          }
        }

        // return this data directly;
        let { method } = req;
        method = method.toLowerCase();
        const previousData = wrapper.data;
        if (method in setting) {
          this.logger.debug('found custom data for method', method);
          wrapper.data = setting[method];
        } else if ('data' in setting) {
          this.logger.debug('found universal custom data');
          wrapper.data = setting.data;
        }

        if (typeof wrapper.data === 'function') {
          this.logger.debug('execute custom data handler');
          wrapper.data = wrapper.data(req, res, previousData, this.logger);
        }

        ({ passThrough } = setting);
      },
    };

    if (parsers[type]) {
      parsers[type]();
    } else {
      this.logger.debug(`invalid setting in map for ${patnReg.source}`);
    }
    if ('data' in wrapper) {
      this.logger.debug('passed out data is', wrapper.data);
    }

    return passThrough;
  }

  /**
   * response from map file.
   *
   * @returns {*} - response data
   */
  handleMap(context) {
    const { req } = context;

    const wrapper = {};

    const { map } = this.listener.options;
    if (!map) return wrapper;

    this.logger.debug('traversing map the first time, running "before" handlers...');
    const found = map.find(([patnReg, setting]) => {
      if (patnReg.test(req.url)) {
        this.logger.debug('matched pattern:', patnReg.source);
        return !this.runBeforeHandlers(patnReg, setting, wrapper, context);
      }
      return false;
    });
    if (!('data' in wrapper)) {
      this.logger.debug('traversing map the second time, get response data...');
      map.find(([patnReg, setting]) => {
        if (patnReg.test(req.url)) {
          this.logger.debug('matched pattern:', patnReg.source);
          const passThrough = this.processMapResponse(patnReg, setting, wrapper, context);
          if (!passThrough) {
            this.logger.debug('processing mapping stopped');
            return true;
          }
        }
        return false;
      });
    }
    if (found) {
      if ('data' in wrapper) {
        this.logger.debug('final custom response returned: ', wrapper.data);
      }
    } else {
      this.logger.debug('none matched in map');
    }
    return wrapper;
  }
}
