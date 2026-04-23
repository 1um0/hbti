function parseEventBody(event) {
  if (event == null) {
    return {};
  }

  // URGENT: if event.body is a string (API Gateway HTTP trigger), parse it directly
  // This must come FIRST because array-like object check below may exit early
  if (typeof event.body === 'string' && event.body.trim()) {
    try {
      return JSON.parse(event.body);
    } catch (error) {
      return {};
    }
  }

  // Handle array-like objects from FC test panel: has numeric keys AND httpMethod/body
  // This is NOT an actual array, but an object with array indices
  if (event && typeof event === 'object' && !Array.isArray(event)) {
    const keys = Object.keys(event);
    const hasNumericKeys = keys.some(k => !isNaN(Number(k)));
    if (hasNumericKeys && event.httpMethod && event.body !== undefined) {
      if (typeof event.body === 'string' && event.body.trim()) {
        try {
          return JSON.parse(event.body);
        } catch (error) {
          return {};
        }
      }
      if (typeof event.body === 'object' && event.body !== null) {
        return event.body;
      }
    }
  }

  // Handle actual arrays from FC test panel
  if (Array.isArray(event)) {
    if (event.httpMethod && event.body !== undefined) {
      if (typeof event.body === 'string' && event.body.trim()) {
        try {
          return JSON.parse(event.body);
        } catch (error) {
          return {};
        }
      }
      if (typeof event.body === 'object' && event.body !== null) {
        return event.body;
      }
    }
    for (const item of event) {
      if (item && typeof item === 'object') {
        const parsed = parseEventBody(item);
        if (Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    }
    return {};
  }

  if (typeof event === 'string' || Buffer.isBuffer(event)) {
    const text = Buffer.isBuffer(event) ? event.toString('utf8') : event;
    if (!String(text).trim()) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return {};
    }
  }

  if (event.body != null) {
    let raw = event.body;

    if (event.isBase64Encoded && typeof raw === 'string') {
      try {
        raw = Buffer.from(raw, 'base64').toString('utf8');
      } catch (error) {
        raw = '';
      }
    }

    if (typeof raw === 'object' && raw !== null) {
      if (typeof raw.body === 'string' && raw.body.trim()) {
        try {
          return JSON.parse(raw.body);
        } catch (error) {
          return raw;
        }
      }
      if (typeof raw.body === 'object' && raw.body !== null) {
        return raw.body;
      }
      return raw;
    }

    if (typeof raw === 'string' && raw.trim()) {
      try {
        return JSON.parse(raw);
      } catch (error) {
        return {};
      }
    }
  }

  if (event.body == null && event.type && typeof event.type === 'string') {
    return event;
  }

  if (event.httpMethod && event.body) {
    if (typeof event.body === 'string') {
      try {
        return JSON.parse(event.body);
      } catch (error) {
        return {};
      }
    }
    return event.body;
  }

  return {};
}

// 模拟真实 API Gateway 事件
const event = {
  "0": "a", "1": "b", "2": "c", "3": "d", "4": "e",
  "5": "f", "6": "g", "7": "h", "8": "i", "9": "j",
  "version": "v1",
  "rawPath": "/",
  "headers": {},
  "queryParameters": {},
  "body": "{\"type\":\"GFBS\"}",
  "isBase64Encoded": false,
  "requestContext": {
    "accountId": "1017089263821858",
    "domainName": "submitresult-melkcrmbnb.cn-hangzhou.fcapp.run",
    "http": { "method": "POST", "path": "/" }
  }
};

const result = parseEventBody(event);
console.log('结果:', JSON.stringify(result));
console.log('期望: {"type":"GFBS"}');