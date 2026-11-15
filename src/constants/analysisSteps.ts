import { AppLanguage, CompanyInfo, ConvictionLevel, PresetCompany } from '../types/research';

export interface StepDefinition {
  id: number;
  shortTitle: Record<AppLanguage, string>;
  title: Record<AppLanguage, string>;
  subtitle: Record<AppLanguage, string>;
  category: Record<AppLanguage, string>;
  prompt: (c: CompanyInfo, lang: AppLanguage) => string;
}

export const ANALYSIS_STEPS: StepDefinition[] = [
  {
    id: 1,
    shortTitle: { zh: '业务理解', en: 'Business Model' },
    title: { zh: '01. 业务理解', en: '01. Business Understanding' },
    subtitle: { zh: 'Business Understanding', en: 'Core Value Proposition' },
    category: { zh: '商业与行业', en: 'Business & Industry' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Explain ${c.name} (${c.ticker}) (Industry: ${c.industry || 'General'}) in clear, jargon-free terms:\n1. What products or services does it sell and what core customer pain point does it solve?\n2. Why do customers choose it over alternatives?\n3. How does its core business flywheel compound over time?`
        : `请用通俗直观的语言拆解 ${c.name} (${c.ticker})（行业：${c.industry || '综合'}）的核心商业逻辑：\n1. 它向谁提供什么产品或服务，解决了什么痛点？\n2. 客户为什么选择它而不是替代方案？\n3. 它的核心商业飞轮是如何运转的？避免堆砌晦涩财务术语。`,
  },
  {
    id: 2,
    shortTitle: { zh: '收入分解', en: 'Revenue Mix' },
    title: { zh: '02. 收入分解', en: '02. Revenue Breakdown' },
    subtitle: { zh: 'Revenue Breakdown', en: 'Segments & Drivers' },
    category: { zh: '商业与行业', en: 'Business & Industry' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Break down the revenue architecture of ${c.name} (${c.ticker}):\n1. Identify primary business segments, revenue mix, and role (cash cow vs. growth engine).\n2. Which segments are accelerating vs. decelerating?\n3. Highlight any customer, geographic, or single-product concentration risks.\nInclude a clean Markdown table summarizing segments where helpful.`
        : `请详细分解 ${c.name} (${c.ticker}) 的收入结构：\n1. 列出主要业务板块或收入来源及其大体占比/角色定位；\n2. 哪些业务是高增长核心引擎，哪些进入成熟或放缓期？\n3. 存在哪些客户集中度、区域集中度或单一产品依赖风险？\n如有帮助，请用 Markdown 表格整理各板块对比。`,
  },
  {
    id: 3,
    shortTitle: { zh: '行业背景', en: 'Industry Context' },
    title: { zh: '03. 行业背景', en: '03. Industry Background' },
    subtitle: { zh: 'Industry Background', en: 'Market & Secular Trends' },
    category: { zh: '商业与行业', en: 'Business & Industry' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Analyze the industry landscape for ${c.name} (${c.ticker}) (${c.industry || 'its sector'}):\n1. Where is the industry in its lifecycle (early growth, scaling, mature, consolidating) and what is penetration/TAM headroom?\n2. Key 3–5 year secular tailwinds vs. structural headwinds.\n3. Bargaining power across upstream suppliers and downstream buyers.`
        : `请剖析 ${c.name} (${c.ticker}) 所处行业（${c.industry || '所在赛道'}）的宏观与产业背景：\n1. 行业当前处于成长期、成熟期还是整合期？市场天花板与渗透率如何？\n2. 未来 3-5 年有哪些结构性顺风（Tailwinds）与逆风（Headwinds）？\n3. 产业链上下游议价能力分布如何？`,
  },
  {
    id: 4,
    shortTitle: { zh: '竞争格局', en: 'Competition & Moat' },
    title: { zh: '04. 竞争格局', en: '04. Competitive Landscape' },
    subtitle: { zh: 'Competitive Landscape', en: 'Moat & Peer Benchmarking' },
    category: { zh: '护城河与财务', en: 'Moat & Financials' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Evaluate the competitive landscape and moat of ${c.name} (${c.ticker}):\n1. Name 2–4 direct competitors.\n2. Provide a Markdown comparison table across pricing power, product differentiation, scale economies, and switching costs/ecosystem moat.\n3. Who is steadily gaining market share vs. losing ground?`
        : `请评估 ${c.name} (${c.ticker}) 的竞争格局与护城河：\n1. 列出 2-4 个最直接的国内外竞争对手；\n2. 请用 Markdown 表格从定价能力、产品差异化、规模效应、技术/生态壁垒四个维度做对比；\n3. 谁在持续赢得市场份额，谁在被动防守？`,
  },
  {
    id: 5,
    shortTitle: { zh: '财务质量', en: 'Financial Quality' },
    title: { zh: '05. 财务质量', en: '05. Financial Quality' },
    subtitle: { zh: 'Financial Quality', en: 'Margins, FCF & ROIC' },
    category: { zh: '护城河与财务', en: 'Moat & Financials' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Assess the financial quality and capital efficiency of ${c.name} (${c.ticker}):\n1. Consistency and organic quality of revenue growth.\n2. Gross, operating, and net margin trajectory alongside ROE/ROIC trends.\n3. Free cash flow (FCF) conversion and balance sheet leverage resilience.\n4. Capital allocation track record (reinvestment, M&A, dividends, buybacks).`
        : `请深度剖析 ${c.name} (${c.ticker}) 的财务质量与资本效率：\n1. 营收增长的持续性与含金量；\n2. 毛利率、净利率及 ROE/ROIC 的长期趋势与驱动因素；\n3. 自由现金流（FCF）转化率、资产负债表杠杆安全度；\n4. 管理层资本配置习惯（再投资、并购、分红还是回购？）。`,
  },
  {
    id: 6,
    shortTitle: { zh: '风险与下跌', en: 'Risks & Downside' },
    title: { zh: '06. 风险与下跌', en: '06. Risks & Downside' },
    subtitle: { zh: 'Risks & Downside', en: 'Bear Threats & Tail Risk' },
    category: { zh: '护城河与财务', en: 'Moat & Financials' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Identify the sharpest downside risks for ${c.name} (${c.ticker}):\n1. Business model disruption or structural demand erosion.\n2. Financial, FX, inventory, or CapEx overrun pressures.\n3. Regulatory, antitrust, or geopolitical exposure.\n4. Extreme tail scenarios that could cause permanent capital loss.`
        : `请从逆向风控视角识别 ${c.name} (${c.ticker}) 面临的最大潜在威胁：\n1. 商业模式被颠覆或需求结构性萎缩的风险；\n2. 财务与流动性压力（高债务、汇率、库存减值或资本开支黑洞）；\n3. 监管政策、反垄断或地缘政治冲击；\n4. 可能导致本金永久性损失（Permanent Capital Loss）的极端情景。`,
  },
  {
    id: 7,
    shortTitle: { zh: '管理层与执行', en: 'Management' },
    title: { zh: '07. 管理层与执行', en: '07. Management & Execution' },
    subtitle: { zh: 'Management & Execution', en: 'Governance & Alignment' },
    category: { zh: '护城河与财务', en: 'Moat & Financials' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Evaluate management quality and corporate governance at ${c.name} (${c.ticker}):\n1. Leadership track record, strategic discipline, and execution credibility.\n2. Insider ownership and incentive alignment with minority shareholders.\n3. Key capital allocation or pivot decisions made during prior cycles.`
        : `请评估 ${c.name} (${c.ticker}) 的管理层素质与公司治理：\n1. 核心管理层与创始人的过往履历、战略定力与兑现记录；\n2. 管理层持股比例、股权激励机制是否与中小股东长期利益一致？\n3. 历史上做过哪些关键的顺境/逆境决策，执行力表现如何？`,
  },
  {
    id: 8,
    shortTitle: { zh: '牛熊情景', en: 'Bull / Bear Cases' },
    title: { zh: '08. 牛熊情景', en: '08. Bull & Bear Scenarios' },
    subtitle: { zh: 'Bull & Bear Scenarios', en: '3–5 Year Fundamental Paths' },
    category: { zh: '情景与估值', en: 'Scenarios & Valuation' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Construct 3–5 year Base, Bull, and Bear scenarios for ${c.name} (${c.ticker}) using a Markdown table:\n1. Expected revenue CAGR, operating margin evolution, and key fundamental catalysts.\n2. Focus strictly on business fundamentals rather than short-term market sentiment.`
        : `请构建 ${c.name} (${c.ticker}) 未来 3-5 年的基准、乐观（牛市）与悲观（熊市）三种情景假设（可使用 Markdown 表格）：\n1. 核心业务增速、利润率演进与关键催化事件；\n2. 聚焦基本面驱动因素，而非短期市场情绪波动。`,
  },
  {
    id: 9,
    shortTitle: { zh: '估值思考', en: 'Valuation' },
    title: { zh: '09. 估值思考', en: '09. Valuation Thoughts' },
    subtitle: { zh: 'Valuation Thoughts', en: 'Multiples & Expectations' },
    category: { zh: '情景与估值', en: 'Scenarios & Valuation' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Lay out a practical valuation framework for ${c.name} (${c.ticker}):\n1. Which primary valuation methodology fits best (P/E, EV/EBITDA, DCF, P/S, or SOTP) and why?\n2. What growth and margin assumptions are implied by typical market expectations?\n3. What defines a clear margin of safety vs. overvaluation?`
        : `请梳理对 ${c.name} (${c.ticker}) 进行估值的核心方法论：\n1. 该公司最适合采用哪种估值框架（PE、EV/EBITDA、DCF、PS 还是分部加总 SOTP）？为什么？\n2. 市场当前定价隐含了怎样的增长或利润率预期？\n3. 什么情况下当前估值算便宜（安全边际），什么前提会证明高估？`,
  },
  {
    id: 10,
    shortTitle: { zh: '长期论文', en: 'Long-term Thesis' },
    title: { zh: '10. 长期投资论文', en: '10. Long-term Thesis' },
    subtitle: { zh: 'Long-term Thesis', en: 'Conviction & Kill Criteria' },
    category: { zh: '情景与估值', en: 'Scenarios & Valuation' },
    prompt: (c, lang) =>
      lang === 'en'
        ? `Synthesize a long-term investment memo for ${c.name} (${c.ticker}):\n1. Core thesis: why own or closely track this business over a 3–5+ year horizon?\n2. Three critical assumptions that must hold true.\n3. Thesis-breaking red flags (kill criteria) that would trigger an exit.`
        : `请综合以上维度，撰写 ${c.name} (${c.ticker}) 的最终长期投资备忘录：\n1. 核心看多论点：为什么它值得长期拥有或持续跟踪？\n2. 必须成立的 3 个关键前提（Key Assumptions）；\n3. 证伪信号清单（如果出现哪些迹象，说明最初的投资逻辑已经破坏，应当果断退出？）。`,
  },
];

export const PRESET_COMPANIES: PresetCompany[] = [
  {
    name: { zh: '腾讯控股', en: 'Tencent Holdings' },
    ticker: '0700.HK',
    industry: { zh: '互联网 / 游戏与社交生态', en: 'Internet / Gaming & Social' },
    market: 'HK',
    note: { zh: '微信生态 + 现金牛游戏 + 视频号商业化', en: 'WeChat ecosystem, evergreen gaming & Video Accounts monetization' },
  },
  {
    name: { zh: '英伟达', en: 'NVIDIA' },
    ticker: 'NVDA',
    industry: { zh: '半导体 / AI 算力基础设施', en: 'Semiconductors / AI Compute' },
    market: 'US',
    note: { zh: 'CUDA 软件生态护城河与数据中心算力周期', en: 'CUDA software moat & global AI data-center infrastructure' },
  },
  {
    name: { zh: '贵州茅台', en: 'Kweichow Moutai' },
    ticker: '600519.SS',
    industry: { zh: '消费品 / 高端白酒', en: 'Consumer Staples / Spirits' },
    market: 'A',
    note: { zh: '极致毛利率、渠道控价与品牌稀缺性', en: 'Ultra-high gross margins, pricing power & heritage scarcity' },
  },
  {
    name: { zh: '苹果', en: 'Apple' },
    ticker: 'AAPL',
    industry: { zh: '消费电子 / 软硬一体生态', en: 'Consumer Tech / Ecosystem' },
    market: 'US',
    note: { zh: '全球高净值硬件存量与高毛利服务飞轮', en: '2B+ active installed base driving recurring Services flywheel' },
  },
  {
    name: { zh: '宁德时代', en: 'CATL' },
    ticker: '300750.SZ',
    industry: { zh: '新能源 / 动力与储能电池', en: 'Clean Energy / EV & ESS Batteries' },
    market: 'A',
    note: { zh: '全球规模制造优势与储能第二增长曲线', en: 'Global battery scale leadership & energy storage expansion' },
  },
  {
    name: { zh: '微软', en: 'Microsoft' },
    ticker: 'MSFT',
    industry: { zh: '企业软件与云计算', en: 'Enterprise Software & Cloud' },
    market: 'US',
    note: { zh: 'Azure 云基础设施与企业级 AI Copilot 变现', en: 'Azure cloud scale & enterprise AI Copilot monetization' },
  },
  {
    name: { zh: '阿里巴巴', en: 'Alibaba Group' },
    ticker: '9988.HK',
    industry: { zh: '电商与云计算', en: 'E-Commerce & Cloud' },
    market: 'HK',
    note: { zh: '核心电商现金流防御与阿里云重估潜力', en: 'Core commerce FCF generation & Alibaba Cloud AI re-rating' },
  },
  {
    name: { zh: '特斯拉', en: 'Tesla' },
    ticker: 'TSLA',
    industry: { zh: '新能源汽车与自动驾驶', en: 'EVs, Autonomy & Energy' },
    market: 'US',
    note: { zh: 'FSD 端到端智驾、储能与制造效率革命', en: 'FSD autonomy software, Megapack energy & manufacturing scale' },
  },
];

export const CONVICTION_LABELS: Record<ConvictionLevel, Record<AppLanguage, string>> = {
  undecided: { zh: '尚未评级', en: 'Unrated' },
  high: { zh: '强烈关注', en: 'High Conviction' },
  watch: { zh: '持续跟踪', en: 'Watchlist' },
  pass: { zh: '暂不考虑', en: 'Pass' },
};

export const FOLLOWUP_SUGGESTIONS: Record<AppLanguage, string[]> = {
  zh: [
    '如果宏观需求低于预期 20%，它的自由现金流和分红会受到多大冲击？',
    '对比行业头号竞争对手，它最容易被攻破的薄弱环节是什么？',
    '未来 4 个季度财报中最需要盯紧的 3 个先行指标是什么？',
    '用最保守的悲观假设，估算它的长期安全边际在哪里？',
  ],
  en: [
    'How resilient are FCF and shareholder returns if demand slows 20%?',
    'What is its sharpest vulnerability compared with its #1 competitor?',
    'Which 3 leading KPIs matter most over the next 4 earnings quarters?',
    'Under conservative bear assumptions, where is the margin of safety?',
  ],
};
