/**
 * hbti徒步人格测试 - 核心逻辑脚本
 * 版本: 2.0
 * 功能: 32题测试、自动计分、人格判定、结果展示
 */

// ==================== 全局配置 ====================
const HBTI_CONFIG = {
  version: '2.0',
  domain: 'hbti.top',
  dimensions: ['能量取向', '行动模式', '自然联结', '耐受风格'],
  dimensionCodes: ['S/G', 'P/F', 'C/B', 'H/S'],
  threshold: 3.5, // 判定阈值：平均分 >= 3.5 判定前字母，否则后字母
  scoreScale: { min: 1, max: 5 },
  reverseScoringEnabled: true,
  storageKeys: {
    result: 'hbti_result',
    answers: 'hbti_answers',
    draftAnswers: 'hbti_draft_answers'
  },
  apiEndpoints: {
    submitResult: 'https://submitresult-melkcrmbnb.cn-hangzhou.fcapp.run',
    getStats: 'https://getstats-dytffsjluv.cn-hangzhou.fcapp.run'
  },
  questionsPerDimension: 8,
  totalQuestions: 32
};

// ==================== 题目数据 ====================
// 包含32道题的完整数据：文本、维度、反向标识
const QUESTIONS = [
  // 维度0: 能量取向 (S独行 / G结伴) —— 题1-8
  { id: 1, text: '长线徒步中，独自掌控节奏会让我更安心', dimension: 0, reverse: false },
  { id: 2, text: '途中持续社交聊天，会分散我对山野的注意力', dimension: 0, reverse: false },
  { id: 3, text: '团队徒步时，我愿意主动协调节奏、照应同行伙伴', dimension: 0, reverse: true },
  { id: 4, text: '临时只剩一人，我也会按原计划独立完成路线', dimension: 0, reverse: false },
  { id: 5, text: '休息时我偏好安静独处，优先恢复体力而非闲聊', dimension: 0, reverse: false },
  { id: 6, text: '我乐于在徒步社群分享轨迹、攻略与出行经验', dimension: 0, reverse: true },
  { id: 7, text: '徒步结束后，我更想独自消化体验，而非立刻复盘社交', dimension: 0, reverse: false },
  { id: 8, text: '山野偶遇同路人，我保持礼貌距离，不主动结伴同行', dimension: 0, reverse: false },

  // 维度1: 行动模式 (P规划 / F随性) —— 题9-16
  { id: 9, text: '出发前我会明确返程时间、下撤点与安全边界', dimension: 1, reverse: false },
  { id: 10, text: '我会提前查询山区小气候，规避降雨、大风等高风险', dimension: 1, reverse: false },
  { id: 11, text: '行程被打乱时，我更愿意顺着现场情况灵活调整', dimension: 1, reverse: true },
  { id: 12, text: '前一晚我会分层打包装备，核对急救、照明等刚需物资', dimension: 1, reverse: false },
  { id: 13, text: '我习惯记录关键路标，降低迷路与回程判断失误', dimension: 1, reverse: false },
  { id: 14, text: '只要大方向正确，我不会严格卡点执行行程时间', dimension: 1, reverse: true },
  { id: 15, text: '我会为天气、封路等突发情况，准备至少一套备选方案', dimension: 1, reverse: false },
  { id: 16, text: '临时起意改线探索，比严格执行原计划更吸引我', dimension: 1, reverse: true },

  // 维度2: 自然联结 (C征服 / B沉浸) —— 题17-24
  { id: 17, text: '看到高爬升、技术路段，我会想挑战自身体能上限', dimension: 2, reverse: false },
  { id: 18, text: '我会驻足观察山野植被、地貌，享受自然细节带来的治愈', dimension: 2, reverse: true },
  { id: 19, text: '规划路线时，我优先选择有挑战性、能突破自我的线路', dimension: 2, reverse: false },
  { id: 20, text: '未登顶也无妨，全程的沉浸体验比结果更重要', dimension: 2, reverse: true },
  { id: 21, text: '完成高难度线路的成就感，远大于拍照打卡的快乐', dimension: 2, reverse: false },
  { id: 22, text: '我偏爱舒缓节奏，愿意为风景多次停留、放慢脚步', dimension: 2, reverse: true },
  { id: 23, text: '我主动探索峡谷、山脊等小众地形，追求山野掌控感', dimension: 2, reverse: false },
  { id: 24, text: '比起里程与高度，我更在意山野里的情绪稳定与松弛感', dimension: 2, reverse: true },

  // 维度3: 耐受风格 (H硬核 / S轻享) —— 题25-32
  { id: 25, text: '为完成目标，我可以接受连续高强度爬升与紧凑节奏', dimension: 3, reverse: false },
  { id: 26, text: '天气路况变差时，我优先保障体验，绝不勉强硬撑', dimension: 3, reverse: true },
  { id: 27, text: '我愿意为轻量化减重，牺牲少量行进舒适性', dimension: 3, reverse: false },
  { id: 28, text: '身体轻微不适时，我会果断下撤，不执着于完赛', dimension: 3, reverse: true },
  { id: 29, text: '我能接受早出晚归，为优质风景压缩休息时间', dimension: 3, reverse: false },
  { id: 30, text: '我优先选择阴凉平缓路段，规避暴晒与连续陡坡', dimension: 3, reverse: true },
  { id: 31, text: '长距离徒步中，我能稳定控速，坚持完成计划行程', dimension: 3, reverse: false },
  { id: 32, text: '比起突破极限，我更看重徒步后的身体恢复与舒适感', dimension: 3, reverse: true }
];

