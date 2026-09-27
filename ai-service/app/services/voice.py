VOICE_CONFIG = {
    "default": {
        "name": "Google UK English Female",
        "lang": "en-GB",
        "pitch": 1.0,
        "rate": 1.0,
        "gender": "female",
    },
    "en": {
        "name": "Google UK English Female",
        "lang": "en-GB",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "es": {
        "name": "Google Español Female",
        "lang": "es-ES",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "fr": {
        "name": "Google Français Female",
        "lang": "fr-FR",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "ar": {
        "name": "Google العربية Female",
        "lang": "ar-SA",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "hi": {
        "name": "Google हिन्दी Female",
        "lang": "hi-IN",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "te": {
        "name": "Google తెలుగు Female",
        "lang": "te-IN",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "mr": {
        "name": "Google मराठी Female",
        "lang": "mr-IN",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "ta": {
        "name": "Google தமிழ் Female",
        "lang": "ta-IN",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "bn": {
        "name": "Google বাংলা Female",
        "lang": "bn-IN",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "ur": {
        "name": "Google اردو Female",
        "lang": "ur-PK",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "pt": {
        "name": "Google Português do Brasil Female",
        "lang": "pt-BR",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "zh": {
        "name": "Google 普通话（中国大陆）Female",
        "lang": "zh-CN",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "ja": {
        "name": "Google 日本語 Female",
        "lang": "ja-JP",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "ko": {
        "name": "Google 한국어 Female",
        "lang": "ko-KR",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "de": {
        "name": "Google Deutsch Female",
        "lang": "de-DE",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "ru": {
        "name": "Google русский Female",
        "lang": "ru-RU",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
    "tr": {
        "name": "Google Türkçe Female",
        "lang": "tr-TR",
        "pitch": 1.05,
        "rate": 1.0,
        "gender": "female",
    },
}

SPEAKING_FRAMING = {
    "default": "May I speak with you kindly, {name}? I would like to help you.",
    "en": "May I speak with you kindly, {name}? I would like to help you.",
    "es": "¿Puedo hablarle amablemente, {name}? Me gustaría ayudarle.",
    "fr": "Puis-je vous parler gentiment, {name} ? J'aimerais vous aider.",
    "ar": "هل يمكنني التحدث معك بلطف، {name}؟ أود مساعدتك.",
    "hi": "क्या मैं आपसे विनम्रता से बात कर सकता हूं, {name}? मैं आपकी मदद करना चाहता हूं।",
    "te": "మీతో మర్యాదగా మాట్లాడవచ్చా, {name}? నేను మీకు సహాయం చేయాలనుకుంటున్నాను।",
    "mr": "मी तुमच्याशी नम्रतेने बोलू शकतो का, {name}? मला तुम्हाला मदत करायची आहे।",
    "ta": "உங்களுடன் பணிவுடன் பேசலாமா, {name}? நான் உங்களுக்கு உதவ விரும்புகிறேன்।",
    "bn": "আমি কি আপনার সাথে বিনীতভাবে কথা বলতে পারি, {name}? আমি আপনাকে সাহায্য করতে চাই।",
    "ur": "کیا میں آپ سے ادب سے بات کر سکتا ہوں، {name}? میں آپ کی مدد کرنا چاہتا ہوں۔",
    "pt": "Posso falar com você gentilmente, {name}? Eu gostaria de ajudar você.",
    "zh": "我可以礼貌地和您说话吗，{name}？我很想帮助您。",
    "ja": "丁寧にお話ししてもよろしいですか、{name}さん？お手伝いしたいと思います。",
    "ko": "{name}님, 정중하게 말씀드려도 될까요? 도와드리고 싶습니다.",
    "de": "Darf ich freundlich mit Ihnen sprechen, {name}? Ich möchte Ihnen gerne helfen.",
    "ru": "Могу ли я вежливо поговорить с вами, {name}? Я хотел бы вам помочь.",
    "tr": "Sizinle kibarca konuşabilir miyim, {name}? Size yardım etmek isterim.",
}


def get_voice(lang_code):
    return VOICE_CONFIG.get(lang_code, VOICE_CONFIG["default"])


def get_speaking_frame(lang_code, name="dear"):
    return SPEAKING_FRAMING.get(lang_code, SPEAKING_FRAMING["default"]).format(name=name)
