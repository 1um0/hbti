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

function getCorsOrigin() {
  return process.env.ALLOW_ORIGIN || '*';
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

  if (request.body == null) {
    return {};
  }

  // Handle case where request.body is a string (raw JSON)
  if (typeof request.body === 'string' && request.body.trim()) {
    try {
      return JSON.parse(request.body);
    } catch (error) {
      return {};
    }
  }

  // Handle case where request.body is already an object
  if (typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    // If body has a nested 'body' string field (阿里云API Gateway format), parse it
    if (typeof request.body.body === 'string' && request.body.body.trim()) {
      try {
        return JSON.parse(request.body.body);
      } catch (error) {
        return request.body;
      }
    }
    return request.body;
  }

  const raw = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : String(request.body);

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function parseEventBody(event) {
  if (event == null) {
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

  if (event.body == null) {
    return {};
  }

  let raw = event.body;

  if (event.isBase64Encoded && typeof raw === 'string') {
    try {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    } catch (error) {
      raw = '';
    }
  }

  if (typeof raw === 'object') {
    return raw;
  }

  const text = String(raw || '');
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

function getMethod(request) {
  if (!request) return '';
  return String(
    request.method ||
    request.httpMethod ||
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

function setCorsHeaders(response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Access-Control-Allow-Origin', getCorsOrigin());
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(response, statusCode, body) {
  if (!response || typeof response.setHeader !== 'function' || typeof response.send !== 'function') {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': getCorsOrigin(),
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify(body)
    };
  }

  setCorsHeaders(response);
  response.statusCode = statusCode;
  response.send(JSON.stringify(body));
  return null;
}

function sendEmpty(response, statusCode) {
  if (!response || typeof response.setHeader !== 'function' || typeof response.send !== 'function') {
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': getCorsOrigin(),
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: ''
    };
  }

  setCorsHeaders(response);
  response.statusCode = statusCode;
  response.send('');
  return null;
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
  const request = args[0];
  const response = args[1];
  const context = args[2] || args[1];
  const method = getMethod(request);
  const isWebShape = response && typeof response.setHeader === 'function' && typeof response.send === 'function';

  if (method === 'OPTIONS') {
    return sendEmpty(isWebShape ? response : null, 204);
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
    return sendJson(isWebShape ? response : null, 400, {
      ok: false,
      error: 'Invalid type',
      allowed: VALID_CODES,
      debug: {
        gotMethod: method || '(empty)',
        bodyType: typeof body,
        bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
        queryType: request && (
          (request.queryParameters && request.queryParameters.type) ||
          (request.queryStringParameters && request.queryStringParameters.type) ||
          (request.queries && request.queries.type) ||
          ''
        ),
        topLevelEventType: request && request.type ? request.type : ''
      }
    });
  }

  const client = createClient(context);

  try {
    const writeResult = await incrementTypeAsync(client, type);
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