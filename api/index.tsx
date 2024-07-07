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

type Speaker = {
  id: string;
  sourceId: string;
  name: string;
  avatar: string;
  description?: string;
  twitter?: string;
}

type State = {
  loaded: boolean;
  currentIdx: number;
  speakerIds: string[];
}

export const app = new Frog<{ State: State }>({
  title: "Devcon Speakers Suggestion",
  assetsPath: '/',
  basePath: '/api',
  ui: { vars },
  initialState: {
    loaded: false,
    currentIdx: 0,
    speakerIds: [],
  }
})

app.frame('/', async (c) => {
  const { buttonValue, inputText, status, deriveState } = c
  const feedback = inputText || buttonValue

  const state = await deriveState(async previousState => {
    if (!previousState.loaded) {
      const randomFromIdx = Math.random() * (MAX - MIN) + MIN
      previousState.speakerIds = await fetchSpeakers(randomFromIdx)
      previousState.currentIdx = 0
      previousState.loaded = true
    } else {
      previousState.currentIdx += 1
    }
  })

  const currentSpeaker = state.loaded && state.currentIdx < state.speakerIds.length
    ? await fetchSpeaker(state.speakerIds[state.currentIdx]) 
    : undefined

  console.log(currentSpeaker)

  return c.res({
    image: (
      <Box
        grow
        overflow='hidden'
        alignHorizontal="center"
        alignVertical='center'
        padding="12"
        backgroundColor="background"
        backgroundPosition="center"
        backgroundRepeat='no-repeat'
        backgroundImage={`linear-gradient(rgba(255,255,255,.2), rgba(255,255,255,.2)), url('${BG_IMAGE_URL}')`}
      >
        {
          status === 'initial' ? <Heading size="32">Welcome to Devcon Speaker Suggestions</Heading> :
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
    ),
    intents: status === 'initial' ? [
      status === 'initial' && <Button value="checkout">Check out previous speakers</Button>,
    ] : state.currentIdx < state.speakerIds.length && currentSpeaker ? [
      <Button value="agree">Agree</Button>,
      <Button value="unsure">Unsure</Button>,
      currentSpeaker.twitter !== undefined && <Button.Link href={`https://x.com/${currentSpeaker.twitter}`}>Twitter</Button.Link>,
    ] : [
      <TextInput placeholder="Suggest a speaker from Asia, especially SEA" />,
      // <Button value="submit">Submit</Button>,
      <Button.Reset>Submit</Button.Reset>,
    ],
  })
})

const fetchSpeakers = async (from: number = 0, size: number = SIZE): Promise<string[]> => {
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
    const speakers = json.data.items.map((item: any) => item.id);
    return shuffleArray(speakers);
  } catch (error: any) {
    console.error(error.message);
    throw new Error(error);
  }
}

const fetchSpeaker = async (id: string): Promise<Speaker> => {
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
    const speaker: Speaker = { 
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
