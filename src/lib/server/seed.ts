import type { Sql } from "@/lib/db";

type VocabSeed = {
  t: string;
  s: string;
  ph?: string;
  ex?: string;
  exs?: string;
};

type ConvQ = {
  prompt: string;
  native: string;
  audio?: string;
  explanation?: string;
  answers: { text: string; ok?: boolean }[];
};

type CatSeed = {
  name: string;
  description: string;
  color: string;
  icon: string;
  vocab: VocabSeed[];
  conversations: ConvQ[];
};

type CourseSeed = {
  code: string;
  name: string;
  nativeName: string;
  order: number;
  categories: CatSeed[];
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function others(list: VocabSeed[], current: VocabSeed, n: number): VocabSeed[] {
  return list.filter((v) => v.t !== current.t).slice(0, n);
}

function padDistractors(list: VocabSeed[], current: VocabSeed): VocabSeed[] {
  const pool = others(list, current, 8);
  const fallback: VocabSeed[] = [
    { t: "Yes", s: "Sí" },
    { t: "No", s: "No" },
    { t: "Please", s: "Por favor" },
    { t: "Thanks", s: "Gracias" },
    { t: "Water", s: "Agua" },
    { t: "Today", s: "Hoy" },
  ];
  const mixed = [...pool, ...fallback.filter((f) => f.t !== current.t && f.s !== current.s)];
  const unique: VocabSeed[] = [];
  for (const item of mixed) {
    if (unique.length >= 3) break;
    if (!unique.some((u) => u.s === item.s || u.t === item.t)) unique.push(item);
  }
  return unique;
}

type BuiltQ = {
  prompt: string;
  promptNative: string;
  type: string;
  points: number;
  explanation: string;
  audio: string;
  answers: { text: string; correct: boolean }[];
};

function buildFromVocab(group: VocabSeed[], all: VocabSeed[]): BuiltQ[] {
  const questions: BuiltQ[] = [];
  group.forEach((word, idx) => {
    const dist = padDistractors(all, word);
    const kind = idx % 3;
    if (kind === 0) {
      questions.push({
        prompt: word.t,
        promptNative: "¿Qué significa esta palabra?",
        type: "multiple_choice",
        points: 10,
        explanation: `${word.t} significa “${word.s}”.`,
        audio: word.t,
        answers: [
          { text: word.s, correct: true },
          ...dist.map((d) => ({ text: d.s, correct: false })),
        ],
      });
    } else if (kind === 1) {
      questions.push({
        prompt: word.s,
        promptNative: "¿Cómo se dice en el idioma que estás aprendiendo?",
        type: "translation",
        points: 10,
        explanation: "“" + word.s + "” se dice " + word.t + ".",
        audio: word.t,
        answers: [
          { text: word.t, correct: true },
          ...dist.map((d) => ({ text: d.t, correct: false })),
        ],
      });
    } else {
      questions.push({
        prompt: "Escucha y elige el significado",
        promptNative: "Reproduce el audio y elige la traducción correcta.",
        type: "listen",
        points: 12,
        explanation: `Escuchaste “${word.t}”, que significa “${word.s}”.`,
        audio: word.t,
        answers: [
          { text: word.s, correct: true },
          ...dist.map((d) => ({ text: d.s, correct: false })),
        ],
      });
    }
    if (idx === 0) {
      questions.push({
        prompt: `Escribe la traducción de: ${word.s}`,
        promptNative: "Escribe la palabra o frase en el idioma objetivo.",
        type: "type_answer",
        points: 15,
        explanation: `La respuesta es “${word.t}”.`,
        audio: word.t,
        answers: [{ text: word.t, correct: true }],
      });
    }
  });
  const first = group[0];
  if (first) {
    questions.push({
      prompt: `${first.t} significa “${first.s}”.`,
      promptNative: "¿Es verdadero o falso?",
      type: "true_false",
      points: 8,
      explanation: "La afirmación es correcta.",
      audio: first.t,
      answers: [
        { text: "Verdadero", correct: true },
        { text: "Falso", correct: false },
      ],
    });
  }
  return questions;
}

function convToBuilt(items: ConvQ[]): BuiltQ[] {
  return items.map((q) => ({
    prompt: q.prompt,
    promptNative: q.native,
    type: "conversation",
    points: 15,
    explanation: q.explanation ?? "",
    audio: q.audio ?? q.prompt,
    answers: q.answers.map((a, i) => ({
      text: a.text,
      correct: Boolean(a.ok) || (i === 0 && !q.answers.some((x) => x.ok)),
    })),
  }));
}

const EN: CatSeed[] = [
  {
    name: "Saludos",
    description: "Hola, adiós y las frases de cortesía que abres cualquier conversación.",
    color: "#0E7C74",
    icon: "hand",
    vocab: [
      { t: "Hello", s: "Hola", ph: "heh-LOH", ex: "Hello, my name is Ana.", exs: "Hola, me llamo Ana." },
      { t: "Hi", s: "Hola (informal)", ph: "hai", ex: "Hi! How are you?", exs: "¡Hola! ¿Cómo estás?" },
      { t: "Good morning", s: "Buenos días", ph: "gud MOR-ning", ex: "Good morning, everyone.", exs: "Buenos días a todos." },
      { t: "Good afternoon", s: "Buenas tardes", ph: "gud af-ter-NOON", ex: "Good afternoon, sir.", exs: "Buenas tardes, señor." },
      { t: "Good evening", s: "Buenas noches (saludo)", ph: "gud EEV-ning", ex: "Good evening, welcome.", exs: "Buenas noches, bienvenido." },
      { t: "Goodbye", s: "Adiós", ph: "gud-BAI", ex: "Goodbye, see you tomorrow.", exs: "Adiós, nos vemos mañana." },
      { t: "See you later", s: "Hasta luego", ph: "see yu LEI-ter", ex: "See you later, my friend.", exs: "Hasta luego, amigo." },
      { t: "Please", s: "Por favor", ph: "pliiz", ex: "A coffee, please.", exs: "Un café, por favor." },
      { t: "Thank you", s: "Gracias", ph: "ZANK yu", ex: "Thank you very much.", exs: "Muchas gracias." },
      { t: "You're welcome", s: "De nada", ph: "yor WEL-kom", ex: "You're welcome!", exs: "¡De nada!" },
      { t: "Excuse me", s: "Disculpe", ph: "ek-SKYUZ mi", ex: "Excuse me, is this seat free?", exs: "Disculpe, ¿está libre este asiento?" },
      { t: "Sorry", s: "Lo siento", ph: "SAH-ree", ex: "Sorry I'm late.", exs: "Lo siento, llego tarde." },
    ],
    conversations: [
      {
        prompt: "Hello! How are you?",
        native: "Alguien te saluda. ¿Qué respondes?",
        audio: "Hello! How are you?",
        explanation: "I'm fine, thank you es la respuesta más natural y educada.",
        answers: [
          { text: "I'm fine, thank you.", ok: true },
          { text: "Good night, see you." },
          { text: "My name is table." },
          { text: "I am a book." },
        ],
      },
      {
        prompt: "Nice to meet you.",
        native: "Te acaban de presentar. ¿Qué dices?",
        audio: "Nice to meet you.",
        explanation: "Nice to meet you too cierra la presentación.",
        answers: [
          { text: "Nice to meet you too.", ok: true },
          { text: "I don't like apples." },
          { text: "Where is the airport?" },
          { text: "It is raining." },
        ],
      },
    ],
  },
  {
    name: "Vocabulario esencial",
    description: "Pronombres, verbos cortos y las palabras que sostienen cada frase.",
    color: "#2F6F8F",
    icon: "book-open",
    vocab: [
      { t: "I", s: "Yo", ex: "I am a student.", exs: "Soy estudiante." },
      { t: "You", s: "Tú / usted", ex: "You are kind.", exs: "Eres amable." },
      { t: "He", s: "Él", ex: "He is my brother.", exs: "Él es mi hermano." },
      { t: "She", s: "Ella", ex: "She is a doctor.", exs: "Ella es doctora." },
      { t: "We", s: "Nosotros", ex: "We are friends.", exs: "Somos amigos." },
      { t: "They", s: "Ellos", ex: "They live here.", exs: "Ellos viven aquí." },
      { t: "to be", s: "ser / estar", ex: "I am happy.", exs: "Estoy feliz." },
      { t: "to have", s: "tener", ex: "I have a question.", exs: "Tengo una pregunta." },
      { t: "to go", s: "ir", ex: "I go to work.", exs: "Voy al trabajo." },
      { t: "to want", s: "querer", ex: "I want water.", exs: "Quiero agua." },
      { t: "yes", s: "sí", ex: "Yes, I agree.", exs: "Sí, estoy de acuerdo." },
      { t: "no", s: "no", ex: "No, thank you.", exs: "No, gracias." },
    ],
    conversations: [
      {
        prompt: "What is your name?",
        native: "Te preguntan tu nombre.",
        audio: "What is your name?",
        explanation: "My name is… es la fórmula estándar.",
        answers: [
          { text: "My name is Camila.", ok: true },
          { text: "I am twenty chairs." },
          { text: "This is a restaurant." },
          { text: "It is blue." },
        ],
      },
    ],
  },
  {
    name: "Familia",
    description: "Padres, hijos y las relaciones que usas al presentarte.",
    color: "#B56A5A",
    icon: "users",
    vocab: [
      { t: "family", s: "familia", ex: "This is my family.", exs: "Esta es mi familia." },
      { t: "mother", s: "madre", ex: "My mother is a teacher.", exs: "Mi madre es profesora." },
      { t: "father", s: "padre", ex: "My father cooks well.", exs: "Mi padre cocina bien." },
      { t: "parents", s: "padres", ex: "My parents live in Lima.", exs: "Mis padres viven en Lima." },
      { t: "brother", s: "hermano", ex: "I have one brother.", exs: "Tengo un hermano." },
      { t: "sister", s: "hermana", ex: "My sister is older.", exs: "Mi hermana es mayor." },
      { t: "son", s: "hijo", ex: "Their son is five.", exs: "Su hijo tiene cinco años." },
      { t: "daughter", s: "hija", ex: "Our daughter likes music.", exs: "A nuestra hija le gusta la música." },
      { t: "husband", s: "esposo", ex: "This is my husband.", exs: "Este es mi esposo." },
      { t: "wife", s: "esposa", ex: "My wife is at home.", exs: "Mi esposa está en casa." },
      { t: "child", s: "niño / hijo", ex: "The child is sleeping.", exs: "El niño está durmiendo." },
      { t: "friend", s: "amigo", ex: "She is my best friend.", exs: "Ella es mi mejor amiga." },
    ],
    conversations: [
      {
        prompt: "Do you have any brothers or sisters?",
        native: "Te preguntan por tus hermanos.",
        audio: "Do you have any brothers or sisters?",
        explanation: "I have a sister / brother es directo y natural.",
        answers: [
          { text: "Yes, I have a sister.", ok: true },
          { text: "I would like a table." },
          { text: "The weather is cold." },
          { text: "Open the window." },
        ],
      },
    ],
  },
  {
    name: "Comida y bebidas",
    description: "Lo que pides en un café, en casa o en la calle.",
    color: "#C45C3E",
    icon: "utensils",
    vocab: [
      { t: "water", s: "agua", ex: "I need water.", exs: "Necesito agua." },
      { t: "coffee", s: "café", ex: "A coffee, please.", exs: "Un café, por favor." },
      { t: "tea", s: "té", ex: "I drink tea at night.", exs: "Tomo té por la noche." },
      { t: "bread", s: "pan", ex: "The bread is fresh.", exs: "El pan está fresco." },
      { t: "rice", s: "arroz", ex: "We eat rice every day.", exs: "Comemos arroz todos los días." },
      { t: "chicken", s: "pollo", ex: "I would like chicken.", exs: "Quisiera pollo." },
      { t: "fish", s: "pescado", ex: "The fish is delicious.", exs: "El pescado está delicioso." },
      { t: "fruit", s: "fruta", ex: "I love fruit.", exs: "Me encanta la fruta." },
      { t: "apple", s: "manzana", ex: "This apple is sweet.", exs: "Esta manzana es dulce." },
      { t: "breakfast", s: "desayuno", ex: "Breakfast is at eight.", exs: "El desayuno es a las ocho." },
      { t: "lunch", s: "almuerzo", ex: "Let's have lunch.", exs: "Almorcemos." },
      { t: "dinner", s: "cena", ex: "Dinner is ready.", exs: "La cena está lista." },
    ],
    conversations: [
      {
        prompt: "What would you like to drink?",
        native: "El mesero te pregunta qué quieres beber.",
        audio: "What would you like to drink?",
        explanation: "I'd like water / a coffee es la respuesta más útil.",
        answers: [
          { text: "I'd like a coffee, please.", ok: true },
          { text: "I am your sister." },
          { text: "Turn left here." },
          { text: "My name is window." },
        ],
      },
    ],
  },
  {
    name: "Números y colores",
    description: "Cuenta, describe y pregunta cantidades con seguridad.",
    color: "#3D6B5A",
    icon: "hash",
    vocab: [
      { t: "one", s: "uno", ex: "I have one ticket.", exs: "Tengo un boleto." },
      { t: "two", s: "dos", ex: "Two coffees, please.", exs: "Dos cafés, por favor." },
      { t: "three", s: "tres", ex: "There are three rooms.", exs: "Hay tres habitaciones." },
      { t: "four", s: "cuatro", ex: "We need four chairs.", exs: "Necesitamos cuatro sillas." },
      { t: "five", s: "cinco", ex: "The meeting is at five.", exs: "La reunión es a las cinco." },
      { t: "ten", s: "diez", ex: "It costs ten dollars.", exs: "Cuesta diez dólares." },
      { t: "red", s: "rojo", ex: "The door is red.", exs: "La puerta es roja." },
      { t: "blue", s: "azul", ex: "A blue shirt.", exs: "Una camisa azul." },
      { t: "green", s: "verde", ex: "Green tea, please.", exs: "Té verde, por favor." },
      { t: "black", s: "negro", ex: "A black bag.", exs: "Una bolsa negra." },
      { t: "white", s: "blanco", ex: "White rice.", exs: "Arroz blanco." },
      { t: "yellow", s: "amarillo", ex: "A yellow taxi.", exs: "Un taxi amarillo." },
    ],
    conversations: [
      {
        prompt: "How many tickets?",
        native: "En la boletería te preguntan cuántos boletos.",
        audio: "How many tickets?",
        explanation: "Two, please es suficiente y claro.",
        answers: [
          { text: "Two, please.", ok: true },
          { text: "It is my mother." },
          { text: "I speak slowly." },
          { text: "Close the book." },
        ],
      },
    ],
  },
  {
    name: "Viajes",
    description: "Aeropuerto, taxi y las frases que te sacan del apuro.",
    color: "#3A6F8C",
    icon: "plane",
    vocab: [
      { t: "airport", s: "aeropuerto", ex: "Where is the airport?", exs: "¿Dónde está el aeropuerto?" },
      { t: "ticket", s: "boleto", ex: "I need a ticket.", exs: "Necesito un boleto." },
      { t: "passport", s: "pasaporte", ex: "Here is my passport.", exs: "Aquí está mi pasaporte." },
      { t: "hotel", s: "hotel", ex: "The hotel is near.", exs: "El hotel está cerca." },
      { t: "taxi", s: "taxi", ex: "I need a taxi.", exs: "Necesito un taxi." },
      { t: "bus", s: "bus", ex: "The bus is late.", exs: "El bus está tarde." },
      { t: "train", s: "tren", ex: "The train leaves at six.", exs: "El tren sale a las seis." },
      { t: "map", s: "mapa", ex: "Can I see a map?", exs: "¿Puedo ver un mapa?" },
      { t: "left", s: "izquierda", ex: "Turn left.", exs: "Gira a la izquierda." },
      { t: "right", s: "derecha", ex: "Turn right.", exs: "Gira a la derecha." },
      { t: "straight", s: "recto", ex: "Go straight.", exs: "Sigue recto." },
      { t: "station", s: "estación", ex: "The station is close.", exs: "La estación está cerca." },
    ],
    conversations: [
      {
        prompt: "Where is the bathroom?",
        native: "Estás en un aeropuerto y necesitas el baño.",
        audio: "Where is the bathroom?",
        explanation: "It's over there / on the left son respuestas típicas; aquí eliges cómo preguntar, no responder.",
        answers: [
          { text: "Excuse me, where is the bathroom?", ok: true },
          { text: "I would like a brother." },
          { text: "This apple is my hotel." },
          { text: "Good night, passport." },
        ],
      },
    ],
  },
  {
    name: "Compras",
    description: "Precios, tallas y cómo pedir algo en una tienda.",
    color: "#8A6A45",
    icon: "shopping-bag",
    vocab: [
      { t: "store", s: "tienda", ex: "The store opens at nine.", exs: "La tienda abre a las nueve." },
      { t: "price", s: "precio", ex: "What is the price?", exs: "¿Cuál es el precio?" },
      { t: "cheap", s: "barato", ex: "This is cheap.", exs: "Esto es barato." },
      { t: "expensive", s: "caro", ex: "It is too expensive.", exs: "Es demasiado caro." },
      { t: "money", s: "dinero", ex: "I don't have money.", exs: "No tengo dinero." },
      { t: "card", s: "tarjeta", ex: "I pay by card.", exs: "Pago con tarjeta." },
      { t: "cash", s: "efectivo", ex: "Do you take cash?", exs: "¿Aceptan efectivo?" },
      { t: "size", s: "talla", ex: "Do you have a smaller size?", exs: "¿Tienen una talla más pequeña?" },
      { t: "shirt", s: "camisa", ex: "I like this shirt.", exs: "Me gusta esta camisa." },
      { t: "shoes", s: "zapatos", ex: "These shoes are new.", exs: "Estos zapatos son nuevos." },
      { t: "bag", s: "bolso / bolsa", ex: "A bag, please.", exs: "Una bolsa, por favor." },
      { t: "sale", s: "oferta", ex: "Everything is on sale.", exs: "Todo está en oferta." },
    ],
    conversations: [
      {
        prompt: "Can I help you?",
        native: "Un vendedor se acerca.",
        audio: "Can I help you?",
        explanation: "I'm just looking / I'm looking for… cubren casi cualquier tienda.",
        answers: [
          { text: "I'm looking for a shirt.", ok: true },
          { text: "The train is my sister." },
          { text: "Turn breakfast left." },
          { text: "Good morning, two fathers." },
        ],
      },
    ],
  },
  {
    name: "Clima",
    description: "Habla del tiempo y decide qué ponerte.",
    color: "#4A7C8A",
    icon: "cloud-sun",
    vocab: [
      { t: "weather", s: "clima", ex: "The weather is nice.", exs: "El clima está agradable." },
      { t: "sun", s: "sol", ex: "The sun is strong.", exs: "El sol está fuerte." },
      { t: "rain", s: "lluvia", ex: "I don't like rain.", exs: "No me gusta la lluvia." },
      { t: "cloudy", s: "nublado", ex: "It is cloudy today.", exs: "Hoy está nublado." },
      { t: "hot", s: "calor / caliente", ex: "It is hot in Lima.", exs: "Hace calor en Lima." },
      { t: "cold", s: "frío", ex: "It is cold this morning.", exs: "Hace frío esta mañana." },
      { t: "wind", s: "viento", ex: "There is a lot of wind.", exs: "Hay mucho viento." },
      { t: "umbrella", s: "paraguas", ex: "Take an umbrella.", exs: "Lleva un paraguas." },
      { t: "coat", s: "abrigo", ex: "Wear a coat.", exs: "Ponte un abrigo." },
      { t: "today", s: "hoy", ex: "Today is sunny.", exs: "Hoy está soleado." },
      { t: "tomorrow", s: "mañana", ex: "Tomorrow will be cold.", exs: "Mañana hará frío." },
      { t: "week", s: "semana", ex: "This week is busy.", exs: "Esta semana está ocupada." },
    ],
    conversations: [
      {
        prompt: "How is the weather today?",
        native: "Small talk clásico. ¿Cómo respondes?",
        audio: "How is the weather today?",
        explanation: "It's sunny / rainy / cold cubre el 90% de los días.",
        answers: [
          { text: "It's sunny and warm.", ok: true },
          { text: "I have two passports of rice." },
          { text: "My shoes are a hotel." },
          { text: "Please, a family." },
        ],
      },
    ],
  },
];

const EXTRA_EN: CatSeed[] = [
  {
    name: "Países e idiomas",
    description: "Nombres de países, idiomas y cómo decir de dónde eres.",
    color: "#3A6F8C",
    icon: "landmark",
    vocab: [
      { t: "country", s: "país", ex: "My country is Peru.", exs: "Mi país es Perú." },
      { t: "language", s: "idioma", ex: "What language do you speak?", exs: "¿Qué idioma hablas?" },
      { t: "English", s: "inglés", ex: "I speak English.", exs: "Hablo inglés." },
      { t: "Spanish", s: "español", ex: "She speaks Spanish.", exs: "Ella habla español." },
      { t: "city", s: "ciudad", ex: "Lima is a big city.", exs: "Lima es una ciudad grande." },
      { t: "capital", s: "capital", ex: "Paris is the capital.", exs: "París es la capital." },
      { t: "where from", s: "de dónde", ex: "Where are you from?", exs: "¿De dónde eres?" },
      { t: "I am from", s: "soy de", ex: "I am from Lima.", exs: "Soy de Lima." },
      { t: "nationality", s: "nacionalidad", ex: "My nationality is Peruvian.", exs: "Mi nacionalidad es peruana." },
      { t: "map", s: "mapa", ex: "Look at the map.", exs: "Mira el mapa." },
      { t: "world", s: "mundo", ex: "I want to travel the world.", exs: "Quiero viajar por el mundo." },
      { t: "people", s: "gente / pueblo", ex: "The people are friendly.", exs: "La gente es amable." },
    ],
    conversations: [
      {
        prompt: "Where are you from?",
        native: "Te preguntan tu origen.",
        audio: "Where are you from?",
        answers: [
          { text: "I'm from Peru.", ok: true },
          { text: "I am a Tuesday." },
          { text: "The soup is my city." },
        ],
      },
    ],
  },
  {
    name: "Gramática 1",
    description: "Ser, estar, artículos y las frases que sostienen todo lo demás.",
    color: "#5B4E8A",
    icon: "spell-check",
    vocab: [
      { t: "I am", s: "yo soy / estoy", ex: "I am a student.", exs: "Soy estudiante." },
      { t: "you are", s: "tú eres / estás", ex: "You are kind.", exs: "Eres amable." },
      { t: "he is", s: "él es / está", ex: "He is at home.", exs: "Él está en casa." },
      { t: "she is", s: "ella es / está", ex: "She is a doctor.", exs: "Ella es doctora." },
      { t: "we are", s: "nosotros somos / estamos", ex: "We are ready.", exs: "Estamos listos." },
      { t: "they are", s: "ellos son / están", ex: "They are here.", exs: "Ellos están aquí." },
      { t: "a / an", s: "un / una", ex: "I need an umbrella.", exs: "Necesito un paraguas." },
      { t: "the", s: "el / la / los / las", ex: "The book is new.", exs: "El libro es nuevo." },
      { t: "this", s: "este / esta", ex: "This is my bag.", exs: "Esta es mi bolsa." },
      { t: "that", s: "ese / esa", ex: "That is my house.", exs: "Esa es mi casa." },
      { t: "there is", s: "hay", ex: "There is a park.", exs: "Hay un parque." },
      { t: "there are", s: "hay (plural)", ex: "There are two rooms.", exs: "Hay dos habitaciones." },
    ],
    conversations: [
      {
        prompt: "Are you a student?",
        native: "Te preguntan tu ocupación.",
        audio: "Are you a student?",
        answers: [
          { text: "Yes, I am a student.", ok: true },
          { text: "Yes, I am a window." },
          { text: "There is my Tuesday." },
        ],
      },
    ],
  },
  {
    name: "La hora y el calendario",
    description: "Días, horas y cómo quedar con alguien sin perder el tren.",
    color: "#C45C3E",
    icon: "clock",
    vocab: [
      { t: "Monday", s: "lunes", ex: "I work on Monday.", exs: "Trabajo el lunes." },
      { t: "Friday", s: "viernes", ex: "See you on Friday.", exs: "Nos vemos el viernes." },
      { t: "weekend", s: "fin de semana", ex: "The weekend is free.", exs: "El fin de semana está libre." },
      { t: "hour", s: "hora", ex: "What hour is it?", exs: "¿Qué hora es?" },
      { t: "minute", s: "minuto", ex: "Wait a minute.", exs: "Espera un minuto." },
      { t: "now", s: "ahora", ex: "I am busy now.", exs: "Estoy ocupado ahora." },
      { t: "yesterday", s: "ayer", ex: "Yesterday was cold.", exs: "Ayer hizo frío." },
      { t: "clock", s: "reloj", ex: "Look at the clock.", exs: "Mira el reloj." },
      { t: "calendar", s: "calendario", ex: "Check the calendar.", exs: "Revisa el calendario." },
      { t: "morning", s: "mañana (parte del día)", ex: "In the morning I drink coffee.", exs: "Por la mañana tomo café." },
      { t: "night", s: "noche", ex: "Good night.", exs: "Buenas noches." },
      { t: "What time is it?", s: "¿Qué hora es?", ex: "What time is it?", exs: "¿Qué hora es?" },
    ],
    conversations: [
      {
        prompt: "What time is it?",
        native: "Alguien necesita la hora.",
        audio: "What time is it?",
        answers: [
          { text: "It's ten o'clock.", ok: true },
          { text: "It is my sister." },
          { text: "I speak a calendar." },
        ],
      },
    ],
  },
  {
    name: "Escuela",
    description: "Aula, materiales y las frases de un día de clase.",
    color: "#3D6B5A",
    icon: "graduation-cap",
    vocab: [
      { t: "school", s: "escuela / colegio", ex: "The school is near.", exs: "La escuela está cerca." },
      { t: "teacher", s: "profesor / profesora", ex: "The teacher is kind.", exs: "La profesora es amable." },
      { t: "student", s: "estudiante", ex: "I am a student.", exs: "Soy estudiante." },
      { t: "book", s: "libro", ex: "Open your book.", exs: "Abre tu libro." },
      { t: "pencil", s: "lápiz", ex: "I need a pencil.", exs: "Necesito un lápiz." },
      { t: "classroom", s: "aula", ex: "The classroom is big.", exs: "El aula es grande." },
      { t: "homework", s: "tarea", ex: "I have homework.", exs: "Tengo tarea." },
      { t: "exam", s: "examen", ex: "The exam is tomorrow.", exs: "El examen es mañana." },
      { t: "desk", s: "pupitre / escritorio", ex: "Sit at your desk.", exs: "Siéntate en tu pupitre." },
      { t: "board", s: "pizarra", ex: "Look at the board.", exs: "Mira la pizarra." },
      { t: "lesson", s: "lección / clase", ex: "The lesson starts now.", exs: "La clase empieza ahora." },
      { t: "break", s: "recreo", ex: "It's break time.", exs: "Es la hora del recreo." },
    ],
    conversations: [
      {
        prompt: "Do you have homework?",
        native: "Un compañero te pregunta por la tarea.",
        audio: "Do you have homework?",
        answers: [
          { text: "Yes, I have math homework.", ok: true },
          { text: "Yes, I have a passport soup." },
          { text: "The desk is raining." },
        ],
      },
    ],
  },
  {
    name: "En el hogar",
    description: "Habitaciones, objetos y cómo pedir algo en casa.",
    color: "#8A6A45",
    icon: "home",
    vocab: [
      { t: "house", s: "casa", ex: "This is my house.", exs: "Esta es mi casa." },
      { t: "room", s: "habitación", ex: "My room is small.", exs: "Mi habitación es pequeña." },
      { t: "kitchen", s: "cocina", ex: "The kitchen is clean.", exs: "La cocina está limpia." },
      { t: "bathroom", s: "baño", ex: "Where is the bathroom?", exs: "¿Dónde está el baño?" },
      { t: "bed", s: "cama", ex: "The bed is comfortable.", exs: "La cama es cómoda." },
      { t: "table", s: "mesa", ex: "The table is ready.", exs: "La mesa está lista." },
      { t: "chair", s: "silla", ex: "Please take a chair.", exs: "Toma una silla, por favor." },
      { t: "door", s: "puerta", ex: "Close the door.", exs: "Cierra la puerta." },
      { t: "window", s: "ventana", ex: "Open the window.", exs: "Abre la ventana." },
      { t: "sofa", s: "sofá", ex: "Sit on the sofa.", exs: "Siéntate en el sofá." },
      { t: "key", s: "llave", ex: "I lost my key.", exs: "Perdí mi llave." },
      { t: "at home", s: "en casa", ex: "I am at home.", exs: "Estoy en casa." },
    ],
    conversations: [
      {
        prompt: "Where is the bathroom?",
        native: "Estás en una casa nueva.",
        audio: "Where is the bathroom?",
        answers: [
          { text: "It's next to the kitchen.", ok: true },
          { text: "It is my homework." },
          { text: "The sofa speaks English." },
        ],
      },
    ],
  },
  {
    name: "Trabajo",
    description: "Oficina, reuniones y las frases para presentarte en el trabajo.",
    color: "#3A5A7C",
    icon: "briefcase",
    vocab: [
      { t: "work", s: "trabajo", ph: "wurk", ex: "I go to work at eight.", exs: "Voy al trabajo a las ocho." },
      { t: "office", s: "oficina", ph: "OH-fis", ex: "The office is downtown.", exs: "La oficina está en el centro." },
      { t: "meeting", s: "reunión", ph: "MEE-ting", ex: "The meeting starts now.", exs: "La reunión empieza ahora." },
      { t: "boss", s: "jefe / jefa", ph: "bos", ex: "My boss is kind.", exs: "Mi jefa es amable." },
      { t: "colleague", s: "colega", ph: "KOL-eeg", ex: "This is my colleague.", exs: "Este es mi colega." },
      { t: "email", s: "correo electrónico", ph: "EE-meil", ex: "I sent an email.", exs: "Envié un correo." },
      { t: "schedule", s: "horario", ph: "SKE-jool", ex: "What is your schedule?", exs: "¿Cuál es tu horario?" },
      { t: "interview", s: "entrevista", ph: "IN-ter-vyu", ex: "I have an interview.", exs: "Tengo una entrevista." },
      { t: "salary", s: "sueldo", ph: "SA-luh-ree", ex: "The salary is good.", exs: "El sueldo es bueno." },
      { t: "computer", s: "computadora", ph: "kom-PYOO-ter", ex: "I need a computer.", exs: "Necesito una computadora." },
      { t: "project", s: "proyecto", ph: "PRO-jekt", ex: "This project is new.", exs: "Este proyecto es nuevo." },
      { t: "to work", s: "trabajar", ph: "tu wurk", ex: "I work from home.", exs: "Trabajo desde casa." },
    ],
    conversations: [
      {
        prompt: "What do you do?",
        native: "Te preguntan a qué te dedicas.",
        audio: "What do you do?",
        explanation: "I work in… / I'm a… es la respuesta más natural.",
        answers: [
          { text: "I work in an office.", ok: true },
          { text: "I am a Tuesday meeting." },
          { text: "The sofa is my boss." },
          { text: "Please, a window salary." },
        ],
      },
      {
        prompt: "Can we meet at three?",
        native: "Un colega quiere agendar una reunión.",
        audio: "Can we meet at three?",
        explanation: "Yes, that works for me confirma el horario.",
        answers: [
          { text: "Yes, that works for me.", ok: true },
          { text: "My computer is hungry." },
          { text: "The interview is a cat." },
          { text: "Turn left the email." },
        ],
      },
    ],
  },
  {
    name: "Salud",
    description: "Síntomas, citas y cómo pedir ayuda en una clínica.",
    color: "#4A8A7A",
    icon: "stethoscope",
    vocab: [
      { t: "doctor", s: "médico / doctora", ph: "DOK-ter", ex: "I need a doctor.", exs: "Necesito un médico." },
      { t: "hospital", s: "hospital", ph: "HOS-pi-tal", ex: "The hospital is near.", exs: "El hospital está cerca." },
      { t: "medicine", s: "medicina", ph: "MED-i-sin", ex: "Take this medicine.", exs: "Toma esta medicina." },
      { t: "pain", s: "dolor", ph: "pein", ex: "I have pain here.", exs: "Tengo dolor aquí." },
      { t: "fever", s: "fiebre", ph: "FEE-ver", ex: "She has a fever.", exs: "Ella tiene fiebre." },
      { t: "pharmacy", s: "farmacia", ph: "FAR-ma-see", ex: "Where is the pharmacy?", exs: "¿Dónde está la farmacia?" },
      { t: "appointment", s: "cita", ph: "a-POINT-ment", ex: "I have an appointment.", exs: "Tengo una cita." },
      { t: "nurse", s: "enfermera", ph: "nurs", ex: "The nurse is kind.", exs: "La enfermera es amable." },
      { t: "headache", s: "dolor de cabeza", ph: "HED-eik", ex: "I have a headache.", exs: "Tengo dolor de cabeza." },
      { t: "healthy", s: "saludable", ph: "HEL-thee", ex: "I want to be healthy.", exs: "Quiero estar saludable." },
      { t: "sick", s: "enfermo", ph: "sik", ex: "He is sick today.", exs: "Hoy está enfermo." },
      { t: "I feel sick", s: "me siento mal", ph: "ai feel sik", ex: "I feel sick.", exs: "Me siento mal." },
    ],
    conversations: [
      {
        prompt: "How do you feel?",
        native: "En la clínica te preguntan cómo te sientes.",
        audio: "How do you feel?",
        explanation: "I have a headache / I feel sick cubre la mayoría de visitas.",
        answers: [
          { text: "I have a headache.", ok: true },
          { text: "I am a pharmacy window." },
          { text: "The nurse is my passport." },
          { text: "Please, two fever chairs." },
        ],
      },
      {
        prompt: "Do you need a doctor?",
        native: "Alguien ofrece ayuda médica.",
        audio: "Do you need a doctor?",
        explanation: "Yes, I need an appointment es claro y útil.",
        answers: [
          { text: "Yes, I need an appointment.", ok: true },
          { text: "Yes, I need a Monday soup." },
          { text: "The hospital is singing." },
          { text: "My fever is a colleague." },
        ],
      },
    ],
  },
  {
    name: "Animales",
    description: "Mascotas, granja y cómo hablar de los animales que te rodean.",
    color: "#8A5A3A",
    icon: "paw-print",
    vocab: [
      { t: "dog", s: "perro", ph: "dog", ex: "The dog is friendly.", exs: "El perro es amigable." },
      { t: "cat", s: "gato", ph: "kat", ex: "The cat is sleeping.", exs: "El gato está durmiendo." },
      { t: "bird", s: "pájaro", ph: "burd", ex: "A bird is singing.", exs: "Un pájaro está cantando." },
      { t: "horse", s: "caballo", ph: "hors", ex: "The horse is fast.", exs: "El caballo es rápido." },
      { t: "pet", s: "mascota", ph: "pet", ex: "I have a pet.", exs: "Tengo una mascota." },
      { t: "animal", s: "animal", ph: "A-ni-mal", ex: "This animal is wild.", exs: "Este animal es salvaje." },
      { t: "to walk", s: "pasear", ph: "tu wok", ex: "I walk the dog.", exs: "Paseo al perro." },
      { t: "to feed", s: "alimentar", ph: "tu feed", ex: "Feed the cat, please.", exs: "Alimenta al gato, por favor." },
      { t: "cute", s: "lindo / tierno", ph: "kyoot", ex: "Your puppy is cute.", exs: "Tu cachorro es lindo." },
      { t: "farm", s: "granja", ph: "farm", ex: "We visit a farm.", exs: "Visitamos una granja." },
      { t: "zoo", s: "zoológico", ph: "zuu", ex: "The zoo opens at ten.", exs: "El zoológico abre a las diez." },
      { t: "puppy", s: "cachorro", ph: "PU-pee", ex: "The puppy is small.", exs: "El cachorro es pequeño." },
    ],
    conversations: [
      {
        prompt: "Do you have a pet?",
        native: "Small talk sobre mascotas.",
        audio: "Do you have a pet?",
        explanation: "Yes, I have a dog / cat es la respuesta más útil.",
        answers: [
          { text: "Yes, I have a dog.", ok: true },
          { text: "Yes, I have a meeting fever." },
          { text: "The zoo is my salary." },
          { text: "Please, a computer horse." },
        ],
      },
      {
        prompt: "Is that your cat?",
        native: "Alguien señala a un gato.",
        audio: "Is that your cat?",
        explanation: "Yes, her name is… suena natural y completo.",
        answers: [
          { text: "Yes, her name is Luna.", ok: true },
          { text: "Yes, she is my interview." },
          { text: "The farm is a headache." },
          { text: "I pay with a bird." },
        ],
      },
    ],
  },
  {
    name: "Dinero",
    description: "Banco, pagos y cómo preguntar precios sin titubear.",
    color: "#3D6B5A",
    icon: "wallet",
    vocab: [
      { t: "bank", s: "banco", ph: "bank", ex: "The bank is closed.", exs: "El banco está cerrado." },
      { t: "wallet", s: "billetera", ph: "WOL-it", ex: "I lost my wallet.", exs: "Perdí mi billetera." },
      { t: "to pay", s: "pagar", ph: "tu pei", ex: "I want to pay now.", exs: "Quiero pagar ahora." },
      { t: "to save", s: "ahorrar", ph: "tu seiv", ex: "I save every month.", exs: "Ahorro cada mes." },
      { t: "credit card", s: "tarjeta de crédito", ph: "KRE-dit kard", ex: "I pay by credit card.", exs: "Pago con tarjeta de crédito." },
      { t: "ATM", s: "cajero automático", ph: "ei-tee-EM", ex: "Where is the ATM?", exs: "¿Dónde está el cajero?" },
      { t: "coin", s: "moneda", ph: "koin", ex: "I need a coin.", exs: "Necesito una moneda." },
      { t: "bill", s: "billete", ph: "bil", ex: "A ten-dollar bill.", exs: "Un billete de diez dólares." },
      { t: "to withdraw", s: "retirar", ph: "tu with-DRAW", ex: "I want to withdraw cash.", exs: "Quiero retirar efectivo." },
      { t: "change", s: "cambio", ph: "cheinj", ex: "Keep the change.", exs: "Quédate con el cambio." },
      { t: "account", s: "cuenta bancaria", ph: "a-KOUNT", ex: "I opened an account.", exs: "Abrí una cuenta." },
      { t: "receipt", s: "recibo", ph: "ri-SEET", ex: "Can I have a receipt?", exs: "¿Me da un recibo?" },
    ],
    conversations: [
      {
        prompt: "How would you like to pay?",
        native: "En la caja te preguntan cómo pagas.",
        audio: "How would you like to pay?",
        explanation: "I'll pay by card / in cash cubre casi cualquier compra.",
        answers: [
          { text: "I'll pay by card.", ok: true },
          { text: "I'll pay with a horse." },
          { text: "My fever is expensive." },
          { text: "The ATM is my sister." },
        ],
      },
      {
        prompt: "Where is the nearest ATM?",
        native: "Necesitas efectivo.",
        audio: "Where is the nearest ATM?",
        explanation: "It's next to the bank es una respuesta típica de dirección.",
        answers: [
          { text: "It's next to the bank.", ok: true },
          { text: "It is my cute puppy." },
          { text: "The receipt is raining." },
          { text: "Please, two meetings." },
        ],
      },
    ],
  },
  {
    name: "En el hotel",
    description: "Recepción, habitación y las frases para hacer el check-in.",
    color: "#B56A5A",
    icon: "bell",
    vocab: [
      { t: "reservation", s: "reserva", ph: "re-zer-VEI-shun", ex: "I have a reservation.", exs: "Tengo una reserva." },
      { t: "reception", s: "recepción", ph: "ri-SEP-shun", ex: "Go to reception.", exs: "Ve a recepción." },
      { t: "key card", s: "tarjeta llave", ph: "kee kard", ex: "Here is your key card.", exs: "Aquí está tu tarjeta llave." },
      { t: "elevator", s: "ascensor", ph: "E-luh-vei-ter", ex: "The elevator is on the left.", exs: "El ascensor está a la izquierda." },
      { t: "towel", s: "toalla", ph: "TAU-el", ex: "I need a towel.", exs: "Necesito una toalla." },
      { t: "check-in", s: "registro de entrada", ph: "chek-IN", ex: "Check-in is at three.", exs: "El check-in es a las tres." },
      { t: "check-out", s: "salida", ph: "chek-AUT", ex: "Check-out is at eleven.", exs: "El check-out es a las once." },
      { t: "floor", s: "piso", ph: "flor", ex: "Your room is on the fourth floor.", exs: "Tu habitación está en el cuarto piso." },
      { t: "luggage", s: "equipaje", ph: "LU-gij", ex: "Where is my luggage?", exs: "¿Dónde está mi equipaje?" },
      { t: "single room", s: "habitación individual", ph: "SING-gul ruum", ex: "A single room, please.", exs: "Una habitación individual, por favor." },
      { t: "double room", s: "habitación doble", ph: "DU-bul ruum", ex: "We need a double room.", exs: "Necesitamos una habitación doble." },
      { t: "Wi-Fi", s: "wifi", ph: "WAI-fai", ex: "What is the Wi-Fi password?", exs: "¿Cuál es la contraseña del wifi?" },
    ],
    conversations: [
      {
        prompt: "Do you have a reservation?",
        native: "En recepción te piden la reserva.",
        audio: "Do you have a reservation?",
        explanation: "Yes, under the name… es la fórmula clásica de check-in.",
        answers: [
          { text: "Yes, under the name García.", ok: true },
          { text: "Yes, I have a headache cat." },
          { text: "The towel is my boss." },
          { text: "Please, two salaries." },
        ],
      },
      {
        prompt: "What time is breakfast?",
        native: "Preguntas el horario del desayuno.",
        audio: "What time is breakfast?",
        explanation: "Breakfast is from seven to ten es una respuesta de hotel típica.",
        answers: [
          { text: "Breakfast is from seven to ten.", ok: true },
          { text: "Breakfast is my elevator." },
          { text: "The key card is raining." },
          { text: "I walk a double room." },
        ],
      },
    ],
  },
];

const FR: CatSeed[] = [
  {
    name: "Saludos",
    description: "Las primeras frases para moverte en francés.",
    color: "#0E7C74",
    icon: "hand",
    vocab: [
      { t: "Bonjour", s: "Buenos días / hola", ex: "Bonjour, je m'appelle Léa.", exs: "Hola, me llamo Léa." },
      { t: "Bonsoir", s: "Buenas noches (saludo)", ex: "Bonsoir, monsieur.", exs: "Buenas noches, señor." },
      { t: "Salut", s: "Hola (informal)", ex: "Salut ! Ça va ?", exs: "¡Hola! ¿Qué tal?" },
      { t: "Au revoir", s: "Adiós", ex: "Au revoir, à demain.", exs: "Adiós, hasta mañana." },
      { t: "Merci", s: "Gracias", ex: "Merci beaucoup.", exs: "Muchas gracias." },
      { t: "S'il vous plaît", s: "Por favor", ex: "Un café, s'il vous plaît.", exs: "Un café, por favor." },
      { t: "Oui", s: "Sí", ex: "Oui, bien sûr.", exs: "Sí, por supuesto." },
      { t: "Non", s: "No", ex: "Non, merci.", exs: "No, gracias." },
    ],
    conversations: [
      {
        prompt: "Comment allez-vous ?",
        native: "Te preguntan cómo estás.",
        audio: "Comment allez-vous ?",
        answers: [
          { text: "Je vais bien, merci.", ok: true },
          { text: "Je suis un ticket." },
          { text: "C'est un aéroport." },
        ],
      },
    ],
  },
  {
    name: "Café",
    description: "Pedir en un café sin titubear.",
    color: "#C45C3E",
    icon: "utensils",
    vocab: [
      { t: "café", s: "café", ex: "Un café, s'il vous plaît.", exs: "Un café, por favor." },
      { t: "eau", s: "agua", ex: "Une eau, s'il vous plaît.", exs: "Un agua, por favor." },
      { t: "pain", s: "pan", ex: "Du pain, merci.", exs: "Pan, gracias." },
      { t: "fromage", s: "queso", ex: "J'aime le fromage.", exs: "Me gusta el queso." },
      { t: "addition", s: "cuenta", ex: "L'addition, s'il vous plaît.", exs: "La cuenta, por favor." },
      { t: "table", s: "mesa", ex: "Une table pour deux.", exs: "Una mesa para dos." },
    ],
    conversations: [
      {
        prompt: "Vous désirez ?",
        native: "El mesero espera tu pedido.",
        audio: "Vous désirez ?",
        answers: [
          { text: "Un café, s'il vous plaît.", ok: true },
          { text: "Je suis votre mère." },
          { text: "C'est un passeport." },
        ],
      },
    ],
  },
];

const PT: CatSeed[] = [
  {
    name: "Saudações",
    description: "Portugués para saludar y pedir con cortesía.",
    color: "#3D6B5A",
    icon: "hand",
    vocab: [
      { t: "Olá", s: "Hola", ex: "Olá, tudo bem?", exs: "Hola, ¿todo bien?" },
      { t: "Bom dia", s: "Buenos días", ex: "Bom dia, senhor.", exs: "Buenos días, señor." },
      { t: "Boa tarde", s: "Buenas tardes", ex: "Boa tarde!", exs: "¡Buenas tardes!" },
      { t: "Boa noite", s: "Buenas noches", ex: "Boa noite, até amanhã.", exs: "Buenas noches, hasta mañana." },
      { t: "Obrigado", s: "Gracias", ex: "Obrigado pela ajuda.", exs: "Gracias por la ayuda." },
      { t: "Por favor", s: "Por favor", ex: "Um café, por favor.", exs: "Un café, por favor." },
      { t: "Sim", s: "Sí", ex: "Sim, eu quero.", exs: "Sí, quiero." },
      { t: "Não", s: "No", ex: "Não, obrigado.", exs: "No, gracias." },
    ],
    conversations: [
      {
        prompt: "Tudo bem?",
        native: "Un saludo informal brasileño.",
        audio: "Tudo bem?",
        answers: [
          { text: "Tudo bem, e você?", ok: true },
          { text: "Eu sou um hotel." },
          { text: "Onde está o irmão do pão?" },
        ],
      },
    ],
  },
  {
    name: "Comida",
    description: "Pedir platos y bebidas en portugués.",
    color: "#C45C3E",
    icon: "utensils",
    vocab: [
      { t: "água", s: "agua", ex: "Uma água, por favor.", exs: "Un agua, por favor." },
      { t: "café", s: "café", ex: "Um café pequeno.", exs: "Un café pequeño." },
      { t: "pão", s: "pan", ex: "O pão está quente.", exs: "El pan está caliente." },
      { t: "arroz", s: "arroz", ex: "Arroz e feijão.", exs: "Arroz y frijoles." },
      { t: "conta", s: "cuenta", ex: "A conta, por favor.", exs: "La cuenta, por favor." },
      { t: "restaurante", s: "restaurante", ex: "Este restaurante é bom.", exs: "Este restaurante es bueno." },
    ],
    conversations: [
      {
        prompt: "O que você vai pedir?",
        native: "En la mesa, te preguntan qué vas a pedir.",
        audio: "O que você vai pedir?",
        answers: [
          { text: "Eu vou pedir o prato do dia.", ok: true },
          { text: "Eu sou um passaporte." },
          { text: "Vira à esquerda o café." },
        ],
      },
    ],
  },
];

const IT: CatSeed[] = [
  {
    name: "Saluti",
    description: "Italiano esencial para presentarte.",
    color: "#3D6B5A",
    icon: "hand",
    vocab: [
      { t: "Ciao", s: "Hola / adiós", ex: "Ciao, come stai?", exs: "Hola, ¿cómo estás?" },
      { t: "Buongiorno", s: "Buenos días", ex: "Buongiorno, signora.", exs: "Buenos días, señora." },
      { t: "Buonasera", s: "Buenas tardes/noches", ex: "Buonasera a tutti.", exs: "Buenas tardes a todos." },
      { t: "Arrivederci", s: "Adiós", ex: "Arrivederci!", exs: "¡Adiós!" },
      { t: "Grazie", s: "Gracias", ex: "Grazie mille.", exs: "Muchas gracias." },
      { t: "Prego", s: "De nada / por favor", ex: "Prego, si accomodi.", exs: "Por favor, siéntese." },
      { t: "Sì", s: "Sí", ex: "Sì, grazie.", exs: "Sí, gracias." },
      { t: "No", s: "No", ex: "No, grazie.", exs: "No, gracias." },
    ],
    conversations: [
      {
        prompt: "Come ti chiami?",
        native: "Te preguntan cómo te llamas.",
        audio: "Come ti chiami?",
        answers: [
          { text: "Mi chiamo Luca.", ok: true },
          { text: "Sono un biglietto." },
          { text: "Dov'è il caffè della sorella?" },
        ],
      },
    ],
  },
];

const DE: CatSeed[] = [
  {
    name: "Begrüßung",
    description: "Alemán para saludar con corrección.",
    color: "#2F6F8F",
    icon: "hand",
    vocab: [
      { t: "Hallo", s: "Hola", ex: "Hallo, wie geht's?", exs: "Hola, ¿cómo estás?" },
      { t: "Guten Morgen", s: "Buenos días", ex: "Guten Morgen!", exs: "¡Buenos días!" },
      { t: "Guten Tag", s: "Buen día", ex: "Guten Tag, Frau Klein.", exs: "Buenos días, señora Klein." },
      { t: "Guten Abend", s: "Buenas tardes/noches", ex: "Guten Abend zusammen.", exs: "Buenas tardes a todos." },
      { t: "Auf Wiedersehen", s: "Adiós", ex: "Auf Wiedersehen!", exs: "¡Adiós!" },
      { t: "Danke", s: "Gracias", ex: "Danke schön.", exs: "Muchas gracias." },
      { t: "Bitte", s: "Por favor / de nada", ex: "Bitte schön.", exs: "Por favor / de nada." },
      { t: "Ja", s: "Sí", ex: "Ja, genau.", exs: "Sí, exactamente." },
      { t: "Nein", s: "No", ex: "Nein, danke.", exs: "No, gracias." },
    ],
    conversations: [
      {
        prompt: "Wie geht es Ihnen?",
        native: "Forma educada de preguntar cómo estás.",
        audio: "Wie geht es Ihnen?",
        answers: [
          { text: "Gut, danke. Und Ihnen?", ok: true },
          { text: "Ich bin ein Hotel." },
          { text: "Wo ist der Bruder?" },
        ],
      },
    ],
  },
];

const COURSES: CourseSeed[] = [
  { code: "en", name: "Inglés", nativeName: "English", order: 1, categories: [...EN, ...EXTRA_EN] },
  { code: "fr", name: "Francés", nativeName: "Français", order: 2, categories: FR },
  { code: "pt", name: "Portugués", nativeName: "Português", order: 3, categories: PT },
  { code: "it", name: "Italiano", nativeName: "Italiano", order: 4, categories: IT },
  { code: "de", name: "Alemán", nativeName: "Deutsch", order: 5, categories: DE },
];

async function insertAnswers(sql: Sql, questionId: number, answers: BuiltQ["answers"]) {
  for (let i = 0; i < answers.length; i += 1) {
    const a = answers[i];
    await sql`
      insert into answers (question_id, answer_text, is_correct, sort_order)
      values (${questionId}, ${a.text}, ${a.correct}, ${i + 1})
    `;
  }
}

async function insertQuestions(sql: Sql, lessonId: number, questions: BuiltQ[]) {
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const rows = await sql<{ id: number }>`
      insert into questions (
        lesson_id, prompt, prompt_native, question_type, points, sort_order, explanation, audio_text, is_active
      ) values (
        ${lessonId}, ${q.prompt}, ${q.promptNative}, ${q.type}, ${q.points}, ${i + 1}, ${q.explanation}, ${q.audio}, true
      ) returning id
    `;
    const id = rows[0]?.id;
    if (id) await insertAnswers(sql, id, q.answers);
  }
}

