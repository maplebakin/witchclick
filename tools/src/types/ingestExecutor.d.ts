declare module "../../server/lib/ingestExecutor.js" {
  export function executeIngest(spec: unknown, options?: Record<string, unknown>): Promise<any>;
}
