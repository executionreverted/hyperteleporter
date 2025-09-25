// Global type declarations for missing modules

declare module 'corestore' {
  const Corestore: {
    new (storage: any, opts?: any): {
      get(name: string, opts?: any): any;
      close(): Promise<void>;
      replicate(socket: any): any;
    };
  };
  export = Corestore;
}

declare module 'hyperdrive' {
  const Hyperdrive: {
    new (corestore: any, key?: Buffer | string, opts?: any): {
      ready(): Promise<void>;
      close(): Promise<void>;
      get(key: string, opts?: any): Promise<Buffer>;
      put(key: string, value: any): Promise<void>;
      del(key: string): Promise<void>;
      readdir(path: string, opts?: any): Promise<string[]>;
      stat(path: string): Promise<any>;
      createReadStream(path: string, opts?: any): any;
      createWriteStream(path: string, opts?: any): any;
      
      // Additional properties and methods
      discoveryKey: Buffer;
      key: Buffer;
      contentKey?: Buffer;
      version: number;
      findingPeers: boolean;
      core: {
        peers?: any[];
      };
      
      // File system methods
      list(path: string, opts?: any): AsyncIterable<any>;
      exists(path: string): Promise<boolean>;
      download(path: string, opts?: any): Promise<{ done(): Promise<void> }>;
    };
  };
  export = Hyperdrive;
}

declare module 'hyperswarm' {
  const Hyperswarm: {
    new (opts?: any): {
      join(topic: Buffer, opts?: any): {
        flushed(): Promise<void>;
      };
      leave(topic: Buffer): void;
      on(event: string, listener: (...args: any[]) => void): any;
      destroy(): Promise<void>;
    };
  };
  export = Hyperswarm;
}

declare module 'react-syntax-highlighter' {
  export const Prism: any;
  const _default: any;
  export default _default;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const vscDarkPlus: any;
}

declare module '*.png?asset' {
  const value: string;
  export default value;
}

declare module '**/resources/icon.png?asset' {
  const value: string;
  export default value;
}

declare module '/Users/canersevince/Desktop/file-sharing-app/resources/icon.png?asset' {
  const value: string;
  export default value;
}

declare module '*.jsx' {
  const content: any;
  export default content;
}

// Extend Window interface for Electron
declare global {
  interface Window {
    electron: {
      process: {
        versions: any;
      };
    };
  }
}

export {};
