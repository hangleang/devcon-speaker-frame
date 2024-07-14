import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { handle } from 'frog/vercel'
import { Box, Heading, Text, VStack, Image, vars, HStack } from './ui.js'
import { kv } from "@vercel/kv";
// import { neynar } from 'frog/hubs'

// Uncomment to use Edge Runtime.
// export const config = {
//   runtime: 'edge',
// }

const MIN = 0
const MAX = 1088;
const SIZE = 10;
const BG_IMAGE_URL = "https://devcon.org/_next/image/?url=%2F_next%2Fstatic%2Fmedia%2Ffooter-bg.2061d385.png&w=3840&q=75"
const SEA_SPEAKERS_SLUG = 'sea-speakers-slug'

type SpeakerDetail = {
  id: string;
  sourceId: string;
  name: string;
  avatar: string;
  description?: string;
  twitter?: string;
  // kv store
  suggested: number;
  appeared: number;
}

type Speaker = {
  id: string;
  twitter?: string;
}

type SpeakerStore = {
  suggested: number;
  appeared: number;
}
const DEFAULT_STORE: SpeakerStore = { suggested: 0, appeared: 0 }

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
    action: `/speakers`,
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
  const { buttonValue, deriveState } = c
  
  const state = await deriveState(async prev => {
    if (!prev.loaded) {
      const randomFromIdx = Math.random() * (MAX - MIN) + MIN
      prev.speakers = await fetchSpeakers()
      prev.currentIdx = 0
      prev.loaded = true
    } else if (prev.currentIdx < prev.speakers.length) {
      prev.currentIdx++
    }
  })
  const speaker = state.currentIdx < state.speakers.length ? state.speakers[state.currentIdx] : undefined;

  if (buttonValue != undefined && state.currentIdx > 0 && state.currentIdx <= state.speakers.length) {
    try {
      const prevSpeakerId = state.speakers[state.currentIdx - 1].id;
      let speakerScore: SpeakerStore = await kv.get<SpeakerStore>(prevSpeakerId) || DEFAULT_STORE;
      if (buttonValue === "agree") {
        speakerScore.suggested += 1;
      }
      speakerScore.appeared += 1;
      await kv.set<SpeakerStore>(prevSpeakerId, speakerScore);
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error);
    }
  }

  return c.res({
    image: `/speaker-image/${speaker?.id || "null"}`,
    intents: state.currentIdx < state.speakers.length ? [
      <Button value="agree">Agree</Button>,
      <Button value="unsure">Unsure</Button>,
      speaker?.twitter !== undefined && <Button.Link href={twitterUrl(speaker.twitter)}>Twitter</Button.Link>,
    ] : [
      <TextInput placeholder="Enter his/her contact" />,
      <Button action='/result' value="submit">Submit</Button>,
    ]
  })
})

app.image("speaker-image/:sid", async (c) => {
  const id = c.req.param('sid');
  const currentSpeaker = id !== "null" ? await fetchSpeaker(id) : undefined;
  console.log(currentSpeaker)

  return c.res({
    headers: {
      'Cache-Control': 'max-age=0'
    },
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
            <HStack gap="8" grow>
              <Heading decoration="underline" size="32" font="wittgenstein">{currentSpeaker.name}</Heading>
              {currentSpeaker.suggested > 0 && <Box
                backgroundColor="background200"
                borderRadius="18"
                height="36"
                width="36"
                alignHorizontal="center"
                alignVertical='center'
              >
                <Text font="wittgenstein">+{currentSpeaker.suggested}</Text>
              </Box>}
            </HStack>
            {currentSpeaker.description && <Text color="text200" overflow='ellipsis'>{currentSpeaker.description}</Text>}
          </VStack> : <Heading size="32">Do you know any speaker from Asia, especially SEA?</Heading>
        }
      </Box>
    )
  });
})

app.frame("result", async (c) => {
  const { inputText, deriveState } = c

  if (inputText) {
    let seaSpeakers = await kv.get<string[]>(SEA_SPEAKERS_SLUG) || [];
    seaSpeakers.push(inputText);
    await kv.set<string[]>(SEA_SPEAKERS_SLUG, seaSpeakers);
  }
  const state = deriveState();
  const speakers = await Promise.all(state.speakers.map(async s => ({
    id: s.id,
    score: await kv.get<SpeakerStore>(s.id) || DEFAULT_STORE
  })))

  return c.res({
    image: (
      <Box
        grow
        overflow='hidden'
        alignHorizontal="center"
        alignVertical='center'
        padding="10"
        backgroundColor="background"
        backgroundPosition="center"
        backgroundRepeat='no-repeat'
        backgroundImage={`linear-gradient(rgba(255,255,255,.2), rgba(255,255,255,.2)), url('${BG_IMAGE_URL}')`}
      >
        <VStack gap="0" alignHorizontal='center'>
          <Heading size="24">Thanks for your valuable suggestions</Heading>
          { speakers.map(s => <Text font="wittgenstein">{`${s.id} got ${s.score.suggested} suggested out of ${s.score.appeared} appeared`}</Text>) }
          { inputText && <Text font="wittgenstein">{`SEA speaker suggested: ${inputText}`}</Text> }
        </VStack>
      </Box>
    ),
    intents: [
      <Button.Reset>Refresh</Button.Reset>,
    ]
  })
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

const fetchSpeaker = async (sid: string): Promise<SpeakerDetail> => {
  const url = `https://api.devcon.org/speakers/${sid}`;
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
    const speakerScore = await kv.get<SpeakerStore>(sid);
    
    const speaker: SpeakerDetail = { 
      id, sourceId, name, avatar, 
      description: description || undefined,
      twitter: twitter || undefined,
      suggested: speakerScore?.suggested || 0,
      appeared: speakerScore?.appeared || 0,
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

const twitterUrl = (usernameOrUrl: string): string => {
  if (!usernameOrUrl.startsWith("https")) {
    usernameOrUrl = `https://x.com/${usernameOrUrl}`
  }
  return usernameOrUrl;
}

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== 'undefined'
const isProduction = isEdgeFunction || import.meta.env?.MODE !== 'development'
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
