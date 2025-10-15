export const checkOk = async (response: Response): Promise<void> => {
  if (!response.ok) {
    const defaultMessage = `Error ${response.status}: ${response.statusText}`;
    let message = '';
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const errorData = await response.json();
        message = typeof errorData.message === 'string' ? errorData.message : 
          typeof errorData.error === 'string' ? errorData.error : 
            JSON.stringify(errorData.message || errorData.error) || defaultMessage;
      } catch(error) {
        throw new Error('Failed to parse error response as JSON');
      }
    } else {
      try {
        const textData = await response.text();
        message = textData || defaultMessage;
      } catch(error) {
        throw new Error('Failed to parse error response as text');
      }
    }

    throw new Error(message);
  }
};
