import type { Channel } from '../types'

export const ANALYST_NAME = 'Maya Chen'

export const CUSTOMERS = [
  'Avery Morgan',
  'Jamie Rivers',
  'Morgan Patel',
  'Riley Chen',
  'Nadia Rahman',
  'Elena Voss',
  'Chris Dalton',
  'Priya Shah',
  'Jonah Ellis',
  'Samira Cole',
  'Owen Blake',
  'Harper Quinn',
  'Luis Ortega',
  'Nina Kapoor',
  'Felix Grant',
] as const

export const MERCHANTS = [
  'Solstice Travel',
  'Northstar Market',
  'Bluebird Goods',
  'Juniper Digital',
  'Harbor & Co',
  'Lumen Supply',
  'Cedar Lane',
  'Atlas Outdoor',
  'Brightline Media',
  'Kite Coffee',
  'Marble Street',
  'Fieldnote',
] as const

export const CHANNELS: Channel[] = [
  'card_present',
  'card_not_present',
  'mobile_wallet',
  'wire',
  'ach',
]
