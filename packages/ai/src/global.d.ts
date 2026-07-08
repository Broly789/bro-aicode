declare global {
  // 裸标识符 logger()，无需 import
  function logger(module: string, msg: unknown): void
  // 扩展 globalThis，使 globalThis.logger = logger 赋值合法
  var logger: (module: string, msg: unknown) => void
}

export {}
