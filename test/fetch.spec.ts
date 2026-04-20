import { fetchEventData } from '../src/fetch';

// Mock fetch globally
global.fetch = jest.fn();

describe('fetchEventData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should stringify plain objects including null-prototype objects', async () => {
    const mockResponse = new Response('data: test\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' }
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const payload = Object.create(null) as Record<string, string>;
    payload.message = 'hello';

    await fetchEventData('http://example.com', {
      method: 'POST',
      data: payload
    });

    expect(global.fetch).toHaveBeenCalledWith('http://example.com', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ message: 'hello' })
    }));
  });

  test('should pass through BodyInit payloads without stringifying them', async () => {
    const mockResponse = new Response('data: test\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' }
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await fetchEventData('http://example.com', {
      method: 'POST',
      data: 'raw-body'
    });

    expect(global.fetch).toHaveBeenCalledWith('http://example.com', expect.objectContaining({
      method: 'POST',
      body: 'raw-body'
    }));
  });

  test('should call checkOk before onOpen by default', async () => {
    const mockResponse = new Response('data: test\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' }
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const onOpen = jest.fn();
    const onMessage = jest.fn();

    await fetchEventData('http://example.com', {
      onOpen,
      onMessage
    });

    expect(onOpen).toHaveBeenCalledWith(mockResponse);
  });

  test('should call onClose after the response stream is fully consumed', async () => {
    const mockResponse = new Response('data: test\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' }
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const onClose = jest.fn();
    const onMessage = jest.fn();

    await fetchEventData('http://example.com', {
      onClose,
      onMessage
    });

    expect(onMessage).toHaveBeenCalledWith({
      event: null,
      data: 'test',
      raw: ['test']
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('should not call onClose when there is no readable response body', async () => {
    const mockResponse = new Response(null, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' }
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const onClose = jest.fn();

    await fetchEventData('http://example.com', {
      onClose
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  test('should throw error when status is not ok by default', async () => {
    const mockResponse = new Response('error', {
      status: 500,
      statusText: 'Internal Server Error'
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const onOpen = jest.fn();
    const onError = jest.fn();

    await fetchEventData('http://example.com', {
      onOpen,
      onError
    });

    expect(onOpen).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  test('should call onOpen even when status is not ok with skipStatusCheck=true', async () => {
    const mockResponse = new Response('data: test\n\n', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: { 'Content-Type': 'text/event-stream' }
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const onOpen = jest.fn();
    const onMessage = jest.fn();

    await fetchEventData('http://example.com', {
      skipStatusCheck: true,
      onOpen,
      onMessage
    });

    expect(onOpen).toHaveBeenCalledWith(mockResponse);
  });

  test('should call onOpen with custom status code when skipStatusCheck=true', async () => {
    const mockResponse = new Response('data: test\n\n', {
      status: 299,
      statusText: 'Custom Status',
      headers: { 'Content-Type': 'text/event-stream' }
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const onOpen = jest.fn();
    const onMessage = jest.fn();

    await fetchEventData('http://example.com', {
      skipStatusCheck: true,
      onOpen,
      onMessage
    });

    expect(onOpen).toHaveBeenCalledWith(mockResponse);
    expect(mockResponse.status).toBe(299);
  });

  test('should report fetch rejections through onError', async () => {
    const networkError = new Error('network down');
    (global.fetch as jest.Mock).mockRejectedValue(networkError);

    const onError = jest.fn();

    await fetchEventData('http://example.com', {
      onError
    });

    expect(onError).toHaveBeenCalledWith(networkError);
  });
});