// ==================== 人格类型数据 ====================
// 16种HBTI徒步人格的完整描述
const PERSONALITY_TYPES = {
  // S 独行组
  'SPCH': {
    name: '孤狼征服者',
    nickname: '徒步卷王·山顶独逼',
    description: '别人徒步散心，你徒步渡劫。重装虐线单人冲，攻略比论文细，零社交零废话，登顶只发一个句号，山见了你都得立正。',
    group: 'S独行组',
    rarity: '2%',
    imagePath: 'assets/images/SPCH.jpg',
    compatibility: {
      best: ['GPCH', 'SFCH'],
      avoid: ['GFBS', 'GPBS']
    }
  },
  'SPCS': {
    name: '独行规划家',
    nickname: '精致独走·洁癖型山民',
    description: '独行不发疯，轻装不摆烂。轨迹精准到米，装备一尘不染，不虐不卷不社交，进山只为躲人，体面又高冷。',
    group: 'S独行组',
    rarity: '5%',
    imagePath: 'assets/images/SPCS.jpg',
    compatibility: {
      best: ['GPCS', 'SFCS'],
      avoid: ['GFBS', 'GFBH']
    }
  },
  'SPBH': {
    name: '山野禁欲者',
    nickname: '山里苦行僧·风景入定人',
    description: '不冲顶不打卡不发圈，进山如同出家。长线冷饭不矫情，万物皆可静心，你不是徒步，是来山野闭关修行。',
    group: 'S独行组',
    rarity: '4%',
    imagePath: 'assets/images/SPBH.jpg',
    compatibility: {
      best: ['GPBH', 'SFBH'],
      avoid: ['GFCH', 'GPCH']
    }
  },
  'SPBS': {
    name: '独处治愈者',
    nickname: '城市逃犯·山里躺平怪',
    description: '社恐终极形态，进山纯纯躲人类。慢走发呆不赶路，坐比走久，不问里程爬升，主打一个精神回血充电。',
    group: 'S独行组',
    rarity: '8%',
    imagePath: 'assets/images/SPBS.jpg',
    compatibility: {
      best: ['GPBS', 'SFBS'],
      avoid: ['GFCH', 'GPCH']
    }
  },
  'SFCH': {
    name: '随性孤勇者',
    nickname: '野生莽夫·无轨敢死队',
    description: '没攻略没计划没队友，脑子一热就进山。野路乱钻全靠命硬，自由到离谱，连山都猜不到你下一步去哪。',
    group: 'S独行组',
    rarity: '3%',
    imagePath: 'assets/images/SFCH.jpg',
    compatibility: {
      best: ['GFCH', 'SPCH'],
      avoid: ['GPCS', 'SPCS']
    }
  },
  'SFCS': {
    name: '独行漫游者',
    nickname: '随缘散步帝·山里摆烂王',
    description: '单人乱晃走哪算哪，累了就撤渴了就停。不冲顶不内卷，徒步=户外散步，主打来过、走过、快乐过。',
    group: 'S独行组',
    rarity: '7%',
    imagePath: 'assets/images/SFCS.jpg',
    compatibility: {
      best: ['GFCS', 'SPCS'],
      avoid: ['GPCH', 'SPCH']
    }
  },
  'SFBH': {
    name: '野生修行者',
    nickname: '山野流浪汉·灵魂飘着走',
    description: '无目标无时间，长线沉浸式看云看树。能挨饿能吃苦不矫情，人在山野，魂在三界外，极致自由。',
    group: 'S独行组',
    rarity: '3%',
    imagePath: 'assets/images/SFBH.jpg',
    compatibility: {
      best: ['GFBH', 'SPBH'],
      avoid: ['GPCH', 'SPCH']
    }
  },
  'SFBS': {
    name: '佛系独行人',
    nickname: '终极懒人·山里摸鱼冠军',
    description: '独行界底线选手。不起早不爬坡，找块草地坐一下午，徒步=换个地方玩手机，松弛感拉满到溢出。',
    group: 'S独行组',
    rarity: '9%',
    imagePath: 'assets/images/SFBS.jpg',
    compatibility: {
      best: ['GFBS', 'SPBS'],
      avoid: ['GPCH', 'SPCH']
    }
  },

  // G 结伴组
  'GPCH': {
    name: '领队征服者',
    nickname: '卷王队长·全员催命官',
    description: '全队的爹，路线的神。六点催起床，爬坡催加速，登顶催拍照，跟你徒步=户外军训，快乐没有，荣誉感拉满。',
    group: 'G结伴组',
    rarity: '6%',
    imagePath: 'assets/images/GPCH.jpg',
    compatibility: {
      best: ['SPCH', 'GFCH'],
      avoid: ['SFBS', 'SPBS']
    }
  },
  'GPCS': {
    name: '精致带队人',
    nickname: '神仙搭子·保姆级团长',
    description: '靠谱到发光，温柔到离谱。路线不累、出片率高、补给管够，不卷不虐，跟你徒步=轻奢山野度假。',
    group: 'G结伴组',
    rarity: '8%',
    imagePath: 'assets/images/GPCS.jpg',
    compatibility: {
      best: ['SPCS', 'GFCS'],
      avoid: ['SFCH', 'SFBH']
    }
  },
  'GPBH': {
    name: '团队治愈官',
    nickname: '山里温柔爹·慢节奏菩萨',
    description: '带队不催命，爬坡不卷速。风景看够休息管够，专治赶路焦虑怪，走一趟心平气和，腿酸都自愈。',
    group: 'G结伴组',
    rarity: '7%',
    imagePath: 'assets/images/GPBH.jpg',
    compatibility: {
      best: ['SPBH', 'GFBH'],
      avoid: ['SFCH', 'GFCH']
    }
  },
  'GPBS': {
    name: '舒适组织者',
    nickname: '团建天花板·摆烂团团长',
    description: '只开平路树荫野餐局，爬升为0快乐拉满。徒步=户外下午茶，情侣闺蜜懒人废腿，全员适配零差评。',
    group: 'G结伴组',
    rarity: '12%',
    imagePath: 'assets/images/GPBS.jpg',
    compatibility: {
      best: ['SPBS', 'GFBS'],
      avoid: ['SFCH', 'SPCH']
    }
  },
  'GFCH': {
    name: '野性搭子王',
    nickname: '临时疯批·说走就走战神',
    description: '没规划但敢冲，没人带但敢野。组队靠缘分，冲线靠热血，又疯又能打，跟你徒步=开刺激盲盒。',
    group: 'G结伴组',
    rarity: '5%',
    imagePath: 'assets/images/GFCH.jpg',
    compatibility: {
      best: ['SFCH', 'GPCH'],
      avoid: ['SPCS', 'GPCS']
    }
  },
  'GFCS': {
    name: '快乐漫游搭子',
    nickname: '徒步气氛组·全程哈哈哈',
    description: '不卷里程不卷强度，全程拍照唠嗑讲段子。走得慢笑得响，徒步=户外社交局，快乐永远第一名。',
    group: 'G结伴组',
    rarity: '10%',
    imagePath: 'assets/images/GFCS.jpg',
    compatibility: {
      best: ['SFCS', 'GPCS'],
      avoid: ['SPCH', 'GPCH']
    }
  },
  'GFBH': {
    name: '山野氛围家',
    nickname: '治愈搭子·陪看风景选手',
    description: '温柔慢热不赶路，陪你看云看山看日落。不催不卷不内卷，情绪低谷期的专属山野陪伴者。',
    group: 'G结伴组',
    rarity: '6%',
    imagePath: 'assets/images/GFBH.jpg',
    compatibility: {
      best: ['SFBH', 'GPBH'],
      avoid: ['SPCH', 'GPCH']
    }
  },
  'GFBS': {
    name: '摆烂社交王',
    nickname: '大众款·徒步摸鱼主流人格',
    description: '全国占比最高，徒步圈正常人。不虐不卷不独行，结伴散步打卡，累了就撤。核心：来山里不是爬山，是出来玩。',
    group: 'G结伴组',
    rarity: '38%',
    imagePath: 'assets/images/GFBS.jpg',
    compatibility: {
      best: ['SFBS', 'GPBS'],
      avoid: ['SPCH', 'GPCH']
    }
  }
};

const DIMENSION_META = [
  {
    name: '能量维度',
    firstLetter: 'S',
    firstLabel: '独行',
    secondLetter: 'G',
    secondLabel: '结伴',
    descriptionMap: {
      S: '你更容易在独处中恢复状态，适合按自己的节奏完成路线。',
      G: '你更容易在互动中保持活力，结伴徒步会提升体验感。'
    }
  },
  {
    name: '行动模式',
    firstLetter: 'P',
    firstLabel: '规划',
    secondLetter: 'F',
    secondLabel: '随性',
    descriptionMap: {
      P: '你偏向先规划后出发，重视路线确定性和风险可控性。',
      F: '你偏向边走边调整，享受过程弹性和未知带来的新鲜感。'
    }
  },
  {
    name: '自然联结',
    firstLetter: 'C',
    firstLabel: '征服',
    secondLetter: 'B',
    secondLabel: '沉浸',
    descriptionMap: {
      C: '你更看重挑战与突破，难度和成就感会明显提升满足感。',
      B: '你更看重在自然中的停留与感受，节奏和体验优先于打卡。'
    }
  },
  {
    name: '耐受风格',
    firstLetter: 'H',
    firstLabel: '硬核',
    secondLetter: 'S',
    secondLabel: '轻享',
    descriptionMap: {
      H: '你对强度和环境的耐受更高，适配高爬升、长距离场景。',
      S: '你更重视舒适与可持续，适配轻量、轻松、体验友好的路线。'
    }
  }
];