async function insertCatTree(sql: Sql, languageId: number, cat: CatSeed, sortOrder: number) {
  const catRows = await sql<{ id: number }>`
    insert into categories (language_id, name, description, color, icon, sort_order, is_active)
    values (${languageId}, ${cat.name}, ${cat.description}, ${cat.color}, ${cat.icon}, ${sortOrder}, true)
    returning id
  `;
  const categoryId = catRows[0]!.id;
  const groups = chunk(cat.vocab, 6);

  for (let l = 0; l < groups.length; l += 1) {
    const group = groups[l];
    const lessonRows = await sql<{ id: number }>`
      insert into lessons (category_id, name, description, lesson_type, sort_order, estimated_minutes, is_active)
      values (
        ${categoryId},
        ${`Lección ${l + 1}`},
        ${`Practica ${group.map((g) => g.t).slice(0, 3).join(", ")} y más.`},
        ${"vocabulary"},
        ${l + 1},
        ${5},
        true
      ) returning id
    `;
    const lessonId = lessonRows[0]!.id;
    for (let v = 0; v < group.length; v += 1) {
      const word = group[v];
      await sql`
        insert into vocabulary (
          language_id, category_id, lesson_id, term, translation, phonetic, example, example_translation, sort_order, is_active
        ) values (
          ${languageId}, ${categoryId}, ${lessonId}, ${word.t}, ${word.s}, ${word.ph ?? ""}, ${word.ex ?? ""}, ${word.exs ?? ""}, ${v + 1}, true
        )
      `;
    }
    await insertQuestions(sql, lessonId, buildFromVocab(group, cat.vocab));
  }

  if (cat.conversations.length) {
    const convRows = await sql<{ id: number }>`
      insert into lessons (category_id, name, description, lesson_type, sort_order, estimated_minutes, is_active)
      values (
        ${categoryId},
        ${"Conversación"},
        ${"Elige la respuesta natural en un diálogo real."},
        ${"conversation"},
        ${groups.length + 1},
        ${4},
        true
      ) returning id
    `;
    await insertQuestions(sql, convRows[0]!.id, convToBuilt(cat.conversations));
  }
}

