declare module '*.woff2' {
  const url: string;
  export default url;
}

// webpack's require.context, used by the Studio root to list every project folder.
declare namespace NodeJS {
  interface Require {
    context(
      dir: string,
      deep: boolean,
      filter: RegExp,
    ): {
      keys(): string[];
      <T = unknown>(id: string): T;
    };
  }
}
