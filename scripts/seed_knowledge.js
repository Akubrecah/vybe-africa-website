/**
 * scripts/seed_knowledge.js
 *
 * One-time seed of curated pillar knowledge into the Bonga na Vybe
 * vector store. Run ONCE after setting up the Supabase schema.
 *
 * Usage:
 *   node scripts/seed_knowledge.js
 *
 * Prerequisites:
 *   - GEMINI_API_KEY in .env
 *   - Supabase schema applied (supabase_rag_schema.sql)
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../config/supabase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const sleep  = ms => new Promise(r => setTimeout(r, ms));

// ── Curated knowledge base ────────────────────────────────────────────────────
// Sourced from UNICEF, WHO, UNFPA, Red Cross, UNEP, Save the Children, UN Women
const KNOWLEDGE = [

  // ── SRHR ───────────────────────────────────────────────────────────────────
  {
    pillar: 'srhr', source_name: 'UNICEF Kenya', source_url: 'https://www.unicef.org/kenya/maternal-and-newborn-health',
    title: 'Maternal and Newborn Health in Kenya',
    content: `Kenya has made significant progress in reducing maternal mortality but challenges remain, especially in rural counties like West Pokot. The maternal mortality ratio stands at about 342 per 100,000 live births. UNICEF Kenya supports skilled birth attendance, antenatal care, and community health worker programmes. Key barriers include distance to health facilities, cost of care, and cultural practices. Adolescent pregnancies remain high — about 18% of girls aged 15–19 have begun childbearing. Comprehensive SRHR education, community mobilisation, and access to contraception are critical interventions. UNICEF supports community-based health workers who provide SRHR information and refer clients to facilities.`,
  },
  {
    pillar: 'srhr', source_name: 'UNFPA Kenya', source_url: 'https://kenya.unfpa.org/en/topics/sexual-reproductive-health-0',
    title: 'Sexual and Reproductive Health Rights in Kenya',
    content: `UNFPA Kenya focuses on ensuring universal access to sexual and reproductive health services. This includes family planning, safe motherhood, HIV prevention, and addressing gender-based violence. In Kenya, unmet need for family planning is approximately 18%. Modern contraceptive use has increased but remains low in arid and semi-arid areas including West Pokot at around 26%. Adolescent girls face particular vulnerabilities. UNFPA's programmes include community mobilisation, training of health providers, supply of contraceptives, and support to community-based health volunteers. Harmful practices like Female Genital Mutilation (FGM) and child marriage continue to affect girls in some counties.`,
  },
  {
    pillar: 'srhr', source_name: 'WHO Kenya', source_url: 'https://www.who.int/kenya',
    title: 'Adolescent Sexual Health — WHO Kenya',
    content: `WHO Kenya emphasises that adolescent sexual and reproductive health (ASRH) is a fundamental right. Adolescents aged 10–24 make up 34% of Kenya's population. Key ASRH priorities include preventing early and unintended pregnancies, preventing and treating sexually transmitted infections including HIV, preventing sexual violence, and ensuring access to safe abortion services where legal. Comprehensive sexuality education (CSE) in schools is critical. Health systems must be youth-friendly. Community-based distribution of contraceptives reaches adolescents who cannot access facility-based services. Peer education and peer support groups are effective approaches for youth outreach.`,
  },
  {
    pillar: 'srhr', source_name: 'UNICEF Kenya', source_url: 'https://www.unicef.org/kenya/gender-based-violence',
    title: 'Gender-Based Violence in Kenya',
    content: `Gender-based violence (GBV) affects 1 in 3 women in Kenya. In conflict-affected and remote areas including West Pokot, rates are higher. GBV includes intimate partner violence, sexual violence, harmful traditional practices, and child marriage. UNICEF supports GBV prevention through community dialogues, engaging men and boys as champions, strengthening response systems (one-stop centres), and supporting survivors. The government's National Gender and Equality Commission (NGEC) coordinates GBV response. Reporting mechanisms remain limited in rural settings. Social norms that condone violence against women and girls must be challenged through sustained community engagement.`,
  },

  // ── CLIMATE ACTION ─────────────────────────────────────────────────────────
  {
    pillar: 'climate', source_name: 'Kenya Red Cross', source_url: 'https://www.redcross.or.ke/climate-change',
    title: 'Climate Change and Disaster Risk in Kenya',
    content: `Kenya is among the most climate-vulnerable countries in Africa. Droughts, floods, and food insecurity are intensifying. Kenya Red Cross Society leads community-based disaster risk reduction programmes in arid and semi-arid lands (ASALs) including West Pokot. Their approach includes early warning systems, community resilience building, water harvesting structures, and livelihood diversification. Climate-smart agriculture helps communities adapt. Youth volunteers play a key role in community preparedness and response. The Red Cross operates through branches in all 47 counties and trains Community Disaster Response Teams (CDRTs) at the grassroots level.`,
  },
  {
    pillar: 'climate', source_name: 'UNEP Kenya', source_url: 'https://www.unep.org/regions/africa/kenya',
    title: 'UNEP Kenya — Environmental Sustainability',
    content: `The United Nations Environment Programme (UNEP), headquartered in Nairobi, Kenya, leads global environmental action. Kenya's key environmental challenges include deforestation — forest cover has declined from 12% to around 7% — soil degradation, water scarcity, and pollution. UNEP supports Kenya's implementation of the Paris Agreement and nationally determined contributions (NDCs). Renewable energy transition is critical: Kenya already generates over 90% of its electricity from renewables including geothermal and hydro. Youth engagement in environmental action through Ecosystem Restoration Camps and the UN Decade on Ecosystem Restoration is prioritised. Community reforestation and waste management are entry points for youth environmental activism.`,
  },
  {
    pillar: 'climate', source_name: 'NEMA Kenya', source_url: 'https://www.nema.go.ke/',
    title: 'National Environment Management Authority — Kenya',
    content: `The National Environment Management Authority (NEMA) is the principal government instrument for the implementation of all policies relating to the environment in Kenya. NEMA coordinates all matters relating to the environment including environmental assessments, enforcement, and compliance. Key priorities include waste management, water resource protection, and climate change adaptation. Citizens can report environmental violations. NEMA works with county governments on waste management and environmental education. Young people are encouraged to participate in environmental compliance monitoring and tree planting initiatives supported under the government's 15 billion trees target by 2032.`,
  },
  {
    pillar: 'climate', source_name: 'UNDP Kenya', source_url: 'https://www.undp.org/kenya/climate-change',
    title: 'UNDP Kenya Climate Adaptation',
    content: `UNDP Kenya supports climate change adaptation and mitigation. Kenya has committed to reducing emissions by 32% by 2030 in its NDC. Key UNDP programmes include integrated climate risk management, sustainable land management, and energy access for rural communities. The Green Climate Fund (GCF) supports Kenya's climate resilience projects. Pastoralist communities in ASALs face the highest climate risks — drought, livestock losses, and displacement. Index-based livestock insurance (IBLI) helps protect pastoralist livelihoods. Women and youth-led climate action is supported through community adaptation planning.`,
  },

  // ── CHILD PROTECTION ───────────────────────────────────────────────────────
  {
    pillar: 'child_protection', source_name: 'UNICEF Kenya — Child Protection', source_url: 'https://www.unicef.org/kenya/child-protection',
    title: 'Child Protection in Kenya — UNICEF',
    content: `UNICEF Kenya's child protection programme addresses violence, exploitation, abuse, and neglect affecting children. Kenya has 22.5 million children under 18. Child marriage remains a concern — 23% of girls are married before 18. FGM affects 21% of women in Kenya, with much higher rates in specific counties. Street-connected children face particular vulnerabilities. UNICEF supports the Child Protection Alternative Care system, community-based child protection mechanisms (CBCPMs), legal aid, and psychosocial support. The Children Act 2022 strengthens protections. Reporting of child abuse to the Child Helpline (116) is free. Community child protection committees at village level monitor and respond to child protection concerns.`,
  },
  {
    pillar: 'child_protection', source_name: 'Save the Children Kenya', source_url: 'https://kenya.savethechildren.net/',
    title: 'Save the Children Kenya — Child Rights',
    content: `Save the Children Kenya works to ensure every child has the right to survival, protection, development, and participation. Their programmes focus on child-friendly schools, prevention of violence against children, child labour elimination, and humanitarian response. In West Pokot and other ASAL counties, child protection is integrated with humanitarian programming. Child-friendly spaces in communities provide safe environments for learning and play. Community engagement of parents, teachers, and community leaders is essential for sustainable child protection outcomes. Save the Children supports case management systems and referral pathways for children at risk.`,
  },
  {
    pillar: 'child_protection', source_name: 'UNICEF Kenya — Education', source_url: 'https://www.unicef.org/kenya/education',
    title: 'Education and Child Rights in Kenya',
    content: `Access to quality education is a fundamental child right. Kenya has made significant gains in primary school enrolment under the Competency-Based Curriculum (CBC). However, learning poverty remains high — many children complete primary school unable to read. In West Pokot, school attendance is affected by pastoralism, drought-related displacement, and early marriage. UNICEF supports catch-up learning, school feeding programmes, water and sanitation in schools, and menstrual hygiene management to keep girls in school. Inclusive education for children with disabilities is a priority. Safe school environments free from violence and bullying are essential for child protection.`,
  },
  {
    pillar: 'child_protection', source_name: 'UNICEF Kenya', source_url: 'https://www.unicef.org/kenya/early-childhood-development',
    title: 'Early Childhood Development in Kenya',
    content: `The first 1,000 days of life — from conception to age 2 — are critical for brain development. Investments in early childhood development (ECD) have high returns for individuals and communities. In Kenya, ECD enrolment has improved but quality varies widely. Stunting affects 26% of children under 5, indicating chronic malnutrition. UNICEF and the government support community-based ECD centres, training of ECD caregivers, and parent education on nurturing care. Responsive caregiving, adequate nutrition, early learning, and protection from stress are the pillars of nurturing care. Communities can support ECD through establishing village-level playgroups and supporting mothers.`,
  },

  // ── INCLUSIVE GOVERNANCE ──────────────────────────────────────────────────
  {
    pillar: 'governance', source_name: 'UN Women Kenya', source_url: 'https://africa.unwomen.org/en/where-we-are/eastern-and-southern-africa/kenya',
    title: 'Women in Leadership and Governance — Kenya',
    content: `Kenya's Constitution (2010) requires that no more than two-thirds of elected positions be of the same gender. However, women hold only 23% of parliamentary seats. UN Women Kenya works to increase women's political participation, eliminate violence against women in elections, and support women leaders at county and national levels. The two-thirds gender rule requires civic education, legal reform, and changing social norms. Women's access to land and economic resources is a prerequisite for meaningful political participation. Young women face double marginalisation — as youth and as women — in governance spaces. Quota systems and affirmative action have increased women's representation in some sectors.`,
  },
  {
    pillar: 'governance', source_name: 'UNDP Kenya', source_url: 'https://www.undp.org/kenya/democratic-governance',
    title: 'Democratic Governance in Kenya — UNDP',
    content: `UNDP Kenya supports democratic governance, rule of law, and civic participation. Kenya has a devolved system of government with 47 counties — each with a County Government. Public participation is constitutionally mandated in the budget-making process and legislation. Citizens have a right to access government information. Youth participation in governance is guaranteed under the Constitution — the National Youth Council Act provides a framework for youth engagement. Community score cards and social accountability tools empower citizens to hold duty bearers accountable. UNDP supports elections administration, anti-corruption, and access to justice programmes.`,
  },
  {
    pillar: 'governance', source_name: 'IEBC Kenya', source_url: 'https://www.iebc.or.ke/',
    title: 'Youth Participation in Elections — Kenya',
    content: `The Independent Electoral and Boundaries Commission (IEBC) is responsible for conducting elections in Kenya. Youth aged 18+ can register and vote. Young people make up 60% of Kenya's population but are under-represented as candidates. The Constitution provides for the youth to be represented in Parliament through nominated seats. County assemblies have youth minority representation. Civic education is essential to ensure youth understand their rights and how to participate meaningfully in electoral processes. Voter registration drives targeting youth in institutions of learning and rural areas help expand youth electoral participation.`,
  },
  {
    pillar: 'governance', source_name: 'UN Women Kenya', source_url: 'https://africa.unwomen.org/en/where-we-are/eastern-and-southern-africa/kenya/stories',
    title: 'Community Dialogues for Inclusive Governance',
    content: `Community dialogues are a proven tool for inclusive governance. They bring together diverse community members — including women, youth, persons with disabilities, and marginalised groups — to discuss issues affecting them and propose solutions. Barazas (community meetings) are a traditional governance mechanism in Kenya that can be made more inclusive. County governments are required by law to hold public participation forums. CSOs and CBOs like Vybe Africa play a critical role in mobilising community members to attend and meaningfully participate in these forums. Trained community mobilisers and youth advocates can ensure marginalised voices are heard in governance processes.`,
  },
];

// ── Embed and insert ──────────────────────────────────────────────────────────
async function embed(text) {
  const model  = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌  GEMINI_API_KEY not set in .env');
    process.exit(1);
  }

  console.log(`\n🌱 Bonga na Vybe — Seeding knowledge base`);
  console.log(`   ${KNOWLEDGE.length} documents to process\n`);

  let inserted = 0, failed = 0;

  for (const doc of KNOWLEDGE) {
    try {
      process.stdout.write(`  Embedding: "${doc.title.substring(0, 55)}..." `);
      const embedding = await embed(`${doc.title}. ${doc.content}`);

      const { error } = await supabase.from('bonga_documents').upsert({
        content:     doc.content,
        embedding,
        source_url:  doc.source_url,
        source_name: doc.source_name,
        pillar:      doc.pillar,
        title:       doc.title,
        updated_at:  new Date().toISOString(),
      });

      if (error) {
        console.log(`✗ (${error.message})`);
        failed++;
      } else {
        console.log('✓');
        inserted++;
      }

      await sleep(300); // rate limit buffer
    } catch (err) {
      console.log(`✗ Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅  Seed complete: ${inserted} inserted, ${failed} failed`);
  console.log('   Open Supabase Table Editor → bonga_documents to verify.\n');
  process.exit(0);
}

run();
