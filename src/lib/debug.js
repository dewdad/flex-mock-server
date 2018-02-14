import chalk from 'chalk';

const globalId = 'FMS_SERVER';
function getGlobalLogger() {
  return global[globalId];
}
function formatArgs(...args) {
  return args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
}

const noop = () => {};

class Logger {
  static ID = '[FMS';
  static Instances = 0;

  constructor() {
    this.constructor.Instances++;
    if (this.constructor.Instances > 1) {
      this.id = `${this.constructor.ID}_${this.constructor.Instances}]`;
    } else {
      this.id = `${this.constructor.ID}]`;
      global[globalId] = this;
      noop(globalId); // fix problem that rewire doens't export it.
    }
  }
  debug(...args) {
    Array.prototype.unshift.call(args, this.id);
    console.log(...args);
  }
  info(...args) {
    console.log(chalk.blue(this.id, formatArgs(...args)));
  }
  error(...args) {
    console.log(chalk.red(this.id, formatArgs(...args)));
  }
}

export default function createLogger(toDebug) {
  const logger = new Logger();
  // if (!toDebug) logger.debug = noop;
  return logger;
}

export { getGlobalLogger };