// ==================== 核心函数 ====================

/**
 * 计算HBTI人格类型
 * @param {Object} answers - 用户答案对象，键为题目ID，值为分数(1-5)
 * @returns {Object} 包含人格代码、维度分数等信息的对象
 */
function calculateHBTI(answers) {
  // 初始化维度分数
  const dimensionScores = [0, 0, 0, 0];
  const dimensionCounts = [0, 0, 0, 0];

  // 遍历所有题目计算维度分数
  QUESTIONS.forEach(question => {
    const answer = answers[question.id];
    if (answer !== undefined) {
      let score = parseInt(answer);

      // 处理反向题
      if (HBTI_CONFIG.reverseScoringEnabled && question.reverse) {
        score = reverseScore(score);
      }

      dimensionScores[question.dimension] += score;
      dimensionCounts[question.dimension]++;
    }
  });

  // 计算维度平均分
  const dimensionAverages = dimensionScores.map((score, index) => {
    return dimensionCounts[index] > 0 ? score / dimensionCounts[index] : 0;
  });

  // 根据阈值判定每个维度的字母
  const letters = [];
  dimensionAverages.forEach((avg, index) => {
    switch(index) {
      case 0: // 能量维度: S/G
        letters.push(avg >= HBTI_CONFIG.threshold ? 'S' : 'G');
        break;
      case 1: // 行动维度: P/F
        letters.push(avg >= HBTI_CONFIG.threshold ? 'P' : 'F');
        break;
      case 2: // 动机维度: C/B
        letters.push(avg >= HBTI_CONFIG.threshold ? 'C' : 'B');
        break;
      case 3: // 耐受维度: H/S
        letters.push(avg >= HBTI_CONFIG.threshold ? 'H' : 'S');
        break;
    }
  });

  // 组合人格代码
  const personalityCode = letters.join('');

  return {
    code: personalityCode,
    averages: dimensionAverages,
    scores: dimensionScores,
    letters: letters,
    isValid: personalityCode in PERSONALITY_TYPES
  };
}

/**
 * 反转分数（用于反向题）
 * @param {number} score - 原始分数(1-5)
 * @returns {number} 反转后的分数
 */
function reverseScore(score) {
  const min = HBTI_CONFIG.scoreScale.min;
  const max = HBTI_CONFIG.scoreScale.max;
  if (score < min || score > max) return score;
  return max + min - score;
}

/**
 * 获取用户答案
 * @returns {Object} 答案对象
 */
function getUserAnswers() {
  const answers = {};

  // 从表单获取所有答案
  for (let i = 1; i <= HBTI_CONFIG.totalQuestions; i++) {
    const radio = document.querySelector(`input[name="q${i}"]:checked`);
    if (radio) {
      answers[i] = radio.value;
    }
  }

  return answers;
}

/**
 * 计算并显示结果
 */
