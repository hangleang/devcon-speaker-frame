import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { handle } from 'frog/vercel'
import { Box, Heading, Text, VStack, Image, vars } from './ui.js'
// import { neynar } from 'frog/hubs'

// Uncomment to use Edge Runtime.
// export const config = {
//   runtime: 'edge',
// }

const MIN = 0
const MAX = 1088;
const SIZE = 10;
const BG_IMAGE_URL = "https://devcon.org/_next/image/?url=%2F_next%2Fstatic%2Fmedia%2Ffooter-bg.2061d385.png&w=3840&q=75"

type SpeakerDetail = {
  id: string;
  sourceId: string;
  name: string;
  avatar: string;
  description?: string;
  twitter?: string;
}

type Speaker = {
  id: string;
  twitter?: string;
}

type State = {
  loaded: boolean;
  currentIdx: number;
  speakers: Speaker[];
}

export const app = new Frog<{ State: State }>({
  title: "Devcon Speaker suggestions",
  assetsPath: '/',
  basePath: '/api',
  ui: { vars },
  initialState: {
    loaded: false,
    currentIdx: 0,
    speakers: [],
  }
})

app.frame('/', async (c) => {
  return c.res({
    action: '/speakers',
    image: (
      <Box
        grow
        overflow='hidden'
        alignHorizontal="center"
        alignVertical='center'
        padding="32"
        backgroundColor="background"
        backgroundPosition="center"
        backgroundRepeat='no-repeat'
        backgroundImage={`linear-gradient(rgba(255,255,255,.2), rgba(255,255,255,.2)), url('${BG_IMAGE_URL}')`}
      >
        <Heading size="32">Welcome to Devcon Speaker Suggestions</Heading>
      </Box>
    ),
    intents: [
      <Button value="checkout">Check out previous speakers</Button>,
    ],
  })
})

app.frame("speakers", async (c) => {
  const { buttonValue, inputText, deriveState } = c
  const feedback = inputText || buttonValue
  
  const state = await deriveState(async previousState => {
    if (!previousState.loaded) {
      const randomFromIdx = Math.random() * (MAX - MIN) + MIN
      previousState.speakers = await fetchSpeakers(randomFromIdx)
      previousState.currentIdx = 0
      previousState.loaded = true
    } else {
      previousState.currentIdx += 1
    }
  })
  const speaker = state.currentIdx < state.speakers.length ? state.speakers[state.currentIdx] : undefined;

  return c.res({
    image: `/speaker-image/${speaker?.id || "null"}`,
    intents: state.currentIdx < state.speakers.length ? [
      <Button value="agree">Agree</Button>,
      <Button value="unsure">Unsure</Button>,
      speaker?.twitter !== undefined && <Button.Link href={`https://x.com/${speaker.twitter}`}>Twitter</Button.Link>,
    ] : [
      <TextInput placeholder="Suggest a speaker from Asia, especially SEA" />,
      // <Button value="submit">Submit</Button>,
      <Button.Reset>Submit</Button.Reset>,
    ]
  })
})

app.image("speaker-image/:sid", async (c) => {
  const id = c.req.param('sid');
  const currentSpeaker = id !== "null" ? await fetchSpeaker(id) : undefined;

  return c.res({
    image: (
      <Box
        grow
        overflow='hidden'
        alignHorizontal="center"
        alignVertical='center'
        padding="32"
        backgroundColor="background"
        backgroundPosition="center"
        backgroundRepeat='no-repeat'
        backgroundImage={`linear-gradient(rgba(255,255,255,.2), rgba(255,255,255,.2)), url('${BG_IMAGE_URL}')`}
      >
        {
          currentSpeaker ? <VStack gap="4" alignHorizontal='center'>
            <Image
              height="128"
              width="128"
              borderRadius="64"
              objectFit="cover"
              src={currentSpeaker.avatar}
            />
            <Heading decoration="underline" size="32" font="wittgenstein">{currentSpeaker.name}</Heading>
            {currentSpeaker.description && <Text color="text200" overflow='ellipsis'>{currentSpeaker.description}</Text>}
          </VStack> : <Heading size="32">Thanks for your valuable suggestions</Heading>
        }
      </Box>
    )
  });
})

const fetchSpeakers = async (from: number = 0, size: number = SIZE): Promise<Speaker[]> => {
  const url = `https://api.devcon.org/speakers?from=${from}&size=${size}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();

    if (json.status != "200") {
      throw new Error(`Response error: ${json.message}`);
    }
    const speakers: Speaker[] = json.data.items.map((item: any) => ({
      id: item.id,
      twitter: item.twitter || undefined
    }));
    return shuffleArray(speakers);
  } catch (error: any) {
    console.error(error.message);
    throw new Error(error);
  }
}

const fetchSpeaker = async (id: string): Promise<SpeakerDetail> => {
  const url = `https://api.devcon.org/speakers/${id}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();

    if (json.status != "200") {
      throw new Error(`Response error: ${json.message}`);
    }
    const { id, sourceId, name, avatar, description, twitter } = json.data
    const speaker: SpeakerDetail = { 
      id, sourceId, name, avatar, 
      description: description || undefined,
      twitter: twitter || undefined
    }
    return speaker;
  } catch (error: any) {
    console.error(error.message);
    throw new Error(error);
  }
}

function shuffleArray<T>(array: T[]): T[] {
  // Create a copy of the array to avoid mutating the original array
  const shuffledArray = array.slice();

  for (let i = shuffledArray.length - 1; i > 0; i--) {
      // Generate a random index from 0 to i
      const j = Math.floor(Math.random() * (i + 1));
      // Swap elements at indices i and j
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }

  return shuffledArray;
}

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== 'undefined'
const isProduction = isEdgeFunction || import.meta.env?.MODE !== 'development'
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
