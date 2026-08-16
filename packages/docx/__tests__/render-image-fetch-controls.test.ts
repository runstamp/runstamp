import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOCXErrorCode } from '../src/errors';
import { getDefaultFetchConfig, isNonPublicIpAddress } from '../src/elements/images/extractor';
import { renderToDocx } from '../src/render';
import type { DocxDocument } from '../src/schema';

const DNS_LOOKUP_MOCK = vi.hoisted(() => vi.fn());
vi.mock('node:dns/promises', () => ({ lookup: DNS_LOOKUP_MOCK }));

const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XQAAAAASUVORK5CYII=',
  'base64',
);
const ORIGINAL_FETCH = globalThis.fetch;

function imageDoc(src = 'https://93.184.216.34/pixel.png'): DocxDocument {
  return {
    type: 'DocxDocument',
    pageSize: 'a4',
    pages: [{
      elements: [{
        type: 'image',
        src,
        alt: 'remote pixel',
        width: 32,
        height: 32,
      }],
    }],
  };
}

function multiImageDoc(count: number): DocxDocument {
  return {
    type: 'DocxDocument',
    pageSize: 'a4',
    pages: [{
      elements: Array.from({ length: count }, (_, index) => ({
        type: 'image' as const,
        src: `https://93.184.216.34/pixel-${index}.png`,
        alt: `remote pixel ${index}`,
        width: 32,
        height: 32,
      })),
    }],
  };
}

function responseLike(
  status: number,
  statusText: string,
  body = PNG_PIXEL,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    async arrayBuffer() {
      return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
    },
  } as Response;
}

describe('render image fetch controls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    DNS_LOOKUP_MOCK.mockReset();
    if (ORIGINAL_FETCH) {
      globalThis.fetch = ORIGINAL_FETCH;
    } else {
      Reflect.deleteProperty(globalThis, 'fetch');
    }
  });

  it('defaults the low-level external fetch policy to disabled', () => {
    expect(getDefaultFetchConfig().allowExternal).toBe(false);
  });

  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:0:127.0.0.1',
    '64:ff9b::7f00:1',
    '64:ff9b:1::1',
  ])('classifies non-public address %s as blocked', (address) => {
    expect(isNonPublicIpAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '2606:4700:4700::1111'])(
    'classifies public address %s as fetchable',
    (address) => {
      expect(isNonPublicIpAddress(address)).toBe(false);
    },
  );

  it('does not call fetch for external images without an explicit opt-in', async () => {
    const fetchMock = vi.fn(async () => responseLike(200, 'OK'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(imageDoc(), { deterministic: false })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
      message: expect.stringContaining('set imageFetch.allowExternal explicitly'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows external image fetches when explicitly opted in', async () => {
    const fetchMock = vi.fn(async () => responseLike(200, 'OK', PNG_PIXEL, {
      'content-length': String(PNG_PIXEL.length),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await renderToDocx(imageDoc(), {
      deterministic: false,
      imageFetch: {
        allowExternal: true,
        retries: 1,
        maxRedirects: 0,
        timeout: 1000,
      },
    });

    expect(result.buffer.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('force-disables external image fetches in deterministic renders despite opt-in', async () => {
    const fetchMock = vi.fn(async () => responseLike(200, 'OK'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(imageDoc(), {
      deterministic: true,
      imageFetch: {
        allowExternal: true,
      },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enforces the configured redirect ceiling', async () => {
    const fetchMock = vi.fn(async () => responseLike(302, 'Found', PNG_PIXEL, {
      location: 'https://93.184.216.34/redirected.png',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(imageDoc(), {
      deterministic: false,
      imageFetch: {
        allowExternal: true,
        retries: 1,
        maxRedirects: 0,
        timeout: 1000,
      },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    'http://127.0.0.1/private.png',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/private.png',
    'http://[::ffff:127.0.0.1]/private.png',
  ])('blocks direct requests to non-public address %s', async (url) => {
    const fetchMock = vi.fn(async () => responseLike(200, 'OK'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(imageDoc(url), {
      deterministic: false,
      imageFetch: { allowExternal: true, retries: 1 },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
      message: expect.stringContaining('non-public'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('revalidates and blocks a redirect to a private address', async () => {
    const fetchMock = vi.fn(async () => responseLike(302, 'Found', PNG_PIXEL, {
      location: 'http://127.0.0.1/private.png',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(imageDoc(), {
      deterministic: false,
      imageFetch: { allowExternal: true, retries: 1, maxRedirects: 1 },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
      message: expect.stringContaining('non-public'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks a hostname when any resolved A or AAAA answer is non-public', async () => {
    DNS_LOOKUP_MOCK.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    const fetchMock = vi.fn(async () => responseLike(200, 'OK'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(imageDoc('https://mixed.example/pixel.png'), {
      deterministic: false,
      imageFetch: { allowExternal: true, retries: 1 },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
      message: expect.stringContaining('127.0.0.1'),
    });
    expect(DNS_LOOKUP_MOCK).toHaveBeenCalledWith('mixed.example', { all: true, verbatim: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails subsequent images when the per-render byte budget is exhausted', async () => {
    const fetchMock = vi.fn(async () => responseLike(200, 'OK', PNG_PIXEL, {
      'content-length': String(PNG_PIXEL.length),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(multiImageDoc(2), {
      deterministic: false,
      imageFetch: {
        allowExternal: true,
        retries: 1,
        maxTotalExternalFetchBytes: PNG_PIXEL.length,
      },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
      message: expect.stringContaining('byte budget exhausted'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('charges downloaded bytes when an unknown-length response exceeds the budget', async () => {
    const fetchMock = vi.fn(async () => responseLike(200, 'OK', PNG_PIXEL));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(imageDoc(), {
      deterministic: false,
      imageFetch: {
        allowExternal: true,
        retries: 1,
        maxTotalExternalFetchBytes: PNG_PIXEL.length - 1,
      },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
      message: expect.stringContaining('byte budget exceeded'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails an image structurally when the per-render time budget is exceeded', async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return responseLike(200, 'OK', PNG_PIXEL);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(renderToDocx(imageDoc(), {
      deterministic: false,
      imageFetch: {
        allowExternal: true,
        retries: 1,
        maxTotalExternalFetchTimeMs: 5,
      },
    })).rejects.toMatchObject({
      code: DOCXErrorCode.IMAGE_FETCH_FAILED,
      message: expect.stringContaining('time budget exceeded'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
