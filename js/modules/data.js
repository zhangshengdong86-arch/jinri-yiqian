/**
 * 占位内容数据
 * ------------------------------------------------------------------
 * 说明：本文件为「结构占位 + 少量示例」，用于打通全部页面链路。
 *       正式上线前需按 docs/数据清单 替换为全量数据，缺失量级已标注。
 *       所有文案均为示例，且已规避「准确/注定/化解」等禁用表述。
 * ------------------------------------------------------------------
 * 转写说明：由 utils/data.js 转写，module.exports → JY.data；数据一字未改。
 *   - require('./db/hexagrams.js') → 惰性 JY.dbHexagrams
 *   - require('./db/tarot.js')     → 惰性 JY.dbTarot
 *   因为 index.html 中 data.js 先于 db/*.js 加载，导出键 HEXAGRAMS / TAROT_CARDS
 *   改为 getter 惰性求值（首次访问时 db 文件已就绪），取值与原文完全一致；
 *   TAROT_CARDS 原「].concat(MINOR_EXTRA)」与 emoji/元素打标循环随之移到首次取用时执行。
 */
JY.data = (function () {

/** 全局娱乐声明：任何结果页、分享位都必须携带 */
const NOTICE = {
  short: '小编创作不易，感谢支持',
  // 结果页徽章专用：结果页正文已含完整免责声明，徽章须保留娱乐声明字样
  badge: '本内容仅供娱乐',
  full: '本内容仅供娱乐，不构成任何决策依据。所有结果由规则与内容库生成，请理性看待。',
  share: '仅供娱乐 · 不构成任何决策依据',
  health: '健康相关描述为通用提示，如有不适请及时就医。'
}

/* ============================ 一、卜卦 ============================ */

/** 八卦基础（全量 8 条，已完整） */
const TRIGRAMS = [
  { id: 1, name: '乾', symbol: '☰', nature: '天', element: '金', num: 1, key: '刚健' },
  { id: 2, name: '兑', symbol: '☱', nature: '泽', element: '金', num: 2, key: '悦' },
  { id: 3, name: '离', symbol: '☲', nature: '火', element: '火', num: 3, key: '丽' },
  { id: 4, name: '震', symbol: '☳', nature: '雷', element: '木', num: 4, key: '动' },
  { id: 5, name: '巽', symbol: '☴', nature: '风', element: '木', num: 5, key: '入' },
  { id: 6, name: '坎', symbol: '☵', nature: '水', element: '水', num: 6, key: '陷' },
  { id: 7, name: '艮', symbol: '☶', nature: '山', element: '土', num: 7, key: '止' },
  { id: 8, name: '坤', symbol: '☷', nature: '地', element: '土', num: 8, key: '顺' }
]

/** 六十四卦完整内容库：64 卦，独立文件维护，见 utils/db/hexagrams.js */
// 转写：const HEXAGRAMS = require('./db/hexagrams.js') → 惰性（data.js 先于 db 文件加载）
var HEXAGRAMS = null
function hexagramsLoaded() {
  if (!HEXAGRAMS) HEXAGRAMS = JY.dbHexagrams
  return HEXAGRAMS
}

/** 塔罗小阿尔卡纳补充：40 张，与原 38 张凑齐 78 张，见 utils/db/tarot.js */
// 转写：const MINOR_EXTRA = require('./db/tarot.js') → 惰性（data.js 先于 db 文件加载）
var MINOR_EXTRA = null
function minorLoaded() {
  if (!MINOR_EXTRA) MINOR_EXTRA = JY.dbTarot
  return MINOR_EXTRA
}

/** 六爻起卦规则（铜钱法） */
const COIN_RULES = {
  desc: '三枚铜钱掷一次成一爻，自下而上共六次',
  mapping: [
    { key: 'laoyang', coins: '3 背', name: '老阳', yin: false, moving: true, mark: '○' },
    { key: 'shaoyin', coins: '2 背 1 字', name: '少阴', yin: true, moving: false, mark: '- -' },
    { key: 'shaoyang', coins: '2 字 1 背', name: '少阳', yin: false, moving: false, mark: '—' },
    { key: 'laoyin', coins: '3 字', name: '老阴', yin: true, moving: true, mark: '×' }
  ],
  movingTip: '老阴、老阳为动爻，阳极变阴、阴极变阳'
}

/** 梅花易数起卦方式 */
const MEIHUA_METHODS = [
  { key: 'number', name: '数字起卦', desc: '心中默念所问之事，随意报两个数字', hint: '示例：23 与 17' },
  { key: 'time', name: '时间起卦', desc: '以提问当下的年月日时起卦', hint: '自动读取当前时间' },
  { key: 'text', name: '字数起卦', desc: '以一句话的字数分上下卦', hint: '输入不超过 20 字' }
]

/* ============================ 二、星座 ============================ */

/** 十二星座档案（全量 12 条，已完整；性格长文待补） */
const ZODIACS = [
  { id: 'aries', name: '白羊座', en: 'Aries', range: '3.21 - 4.19', element: '火', mode: '基本', ruler: '火星', symbol: '♈', color: '正红', number: 9, stone: '红宝石', keywords: ['行动', '直率', '开创'] },
  { id: 'taurus', name: '金牛座', en: 'Taurus', range: '4.20 - 5.20', element: '土', mode: '固定', ruler: '金星', symbol: '♉', color: '苔绿', number: 6, stone: '翡翠', keywords: ['稳定', '务实', '感官'] },
  { id: 'gemini', name: '双子座', en: 'Gemini', range: '5.21 - 6.21', element: '风', mode: '变动', ruler: '水星', symbol: '♊', color: '浅黄', number: 5, stone: '玛瑙', keywords: ['好奇', '灵活', '表达'] },
  { id: 'cancer', name: '巨蟹座', en: 'Cancer', range: '6.22 - 7.22', element: '水', mode: '基本', ruler: '月亮', symbol: '♋', color: '银白', number: 2, stone: '珍珠', keywords: ['守护', '细腻', '记忆'] },
  { id: 'leo', name: '狮子座', en: 'Leo', range: '7.23 - 8.22', element: '火', mode: '固定', ruler: '太阳', symbol: '♌', color: '金橙', number: 1, stone: '琥珀', keywords: ['表现', '慷慨', '主导'] },
  { id: 'virgo', name: '处女座', en: 'Virgo', range: '8.23 - 9.22', element: '土', mode: '变动', ruler: '水星', symbol: '♍', color: '灰蓝', number: 4, stone: '蓝宝石', keywords: ['秩序', '分析', '服务'] },
  { id: 'libra', name: '天秤座', en: 'Libra', range: '9.23 - 10.23', element: '风', mode: '基本', ruler: '金星', symbol: '♎', color: '粉蓝', number: 7, stone: '蛋白石', keywords: ['平衡', '审美', '协商'] },
  { id: 'scorpio', name: '天蝎座', en: 'Scorpio', range: '10.24 - 11.22', element: '水', mode: '固定', ruler: '冥王星', symbol: '♏', color: '深酒红', number: 8, stone: '黑曜石', keywords: ['深度', '专注', '洞察'] },
  { id: 'sagittarius', name: '射手座', en: 'Sagittarius', range: '11.23 - 12.21', element: '火', mode: '变动', ruler: '木星', symbol: '♐', color: '宝蓝', number: 3, stone: '绿松石', keywords: ['探索', '坦率', '扩张'] },
  { id: 'capricorn', name: '摩羯座', en: 'Capricorn', range: '12.22 - 1.19', element: '土', mode: '基本', ruler: '土星', symbol: '♑', color: '墨黑', number: 10, stone: '石榴石', keywords: ['克制', '长期', '结构'] },
  { id: 'aquarius', name: '水瓶座', en: 'Aquarius', range: '1.20 - 2.18', element: '风', mode: '固定', ruler: '天王星', symbol: '♒', color: '电光蓝', number: 11, stone: '紫水晶', keywords: ['独立', '革新', '抽离'] },
  { id: 'pisces', name: '双鱼座', en: 'Pisces', range: '2.19 - 3.20', element: '水', mode: '变动', ruler: '海王星', symbol: '♓', color: '雾紫', number: 12, stone: '海蓝宝', keywords: ['共感', '想象', '柔软'] }
]

/** 运势维度 */
const FORTUNE_DIMS = [
  { key: 'overall', name: '综合' },
  { key: 'love', name: '爱情' },
  { key: 'career', name: '事业' },
  { key: 'wealth', name: '财运' },
  { key: 'health', name: '健康' }
]

/**
 * 运势文案模板：按「档位 × 维度」组织
 * 正式版需扩到 12 星座 × 4 周期 × 5 维度 × 3-5 条（约 720-1200 条）
 */
const FORTUNE_POOL = {
  high: {
    overall: ['今天的状态在线，适合把拖着的事一次推完。', '节奏顺，容易被看见，别藏着。'],
    love: ['表达欲强，说出来比暗示有效。', '相处轻松，适合约一次认真的对话。'],
    career: ['推进顺畅，适合开口谈条件。', '你的判断会被认可，主动一点。'],
    wealth: ['有小额进账的机会，留意细节。', '适合做一次收支复盘。'],
    health: ['精力充沛，适合安排一次运动。', '状态好，别熬太晚。']
  },
  mid: {
    overall: ['平稳的一天，按计划走就行。', '没有大波动，适合处理琐事。'],
    love: ['平淡但稳定，多些日常关心。', '别急着下结论，再观察一下。'],
    career: ['常规推进，注意别被会议占满。', '适合补基础功，不适合冒险。'],
    wealth: ['收支平衡，控制冲动消费。', '先记账，再决定。'],
    health: ['作息是关键，别透支。', '注意肩颈与用眼。']
  },
  low: {
    overall: ['容易分心，把任务清单缩短一点。', '状态偏低，优先做重要的事。'],
    love: ['沟通容易被误会，先确认再回应。', '给彼此一点空间。'],
    career: ['进展慢，把它当缓冲期。', '降低预期，把交付做扎实。'],
    wealth: ['保守为宜，避免大额决定。', '预留一点缓冲。'],
    health: ['注意休息与情绪，早点睡。', '不适请就医，别硬扛。']
  }
}

/** 星座配对：三档文案（正式版需补至 144 条） */
const MATCH_LEVELS = [
  { key: 'high', name: '高度契合', min: 80, desc: '节奏接近，容易互相理解，相处成本低。', tip: '多给彼此确定性，关系会更稳。' },
  { key: 'mid', name: '需要磨合', min: 60, desc: '差异明显，但互补空间大。', tip: '把分歧摊开说，别积累。' },
  { key: 'low', name: '张力较强', min: 0, desc: '步调不同，容易在小事上消耗。', tip: '降低期待，先做朋友式相处。' }
]

/* ============================ 三、手相 ============================ */

/** 手型分类（示例 5 类，已完整） */
const PALM_TYPES = [
  { id: 'square', name: '方形手', feature: '掌形方正、指尖平齐、掌肉厚实', reading: '务实、讲秩序，偏好可执行的事。', good: '耐久、可靠', note: '容易固执，记得留弹性' },
  { id: 'conic', name: '圆锥手', feature: '掌形圆润、指尖渐细', reading: '感受力强，审美与直觉在线。', good: '共情、创意', note: '容易受情绪影响节奏' },
  { id: 'spatulate', name: '篦形手', feature: '指尖宽扁、掌部有力', reading: '行动派，喜欢动手和探索。', good: '执行、开拓', note: '耐心偏短，注意收尾' },
  { id: 'philosophic', name: '哲学手', feature: '指节明显、掌形偏瘦长', reading: '爱思考，重逻辑与因果。', good: '分析、研究', note: '想得多做得少，记得落地' },
  { id: 'psychic', name: '精神手', feature: '掌形纤细、指尖尖长', reading: '敏感细腻，想象力丰富。', good: '直觉、艺术', note: '易内耗，需要稳定作息' }
]

/**
 * 掌纹主线：生命线 / 事业线 / 婚姻线
 * ------------------------------------------------------------------
 * 每条线包含：
 *   observe —— 位置与观察方法（怎么看、看什么）
 *   forms   —— 常见形态解析，按 性格 / 健康 / 事业 / 情感 四个维度给参考
 * 说明文案统一按「娱乐参考」定位，使用「倾向、可能、可以理解为」等表述，
 * 不作预测性或绝对化断言，也不作任何医疗、诊断结论。
 */
const PALM_LINES = [
  {
    id: 'life', name: '生命线', alias: '地纹',
    from: '虎口', to: '腕部', domain: '精力节奏与生活方式',
    normal: '弧度饱满、走向清晰、中途不断', emoji: '◠',
    observe: '位于虎口与拇指根部之间，沿大鱼际呈弧形向下环绕至腕部。观察时手掌自然张开、' +
             '光线从侧前方打来，重点看弧度是否饱满、线条是否连续、中途有无变浅、分叉或断开。',
    forms: [
      { tag: 'long', name: '长而深', summary: '精力储备较充足，能扛得住长线的事。',
        trait: '耐力较好，愿意在选定的事上持续投入。',
        health: '通常恢复力不错，但长期透支同样会累，规律作息仍是前提。',
        career: '适合需要长期积累、反馈周期较长的事务。',
        emotion: '在关系里倾向长期陪伴，表达方式偏稳定。' },
      { tag: 'short', name: '短而浅', summary: '节奏轻快，兴趣切换也比较快。',
        trait: '反应快、好奇心强，容易对新事物产生兴趣。',
        health: '忙碌期更容易感到疲惫，值得主动留出空白时间。',
        career: '更适合短周期、能快速看到反馈的工作节奏。',
        emotion: '热情来得快，彼此保留空间会更舒服。' },
      { tag: 'curve', name: '弧度大', summary: '适应力强，喜欢有变化的节奏。',
        trait: '灵活、愿意调整，环境变化时不容易卡住。',
        health: '状态容易随环境与作息波动，稳定节律有帮助。',
        career: '适合需要随机应变、接触面广的岗位。',
        emotion: '表达外放，重视相处中的体验与新鲜感。' },
      { tag: 'straight', name: '平直', summary: '偏好稳定，生活讲究规律。',
        trait: '讲秩序、边界清楚，不喜欢频繁的意外。',
        health: '作息规律的时候状态最好，打乱节奏容易不适。',
        career: '擅长流程清晰、结果可预期的工作。',
        emotion: '情感表达偏克制，但可靠度高。' },
      { tag: 'fork', name: '末端分叉', summary: '生活里有两条并行线，切换自如。',
        trait: '能同时兼顾多个角色，适应多线程。',
        health: '注意别在两条线上同时透支，需要主动取舍。',
        career: '主业与副业并行、或同时推进两个方向的情况较常见。',
        emotion: '在家庭责任与自我空间之间需要刻意平衡。' },
      { tag: 'chain', name: '链状', summary: '状态起伏较明显，注意作息稳定。',
        trait: '投入程度时高时低，容易受外界影响。',
        health: '某些阶段精力偏低，安排休息比硬扛更划算。',
        career: '效率有波动，重要事项尽量避开低谷期。',
        emotion: '情绪容易受环境影响，需要稳定的回应。' },
      { tag: 'island', name: '岛纹', summary: '某个阶段状态偏低，过去了就好。',
        trait: '那段时间自我怀疑偏多，判断容易摇摆。',
        health: '可以理解为身体在提示放慢一点，并非异常信号。',
        career: '该阶段推进阻力偏大，适合做整理与复盘。',
        emotion: '容易陷入内耗，把想法说出来通常会好一些。' },
      { tag: 'break', name: '断裂', summary: '节奏被中断过，重新建立规律即可。',
        trait: '生活出现过明显转折，之后会重建秩序。',
        health: '可以理解为曾经透支，恢复需要一段时间。',
        career: '转折之后方向感往往比之前更清楚。',
        emotion: '重建信任与亲密感需要过程，慢慢来。' }
    ]
  },
  {
    id: 'career', name: '事业线', alias: '命运线 · 玉柱纹',
    from: '掌根（腕部）', to: '中指根部', domain: '事业方向与长期路径',
    normal: '自下而上清晰，未必直达顶部，不明显也属常见', emoji: '∣',
    observe: '自掌根纵向上升、穿过掌心指向中指根部。这条线并非人人明显，' +
             '没有或很浅都不代表异常；观察时看它起于何处、是否连续、中途有无偏移或中断。',
    forms: [
      { tag: 'long', name: '长而清晰', summary: '方向感明确，能在一条路上走很久。',
        trait: '目标感强，愿意为长期结果付出。',
        health: '长期投入下要主动安排休息，别等身体提醒。',
        career: '适合需要积累与专业深度的路径。',
        emotion: '稳定可靠，但可能把工作节奏带进亲密关系。' },
      { tag: 'short', name: '短而浅', summary: '更看重当下体验，目标弹性较大。',
        trait: '务实、灵活，愿意根据现实调整计划。',
        health: '较少因目标过度消耗，整体节奏更松弛。',
        career: '适合阶段性目标或项目制的工作方式。',
        emotion: '更愿意把时间留给生活与身边的人。' },
      { tag: 'straight', name: '平直', summary: '步调稳定，靠积累一步步推进。',
        trait: '踏实、可预期，不喜欢大幅度的反复。',
        health: '作息规律时效率最高，熬夜影响明显。',
        career: '适合流程清晰、标准明确的岗位。',
        emotion: '关系观务实，重视承诺与兑现。' },
      { tag: 'curve', name: '偏移或弧度', summary: '路径有过调整，换方向也走得通。',
        trait: '能根据环境改道，不执着于原计划。',
        health: '转折期压力偏大，需要留意调节方式。',
        career: '中途换赛道、转岗或转型的可能性较高。',
        emotion: '变动期需要更多沟通，避免让对方猜。' },
      { tag: 'fork', name: '末端分叉', summary: '路上出现过岔口，多条线并行也能走通。',
        trait: '兴趣与能力面较广，容易被新机会吸引。',
        health: '注意别多线程同时透支，保留一个主节奏。',
        career: '主业之外的第二曲线并行，是常见状态。',
        emotion: '精力分散时容易忽略陪伴，需要主动安排。' },
      { tag: 'chain', name: '链状', summary: '投入程度时高时低，节奏弹性大。',
        trait: '热情有周期性，状态好时效率很高。',
        health: '波动明显时，固定作息能起到托底作用。',
        career: '更适合弹性工时或自主安排节奏的工作。',
        emotion: '情绪容易被工作牵动，需要明确的边界。' },
      { tag: 'island', name: '岛纹', summary: '某段时期推进阻力偏大。',
        trait: '那段时间容易自我怀疑，判断力打折扣。',
        health: '可以理解为需要减负的信号，适当降低强度。',
        career: '该阶段适合做调整与沉淀，而非强行扩张。',
        emotion: '压力容易带回家，说出来比硬扛有用。' },
      { tag: 'break', name: '断裂', summary: '路径有过中断，转折之后反而更清楚。',
        trait: '经历过明显的停顿或重启，抗挫力随之增强。',
        health: '那段时期的压力值得复盘，避免重演。',
        career: '中断之后方向往往会更聚焦。',
        emotion: '变动期需要被理解，而不是被追问。' }
    ]
  },
  {
    id: 'marriage', name: '婚姻线', alias: '结婚线',
    from: '掌缘（小指根部下方）', to: '向掌心延伸的短横线', domain: '对待亲密关系的态度',
    normal: '短横清晰，条数多少与经历次数无关', emoji: '⌒',
    observe: '位于小指根部掌缘、呈短横线状，常有一条或多条。' +
             '条数多少不代表任何经历次数，重点看是否清晰、平直，有无链状、断裂或岛纹。',
    forms: [
      { tag: 'long', name: '长而清晰', summary: '对待关系认真，愿意给出承诺。',
        trait: '重视确定性，进入关系前会认真考虑。',
        health: '关系稳定时，整体身心状态往往更好。',
        career: '有稳定的后方支持，更容易专注投入。',
        emotion: '情感投入深，期待长期而明确的关系。' },
      { tag: 'short', name: '短而浅', summary: '对关系态度轻松，需要独立空间。',
        trait: '随和、不喜束缚，更看重相处舒适度。',
        health: '较少因关系内耗，情绪负担相对轻。',
        career: '愿意把时间与精力更多投在自己身上。',
        emotion: '需要较多独处空间，亲密但不黏着。' },
      { tag: 'straight', name: '平直', summary: '关系观务实，边界清楚。',
        trait: '理性、讲分寸，不喜欢模糊的关系状态。',
        health: '稳定的关系有助于建立规律作息。',
        career: '家庭与工作安排有序，切换较顺畅。',
        emotion: '表达克制但可靠，行动多于言语。' },
      { tag: 'curve', name: '弧度明显', summary: '情感丰富，表达主动且直接。',
        trait: '感受力强，愿意主动推进关系。',
        health: '情绪起伏时需要有出口，别压着。',
        career: '创意与表达类工作容易被情绪带动。',
        emotion: '重视互动、仪式感与被在乎的感觉。' },
      { tag: 'fork', name: '末端分叉', summary: '在亲密与独立之间来回摇摆。',
        trait: '既想要连接，也想要自由，容易犹豫。',
        health: '纠结期可能影响睡眠，早点想清楚更省事。',
        career: '决策容易受关系状态牵动。',
        emotion: '需要把真实诉求说出来，而不是让对方猜。' },
      { tag: 'chain', name: '链状', summary: '关系里有过纠结，想清楚之后会更稳。',
        trait: '容易反复权衡，对关系细节敏感。',
        health: '内耗期注意休息，别用忙碌掩盖。',
        career: '情绪会牵动效率，重要决策避开情绪期。',
        emotion: '把标准说清楚，关系反而更轻松。' },
      { tag: 'island', name: '岛纹', summary: '有一段关系让人消耗，允许自己放下。',
        trait: '那段时间自我评价偏低，容易迁就。',
        health: '可以理解为需要一段恢复期的提示。',
        career: '专注度会受影响，先处理情绪再谈效率。',
        emotion: '允许自己结束消耗型的关系。' },
      { tag: 'break', name: '断裂', summary: '情感上受过打断，慢慢来也能重新敞开。',
        trait: '经历过关系的中断，之后会更谨慎。',
        health: '恢复需要时间，急着开始反而更累。',
        career: '变动期效率下滑属正常，给自己缓冲。',
        emotion: '重新建立信任需要过程，不必强求。' }
    ]
  }
]

/** 线型形态标签（正式需补至 12-15 个） */
const LINE_TAGS = [
  { id: 'long', name: '长而深', general: '投入程度高，持续性强' },
  { id: 'short', name: '短而浅', general: '节奏轻快，易转移兴趣' },
  { id: 'curve', name: '弧度大', general: '表达外放，适应力强' },
  { id: 'straight', name: '平直', general: '理性克制，边界清楚' },
  { id: 'fork', name: '末端分叉', general: '多元并行，选择多' },
  { id: 'chain', name: '链状', general: '波动较多，易受干扰' },
  { id: 'island', name: '岛纹', general: '某阶段有阻滞' },
  { id: 'break', name: '断裂', general: '节奏被打断，注意调整' }
]

/**
 * 主线 × 形态：组合解读
 * 由 PALM_LINES 的 forms 自动生成，保证「图鉴详情」与「结果页/组合查询」两处文案
 * 只有一个来源，不会出现改了一处漏了另一处的情况。
 */
const LINE_READINGS = {}
PALM_LINES.forEach(function (l) {
  LINE_READINGS[l.id] = {}
  l.forms.forEach(function (f) { LINE_READINGS[l.id][f.tag] = f.summary })
})

/** 自评问卷（图像识别的兜底方案）：q1 手型 + 三条主线各一题 */
const PALM_QUIZ = [
  { id: 'q1', title: '手掌整体形状更接近？', options: [{ label: '方正厚实', tag: 'square' }, { label: '圆润渐细', tag: 'conic' }, { label: '指尖宽扁', tag: 'spatulate' }] },
  { id: 'q2', title: '生命线的弧度？', options: [{ label: '弧度饱满', tag: 'curve' }, { label: '较为平直', tag: 'straight' }] },
  { id: 'q3', title: '事业线看起来？', options: [{ label: '清晰且长', tag: 'long' }, { label: '偏短偏浅', tag: 'short' }, { label: '中途有中断', tag: 'break' }] },
  { id: 'q4', title: '婚姻线的状态？', options: [{ label: '清晰平直', tag: 'straight' }, { label: '弧度明显', tag: 'curve' }, { label: '有链状感', tag: 'chain' }] }
]

/* ============================ 四、塔罗 ============================ */

/**
 * 塔罗牌
 * 大阿尔卡纳 22 张已全量补齐；小阿尔卡纳 16 张（每花色 4 张），
 * 正式上线需补至 78 张（22 大 + 56 小）
 * 字段：id / name / en / arcana / suit / element / upright[] / reversed[] / upText / revText / advice
 */
const TAROT_CARDS = [
  { id: 0, name: '愚者', en: 'The Fool', arcana: 'major', element: '风', upright: ['开始', '自由', '冒险'], reversed: ['犹豫', '轻率'], upText: '新的起点就在脚下，放下过度准备，先迈出一小步。', revText: '不是不能开始，是还没想清楚要什么。', advice: '今天做一件一直拖着的小事。' },
  { id: 1, name: '魔术师', en: 'The Magician', arcana: 'major', element: '水星', upright: ['行动', '资源', '专注'], reversed: ['分散', '拖延'], upText: '手上已有足够的资源，缺的不是条件而是开始。', revText: '注意力摊得太薄，先收拢到一件事上。', advice: '列出你已经拥有的三个资源。' },
  { id: 2, name: '女祭司', en: 'The High Priestess', arcana: 'major', element: '月亮', upright: ['直觉', '静观', '内在'], reversed: ['忽视感受', '信息不足'], upText: '先听内在的声音，答案不必急着给出来。', revText: '信息还不充分，别只凭感觉下判断。', advice: '给自己半天不被打扰的时间。' },
  { id: 3, name: '皇后', en: 'The Empress', arcana: 'major', element: '金星', upright: ['丰盛', '滋养', '创造'], reversed: ['过度付出', '停滞'], upText: '适合滋养自己也在意的事，产出会自然发生。', revText: '照顾了所有人，唯独漏掉自己。', advice: '为自己安排一次真正放松的休息。' },
  { id: 4, name: '皇帝', en: 'The Emperor', arcana: 'major', element: '白羊', upright: ['秩序', '掌控', '结构'], reversed: ['僵化', '专断'], upText: '建立规则的时候到了，清晰的边界反而让人安心。', revText: '控制得太紧，弹性正在流失。', advice: '把一件混乱的事定出明确流程。' },
  { id: 5, name: '教皇', en: 'The Hierophant', arcana: 'major', element: '金牛', upright: ['传承', '学习', '规范'], reversed: ['墨守', '质疑'], upText: '向有经验的人请教，比自己摸索省力。', revText: '规则不一定适合你，可以适度保留。', advice: '找一个走过这条路的人聊一次。' },
  { id: 6, name: '恋人', en: 'The Lovers', arcana: 'major', element: '双子', upright: ['选择', '联结', '价值一致'], reversed: ['摇摆', '错位期待'], upText: '关系与选择都指向同一个问题：价值是否一致。', revText: '期待不对齐，先把话说清楚再谈下一步。', advice: '明确你真正在意的三件事。' },
  { id: 7, name: '战车', en: 'The Chariot', arcana: 'major', element: '巨蟹', upright: ['前进', '意志', '掌控'], reversed: ['失控', '方向不明'], upText: '方向已定，现在靠执行力拉开差距。', revText: '跑得很快，但不确定要去哪。', advice: '先确认目的地，再踩油门。' },
  { id: 8, name: '力量', en: 'Strength', arcana: 'major', element: '狮子', upright: ['耐心', '柔韧', '勇气'], reversed: ['自我怀疑', '急躁'], upText: '真正的力量是柔韧，不是硬扛。', revText: '对自己太苛刻，先缓一缓。', advice: '用温和的方式处理一件棘手的事。' },
  { id: 9, name: '隐者', en: 'The Hermit', arcana: 'major', element: '处女', upright: ['独处', '内省', '寻找'], reversed: ['孤立', '逃避'], upText: '退一步看清楚，比急着行动更有价值。', revText: '独处变成了回避，试着重新连接。', advice: '关掉通知，安静地想三十分钟。' },
  { id: 10, name: '命运之轮', en: 'Wheel of Fortune', arcana: 'major', element: '木星', upright: ['转机', '周期', '顺势'], reversed: ['停滞', '抗拒变化'], upText: '局势正在转动，顺势比硬扛省力。', revText: '卡住的部分，往往来自抗拒本身。', advice: '接受一个你暂时改不了的事实。' },
  { id: 11, name: '正义', en: 'Justice', arcana: 'major', element: '天秤', upright: ['权衡', '因果', '公正'], reversed: ['偏颇', '逃避责任'], upText: '把利弊摆到台面上，结论会很清楚。', revText: '心里已有偏好，只是在找理由。', advice: '为你的决定写出正反两面各三条。' },
  { id: 12, name: '倒吊人', en: 'The Hanged Man', arcana: 'major', element: '海王星', upright: ['换个角度', '等待', '暂停'], reversed: ['无谓牺牲', '拖延'], upText: '换个视角，卡住的事会露出另一面。', revText: '停得太久，需要重新动起来。', advice: '用旁观者的身份重述一遍你的问题。' },
  { id: 13, name: '死神', en: 'Death', arcana: 'major', element: '天蝎', upright: ['结束', '转化', '放下'], reversed: ['留恋', '抗拒结束'], upText: '一个阶段结束了，新的才有位置进来。', revText: '明知该结束，却还拖着不放手。', advice: '清理一件早该丢掉的东西。' },
  { id: 14, name: '节制', en: 'Temperance', arcana: 'major', element: '射手', upright: ['平衡', '调和', '耐心'], reversed: ['失衡', '极端'], upText: '慢一点反而更快，节奏比强度重要。', revText: '用力过猛，注意回调。', advice: '把今天的安排删掉两成。' },
  { id: 15, name: '恶魔', en: 'The Devil', arcana: 'major', element: '摩羯', upright: ['束缚', '欲望', '惯性'], reversed: ['觉察', '松绑'], upText: '看清是什么在牵着你，看清就有选择权。', revText: '开始意识到那个模式，正是松动的开始。', advice: '写下你最想摆脱的一个习惯。' },
  { id: 16, name: '塔', en: 'The Tower', arcana: 'major', element: '火星', upright: ['突变', '瓦解', '真相'], reversed: ['延后的崩塌', '勉强维持'], upText: '旧结构在松动，虽然不适，但腾出了空间。', revText: '还在硬撑，问题只是被推迟了。', advice: '承认一件你一直不愿面对的事。' },
  { id: 17, name: '星星', en: 'The Star', arcana: 'major', element: '水瓶', upright: ['希望', '疗愈', '方向'], reversed: ['信心不足', '迷失'], upText: '最难的阶段过去了，可以重新开始期待。', revText: '别让一次挫折否定整段路。', advice: '写下一个你想在半年内实现的小愿望。' },
  { id: 18, name: '月亮', en: 'The Moon', arcana: 'major', element: '双鱼', upright: ['模糊', '潜意识', '不安'], reversed: ['澄清', '走出迷雾'], upText: '看不清的时候别急着决定，先收集事实。', revText: '雾在散，可以试着确认真实情况。', advice: '把你担心的事逐条写下来核对。' },
  { id: 19, name: '太阳', en: 'The Sun', arcana: 'major', element: '太阳', upright: ['明朗', '成就', '坦率'], reversed: ['暂时的阴影', '过度乐观'], upText: '状态明朗，适合把事摊开来讲清楚。', revText: '别把乐观当成计划。', advice: '做一件让你有成就感的小事。' },
  { id: 20, name: '审判', en: 'Judgement', arcana: 'major', element: '冥王星', upright: ['回顾', '召唤', '总结'], reversed: ['自我批判', '回避复盘'], upText: '做一次诚实的复盘，下一步会自然浮现。', revText: '过于苛责自己，复盘不等于审判。', advice: '写下这段时间三个做得好的地方。' },
  { id: 21, name: '世界', en: 'The World', arcana: 'major', element: '土星', upright: ['完成', '整合', '圆满'], reversed: ['收尾未完', '欠缺闭环'], upText: '一个循环接近完成，把最后收尾做好。', revText: '还差最后一步，别在这里松劲。', advice: '完成那件已进行九成的事。' },

  { id: 'w1', name: '权杖首牌', en: 'Ace of Wands', arcana: 'minor', suit: '权杖', upright: ['灵感', '启动'], reversed: ['延迟', '动力不足'], upText: '新想法出现，抓住最初那股冲动。', revText: '热情退得快，先定一个小到不会失败的目标。', advice: '今天就开始第一步。' },
  { id: 'w3', name: '权杖三', en: 'Three of Wands', arcana: 'minor', suit: '权杖', upright: ['扩张', '远见', '等待回报'], reversed: ['视野受限', '受阻'], upText: '布局已经展开，现在需要一点耐心。', revText: '眼光只盯着眼前，试着看远一点。', advice: '为三个月后做一件准备。' },
  { id: 'w8', name: '权杖八', en: 'Eight of Wands', arcana: 'minor', suit: '权杖', upright: ['快速', '消息', '推进'], reversed: ['延误', '节奏混乱'], upText: '节奏突然加快，抓紧这波势头。', revText: '事情卡住了，检查哪个环节断了。', advice: '趁状态好，一次推进两件事。' },
  { id: 'w10', name: '权杖十', en: 'Ten of Wands', arcana: 'minor', suit: '权杖', upright: ['重担', '责任', '接近终点'], reversed: ['卸下', '放手'], upText: '你扛得有点多，但终点已经不远。', revText: '是时候放下一些不属于你的责任。', advice: '把一项任务交出去或推迟。' },

  { id: 'c1', name: '圣杯首牌', en: 'Ace of Cups', arcana: 'minor', suit: '圣杯', upright: ['情感流动', '开始', '敞开'], reversed: ['封闭', '情绪堵塞'], upText: '情感开始流动，允许自己表达需要。', revText: '把感受压住了，先承认它存在。', advice: '向一个人说出你的真实感受。' },
  { id: 'c2', name: '圣杯二', en: 'Two of Cups', arcana: 'minor', suit: '圣杯', upright: ['契合', '互相', '尊重'], reversed: ['失衡', '误解'], upText: '这是一段双向的关系，值得投入。', revText: '付出不对等，需要一次坦诚沟通。', advice: '主动表达一次你的需要。' },
  { id: 'c6', name: '圣杯六', en: 'Six of Cups', arcana: 'minor', suit: '圣杯', upright: ['回忆', '纯真', '旧识'], reversed: ['困于过去', '放手'], upText: '过去的人和事带来安抚，也可以带来提醒。', revText: '该向前看了，回忆不该成为锚点。', advice: '联系一位很久没见的老朋友。' },
  { id: 'c10', name: '圣杯十', en: 'Ten of Cups', arcana: 'minor', suit: '圣杯', upright: ['和谐', '归属', '满足'], reversed: ['表面和谐', '疏离'], upText: '关系里的支持感很足，值得珍惜。', revText: '表面平静之下有没说出口的话。', advice: '和家人或伴侣好好吃一顿饭。' },

  { id: 's1', name: '宝剑首牌', en: 'Ace of Swords', arcana: 'minor', suit: '宝剑', upright: ['清晰', '洞见', '决断'], reversed: ['混乱', '词不达意'], upText: '思路突然清晰，适合做出决定。', revText: '想得太多反而乱，先写下再说。', advice: '把决定写下来，给自己一个期限。' },
  { id: 's3', name: '宝剑三', en: 'Three of Swords', arcana: 'minor', suit: '宝剑', upright: ['失落', '真相', '疗愈开始'], reversed: ['逐渐平复', '压抑'], upText: '有些真相让人难受，但看清了才能过去。', revText: '伤口在愈合，允许自己慢慢来。', advice: '承认难受，然后做一件照顾自己的事。' },
  { id: 's8', name: '宝剑八', en: 'Eight of Swords', arcana: 'minor', suit: '宝剑', upright: ['受限', '自我设限'], reversed: ['松动', '看清'], upText: '困住你的多半是想法，不是现实。', revText: '限制开始松动，可以试着挣脱。', advice: '写下三个「其实可以」的选项。' },
  { id: 's10', name: '宝剑十', en: 'Ten of Swords', arcana: 'minor', suit: '宝剑', upright: ['触底', '结束', '最低点'], reversed: ['回升', '复原'], upText: '已经到低点，接下来只会往上走。', revText: '最难的阶段正在过去。', advice: '结束那件让你消耗的事。' },

  { id: 'p1', name: '星币首牌', en: 'Ace of Pentacles', arcana: 'minor', suit: '星币', upright: ['机会', '务实', '起步'], reversed: ['错失', '计划不足'], upText: '一个实际的机会出现，值得认真评估。', revText: '机会还在，但准备不够充分。', advice: '把这个机会的具体条件写清楚。' },
  { id: 'p4', name: '星币四', en: 'Four of Pentacles', arcana: 'minor', suit: '星币', upright: ['保守', '守住', '安全感'], reversed: ['松手', '过度控制'], upText: '守住已有的没错，但别错过流动。', revText: '握得太紧，试着放开一点。', advice: '在安全感和尝试之间找个中间值。' },
  { id: 'p7', name: '星币七', en: 'Seven of Pentacles', arcana: 'minor', suit: '星币', upright: ['等待', '评估', '长期'], reversed: ['急于求成', '投入无果'], upText: '已经投入很多，现在需要的是耐心。', revText: '回报不明显，重新评估是否值得继续。', advice: '给自己设一个复评的时间点。' },
  { id: 'p10', name: '星币十', en: 'Ten of Pentacles', arcana: 'minor', suit: '星币', upright: ['稳定', '长期', '积累'], reversed: ['结构松动', '短期主义'], upText: '长期积累正在成形，稳住节奏就好。', revText: '基础需要修补，别只盯着眼前的收益。', advice: '为半年后做一件小事。' }
]
// 转写：原数组字面量末尾的 ].concat(MINOR_EXTRA) 移到 ensureTarot()：
//       db/tarot.js 在 data.js 之后加载，拼接与打标统一放到 TAROT_CARDS 首次被取用时执行。

/** 牌阵（一期 4 个，正式可扩至 8-12 个） */
const SPREADS = [
  {
    id: 'single', name: '单张指引', count: 1, scene: '快速', desc: '给当下一个提醒，适合每天一张。',
    positions: [{ i: 0, name: '此刻的提醒', meaning: '今天最需要留意的一件事' }]
  },
  {
    id: 'triangle', name: '圣三角', count: 3, scene: '综合', desc: '看清一件事的来龙去脉。',
    positions: [
      { i: 0, name: '过去', meaning: '形成现状的原因' },
      { i: 1, name: '现在', meaning: '你正处的状态' },
      { i: 2, name: '未来', meaning: '顺着当下的走向' }
    ]
  },
  {
    id: 'choice', name: '二选一', count: 3, scene: '抉择', desc: '在两条路之间看清差异。',
    positions: [
      { i: 0, name: '现状', meaning: '你现在的处境' },
      { i: 1, name: '选项 A', meaning: '走第一条路的走向' },
      { i: 2, name: '选项 B', meaning: '走第二条路的走向' }
    ]
  },
  {
    id: 'cross', name: '五张十字', count: 5, scene: '深度', desc: '把一个复杂问题拆开看。',
    positions: [
      { i: 0, name: '核心', meaning: '问题的中心' },
      { i: 1, name: '阻碍', meaning: '卡住你的部分' },
      { i: 2, name: '助力', meaning: '可用的资源' },
      { i: 3, name: '过去', meaning: '成因' },
      { i: 4, name: '建议', meaning: '可以怎么走' }
    ]
  }
]

/** 抽牌规则 */
const DRAW_RULES = {
  reversedRate: 0.25,
  allowRepeat: false,
  guide: '默想你的问题，凭直觉选牌，不必反复犹豫。'
}

/**
 * 牌面占位符号
 * 不引入任何图片资源：大牌用星，小牌按花色给一个可读的 emoji
 */
const SUIT_EMOJI = { '权杖': '🪄', '圣杯': '🏆', '宝剑': '⚔️', '星币': '🪙' }
const SUIT_ELEMENT = { '权杖': '火', '圣杯': '水', '宝剑': '风', '星币': '土' }

/* 转写：原 TAROT_CARDS.forEach(...) 打标循环原样并入 ensureTarot()（惰性拼接后执行） */
var _tarotReady = false
function ensureTarot() {
  if (_tarotReady) return TAROT_CARDS
  var extra = minorLoaded() || []
  for (var i = 0; i < extra.length; i++) TAROT_CARDS.push(extra[i])
  TAROT_CARDS.forEach(function (c) {
    c.emoji = c.arcana === 'major' ? '🌟' : (SUIT_EMOJI[c.suit] || '🃏')
    if (!c.element && c.suit) c.element = SUIT_ELEMENT[c.suit] || ''
  })
  _tarotReady = true
  return TAROT_CARDS
}

var M = {
  NOTICE: NOTICE,
  SUIT_EMOJI: SUIT_EMOJI,
  TRIGRAMS: TRIGRAMS,
  // 转写：HEXAGRAMS 导出键改为 getter 惰性求值（值 = 原 require('./db/hexagrams.js')，一字未改）
  get HEXAGRAMS() { return hexagramsLoaded() },
  COIN_RULES: COIN_RULES,
  MEIHUA_METHODS: MEIHUA_METHODS,
  ZODIACS: ZODIACS,
  FORTUNE_DIMS: FORTUNE_DIMS,
  FORTUNE_POOL: FORTUNE_POOL,
  MATCH_LEVELS: MATCH_LEVELS,
  PALM_TYPES: PALM_TYPES,
  PALM_LINES: PALM_LINES,
  LINE_TAGS: LINE_TAGS,
  LINE_READINGS: LINE_READINGS,
  PALM_QUIZ: PALM_QUIZ,
  // 转写：TAROT_CARDS 导出键改为 getter 惰性求值（首次取用时拼接 db/tarot.js 的 40 张并打标）
  get TAROT_CARDS() { return ensureTarot() },
  SPREADS: SPREADS,
  DRAW_RULES: DRAW_RULES
}

return M
})()