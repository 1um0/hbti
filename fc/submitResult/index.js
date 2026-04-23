const TableStore = require('tablestore');

const VALID_CODES = [
  'SPCH', 'SPCS', 'SPBH', 'SPBS',
  'SFCH', 'SFCS', 'SFBH', 'SFBS',
  'GPCH', 'GPCS', 'GPBH', 'GPBS',
  'GFCH', 'GFCS', 'GFBH', 'GFBS'
];

function getTableName() {
  return process.env.OTS_TABLE || 'hbti_stats';
}

function createClient(context) {
  const credentials = (context && context.credentials) || {};
  const accessKeyId = credentials.accessKeyId || process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  const accessKeySecret = credentials.accessKeySecret || process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
  const securityToken = credentials.securityToken || process.env.ALIBABA_CLOUD_SECURITY_TOKEN;

  const options = {
    endpoint: process.env.OTS_ENDPOINT,
    instancename: process.env.OTS_INSTANCE
  };

  if (accessKeyId && accessKeySecret) {
    options.accessKeyId = accessKeyId;
    options.accessKeySecret = accessKeySecret;

    if (securityToken) {
      options.securityToken = securityToken;
    }
  }

  return new TableStore.Client(options);
}

function parseBody(request) {
  if (request == null) {
    return {};
  }

  if (typeof request === 'string' || Buffer.isBuffer(request)) {
    const text = Buffer.isBuffer(request) ? request.toString('utf8') : request;
    if (!String(text).trim()) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return {};
    }
  }

  // Handle direct body string (raw JSON body)
  if (typeof request.body === 'string' && request.body.trim()) {
    try {
      return JSON.parse(request.body);
    } catch (error) {
      return {};
    }
  }

  // Handle case where body is an object (阿里云 API Gateway format with nested body)
  if (typeof request.body === 'object' && request.body !== null) {
    // If request.body has a body property that is a string, parse it
    if (typeof request.body.body === 'string' && request.body.body.trim()) {
      try {
        return JSON.parse(request.body.body);
      } catch (error) {
        return request.body;
      }
    }
    // If request.body has a body property that is an object, return it
    if (typeof request.body.body === 'object' && request.body.body !== null) {
      return request.body.body;
    }
    // If request.body has type directly (not an API Gateway object), return it
    if (request.body.type && !request.body.version && !request.body.rawPath && !request.body.body) {
      return request.body;
    }
  }

  // Handle the case where request itself contains the body directly (some HTTP triggers)
  if (request.body === undefined && typeof request.bodyString === 'string') {
    try {
      return JSON.parse(request.bodyString);
    } catch (error) {
      return {};
    }
  }

  // If body is missing but request looks like a parsed body object with type, return it
  if (request.body == null && request.type && typeof request.type === 'string') {
    return request;
  }

  return {};
}