async function seedMissingEnglish(sql: Sql) {
  const langs = await sql<{ id: number }>`select id from languages where code = 'en'`;
  const languageId = langs[0]?.id;
  if (!languageId) return;
  const rows = await sql<{ name: string }>`select name from categories where language_id = ${languageId}`;
  const names = new Set(rows.map((r) => r.name));
  const max = await sql<{ n: number }>`
    select coalesce(max(sort_order), 0)::int as n from categories where language_id = ${languageId}
  `;
  let order = max[0]?.n ?? 0;
  for (const cat of EXTRA_EN) {
    if (names.has(cat.name)) continue;
    order += 1;
    await insertCatTree(sql, languageId, cat, order);
  }
}

async function seedMissingUsers(sql: Sql) {
  const tables = await sql<{ n: number }>`
    select count(*)::int as n from information_schema.tables
    where table_schema = 'public' and table_name = 'cms_users'
  `;
  if ((tables[0]?.n ?? 0) === 0) return;
  const existing = await sql<{ n: number }>`select count(*)::int as n from cms_users`;
  if ((existing[0]?.n ?? 0) > 0) return;
  const langs = await sql<{ id: number }>`select id from languages where code = 'en'`;
  const languageId = langs[0]?.id ?? null;
  const roster = [
    { alias: "Administrador", role: "administrador", xp: 0, streak: 0, notes: "Gestiona categorías, lecciones y preguntas.", order: 1 },
    { alias: "Editor", role: "editor", xp: 140, streak: 6, notes: "Publica vocabulario y revisa el catálogo.", order: 2 },
    { alias: "Camila", role: "aprendiz", xp: 96, streak: 5, notes: "Persona del marcador de demostración.", order: 3 },
    { alias: "Leo", role: "aprendiz", xp: 64, streak: 3, notes: "Persona del marcador de demostración.", order: 4 },
    { alias: "Sofía", role: "aprendiz", xp: 42, streak: 2, notes: "Persona del marcador de demostración.", order: 5 },
  ];
  for (const row of roster) {
    await sql`
      insert into cms_users (alias, role, language_id, xp, streak, is_active, notes, sort_order)
      values (${row.alias}, ${row.role}, ${languageId}, ${row.xp}, ${row.streak}, true, ${row.notes}, ${row.order})
    `;
  }
}

let seeding: Promise<void> | null = null;

export async function seedIfEmpty(sql: Sql): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    const existing = await sql<{ n: number }>`select count(*)::int as n from languages`;
    if ((existing[0]?.n ?? 0) === 0) {
      for (const course of COURSES) {
        const langRows = await sql<{ id: number }>`
          insert into languages (code, name, native_name, sort_order, is_active)
          values (${course.code}, ${course.name}, ${course.nativeName}, ${course.order}, true)
          returning id
        `;
        const languageId = langRows[0]!.id;
        for (let c = 0; c < course.categories.length; c += 1) {
          await insertCatTree(sql, languageId, course.categories[c], c + 1);
        }
      }
    }
    await seedMissingEnglish(sql);
    await seedMissingUsers(sql);
  })().catch((err) => {
    seeding = null;
    throw err;
  });
  return seeding;
}
