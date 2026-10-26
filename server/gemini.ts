import { GoogleGenAI } from '@google/genai';
import { db } from './db';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI client:', e);
    }
  }
  return aiClient;
}

export const LANGUAGE_METADATA: Record<string, { name: string; native: string; script: string }> = {
  en: { name: 'English', native: 'English', script: 'Latin' },
  hi: { name: 'Hindi', native: 'हिन्दी', script: 'Devanagari' },
  mr: { name: 'Marathi', native: 'मराठी', script: 'Devanagari' },
  bn: { name: 'Bengali', native: 'বাংলা', script: 'Bengali' },
  gu: { name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati' },
  ta: { name: 'Tamil', native: 'தமிழ்', script: 'Tamil' },
  te: { name: 'Telugu', native: 'తెలుగు', script: 'Telugu' },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada' },
  ml: { name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam' },
  pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  as: { name: 'Assamese', native: 'অসমীয়া', script: 'Assamese' },
  or: { name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  ur: { name: 'Urdu', native: 'اردو', script: 'Nastaliq / Urdu' }
};

export async function askKrishiSahayak(userPrompt: string, language: string = 'en', userContext?: any) {
  const schemes = db.getData().schemes;
  const loans = db.getData().loans;
  const langMeta = LANGUAGE_METADATA[language] || LANGUAGE_METADATA.en;

  // Build grounded context
  const schemeSummary = schemes.map(s => `
Scheme: ${s.name} (${s.code})
Department: ${s.department}
Type: ${s.category} (${s.governmentLevel})
Benefits: ${s.benefits}
Subsidy/Assistance: ${s.subsidyAmountOrPercent}
Eligibility: ${s.eligibilitySummary.join('; ')}
Required Documents: ${s.requiredDocuments.join(', ')}
Official Portal: ${s.officialSourceUrl}
Last Verified Date: ${s.lastVerifiedDate}
`).join('\n---\n');

  const loanSummary = loans.map(l => `
Bank: ${l.bankName}
Loan: ${l.loanName}
Interest: ${l.interestRate}
Max Amount: ${l.maxAmount}
Tenure: ${l.tenure}
Collateral: ${l.collateralRequirement}
Subvention/Subsidy: ${l.subsidyOrSubvention}
Official Link: ${l.officialSourceUrl}
`).join('\n---\n');

  const systemInstruction = `You are Krishi Sahayak (कृषि सहायक), the official AI advisor for the Farmer Loan & Subsidy Finder platform (Government of India Agriculture Welfare Network).
Your goal is to provide legally and factually accurate guidance to Indian farmers, bank officers, and citizen service centers about government subsidies, schemes, agricultural credit, documents, and application steps.

TARGET LANGUAGE REQUIREMENT:
The user's portal interface is set to: ${langMeta.name} (${langMeta.native}).
You MUST compose your response in ${langMeta.name} (${langMeta.native}) using its natural, culturally appropriate ${langMeta.script} script by default, unless the user explicitly requests another language in their query.

RULES:
1. Ground your answers strictly in verified Indian government schemes and loans provided in the context below.
2. Maintain complete accuracy for numbers, financial amounts, interest rates (e.g. ₹6,000, 4% interest, 60% subsidy), dates, and official URLs.
3. Always include the specific department, subsidy percentage/benefit amount, and required documents.
4. Mention official portal links (e.g. pmkisan.gov.in, pmkusum.mnre.gov.in, pmksy.gov.in, sbi.co.in) whenever relevant.
5. Emphasize that "Final sanction and approval is subject to physical verification and discretion of the competent government or bank authority."
6. Be concise, respectful, structured (using bullet points), and compassionate towards farmers.

VERIFIED SCHEME DATABASE:
${schemeSummary}

VERIFIED LOAN DATABASE:
${loanSummary}

USER PROFILE CONTEXT:
${userContext ? JSON.stringify(userContext) : 'Standard farmer inquiry'}
`;

  const client = getAiClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });
      return {
        reply: response.text || 'No response generated.',
        source: 'GEMINI_AI',
        model: 'gemini-2.5-flash'
      };
    } catch (err: any) {
      console.warn('Gemini API call failed, using grounded fallback engine:', err?.message);
    }
  }

  // Knowledge-grounded fallback response when API key is not present or rate limited
  return generateRuleBasedFallback(userPrompt, language, schemes, loans);
}