function calculateScore() {
  console.log('calculateScore called');
  const answers = getUserAnswers();

  // 检查是否完成所有题目
  if (Object.keys(answers).length < HBTI_CONFIG.totalQuestions) {
    alert(`请完成所有${HBTI_CONFIG.totalQuestions}道题目后再提交！`);
    return;
  }

  // 计算HBTI结果
  const result = calculateHBTI(answers);
  console.log('HBTI result:', result.code);

  if (!result.isValid) {
    alert('计算结果异常，请刷新页面重试。');
    return;
  }

  // 保存结果到本地存储，然后跳转到结果页
  localStorage.setItem(HBTI_CONFIG.storageKeys.result, JSON.stringify(result));
  localStorage.setItem(HBTI_CONFIG.storageKeys.answers, JSON.stringify(answers));
  localStorage.removeItem(HBTI_CONFIG.storageKeys.draftAnswers);

  const submitUrl = HBTI_CONFIG.apiEndpoints && HBTI_CONFIG.apiEndpoints.submitResult
    ? HBTI_CONFIG.apiEndpoints.submitResult
    : '';
  console.log('submitUrl:', submitUrl);

  const submitResultToServer = submitUrl
    ? fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: result.code })
      }).then(async response => {
        console.log('submitResult response status:', response.status);
        if (!response.ok) {
          const responseText = await response.text().catch(() => '');
          throw new Error(responseText || `HTTP ${response.status}`);
        }
        return response.json().catch(() => ({}));
      }).catch(error => {
        console.warn('submitResult 上报失败:', error);
      })
    : Promise.resolve();

  submitResultToServer.finally(() => {
    // 跳转到结果页
    window.location.href = 'result.html';
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateMountainMatchScore(result) {
  const averages = result.averages;
  const meanAverage = averages.reduce((sum, val) => sum + val, 0) / averages.length;
  const baseReadiness = scoreToPercent(meanAverage);

  const clarity = averages.reduce((sum, avg) => {
    return sum + (Math.abs(avg - HBTI_CONFIG.threshold) / 2.5) * 100;
  }, 0) / averages.length;

  const variance = averages.reduce((sum, avg) => sum + Math.pow(avg - meanAverage, 2), 0) / averages.length;
  const stdDev = Math.sqrt(variance);
  const balance = clamp(100 - stdDev * 35, 40, 100);

  const finalScore = Math.round(baseReadiness * 0.5 + clarity * 0.3 + balance * 0.2);
  return clamp(finalScore, 50, 99);
}

function renderDimensionAnalysis(result) {
  DIMENSION_META.forEach((meta, index) => {
    const avg = result.averages[index];
    const letter = result.letters[index];
    const forwardPercent = scoreToPercent(avg);
    const isFirstLetter = letter === meta.firstLetter;
    const tendencyPercent = Math.round(isFirstLetter ? forwardPercent : 100 - forwardPercent);
    const tendencyLabel = `${isFirstLetter ? meta.firstLabel : meta.secondLabel}倾向`;
    const tendencyDesc = meta.descriptionMap[letter] || '';

    const letterEl = document.getElementById(`dim-letter-${index}`);
    const descEl = document.getElementById(`dim-desc-${index}`);
    const labelEl = document.getElementById(`dim-label-${index}`);
    const percentEl = document.getElementById(`dim-percent-${index}`);
    const barEl = document.getElementById(`dim-bar-${index}`);

    if (letterEl) letterEl.textContent = letter;
    if (descEl) descEl.textContent = tendencyDesc;
    if (labelEl) labelEl.textContent = tendencyLabel;
    if (percentEl) percentEl.textContent = `${tendencyPercent}%`;
    if (barEl) barEl.style.width = `${tendencyPercent}%`;
  });
}

const COMPATIBILITY_COPY_LIBRARY = {
  SPCH: { bestPrinciple: '你需要能扛强度又不拖节奏的同频搭子。', bestReasonTitle: '匹配关键词：强度同频', bestReasonText: '神仙搭子能跟上你的推进速度，且在关键路段给到有效协同。', avoidPrinciple: '你的冲线思维和佛系节奏天然冲突。', avoidReasonTitle: '冲突关键词：目标断层', avoidReasonText: '避雷组合常在“继续冲还是原地休整”上反复拉扯。' },
  SPCS: { bestPrinciple: '你适配执行稳定、沟通清晰的理性搭子。', bestReasonTitle: '匹配关键词：规则一致', bestReasonText: '神仙搭子尊重计划边界，能把路线执行得干净利落。', avoidPrinciple: '你最怕高随机低约束的临场队友。', avoidReasonTitle: '冲突关键词：计划失控', avoidReasonText: '避雷组合会频繁改线，导致你的准备价值被稀释。' },
  SPBH: { bestPrinciple: '你偏好慢节奏深体验的安静型同行者。', bestReasonTitle: '匹配关键词：沉浸同频', bestReasonText: '神仙搭子愿意停下来感受环境，不催促你赶进度。', avoidPrinciple: '你和冲顶导向队友在动机层面难以统一。', avoidReasonTitle: '冲突关键词：体验错位', avoidReasonText: '避雷组合会把你的沉浸时刻压缩成打卡流程。' },
  SPBS: { bestPrinciple: '你需要能提供松弛感、不过度施压的搭子。', bestReasonTitle: '匹配关键词：舒适优先', bestReasonText: '神仙搭子能接受慢走和休息，不把你拖入强度竞赛。', avoidPrinciple: '你和硬核冲线型队友节奏不兼容。', avoidReasonTitle: '冲突关键词：体能压迫', avoidReasonText: '避雷组合会持续抬高强度，让你体验快速下滑。' },
  SFCH: { bestPrinciple: '你适配行动果断、能临场协同的冒险搭子。', bestReasonTitle: '匹配关键词：机动共振', bestReasonText: '神仙搭子能跟上你的探索冲动，同时守住安全底线。', avoidPrinciple: '你和过度谨慎或流程僵硬的队友难久处。', avoidReasonTitle: '冲突关键词：决策摩擦', avoidReasonText: '避雷组合会在每次路口决策上消耗大量时间与情绪。' },
  SFCS: { bestPrinciple: '你需要轻松、好沟通、愿意边走边调的伙伴。', bestReasonTitle: '匹配关键词：弹性同行', bestReasonText: '神仙搭子能接受随机变化，保持一路轻松不内耗。', avoidPrinciple: '你和高压冲线型领队关系最容易失衡。', avoidReasonTitle: '冲突关键词：节奏挤压', avoidReasonText: '避雷组合会把你的随性空间压缩成刚性任务。' },
  SFBH: { bestPrinciple: '你适配温和安静、愿意慢看风景的搭子。', bestReasonTitle: '匹配关键词：情绪稳定', bestReasonText: '神仙搭子能和你共享沉浸节奏，不打断你的状态流。', avoidPrinciple: '你与高社交高驱动队友容易互相消耗。', avoidReasonTitle: '冲突关键词：社交过载', avoidReasonText: '避雷组合会把安静徒步变成持续外放的社交场。' },
  SFBS: { bestPrinciple: '你适配低压力、可随时调整计划的佛系搭子。', bestReasonTitle: '匹配关键词：松弛同步', bestReasonText: '神仙搭子不会催促强推，能共同守住舒适边界。', avoidPrinciple: '你和卷强度队友在价值观上直接冲突。', avoidReasonTitle: '冲突关键词：目标不兼容', avoidReasonText: '避雷组合会让你在每段路都处于被迫跟跑状态。' },
  GPCH: { bestPrinciple: '你适配执行力高、能承担强度的可靠队员。', bestReasonTitle: '匹配关键词：推进效率', bestReasonText: '神仙搭子能让你的带队效率最大化，减少反复指挥成本。', avoidPrinciple: '你最怕松散无边界的佛系队友拖垮全队。', avoidReasonTitle: '冲突关键词：队伍失速', avoidReasonText: '避雷组合会让计划不断被迫降级，领队压力急剧上升。' },
  GPCS: { bestPrinciple: '你适配有协作意识、重体验质量的队友。', bestReasonTitle: '匹配关键词：协作顺滑', bestReasonText: '神仙搭子配合度高，能一起把行程做得省心又好玩。', avoidPrinciple: '你和纯冒险冲动型队友在风险观上冲突明显。', avoidReasonTitle: '冲突关键词：风险偏好分裂', avoidReasonText: '避雷组合容易把稳妥计划拖向不可控试探。' },
  GPBH: { bestPrinciple: '你适配共情能力高、节奏温和的同行者。', bestReasonTitle: '匹配关键词：照顾同频', bestReasonText: '神仙搭子会主动顾及队友情绪与体能，整体体验更柔和。', avoidPrinciple: '你和高压催速队友在带队理念上南辕北辙。', avoidReasonTitle: '冲突关键词：理念冲突', avoidReasonText: '避雷组合会破坏你营造的安全感和从容氛围。' },
  GPBS: { bestPrinciple: '你适配轻松友好、愿意配合团体节奏的伙伴。', bestReasonTitle: '匹配关键词：团建友好', bestReasonText: '神仙搭子能兼顾互动和效率，让每个人都不掉队。', avoidPrinciple: '你和极端硬核派在目标设定上几乎无法统一。', avoidReasonTitle: '冲突关键词：强度错配', avoidReasonText: '避雷组合会把休闲局变成高压体能考核。' },
  GFCH: { bestPrinciple: '你适配敢冲且能听指令的高能伙伴。', bestReasonTitle: '匹配关键词：高机动协同', bestReasonText: '神仙搭子能与你共同冒险，但不会忽视团队安全边界。', avoidPrinciple: '你和保守慢热队友在推进方式上冲突剧烈。', avoidReasonTitle: '冲突关键词：推进矛盾', avoidReasonText: '避雷组合会让行程在“冲不冲”之间持续卡顿。' },
  GFCS: { bestPrinciple: '你适配气氛轻松、表达直接的社交型搭子。', bestReasonTitle: '匹配关键词：快乐共振', bestReasonText: '神仙搭子能把互动和行程节奏平衡得恰到好处。', avoidPrinciple: '你和独狼冲线型人格在社交需求上分歧明显。', avoidReasonTitle: '冲突关键词：互动断层', avoidReasonText: '避雷组合往往一个想交流，一个只想埋头赶路。' },
  GFBH: { bestPrinciple: '你适配温柔耐心、愿意陪伴式徒步的搭子。', bestReasonTitle: '匹配关键词：陪伴感', bestReasonText: '神仙搭子能与你共同维护慢节奏和好情绪。', avoidPrinciple: '你和高压目标导向队友在过程体验上冲突大。', avoidReasonTitle: '冲突关键词：过程被压缩', avoidReasonText: '避雷组合会把你的治愈路线压成效率导向流程。' },
  GFBS: { bestPrinciple: '你适配普适型、可协商、好磨合的队友。', bestReasonTitle: '匹配关键词：大众兼容', bestReasonText: '神仙搭子能快速形成共识，活动组织成本低。', avoidPrinciple: '你和极端卷王在节奏与目标上最容易爆冲突。', avoidReasonTitle: '冲突关键词：强度压制', avoidReasonText: '避雷组合会让原本轻松的局面变成持续拉扯。' }
};

function renderCompatibility(personalityCode) {
  const personality = PERSONALITY_TYPES[personalityCode];
  if (!personality || !personality.compatibility) {
    return;
  }

  const bestList = personality.compatibility.best || [];
  const avoidList = personality.compatibility.avoid || [];
  const bestCode = bestList[0];
  const avoidCode = avoidList[0];
  const backupBestCode = bestList[1];
  const backupAvoidCode = avoidList[1];
  const bestType = PERSONALITY_TYPES[bestCode];
  const avoidType = PERSONALITY_TYPES[avoidCode];
  const copy = COMPATIBILITY_COPY_LIBRARY[personalityCode] || {};

  if (bestCode && bestType) {
    const bestCodeEl = document.getElementById('best-code');
    const bestNameEl = document.getElementById('best-name');
    const bestPrincipleEl = document.getElementById('best-principle');
    const bestReasonTitleEl = document.getElementById('best-reason-title');
    const bestReasonTextEl = document.getElementById('best-reason-text');

    if (bestCodeEl) bestCodeEl.textContent = bestCode;
    if (bestNameEl) bestNameEl.textContent = bestType.name;
    if (bestReasonTitleEl) bestReasonTitleEl.textContent = copy.bestReasonTitle || '匹配关键词：节奏适配';
    if (bestReasonTextEl) bestReasonTextEl.textContent = copy.bestReasonText || '你们在关键维度上更容易形成协同，同行体验更稳定。';
    if (bestPrincipleEl) {
      const backupText = backupBestCode && PERSONALITY_TYPES[backupBestCode]
        ? `备选搭子：${backupBestCode} ${PERSONALITY_TYPES[backupBestCode].name}。`
        : '';
      bestPrincipleEl.textContent = `${copy.bestPrinciple || '匹配原则：目标同频、节奏可协商。'}${backupText}`;
    }
  }

  if (avoidCode && avoidType) {
    const avoidCodeEl = document.getElementById('avoid-code');
    const avoidNameEl = document.getElementById('avoid-name');
    const avoidPrincipleEl = document.getElementById('avoid-principle');
    const avoidReasonTitleEl = document.getElementById('avoid-reason-title');
    const avoidReasonTextEl = document.getElementById('avoid-reason-text');

    if (avoidCodeEl) avoidCodeEl.textContent = avoidCode;
    if (avoidNameEl) avoidNameEl.textContent = avoidType.name;
    if (avoidReasonTitleEl) avoidReasonTitleEl.textContent = copy.avoidReasonTitle || '冲突关键词：节奏冲突';
    if (avoidReasonTextEl) avoidReasonTextEl.textContent = copy.avoidReasonText || '你们在关键决策点上容易互相拉扯，消耗体验。';
    if (avoidPrincipleEl) {
      const backupText = backupAvoidCode && PERSONALITY_TYPES[backupAvoidCode]
        ? `备选避雷：${backupAvoidCode} ${PERSONALITY_TYPES[backupAvoidCode].name}。`
        : '';
      avoidPrincipleEl.textContent = `${copy.avoidPrinciple || '避雷原则：强冲突维度尽量避免绑定同行。'}${backupText}`;
    }
  }
}

const PERSONALITY_ADVICE_LIBRARY = {
  SPCH: {
    routeTitle: '孤狼冲顶路线',
    teamTitle: '独行执行建议',
    gearTitle: '硬核装备策略',
    routeItems: ['选择高爬升长距离的挑战线，目标明确直冲核心点', '优先技术点密集路线，保留体能给关键爬坡段', '采用双轨迹方案：主攻线 + 紧急下撤线'],
    teamItems: ['优先独行，确需组队只接受强执行力小队', '出发前把节奏和时间窗一次说清，途中不反复讨论', '选择目标一致、强度同频的小队搭档'],
    gearItems: ['鞋包杖以稳定性优先，牺牲部分舒适换通过效率', '高热量快补给 + 电解质按强度上限准备', '装备以功能优先，压缩装饰性负重']
  },
  SPCS: {
    routeTitle: '精确控场路线',
    teamTitle: '低噪组队建议',
    gearTitle: '精简可靠装备',
    routeItems: ['优先路标清晰、风险可控的中高强度路线', '按路段分配时间预算，关键节点预留容错', '错峰出发，减少拥堵导致的节奏波动'],
    teamItems: ['可以1-2人小队，但要提前统一规则', '共享轨迹、补给、回撤点，减少临场沟通成本', '优先选择执行稳定、改线克制的队友'],
    gearItems: ['轻量化优先，但核心安全件必须冗余一份', '装备按功能分层打包，取用顺序固定化', '新装备先低风险磨合再上强度路线']
  },
  SPBH: {
    routeTitle: '静修沉浸路线',
    teamTitle: '低互动同行建议',
    gearTitle: '耐久安静装备',
    routeItems: ['优先景观连续、节奏平稳的长线沉浸路线', '安排足够停留点，以感受为主不追速度', '选择人少时段和低噪音环境'],
    teamItems: ['可独行或与同频慢节奏搭子同行', '提前说明“少说话、少打卡”的偏好', '优先选择安静、不催促的同行者'],
    gearItems: ['舒适耐久优先，保持装备节奏与体验目标一致', '补给以稳定续航为主，少刺激性高糖冲击', '摄影与徒步装备按负重上限平衡配置']
  },
  SPBS: {
    routeTitle: '治愈回血路线',
    teamTitle: '松弛同行建议',
    gearTitle: '轻享舒适装备',
    routeItems: ['选择低爬升风景线，以放松和恢复为目标', '把里程压在舒适区，允许临时缩短路线', '优先可随时下撤和补给方便的区域'],
    teamItems: ['建议独行或和节奏慢的固定搭子同行', '出发前说明不赶路、不卷里程', '选择体验导向一致的轻松型队友'],
    gearItems: ['鞋服以舒适透气为先，减少关节负担', '补给准备热饮和易消化零食，保持体感稳定', '控制器材总量，把负重留在舒适区间']
  },
  SFCH: {
    routeTitle: '野性探索路线',
    teamTitle: '自由冒险建议',
    gearTitle: '机动防护装备',
    routeItems: ['优先可探索支线的野趣路线，保留临场选择权', '主路线设硬性回撤时限，防止过度冒进', '挑战段前做一次风险复盘再推进'],
    teamItems: ['组队宜小而灵活，队员要接受临场调整', '设定最低安全规则，其他保持自由决策', '优先和机动性高、接受探索风格的队友结伴'],
    gearItems: ['兼顾机动和防护，雨具头灯急救包必须齐全', '补给按“比计划多一档”准备，防突发拉长行程', '轻量化同时保留关键安全冗余']
  },
  SFCS: {
    routeTitle: '随缘漫游路线',
    teamTitle: '轻社交建议',
    gearTitle: '轻便灵活装备',
    routeItems: ['选风景密度高、分叉可选多的轻中强度路线', '给路线留足机动时间，不做刚性卡点', '优先交通便利、可提前收队的目的地'],
    teamItems: ['适合2-4人轻松队，边走边聊边调整', '把“开心优先”写进出发共识', '优先与弹性节奏、轻社交队友长期搭配'],
    gearItems: ['轻量日行装备即可，重点保证防晒防雨', '补给以便携零食 + 基础电解质为主', '装备按“高频必用”原则精简打包']
  },
  SFBH: {
    routeTitle: '慢走共生路线',
    teamTitle: '安静陪伴建议',
    gearTitle: '长时舒适装备',
    routeItems: ['选择林线、溪谷、草甸等沉浸感强的路线', '里程安排偏保守，把时间留给停留和观察', '尽量避开高峰客流和商业化打卡点'],
    teamItems: ['可独行，也可与一位同频搭子慢节奏同行', '设定少量关键汇合点，其余自由漫游', '把行程组织在低社交密度的舒缓氛围中'],
    gearItems: ['着装优先体感稳定，温差管理要到位', '补给以低负担持续供能为主，不追刺激补能', '摄影设备轻量化，优先保障行走舒适度']
  },
  SFBS: {
    routeTitle: '躺平休闲路线',
    teamTitle: '佛系出行建议',
    gearTitle: '省力懒人装备',
    routeItems: ['优先平路短线和树荫路线，体力消耗可控', '把“随时结束”作为默认选项', '选择停车与补给方便的郊野线路'],
    teamItems: ['1-3人小队最舒适，协同成本低', '只和不催促、不内卷的队友同行', '出发前锁定轻松路线，减少临时加码干扰'],
    gearItems: ['装备从简但不省安全件：雨具、头灯、急救必带', '补给轻便高频，防止低血糖影响体验', '器材总负重控制在体能阈值以内']
  },
  GPCH: {
    routeTitle: '带队攻坚路线',
    teamTitle: '队伍管理建议',
    gearTitle: '领队保障装备',
    routeItems: ['选有明确阶段目标的高强度线路，便于分段推进', '提前规划领队位、收队位和机动位', '关键风险点设统一通过策略'],
    teamItems: ['出发前明确队规和节奏边界，统一行动口令', '沿途固定时间做人数与状态检查', '优先筛选执行力稳定、可配合指令的队员'],
    gearItems: ['除个人装备外补充队伍级应急物资', '通讯、照明、急救优先级高于轻量化', '把强度推进与队伍续航管理同步规划']
  },
  GPCS: {
    routeTitle: '精致团行路线',
    teamTitle: '保姆型带队建议',
    gearTitle: '均衡实用装备',
    routeItems: ['优先中等强度且景观反馈高的路线', '把拍照点、补给点、休整点纳入行程设计', '控制单日节奏，保证全员完成体验'],
    teamItems: ['适合3-6人小团，提前分配拍照与导航角色', '途中多做状态确认，及时调速', '队伍组成优先体验导向一致的成员结构'],
    gearItems: ['个人轻量 + 团队共享装备组合最优', '补给准备兼顾口味和功能，照顾队友差异', '精致与负重做平衡，确保全队节奏稳定']
  },
  GPBH: {
    routeTitle: '治愈陪伴路线',
    teamTitle: '温和协作建议',
    gearTitle: '舒适安全装备',
    routeItems: ['选择风景稳定、坡度友好的治愈路线', '节奏按全队最慢者校准，减少焦虑感', '把停留体验作为正式行程的一部分'],
    teamItems: ['适合新手混编队，强调互相照顾', '及时鼓励与反馈，保持队伍情绪在线', '优先与温和控速、共情能力强的领队协同'],
    gearItems: ['保暖、防雨、护膝等舒适安全件优先', '补给强调热量和水分的稳定补充', '预算优先投入实用型装备和关键防护件']
  },
  GPBS: {
    routeTitle: '团建友好路线',
    teamTitle: '轻松组局建议',
    gearTitle: '轻社交装备',
    routeItems: ['选择低门槛高出片路线，兼顾拍照与闲逛', '优先可半日完成且交通方便的线路', '设置弹性终点，便于不同体能收队'],
    teamItems: ['适合朋友局、情侣局、亲子局混编', '明确“体验第一，不拼速度”的规则', '把活动定位稳定在休闲体验层级'],
    gearItems: ['轻便舒适优先，备齐防晒防雨与基础药品', '补给偏休闲型但要有功能性兜底', '装备按休闲场景配置，兼顾轻便与安全']
  },
  GFCH: {
    routeTitle: '热血盲盒路线',
    teamTitle: '高能协作建议',
    gearTitle: '快节奏装备',
    routeItems: ['选择刺激感强但回撤通道明确的线路', '允许探索支线，但必须设置返程死线', '关键路段前统一通过策略，确保队伍同进同退'],
    teamItems: ['适合行动力高的临时小队', '保持高频信息同步，防止分组走散', '优先与果断高效、响应快的队友混编'],
    gearItems: ['轻量机动为主，同时保留必要防护', '补给按高输出场景准备，防止后程掉电', '冲刺计划同步配置夜归与天气应对能力']
  },
  GFCS: {
    routeTitle: '快乐社交路线',
    teamTitle: '气氛组建议',
    gearTitle: '拍玩兼顾装备',
    routeItems: ['优先风景变化丰富、互动感强的路线', '安排拍照和休整窗口，保证节奏松弛', '中途可按团队状态灵活缩放里程'],
    teamItems: ['适合3-8人社交型队伍，角色分工轻量', '鼓励交流但要保留安静行走时段', '优先与快乐导向、节奏可协商的队友组队'],
    gearItems: ['装备以舒适 + 拍摄便捷为主', '补给多样化，兼顾口味与基础功能', '器材精简到不影响队伍整体推进速度']
  },
  GFBH: {
    routeTitle: '氛围疗愈路线',
    teamTitle: '陪伴型建议',
    gearTitle: '温和续航装备',
    routeItems: ['优先日落、林线、溪谷等氛围感路线', '节奏慢一点，把景观停留当主任务', '适合半日到一日的轻中强度线路'],
    teamItems: ['选择情绪稳定、沟通温和的队友', '把照顾彼此状态放在效率之前', '优先与过程体验导向一致的队友混搭'],
    gearItems: ['装备注重体感与温差适应性', '补给强调持续稳定，不追求爆发型能量', '轻量化同时保留舒适冗余，稳定全程体感']
  },
  GFBS: {
    routeTitle: '大众友好路线',
    teamTitle: '通用搭子建议',
    gearTitle: '实用均衡装备',
    routeItems: ['选择经典轻徒步线路，安全和体验优先', '把行程控制在大多数人可完成区间', '提前准备可选短线，便于分层活动'],
    teamItems: ['适合多数朋友混编队，规则简单明确', '设定统一集合和返程时间，减少混乱', '通过分层安排保障全队节奏的普适兼容性'],
    gearItems: ['通用型装备最优：舒适鞋服 + 基础安全件', '补给按“少量多次”分配，兼顾新人体验', '装备升级以功能收益为准，控制成本与负重']
  }
};

const PERSONALITY_ADVICE_AVOID_LIBRARY = {
  SPCH: { routeAvoidItems: ['避免无补给评估就硬冲超长线', '避免天气恶化仍强行推进技术段', '避免连续高强度行程不留恢复窗'], teamAvoidItems: ['避免与轻享节奏队友深度捆绑', '避免出发前不明确节奏边界', '避免途中反复争论路线目标'], gearAvoidItems: ['避免极简到缺失应急安全件', '避免新装备未经磨合直接上强线', '避免补给热量低估导致后程崩盘'] },
  SPCS: { routeAvoidItems: ['避免临时改线频繁导致计划失真', '避免忽略替代方案只押单路线', '避免过度追求完美计划错过出发时机'], teamAvoidItems: ['避免与无规则临场派长期绑定', '避免角色分工不清造成责任悬空', '避免信息不同步引发决策断层'], gearAvoidItems: ['避免装备清单过度膨胀增重', '避免关键装备只带单份无冗余', '避免忽略防雨保暖等基础件'] },
  SPBH: { routeAvoidItems: ['避免强打卡导向压缩停留体验', '避免客流高峰时段进入热门线', '避免连续高噪音商业线路影响沉浸'], teamAvoidItems: ['避免高社交、高外放团队', '避免被催速型队友牵着走', '避免临时加入目标不一致队伍'], gearAvoidItems: ['避免过重摄影器材干扰行走', '避免竞速型装备牺牲体感', '避免补给刺激过强影响稳定节奏'] },
  SPBS: { routeAvoidItems: ['避免高爬升高暴露硬核线', '避免无下撤点的封闭长线', '避免连续多日高负荷行程'], teamAvoidItems: ['避免与冲顶派同队被迫加速', '避免大团人多决策混乱', '避免“来都来了”式硬撑文化'], gearAvoidItems: ['避免背负超出舒适阈值', '避免忽视防晒补水基础配置', '避免为了颜值选择功能不足装备'] },
  SFCH: { routeAvoidItems: ['避免探索支线无返程死线', '避免无天气窗口判断就入野路', '避免越级挑战超出经验上限'], teamAvoidItems: ['避免队内风险偏好差距过大', '避免无最低安全规则的自由行动', '避免临场失联后仍分散推进'], gearAvoidItems: ['避免机动优先到牺牲防护', '避免轻量化过头缺急救照明', '避免补给只按理想时长准备'] },
  SFCS: { routeAvoidItems: ['避免把弹性路线做成刚性打卡', '避免无机动时间的紧凑行程', '避免后半程交通衔接过紧'], teamAvoidItems: ['避免高压效率队伍绑定', '避免多人意见不统一却不设决策机制', '避免边走边改却不共享信息'], gearAvoidItems: ['避免携带过多闲置器材', '避免忽视突发天气防护', '避免补给过少导致后程疲软'] },
  SFBH: { routeAvoidItems: ['避免高强度连坡破坏沉浸节奏', '避免纯打卡线路缺少停留空间', '避免高峰拥挤时段影响体验'], teamAvoidItems: ['避免强社交团建型队伍', '避免催速领队主导全程', '避免频繁换队友导致节奏不稳'], gearAvoidItems: ['避免温差管理不足导致体感崩塌', '避免重负重压缩慢走体验', '避免补给波动大影响情绪状态'] },
  SFBS: { routeAvoidItems: ['避免越级报名高难虐线', '避免日照暴晒且无避险点路线', '避免无撤退预案的远距离线路'], teamAvoidItems: ['避免跟随卷王节奏强撑', '避免多人局临时加码强度', '避免不设返程时间拖到夜归'], gearAvoidItems: ['避免省掉头灯雨具急救等底线装备', '避免穿新鞋长线首秀', '避免补给太随意导致低血糖'] },
  GPCH: { routeAvoidItems: ['避免路线强度超出队伍均值太多', '避免关键风险点无统一通行方案', '避免忽视回撤窗口导致被动'], teamAvoidItems: ['避免临时塞入明显不匹配成员', '避免队规不明确导致执行松散', '避免只催速度忽略队员状态'], gearAvoidItems: ['避免只顾轻量化忽略团队应急', '避免通讯与照明冗余不足', '避免补给分配不均造成掉队'] },
  GPCS: { routeAvoidItems: ['避免景观与强度失衡导致体验割裂', '避免行程节点过密留白不足', '避免忽略替代点位影响容错'], teamAvoidItems: ['避免角色分工模糊导致低效', '避免队内需求差异未提前对齐', '避免临场改计划不做全员确认'], gearAvoidItems: ['避免过度精致化增加负重', '避免共享物资无人负责', '避免药品与保暖等底线配置缺失'] },
  GPBH: { routeAvoidItems: ['避免高压赶路破坏治愈感', '避免强刺激地形持续堆叠', '避免停留点不足导致情绪紧绷'], teamAvoidItems: ['避免高压催促型队友主导', '避免忽略新手体能边界', '避免情绪低落队员无人关注'], gearAvoidItems: ['避免只追轻量忽视舒适', '避免补水补盐节奏不稳定', '避免缺少基础护理与防护件'] },
  GPBS: { routeAvoidItems: ['避免把休闲线临时升级成挑战线', '避免起终点交通不便导致疲惫', '避免大团单路线无分层方案'], teamAvoidItems: ['避免强度党绑架全队节奏', '避免集合与返程时间不清', '避免无明确领队导致组织混乱'], gearAvoidItems: ['避免硬核器材挤占轻社交空间', '避免基础防护件准备不足', '避免补给只顾口味忽略功能'] },
  GFCH: { routeAvoidItems: ['避免盲冲未知路段无风险复核', '避免返程时间线缺失', '避免连续决策失误后仍硬推'], teamAvoidItems: ['避免分组后信息断联', '避免意见冲突无拍板机制', '避免与极慢节奏队伍强行同频'], gearAvoidItems: ['避免冲刺心态下忽视防护装备', '避免电量与照明准备不足', '避免补给单一导致能量断崖'] },
  GFCS: { routeAvoidItems: ['避免社交点过多导致行程失控', '避免里程安排脱离队员体能', '避免无雨备方案的户外活动'], teamAvoidItems: ['避免队伍过大缺少组织角色', '避免高频聊天忽视路径信息', '避免把社交局硬改成冲线局'], gearAvoidItems: ['避免拍摄器材过多拖慢队伍', '避免忽略功能型补给和水盐', '避免只看外观忽视鞋服适配'] },
  GFBH: { routeAvoidItems: ['避免过长路线挤占情绪恢复空间', '避免噪音环境破坏氛围感', '避免高风险地形连续叠加'], teamAvoidItems: ['避免情绪波动大队友主导节奏', '避免关键信息不透明引发焦虑', '避免目标导向过强压过陪伴价值'], gearAvoidItems: ['避免体感不稳的激进轻量方案', '避免保暖防雨缺失导致体验崩塌', '避免补给节奏断档影响心态'] },
  GFBS: { routeAvoidItems: ['避免为少数人诉求抬高全队强度', '避免里程过长导致后段集体掉速', '避免缺少短线分流方案'], teamAvoidItems: ['避免组织规则过松造成无序', '避免队内目标分裂却不协调', '避免高压催速引发团队情绪对立'], gearAvoidItems: ['避免低配到失去安全边界', '避免补给不足造成中后程崩盘', '避免盲目升级高价装备增加负担'] }
};

function getAdviceByCode(personalityCode) {
  const advice = PERSONALITY_ADVICE_LIBRARY[personalityCode];
  const avoidAdvice = PERSONALITY_ADVICE_AVOID_LIBRARY[personalityCode];
  if (advice) {
    return {
      ...advice,
      routeAvoidItems: avoidAdvice ? avoidAdvice.routeAvoidItems : [],
      teamAvoidItems: avoidAdvice ? avoidAdvice.teamAvoidItems : [],
      gearAvoidItems: avoidAdvice ? avoidAdvice.gearAvoidItems : []
    };
  }

  return {
    routeTitle: '推荐路线类型',
    teamTitle: '组队建议',
    gearTitle: '装备策略',
    routeItems: ['优先选择安全、信息清晰的成熟路线', '根据体能分配节奏，保持前后程输出稳定', '保留回撤方案，动态评估天气与风险'],
    teamItems: ['出发前统一预期：目标、节奏、返程时间', '途中固定报平安节点，减少信息断层', '优先与节奏相近、目标一致的队友同行'],
    gearItems: ['优先基础安全件：照明、雨具、急救、保暖', '补给以稳定续航为主，少量多次', '按路线强度选择鞋包与防护配置'],
    routeAvoidItems: ['避免无天气评估就盲目出发', '避免没有回撤路线的封闭线', '避免体能与路线难度严重错配'],
    teamAvoidItems: ['避免临场改计划却不通知队友', '避免职责不清导致安全盲区', '避免节奏冲突仍强行同队'],
    gearAvoidItems: ['避免缺失基础安全件', '避免负重超出体能阈值', '避免补给配置与强度失配']
  };
}

function setAdviceItem(elementId, text, isAvoid = false) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  const iconClass = isAvoid ? 'fas fa-times text-red-500 mr-2' : 'fas fa-check text-green-500 mr-2';
  element.innerHTML = `<i class="${iconClass}"></i>${text}`;
}

function renderHikingAdvice(personalityCode) {
  const advice = getAdviceByCode(personalityCode);

  const routeTitleEl = document.getElementById('advice-route-title');
  const teamTitleEl = document.getElementById('advice-team-title');
  const gearTitleEl = document.getElementById('advice-gear-title');

  if (routeTitleEl) routeTitleEl.textContent = advice.routeTitle;
  if (teamTitleEl) teamTitleEl.textContent = advice.teamTitle;
  if (gearTitleEl) gearTitleEl.textContent = advice.gearTitle;

  setAdviceItem('advice-route-1', advice.routeItems[0], false);
  setAdviceItem('advice-route-2', advice.routeItems[1], false);
  setAdviceItem('advice-route-3', advice.routeItems[2], false);
  setAdviceItem('advice-route-4', advice.routeAvoidItems[0], true);
  setAdviceItem('advice-route-5', advice.routeAvoidItems[1], true);
  setAdviceItem('advice-route-6', advice.routeAvoidItems[2], true);

  setAdviceItem('advice-team-1', advice.teamItems[0], false);
  setAdviceItem('advice-team-2', advice.teamItems[1], false);
  setAdviceItem('advice-team-3', advice.teamItems[2], false);
  setAdviceItem('advice-team-4', advice.teamAvoidItems[0], true);
  setAdviceItem('advice-team-5', advice.teamAvoidItems[1], true);
  setAdviceItem('advice-team-6', advice.teamAvoidItems[2], true);

  setAdviceItem('advice-gear-1', advice.gearItems[0], false);
  setAdviceItem('advice-gear-2', advice.gearItems[1], false);
  setAdviceItem('advice-gear-3', advice.gearItems[2], false);
  setAdviceItem('advice-gear-4', advice.gearAvoidItems[0], true);
  setAdviceItem('advice-gear-5', advice.gearAvoidItems[1], true);
  setAdviceItem('advice-gear-6', advice.gearAvoidItems[2], true);
}

/**
 * 在结果页显示人格信息
 */
function displayPersonalityResult() {
  const resultData = localStorage.getItem('hbti_result');

  if (!resultData) {
    // 没有结果数据，跳回测试页
    window.location.href = 'test.html';
    return;
  }

  const result = JSON.parse(resultData);
  const personality = PERSONALITY_TYPES[result.code];

  if (!personality) {
    console.error('未知的人格类型:', result.code);
    return;
  }

  // 更新页面元素
  document.getElementById('type-code').textContent = result.code;
  document.getElementById('type-name').textContent = personality.name;
  document.getElementById('type-nickname').textContent = `外号：${personality.nickname}`;
  document.getElementById('type-description').textContent = personality.description;

  const typeImage = document.getElementById('type-image');
  if (typeImage) {
    typeImage.src = personality.imagePath;
    typeImage.alt = `${result.code} ${personality.name}`;
  }

  const mountainMatchScore = calculateMountainMatchScore(result);
  const matchScoreEl = document.getElementById('mountain-match-score');
  if (matchScoreEl) {
    matchScoreEl.textContent = `${mountainMatchScore}%`;
  }

  renderDimensionAnalysis(result);
  renderCompatibility(result.code);
  renderHikingAdvice(result.code);

  // 更新页面标题
  document.title = `hbti结果 - ${result.code} ${personality.name}｜徒步人格测试`;
}

/**
 * 获取人格类型数据
 * @param {string} code - 人格代码
 * @returns {Object} 人格数据对象
 */
function getPersonalityData(code) {
  return PERSONALITY_TYPES[code] || null;
}

/**
 * 获取所有题目数据
 * @returns {Array} 题目数据数组
 */
function getQuestionsData() {
  return QUESTIONS;
}

/**
 * 获取配置信息
 * @returns {Object} 配置对象
 */
function getConfig() {
  return HBTI_CONFIG;
}

// ==================== 工具函数 ====================

/**
 * 格式化分数为百分比
 * @param {number} score - 分数(0-5)
 * @returns {number} 百分比(0-100)
 */
function scoreToPercent(score) {
  return Math.min(100, Math.max(0, (score / 5) * 100));
}

/**
 * 生成随机测试数据（用于演示）
 * @returns {Object} 随机答案对象
 */
function generateRandomAnswers() {
  const answers = {};
  for (let i = 1; i <= HBTI_CONFIG.totalQuestions; i++) {
    answers[i] = Math.floor(Math.random() * 5) + 1;
  }
  return answers;
}

/**
 * 导出结果到JSON
 * @param {Object} result - HBTI结果对象
 * @returns {string} JSON字符串
 */
function exportResultToJSON(result) {
  const personality = PERSONALITY_TYPES[result.code];
  const exportData = {
    hbti: result.code,
    personality: personality,
    dimensionScores: result.averages.map((avg, i) => ({
      dimension: HBTI_CONFIG.dimensions[i],
      code: HBTI_CONFIG.dimensionCodes[i],
      average: avg,
      percent: scoreToPercent(avg)
    })),
    timestamp: new Date().toISOString(),
    version: HBTI_CONFIG.version
  };

  return JSON.stringify(exportData, null, 2);
}

// ==================== 全局导出 ====================
// 将核心函数暴露给全局作用域
window.HBTI = {
  calculateScore,
  calculateHBTI,
  displayPersonalityResult,
  getPersonalityData,
  getQuestionsData,
  getConfig,
  generateRandomAnswers,
  exportResultToJSON,
  PERSONALITY_TYPES,
  QUESTIONS,
  CONFIG: HBTI_CONFIG
};

// ==================== 页面加载初始化 ====================
// 如果当前页面是结果页，自动显示结果
if (window.location.pathname.includes('result.html')) {
  document.addEventListener('DOMContentLoaded', displayPersonalityResult);
}

// 控制台提示
console.log('hbti徒步人格测试核心脚本已加载');
console.log('版本:', HBTI_CONFIG.version);
console.log('可用函数: window.HBTI.calculateScore(), window.HBTI.displayPersonalityResult()');