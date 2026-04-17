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

function getMethod(request) {
  if (!request) return '';
  return String(
    request.method ||
    request.httpMethod ||
    (request.requestContext && request.requestContext.http && request.requestContext.http.method) ||
    ''
  ).toUpperCase();
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

function getRowAsync(client, type) {
  return new Promise((resolve, reject) => {
    client.getRow(
      {
        tableName: getTableName(),
        primaryKey: [
          { scope: 'global' },
          { type }
        ]
      },
      (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      }
    );
  });
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

function extractCount(rowData) {
  if (!rowData || !rowData.row) {
    return 0;
  }

  const row = rowData.row;
  const attributes = row.attributes || row.attributeColumns || row.attribute_columns || row.attribute_columns_list || [];
  const rawCountValue = findAttributeValue(attributes, 'count');
  if (rawCountValue === undefined) {
    return 0;
  }

  const value = normalizeNumericValue(rawCountValue);
  return Number.isFinite(value) ? value : 0;
}

function getRarityLabel(ratio) {
  if (ratio <= 0.02) return '极稀有';
  if (ratio <= 0.05) return '很稀有';
  if (ratio <= 0.1) return '稀有';
  if (ratio <= 0.2) return '较少';
  if (ratio <= 0.35) return '常见';
  return '大众';
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

  if (method && method !== 'GET') {
    return sendJson(isWebShape ? response : null, 405, {
      ok: false,
      error: 'Method Not Allowed'
    });
  }

  const client = createClient(context);

  try {
    const counts = {};
    let spchRawProbe = null;

    await Promise.all(
      VALID_CODES.map(async (type) => {
        try {
          const data = await getRowAsync(client, type);
          if (type === 'SPCH') {
            spchRawProbe = data;
          }
          counts[type] = extractCount(data);
        } catch (error) {
          counts[type] = 0;
        }
      })
    );

    const total = VALID_CODES.reduce((sum, type) => sum + (counts[type] || 0), 0);
    const ratios = {};
    const rarityByType = {};

    VALID_CODES.forEach((type) => {
      const count = counts[type] || 0;
      const ratio = total > 0 ? count / total : 0;
      ratios[type] = Number(ratio.toFixed(4));
      rarityByType[type] = {
        label: getRarityLabel(ratio),
        percent: Number(((1 - ratio) * 100).toFixed(1))
      };
    });

    return sendJson(isWebShape ? response : null, 200, {
      ok: true,
      total,
      counts,
      ratios,
      rarityByType,
      debug: {
        endpoint: process.env.OTS_ENDPOINT || '',
        instance: process.env.OTS_INSTANCE || '',
        table: getTableName(),
        spchRowExists: !!(spchRawProbe && spchRawProbe.row),
        spchRowShape: spchRawProbe && spchRawProbe.row ? Object.keys(spchRawProbe.row) : []
      }
    });
  } catch (error) {
    console.error('getStats error:', error);
    return sendJson(isWebShape ? response : null, 500, {
      ok: false,
      error: 'Failed to load stats',
      detail: error.message || String(error)
    });
  }
};