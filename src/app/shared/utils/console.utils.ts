import { environment } from '@environment/environment';

export const CONSOLE = {
  info: (title: string, ...message: any) => {
    if (!environment.production) {
      console.info(title, ...message);
    }
  },
  warn: (title: string, ...message: any) => {
    if (!environment.production) {
      console.warn(title, ...message);
    }
  },
  error: (title: string, ...message: any) => {
    if (!environment.production) {
      console.error(title, ...message);
    }
  },
  debug: (title: string, ...message: any) => {
    if (!environment.production) {
      console.debug(title, ...message);
    }
  },
  log: (title: string, ...message: any) => {
    if (!environment.production) {
      console.log(title, ...message);
    }
  },
};