function parseEventBody(event) {
  if (event == null) {
    return {};
  }

  console.error('DEBUG parseEventBody event.body type:', typeof event.body, 'value:', typeof event.body === 'string' ? event.body.slice(0, 50) : event.body);

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
    // First check if the array itself has httpMethod and body (common FC test panel format)
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
    // Try each element until we find one that has a body or looks like an event
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

  // If event has a body property, try to parse it
  if (event.body != null) {
    let raw = event.body;

    if (event.isBase64Encoded && typeof raw === 'string') {
      try {
        raw = Buffer.from(raw, 'base64').toString('utf8');
      } catch (error) {
        raw = '';
      }
    }

    // Check if raw is an object with a body property that is a string (阿里云 API Gateway format)
    if (typeof raw === 'object' && raw !== null) {
      // If raw.body is a string, parse it as JSON
      if (typeof raw.body === 'string' && raw.body.trim()) {
        try {
          return JSON.parse(raw.body);
        } catch (error) {
          return raw;
        }
      }
      // If raw.body is an object, return it directly
      if (typeof raw.body === 'object' && raw.body !== null) {
        return raw.body;
      }
      // Otherwise return the raw object
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

  // If event.body is null/undefined but event itself looks like a parsed body, return event
  if (event.body == null && event.type && typeof event.type === 'string') {
    return event;
  }

  // If event looks like it IS the body (has httpMethod and body properties directly)
  if (event.httpMethod && event.body) {
    // Try to parse body if it's a string
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

function getMethod(request) {
  if (!request) return '';
  // Handle array-like objects (FC test panel) that have httpMethod directly on them
  if (typeof request.httpMethod === 'string') {
    return request.httpMethod.toUpperCase();
  }
  return String(
    request.method ||
    (request.requestContext && request.requestContext.http && request.requestContext.http.method) ||
    ''
  ).toUpperCase();
}

function pickFirstString(candidates) {
  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim();
    }
  }
  return '';
}

function extractType(request, body) {
  const queryType = request && (
    (request.queryParameters && request.queryParameters.type) ||
    (request.queryStringParameters && request.queryStringParameters.type) ||
    (request.queries && request.queries.type)
  );

  const nestedBodyType = body && body.body && body.body.type;
  const topLevelEventType = request && request.type;

  return pickFirstString([
    body && body.type,
    nestedBodyType,
    queryType,
    topLevelEventType
  ]).toUpperCase();
}

function sendJson(response, statusCode, body) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Date,x-fc-request-id'
  };

  const result = {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };

  // If response has web-shaped methods, use them
  if (response && typeof response.setHeader === 'function' && typeof response.send === 'function') {
    Object.keys(headers).forEach(key => response.setHeader(key, headers[key]));
    response.statusCode = statusCode;
    response.send(result.body);
  }

  return result;
}

