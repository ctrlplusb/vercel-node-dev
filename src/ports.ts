import getPort from 'get-port';

export interface Ports {
  apiServer: number;
  proxyServer: number;
  uiServer: number;
}

export async function getPorts(): Promise<Ports> {
  return {
    proxyServer:
      process.env.VND_PORT != null ? parseInt(process.env.VND_PORT) : 3000,
    apiServer: await getPort(),
    uiServer: await getPort(),
  };
}
