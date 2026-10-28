/**
 * 塔罗小阿尔卡纳补充库（40 张）
 * ------------------------------------------------------------------
 * 现有 utils/data.js 已有：22 张大阿尔卡纳 + 16 张小阿尔卡纳。
 * 本文件补齐剩余 40 张小牌，凑齐 78 张完整牌组。
 *
 * 字段与小牌保持一致：
 *   id     花色首字母 + 序号（w 权杖 / c 圣杯 / s 宝剑 / p 星币）
 *          1-10 为数字牌，11 侍从 / 12 骑士 / 13 王后 / 14 国王
 *   suit   花色中文，data.js 依此赋花色图标
 *   upright / reversed  正位 / 逆位关键词
 *   upText / revText    正位 / 逆位解读
 *   advice 一条行动建议
 *
 * 花色元素：权杖火（行动创造）、圣杯水（情感关系）、宝剑风（思维沟通）、星币土（物质现实）
 * ------------------------------------------------------------------
 * 转写说明：由 utils/db/tarot.js 转写，module.exports → JY.dbTarot；数据一字未改。
 */
JY.dbTarot = (function () {
const MINOR_EXTRA = [
  {
    id: 'w2', name: '权杖二', en: 'Two of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['规划', '抉择', '视野'], reversed: ['犹豫', '格局太小'],
    upText: '手里已有筹码，是时候决定往哪走了，把选项写下来更清楚。',
    revText: '不是没有路，是舍不得放下已经拥有的那一条。',
    advice: '给两个选项各写三条代价，再选。'
  },
  {
    id: 'w4', name: '权杖四', en: 'Four of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['庆祝', '安稳', '归属'], reversed: ['根基不稳', '推迟'],
    upText: '一段努力告一段落，值得好好庆祝，也值得感谢同行的人。',
    revText: '表面的安稳还没落地，先把基础补牢再说。',
    advice: '安排一次小小的庆祝。'
  },
  {
    id: 'w5', name: '权杖五', en: 'Five of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['竞争', '摩擦', '各执一词'], reversed: ['内耗', '回避冲突'],
    upText: '意见不一致，但这种摩擦也可能是激发好点子的过程。',
    revText: '表面平静，底下各自较劲，不如摊开说。',
    advice: '把分歧当成议题，别当成输赢。'
  },
  {
    id: 'w6', name: '权杖六', en: 'Six of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['认可', '胜利', '被看见'], reversed: ['自我怀疑', '掌声落空'],
    upText: '成果被看见了，这份认可是真的，大方接住它。',
    revText: '付出没得到回应时，先自己肯定自己。',
    advice: '把这份成绩记下来，别转头就忘。'
  },
  {
    id: 'w7', name: '权杖七', en: 'Seven of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['坚守', '防御', '据理力争'], reversed: ['疲于应对', '退让'],
    upText: '位置需要守住，你有优势，但要挑值得守的阵地。',
    revText: '四面都在消耗你，分清哪些仗其实不用打。',
    advice: '选一件最值得坚持的事，其余放手。'
  },
  {
    id: 'w9', name: '权杖九', en: 'Nine of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['韧性', '戒备', '最后一段'], reversed: ['过度紧绷', '想放弃'],
    upText: '已经撑了很久，离终点不远了，但确实需要喘口气。',
    revText: '警戒过头会耗光自己，允许自己休息。',
    advice: '先休息，再冲刺。'
  },
  {
    id: 'w11', name: '权杖侍从', en: 'Page of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['好奇', '热忱', '试探'], reversed: ['三分钟热度', '消息延迟'],
    upText: '有股新鲜劲儿，适合大胆尝试，不用一开始就做对。',
    revText: '热情来得快去得也快，先承诺一个小目标。',
    advice: '今天就去试那件好奇的事。'
  },
  {
    id: 'w12', name: '权杖骑士', en: 'Knight of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['行动力', '果敢', '热情'], reversed: ['冲动', '虎头蛇尾'],
    upText: '想到就去做，这股冲劲很珍贵，只要别撞了人。',
    revText: '跑得太快忘了方向，先停下来看看地图。',
    advice: '给自己定个截止时间，避免拖成空想。'
  },
  {
    id: 'w13', name: '权杖王后', en: 'Queen of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['自信', '感染力', '掌控'], reversed: ['自我怀疑', '嫉妒'],
    upText: '你的状态能带动别人，温和而坚定就是当下的力量。',
    revText: '别拿别人的成果衡量自己。',
    advice: '主动承担一次带头的角色。'
  },
  {
    id: 'w14', name: '权杖国王', en: 'King of Wands', arcana: 'minor', suit: '权杖', element: '火',
    upright: ['远见', '领导', '决断'], reversed: ['专断', '急躁'],
    upText: '该由你拍板，视野够远，就别再犹豫。',
    revText: '急着推进容易压过别人的声音。',
    advice: '把决定和理由一起说清楚。'
  },
  {
    id: 'c3', name: '圣杯三', en: 'Three of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['欢聚', '友谊', '支持'], reversed: ['疏远', '圈子疲惫'],
    upText: '朋友是当下的能量来源，约一次见面会很值得。',
    revText: '社交有点过载，留点时间给自己。',
    advice: '主动约一个久未见的人。'
  },
  {
    id: 'c4', name: '圣杯四', en: 'Four of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['倦怠', '视而不见', '提不起劲'], reversed: ['重新投入', '转机'],
    upText: '不是没有机会，是当下的你提不起兴趣。允许自己倦怠一阵。',
    revText: '兴趣回来了，别错过眼前那个一直摆着的选项。',
    advice: '换个小环境，打破麻木感。'
  },
  {
    id: 'c5', name: '圣杯五', en: 'Five of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['失落', '遗憾', '盯着失去'], reversed: ['接纳', '慢慢好转'],
    upText: '难过是真的，但身后还有没打翻的杯子，别只看着洒掉的那几只。',
    revText: '开始接受事实了，这是好转的起点。',
    advice: '写下三件还在的事。'
  },
  {
    id: 'c7', name: '圣杯七', en: 'Seven of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['幻想', '选择过多', '分心'], reversed: ['看清', '落地'],
    upText: '选项很多，但有些只是想象。挑一个真正想要的，其余放掉。',
    revText: '幻象散去，你开始看清什么才实际。',
    advice: '把选项砍到只剩两个。'
  },
  {
    id: 'c8', name: '圣杯八', en: 'Eight of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['离开', '放下', '寻找'], reversed: ['徘徊', '不甘心'],
    upText: '有些东西已经给不了你想要的了，转身离开不是失败。',
    revText: '想走又舍不得，先想清楚你真正在找什么。',
    advice: '允许自己放下，不必解释给所有人听。'
  },
  {
    id: 'c9', name: '圣杯九', en: 'Nine of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['满足', '如愿', '享受'], reversed: ['空虚', '贪求'],
    upText: '愿望达成的时刻，好好享受，别急着奔向下一个。',
    revText: '得到后反而空落落的，也许要的不是这个。',
    advice: '认真庆祝一次，别立刻翻篇。'
  },
  {
    id: 'c11', name: '圣杯侍从', en: 'Page of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['悸动', '敏感', '心意'], reversed: ['幼稚', '情绪化'],
    upText: '有份柔软的心意冒出来，值得被认真对待。',
    revText: '容易想太多，把感受说出来比憋着好。',
    advice: '把那句想说的话发出去。'
  },
  {
    id: 'c12', name: '圣杯骑士', en: 'Knight of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['浪漫', '追求', '理想化'], reversed: ['不切实际', '情绪摇摆'],
    upText: '带着真心去靠近，浪漫本身就有力量。',
    revText: '把对方想得太美好，回到现实看看。',
    advice: '用行动表达，而不只是感觉。'
  },
  {
    id: 'c13', name: '圣杯王后', en: 'Queen of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['共情', '温柔', '包容'], reversed: ['过度代入', '耗竭'],
    upText: '你的体贴能接住别人，但也别忘了照顾自己。',
    revText: '太在意别人情绪，把自己掏空了。',
    advice: '先照顾自己的感受，再去照顾别人。'
  },
  {
    id: 'c14', name: '圣杯国王', en: 'King of Cups', arcana: 'minor', suit: '圣杯', element: '水',
    upright: ['成熟', '沉稳', '包容'], reversed: ['压抑', '操控'],
    upText: '情绪稳定是当下的优势，你能给别人安定的感觉。',
    revText: '压着不说不代表处理好了。',
    advice: '用平静的语气说出真实想法。'
  },
  {
    id: 's2', name: '宝剑二', en: 'Two of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['僵持', '回避', '两难'], reversed: ['打破僵局', '信息到来'],
    upText: '卡在两难里，其实你心里有答案，只是不想面对代价。',
    revText: '僵局开始松动，新信息会帮你决定。',
    advice: '写下两个选项最坏的结果。'
  },
  {
    id: 's4', name: '宝剑四', en: 'Four of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['休息', '恢复', '暂停'], reversed: ['勉强复工', '停不下来'],
    upText: '现在最该做的事是休息。停下来不是停滞，是恢复。',
    revText: '休息不够就急着上场，容易再次透支。',
    advice: '今天给自己一段完全放空的时间。'
  },
  {
    id: 's5', name: '宝剑五', en: 'Five of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['争执', '赢了道理输了关系'], reversed: ['和解', '放下胜负'],
    upText: '争赢了也不见得划算，想清楚这场仗值不值得打。',
    revText: '愿意各退一步了，这是关系的转机。',
    advice: '把「谁对」换成「接下来怎么办」。'
  },
  {
    id: 's6', name: '宝剑六', en: 'Six of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['过渡', '离开', '渐入平稳'], reversed: ['滞留', '走不掉'],
    upText: '正在离开一段动荡，虽然还没到岸，但水已经平了。',
    revText: '想走却还有牵绊，先把遗留的事处理完。',
    advice: '接受这段过渡期，别催自己。'
  },
  {
    id: 's7', name: '宝剑七', en: 'Seven of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['策略', '掩饰', '绕道'], reversed: ['坦白', '被识破'],
    upText: '有些事你选择了不直说，短期有效，长期要小心代价。',
    revText: '藏着太累，坦白反而轻松。',
    advice: '把能公开的部分先说清楚。'
  },
  {
    id: 's9', name: '宝剑九', en: 'Nine of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['焦虑', '失眠', '反复思虑'], reversed: ['缓解', '求助'],
    upText: '夜里想的事情，白天往往没那么严重。别一个人扛。',
    revText: '焦虑在减轻，说出来会好得更快。',
    advice: '把担心的事写下来，或找人聊聊。'
  },
  {
    id: 's11', name: '宝剑侍从', en: 'Page of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['好奇', '追问', '警觉'], reversed: ['多疑', '口无遮拦'],
    upText: '想弄明白就多问几句，好奇心是好事。',
    revText: '打探太多会让人不舒服，注意分寸。',
    advice: '把疑问直接问出口。'
  },
  {
    id: 's12', name: '宝剑骑士', en: 'Knight of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['锐利', '直言', '行动快'], reversed: ['莽撞', '言语伤人'],
    upText: '思路快、说得准，是优势；说之前多停一秒更稳。',
    revText: '话赶话容易伤人，慢半拍再开口。',
    advice: '重要的对话先打个草稿。'
  },
  {
    id: 's13', name: '宝剑王后', en: 'Queen of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['清醒', '犀利', '界限'], reversed: ['刻薄', '封闭'],
    upText: '你看得很清楚，把感受和判断分开，会更从容。',
    revText: '尖锐有时是防御，允许自己软一点。',
    advice: '直接说出你的界线。'
  },
  {
    id: 's14', name: '宝剑国王', en: 'King of Swords', arcana: 'minor', suit: '宝剑', element: '风',
    upright: ['理性', '权威', '公正'], reversed: ['冷硬', '滥用逻辑'],
    upText: '用理性做决定很合适，但记得照顾到人的感受。',
    revText: '太讲道理会显得不近人情。',
    advice: '先讲事实，再留一句体谅。'
  },
  {
    id: 'p2', name: '星币二', en: 'Two of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['平衡', '周旋', '灵活'], reversed: ['失衡', '顾此失彼'],
    upText: '同时应付几件事，节奏还在你手上，但别再加新的了。',
    revText: '盘子转不过来了，是时候放下一个。',
    advice: '这周不再接新任务。'
  },
  {
    id: 'p3', name: '星币三', en: 'Three of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['协作', '技艺', '被认可'], reversed: ['配合不良', '敷衍'],
    upText: '专业能力被看见，配合得好会更出成果。',
    revText: '分工不清拖慢进度，先把责任划明白。',
    advice: '主动对齐一次分工和标准。'
  },
  {
    id: 'p5', name: '星币五', en: 'Five of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['困顿', '匮乏', '被落下'], reversed: ['转机', '求助'],
    upText: '日子有点紧，但援助其实就在旁边，开口并不丢人。',
    revText: '最难的一段过去了，情况在回暖。',
    advice: '向可信的人说一次真实处境。'
  },
  {
    id: 'p6', name: '星币六', en: 'Six of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['给予', '分配', '互助'], reversed: ['附带条件', '依赖'],
    upText: '给与受都在流动，接受帮助时也不必觉得亏欠。',
    revText: '付出带着期待回报，会让关系变味。',
    advice: '做一次不计回报的给予。'
  },
  {
    id: 'p8', name: '星币八', en: 'Eight of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['精进', '专注', '打磨'], reversed: ['敷衍', '重复无成长'],
    upText: '正是练手艺的时候，重复里藏着进步。',
    revText: '只是机械重复，该换个练法了。',
    advice: '今天专注打磨一个具体细节。'
  },
  {
    id: 'p9', name: '星币九', en: 'Nine of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['自立', '收获', '从容'], reversed: ['过度依赖', '虚有其表'],
    upText: '凭自己走到这一步，值得好好享受这份安稳。',
    revText: '表面的从容底下是不安全感，先补实力。',
    advice: '犒赏自己一次，认真肯定自己。'
  },
  {
    id: 'p11', name: '星币侍从', en: 'Page of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['务实', '学习', '起步'], reversed: ['拖延', '眼高手低'],
    upText: '愿意从基础学起，这份踏实会带来真正的进展。',
    revText: '只想不做，先做一个最小版本出来。',
    advice: '今天学一个小技能。'
  },
  {
    id: 'p12', name: '星币骑士', en: 'Knight of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['踏实', '可靠', '按部就班'], reversed: ['停滞', '固执'],
    upText: '慢是慢了点，但每一步都算数，别被速度焦虑带跑。',
    revText: '过于求稳反而卡住，试一点新做法。',
    advice: '定个可执行的日程，照着走。'
  },
  {
    id: 'p13', name: '星币王后', en: 'Queen of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['安稳', '照料', '务实'], reversed: ['过度操劳', '忽略自己'],
    upText: '把生活安顿好的能力是天赋，也别忘了享受它。',
    revText: '顾了所有人，唯独漏了自己。',
    advice: '给自己也安排一份照顾。'
  },
  {
    id: 'p14', name: '星币国王', en: 'King of Pentacles', arcana: 'minor', suit: '星币', element: '土',
    upright: ['富足', '掌控', '稳健'], reversed: ['守财', '固执于安全感'],
    upText: '资源与经验都在手上，可以大方一点做长期投入。',
    revText: '太怕失去反而束手束脚。',
    advice: '做一笔着眼长期的投入。'
  }
]

return MINOR_EXTRA
})()