import { createSystem } from 'frog/ui'
 
export const {
  Box,
  Columns,
  Column,
  Heading,
  HStack,
  Rows,
  Row,
  Spacer,
  Text,
  VStack,
  Image,
  vars,
} = createSystem({
  fonts: {
    default: [
      {
        name: 'Noto Serif',
        source: 'google',
        weight: 400,
      },
      {
        name: 'Noto Serif',
        source: 'google',
        weight: 600,
      },
    ],
    wittgenstein: [
      {
        name: 'Wittgenstein',
        source: 'google',
      },
    ],
  },
})