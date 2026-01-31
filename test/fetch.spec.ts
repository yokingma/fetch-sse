import { fetchEventData } from '../src/fetch';

// Mock fetch globally
global.fetch = jest.fn();

describe('fetchEventData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