function generateRuleBasedFallback(prompt: string, language: string, schemes: any[], loans: any[]) {
  const p = prompt.toLowerCase();
  const lang = language.toLowerCase();

  // Kusum / Solar query
  if (p.includes('kusum') || p.includes('solar') || p.includes('सौर') || p.includes('सोलर') || p.includes('ಸೋಲಾರ್') || p.includes('சோலார்') || p.includes('సౌర') || p.includes('സോളാർ')) {
    const s = schemes.find(x => x.code === 'PM-KUSUM-B') || schemes[1];
    
    if (lang === 'hi') {
      return {
        reply: `**${s.name}**\n\n- **विभाग:** ${s.department}\n- **सरकारी सब्सिडी:** 60% से 75% तक अनुदान\n- **मुख्य लाभ:** 3 HP से 10 HP स्टैंडઅલોન सोलर पंप। बिजली बिल से मुक्ति।\n- **पात्रता:** कृषि योग्य भूमि और जल स्रोत (बोरवेल/कुआं/तालाब)।\n- **आवश्यक दस्तावेज़:** आधार कार्ड, 7/12 फर्द/खतौनी, बैंक पासबुक।\n- **आधिकारिक पोर्टल:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*नोट: अंतिम अनुमोदन राज्य अक्षय ऊर्जा विकास एजेंसी (MEDA/CREDA) के सत्यापन पर निर्भर करता है।*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'mr') {
      return {
        reply: `**${s.name}**\n\n- **विभाग:** ${s.department}\n- **शासकीय अनुदान:** ६०% ते ७५% पर्यंत अनुदान\n- **मुख्य लाभ:** ३ एचपी ते १० एचपी स्टँडअलोન सौर कृषी पंप. शून्य वीज बिल.\n- **पात्रता:** शेतीयोग्य जमीन आणि पाण्याची उपलब्धता (विहीर/बोअरवेल/शेततळे).\n- **आवश्यक कागदपत्रे:** आधार कार्ड, ७/१२ व ८-अ उतारा, बँक पासबुक.\n- **अधिकृत पोर्टल:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*टीप: अंतिम मंजुरी संबंधित शासकीय यंत्रणेच्या प्रत्यक्ष पडताळणीवर अवलंबून आहे.*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'bn') {
      return {
        reply: `**${s.name}**\n\n- **দপ্তর:** ${s.department}\n- **সরকারি ভর্তুকি:** ৬০% থেকে ৭৫% পর্যন্ত অনুদান\n- **প্রধান সুবিধা:** ৩ থেকে ১০ এইচপি সোলার পাম্প। ডিজেল খরচ ও বিদ্যুৎ বিল শূন্য।\n- **যোগ্যতা:** কৃষি জমি এবং নিজস্ব জলের উৎস (নলকূপ/পুকুর)।\n- **প্রয়োজনীয় নথি:** আধার কার্ড, জমির খতিয়ান/পর্চা, ব্যাংক পাসবুক।\n- **অফিসিয়াল পোর্টাল:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*দ্রষ্টব্য: চূড়ান্ত অনুমোদন বিভাগীয় ক্ষেত্র যাচাইয়ের সাপেক্ষে।*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'gu') {
      return {
        reply: `**${s.name}**\n\n- **વિભાગ:** ${s.department}\n- **સરકારી સબસિડી:** ૬૦% થી ૭૫% સુધી અનુદાન\n- **મુખ્ય લાભ:** ૩ થી ૧૦ એચપી સોલર પંપ. ડીઝલ ખર્ચ અને વીજળી બિલમાંથી મુક્તિ.\n- **પાત્રતા:** ખેતીલાયક જમીન અને પાણીનો સ્ત્રોત (બોરવેલ/કૂવો).\n- **જરૂરી કાગળો:** આધાર કાર્ડ, ૭/૧૨, ૮-અ દાખલો, બેંક પાસબુક.\n- **સત્તાવાર પોર્ટલ:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*નોંધ: અંતિમ મંજૂરી સરકારી ચકાસણીને આધીન છે.*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'ta') {
      return {
        reply: `**${s.name}**\n\n- **துறை:** ${s.department}\n- **அரசு மானியம்:** 60% முதல் 75% வரை மானியம்\n- **முக்கிய பயன்கள்:** 3 முதல் 10 HP சோலார் பம்பുകൾ. பூஜ்ஜிய மின் கட்டணம்.\n- **தகுதி:** விவசாய நிலம் மற்றும் பாசன நீர் ஆதாரம் (கிணறு/போர்வெல்).\n- **தேவையான ஆவணங்கள்:** ஆதார் அட்டை, பட்டா/சிட்டா, வங்கி பாஸ்புக்.\n- **அதிகாரப்பூர்வ தளம்:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*குறிப்பு: இறுதி ஒப்புதல் கள ஆய்வுக்கு உட்பட்டது.*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'te') {
      return {
        reply: `**${s.name}**\n\n- **విభాగం:** ${s.department}\n- **ప్రభుత్వ సబ్సిడీ:** 60% నుండి 75% వరకు రాయితీ\n- **ప్రధాన ప్రయోజనాలు:** 3 నుండి 10 HP సోలార్ పంపులు. ఉచిత సౌర విద్యుత్.\n- **అర్హత:** సాగుభూమి మరియు నీటి వసతి (బోరుబావి/బావి).\n- **అవసరమైన పత్రాలు:** ఆధార్ కార్డ్, పట్టాదారు పాస్ పుస్తకం, బ్యాంక్ పాస్‌బుక్.\n- **అధికారిక పోర్టల్:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*గమనిక: తుది ఆమోదం క్షేత్రస్థాయి పరిశీలనపై ఆధారపడి ఉంటుంది.*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'kn') {
      return {
        reply: `**${s.name}**\n\n- **ಇಲಾಖೆ:** ${s.department}\n- **ಸರ್ಕಾರಿ ಸಬ್ಸಿಡಿ:** 60% ರಿಂದ 75% ರವರೆಗೆ ಅನುದಾನ\n- **ಮುಖ್ಯ ಪ್ರಯೋಜನಗಳು:** 3 ರಿಂದ 10 HP ಸೋಲಾರ್ ಪಂಪ್‌ಗಳು. ಶೂನ್ಯ ವಿದ್ಯುತ್ ಬಿಲ್.\n- **ಅರ್ಹತೆ:** ಕೃಷಿ ಜಮೀನು ಮತ್ತು ನೀರಿನ ಮೂಲ (ಬೋರ್‌ವೆಲ್/ಬಾವಿ).\n- **ಅಗತ್ಯ ದಾಖಲೆಗಳು:** ಆಧಾರ್ ಕಾರ್ಡ್, ಪಹಣಿ (RTC), ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್.\n- **ಅಧಿಕೃತ ಪೋರ್ಟಲ್:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*ಸೂಚನೆ: ಅಂತಿಮ ಅನುಮೋದನೆ ಸ್ಥಳ ಪರಿಶೀಲನೆಗೆ ಒಳಪಟ್ಟಿರುತ್ತದೆ.*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'ml') {
      return {
        reply: `**${s.name}**\n\n- **വകുപ്പ്:** ${s.department}\n- **സർക്കാർ സബ്‌സിഡി:** 60% മുതൽ 75% വരെ ഗ്രാന്റ്\n- **പ്രധാന നേട്ടങ്ങൾ:** 3 മുതൽ 10 HP വരെയുള്ള സോളാർ പമ്പുകൾ. സീറോ കറന്റ് ബിൽ.\n- **യോഗ്യത:** കൃഷിഭൂമിയും ജലസ്രോതസ്സും (കിണർ/ബോർവെൽ).\n- **ആവശ്യമായ രേഖകൾ:** ആധാർ കാർഡ്, ഭൂമി കരം രസീത്, ബാങ്ക് പാസ്ബുക്ക്.\n- **ഔദ്യോഗിക പോർട്ടൽ:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*ശ്രദ്ധിക്കുക: അന്തിമ അനുമതി സ്ഥലപരിശോധനയ്ക്ക് വിധേയമാണ്.*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'pa') {
      return {
        reply: `**${s.name}**\n\n- **ਵਿਭਾਗ:** ${s.department}\n- **ਸਰਕਾਰੀ ਸਬਸਿਡੀ:** 60% ਤੋਂ 75% ਤੱਕ ਗ੍ਰਾਂਟ\n- **ਮੁੱਖ ਲਾਭ:** 3 ਤੋਂ 10 HP ਸੋਲਰ ਪੰਪ। ਜ਼ੀਰੋ ਬਿਜਲੀ ਬਿੱਲ।\n- **ਯੋਗਤਾ:** ਖੇਤੀਯੋਗ ਜ਼ਮੀਨ ਅਤੇ ਪਾਣੀ ਦਾ ਸਰੋਤ (ਟਿਊਬਵੈੱਲ/ਖੂਹ)।\n- **ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼:** ਆਧਾਰ ਕਾਰਡ, ਜ਼ਮੀਨ ਦੀ ਫ਼ਰਦ/ਜਮ੍ਹਾਂਬੰਦੀ, ਬੈਂਕ ਪਾਸਬੁੱਕ।\n- **ਅਧਿਕਾਰਤ ਪੋਰਟਲ:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*ਨੋਟ: ਅੰਤਿਮ ਪ੍ਰਵਾਨਗੀ ਵਿਭਾਗੀ ਤਸਦੀਕ ਤੇ ਨਿਰਭਰ ਕਰਦੀ ਹੈ।*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'as') {
      return {
        reply: `**${s.name}**\n\n- **বিভাগ:** ${s.department}\n- **চৰকাৰী ৰাজসাহায্য:** ৬০% ৰ পৰা ৭৫% লৈকে অনুদান\n- **মুখ্য লাভ:** ৩ ৰ পৰা ১০ এইচপি সৌৰ পাম্প। শূন্য বিদ্যুৎ বিল।\n- **যোগ্যতা:** খেতিযোগ্য মাটি আৰু পানীৰ উৎস।\n- **প্ৰয়োজনীয় নথি:** আধাৰ কাৰ্ড, মাটিৰ পট্টা/জমাবন্দী, বেংক পাছবুক।\n- **চৰকাৰী প’ৰ্টেল:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*মন কৰিব: চূড়ান্ত অনুমোদন বিভাগীয় পৰীক্ষণৰ ওপৰত নিৰ্ভৰশীল।*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'or') {
      return {
        reply: `**${s.name}**\n\n- **ବିଭାଗ:** ${s.department}\n- **ସରକାରୀ ସବସିଡି:** ୬୦% ରୁ ୭୫% ପର୍ଯ୍ୟନ୍ତ ଅନୁଦାନ\n- **ମୁଖ୍ୟ ଲାଭ:** ୩ ରୁ ୧୦ ଏଚପି ସୌର ପମ୍ପ। ବିଜୁଳି ବିଲରୁ ମୁକ୍ତି।\n- **ଯୋଗ୍ୟତା:** କୃଷିଜମି ଏବଂ ଜଳ ଉତ୍ସ (ବୋରୱେଲ/କୂଅ)।\n- **ଆବଶ୍ୟକ ଦସ୍ତାବିଜ:** ଆଧାର କାର୍ଡ଼, ଜମି ପଟ୍ଟା, ବ୍ୟାଙ୍କ ପାସବୁକ।\n- **ସରକାରୀ ପୋର୍ଟାଲ:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*ସୂଚନା: ଚୂଡ଼ାନ୍ତ ମଞ୍ଜୁରୀ କ୍ଷେତ୍ର ଯାଞ୍ଚ ଉପରେ ନିର୍ଭରଶୀଳ।*`,
        source: 'VERIFIED_DATABASE'
      };
    }
    if (lang === 'ur') {
      return {
        reply: `**${s.name}**\n\n- **محکمہ:** ${s.department}\n- **سرکاری سبسڈی:** 60% سے 75% تک گرانٹ\n- **اہم فوائد:** 3 سے 10 ایچ پی سولر پمپس۔ بجلی کے بل سے چھٹکارا۔\n- **اہلیت:** زرعی زمین اور پانی کا ذریعہ (بورویل/کنواں)۔\n- **درکار کاغذات:** آدھار کارڈ، زمین کی کھتونی/فرد، بینک پاس بک۔\n- **سرکاری پورٹل:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n\n*نوٹ: حتمی منظوری متعلقہ محکمہ کی فیلڈ تصدیق پر منحصر ہے۔*`,
        source: 'VERIFIED_DATABASE'
      };
    }

    // Default English
    return {
      reply: `**${s.name}**\n\n- **Department:** ${s.department}\n- **Financial Subsidy:** ${s.subsidyAmountOrPercent}\n- **Key Benefits:** ${s.benefits}\n- **Eligibility:** ${s.eligibilitySummary.join('. ')}\n- **Required Documents:** ${s.requiredDocuments.join(', ')}\n- **Official Portal:** [${s.officialSourceUrl}](${s.officialSourceUrl})\n- **Last Verified Date:** ${s.lastVerifiedDate}\n\n*Note: Final approval is subject to site survey and verification by the state renewable energy agency (e.g. MEDA).*`,
      source: 'VERIFIED_DATABASE'
    };
  }

  // PM-KISAN query
  if (p.includes('kisan') || p.includes('pmkisan') || p.includes('pm-kisan') || p.includes('6000') || p.includes('सम्मान')) {
    const s = schemes.find(x => x.code === 'PM-KISAN') || schemes[0];
    const greeting = lang === 'hi' ? 'पीएम-किसान सम्मान निधि' : lang === 'mr' ? 'पीएम-किसान सन्मान निधी' : lang === 'bn' ? 'পিএম-কিসান সম্মান নিধি' : lang === 'ta' ? 'பிஎம்-கிசான் சம்மான் நிதி' : lang === 'te' ? 'పీఎం-కిసాన్ సమ్మాన్ నిధి' : lang === 'gu' ? 'પીએમ-કિસાન સન્માન નિધિ' : 'PM-KISAN Samman Nidhi';
    
    return {
      reply: `**${greeting}**\n\n- **Financial Assistance:** ₹6,000 annually in 3 direct benefit transfer instalments (₹2,000 every 4 months).\n- **Eligibility:** All cultivable landholding farmer families with active Aadhaar eKYC.\n- **Required Documents:** Aadhaar Card, Land Records (7/12 / Patta / Khatauni), Bank Account linked with Aadhaar.\n- **Official Portal:** [https://pmkisan.gov.in](https://pmkisan.gov.in)\n- **Toll-Free Helpline:** 155261 / 1800-115-526`,
      source: 'VERIFIED_DATABASE'
    };
  }

  // KCC & Crop loan query
  if (p.includes('loan') || p.includes('kcc') || p.includes('credit') || p.includes('कर्ज') || p.includes('ऋण') || p.includes('ધિરાણ') || p.includes('கடன்') || p.includes('ఋణం') || p.includes('ಸಾಲ')) {
    const l = loans[0];
    return {
      reply: `**Kisan Credit Card (KCC) & Concessional Crop Credit**\n\n- **Lead Bank:** ${l.bankName}\n- **Normal Interest Rate:** 7.00% p.a.\n- **Prompt Repayment Subvention:** 3.00% subsidy by GoI\n- **Effective Farmer Interest Rate:** 4.00% p.a. (up to ₹3 Lakh)\n- **Collateral-Free Limit:** Up to ₹1,60,000 without mortgaging land\n- **Required Documents:** Aadhaar Card, Land Records (7/12, Patta, RTC), Bank Account Passbook\n- **Application Portal:** [https://fasalrin.gov.in](https://fasalrin.gov.in) & all nationalized bank branches`,
      source: 'VERIFIED_DATABASE'
    };
  }

  // General fallback
  const langName = LANGUAGE_METADATA[language]?.native || 'English';
  return {
    reply: `**Krishi Sahayak Official Advisory (${langName})**\n\nI can assist you with:\n1. **Subsidies:** PM-KUSUM (60-75% Solar Pumps), PDMC (55% Drip/Sprinkler Irrigation), SMAM (40-50% Farm Machinery).\n2. **Direct Financial Assistance:** PM-KISAN (₹6,000/yr DBT), State Top-up schemes.\n3. **Agricultural Loans:** Kisan Credit Card (KCC at 4% effective interest), Agri Gold Loans.\n4. **Document Preparation:** Requirements for land records (7/12, Patta, RTC), Aadhaar eKYC seeding, and portal tracking.\n\n*Please specify your crop, landholding area (acres), and district to check exact eligible schemes!*`,
    source: 'VERIFIED_DATABASE'
  };
}
