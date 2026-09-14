import type { Env } from "../_lib/env";
import { handleApi } from "../_lib/router";

export const onRequest: PagesFunction<Env> = async (context) => {
  return handleApi({
    request: context.request,
    env: context.env,
    waitUntil: (promise) => context.waitUntil(promise as Promise<any>),
  });
};