function normalizeNumericValue(rawValue) {
  if (typeof rawValue === 'number') {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (rawValue && typeof rawValue === 'object') {
    if (typeof rawValue.toNumber === 'function') {
      const parsed = Number(rawValue.toNumber());
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (typeof rawValue.toString === 'function') {
      const parsed = Number(rawValue.toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function findAttributeValue(attributes, key) {
  if (!Array.isArray(attributes)) {
    return undefined;
  }

  for (const item of attributes) {
    if (!item) {
      continue;
    }

    if (item.name === key) {
      return item.value;
    }

    if (Object.prototype.hasOwnProperty.call(item, key)) {
      return item[key];
    }

    if (item.columnName === key) {
      return item.value !== undefined ? item.value : item.columnValue;
    }

    if (Array.isArray(item) && item.length >= 2 && item[0] === key) {
      return item[1];
    }
  }

  return undefined;
}

function toOtsInteger(value) {
  const parsed = Number(value);
  const intValue = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;

  if (TableStore && TableStore.Long && typeof TableStore.Long.fromNumber === 'function') {
    return TableStore.Long.fromNumber(intValue);
  }

  return intValue;
}

function incrementTypeAsync(client, type) {
  return new Promise((resolve, reject) => {
    const primaryKey = [
      { scope: 'global' },
      { type }
    ];

    client.getRow(
      {
        tableName: getTableName(),
        primaryKey
      },
      (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        const row = data && data.row ? data.row : null;
        const attributes = row
          ? (row.attributes || row.attributeColumns || row.attribute_columns || row.attribute_columns_list || [])
          : [];
        const rawCountValue = findAttributeValue(attributes, 'count');
        const currentCount = normalizeNumericValue(rawCountValue);
        const nextCount = Number.isFinite(currentCount) ? Math.trunc(currentCount) + 1 : 1;

        client.putRow(
          {
            tableName: getTableName(),
            primaryKey,
            attributeColumns: [
              { count: toOtsInteger(nextCount) },
              { updatedAt: toOtsInteger(Date.now()) }
            ],
            condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE)
          },
          (putErr, putData) => {
            if (putErr) {
              reject(putErr);
              return;
            }

            resolve({
              putData,
              nextCount,
              primaryKey
            });
          }
        );
      }
    );
  });
}

exports.handler = async (...args) => {
  console.error('HANDLER CALLED argsLen:', args.length);
  const request = args[0];
  const response = args[1];
  const context = args[2] || args[1];
  const isWebShape = response && typeof response.setHeader === 'function' && typeof response.send === 'function';
  console.error('HANDLER isWebShape:', isWebShape);

  // Handle OPTIONS preflight FIRST - OPTIONS can come without httpMethod set
  // Check via standard method detection
  const rawMethod = request && (request.method || request.httpMethod || (request.requestContext && request.requestContext.http && request.requestContext.http.method) || '');
  const method = String(rawMethod || '').toUpperCase();

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Expose-Headers': 'Date,x-fc-request-id'
      },
      body: ''
    };
  }

  // Some FC test panels send non-standard event shapes without method.
  // In that case, allow submit flow when body contains type.
  const body = isWebShape ? parseBody(request) : parseEventBody(request);
  const hasTypeInBody = body && typeof body.type === 'string' && body.type.trim().length > 0;
  const allowConsoleFallback = method === 'GET' && hasTypeInBody;

  if (method && method !== 'POST' && !allowConsoleFallback) {
    return sendJson(isWebShape ? response : null, 405, {
      ok: false,
      error: 'Method Not Allowed',
      gotMethod: method,
      expectedMethod: 'POST'
    });
  }

  const type = extractType(request, body);

  if (!VALID_CODES.includes(type)) {
    // Debug info to understand request structure
    const argsArrayLength = args.length;
    const args0Type = typeof args[0];
    const args0IsArray = Array.isArray(args[0]);
    const args0Keys = args[0] && typeof args[0] === 'object' && !Array.isArray(args[0]) ? Object.keys(args[0]).slice(0, 10) : String(args[0]).slice(0, 50);
    const args1Type = typeof args[1];

    const debugInfo = {
      gotMethod: method || '(empty)',
      isWebShape,
      bodyType: typeof body,
      bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
      bodyTypeValue: body && body.type,
      bodyBodyType: body && body.body != null ? typeof body.body : 'undefined',
      queryType: request && (
        (request.queryParameters && request.queryParameters.type) ||
        (request.queryStringParameters && request.queryStringParameters.type) ||
        (request.queries && request.queries.type) ||
        ''
      ),
      // Debug: args structure
      argsArrayLength,
      args0Type,
      args0IsArray,
      args0Keys,
      args1Type
    };

    console.error('DEBUG 400, type extracted:', type, 'body:', JSON.stringify(body), 'requestKeys:', request && typeof request === 'object' ? Object.keys(request).slice(0, 10) : 'n/a');
    return sendJson(isWebShape ? response : null, 400, {
      ok: false,
      error: 'Invalid type',
      allowed: VALID_CODES,
      debug: debugInfo
    });
  }

  let client;
  try {
    client = createClient(context);
  } catch (err) {
    console.error('createClient error:', err);
    return sendJson(isWebShape ? response : null, 500, {
      ok: false,
      error: 'Failed to initialize database client',
      detail: err.message || String(err)
    });
  }

  try {
    const writeResult = await incrementTypeAsync(client, type);
    console.error('DEBUG write success, type:', type, 'nextCount:', writeResult && writeResult.nextCount);
    return sendJson(isWebShape ? response : null, 200, {
      ok: true,
      type,
      message: 'Result saved',
      debug: {
        endpoint: process.env.OTS_ENDPOINT || '',
        instance: process.env.OTS_INSTANCE || '',
        table: getTableName(),
        nextCount: writeResult && typeof writeResult.nextCount === 'number' ? writeResult.nextCount : null,
        primaryKey: writeResult ? writeResult.primaryKey : null
      }
    });
  } catch (error) {
    console.error('submitResult error:', error);
    return sendJson(isWebShape ? response : null, 500, {
      ok: false,
      error: 'Failed to save result',
      detail: error.message || String(error)
    });
  }
};