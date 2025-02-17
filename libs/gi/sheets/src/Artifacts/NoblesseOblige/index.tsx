import type { ArtifactSetKey } from '@genshin-optimizer/gi/consts'
import type { Data } from '@genshin-optimizer/gi/wr'
import {
  equalStr,
  greaterEq,
  greaterEqStr,
  input,
  percent,
} from '@genshin-optimizer/gi/wr'
import { cond, nonStackBuff, st, stg } from '../../SheetUtil'
import { ArtifactSheet, setHeaderTemplate } from '../ArtifactSheet'
import type { SetEffectSheet } from '../IArtifactSheet'
import { dataObjForArtifactSheet } from '../dataUtil'

const key: ArtifactSetKey = 'NoblesseOblige'
const setHeader = setHeaderTemplate(key)

const set2 = greaterEq(input.artSet.NoblesseOblige, 2, percent(0.2))

const [condSet4Path, condSet4] = cond(key, 'set4')
const set4TallyWrite = greaterEqStr(
  input.artSet.NoblesseOblige,
  4,
  equalStr(condSet4, 'on', input.charKey)
)
const [set4, set4Inactive] = nonStackBuff('no4', 'atk_', percent(0.2))

export const data: Data = dataObjForArtifactSheet(key, {
  premod: {
    burst_dmg_: set2,
  },
  teamBuff: {
    premod: {
      atk_: set4,
    },
    nonStacking: {
      no4: set4TallyWrite,
    },
  },
})

const sheet: SetEffectSheet = {
  2: { document: [{ header: setHeader(2), fields: [{ node: set2 }] }] },
  4: {
    document: [
      {
        header: setHeader(4),
        teamBuff: true,
        value: condSet4,
        path: condSet4Path,
        name: st('afterUse.burst'),
        states: {
          on: {
            fields: [
              {
                node: set4,
              },
              {
                node: set4Inactive,
              },
              {
                text: stg('duration'),
                value: 12,
                unit: 's',
              },
            ],
          },
        },
      },
    ],
  },
}
export default new ArtifactSheet(sheet, data)
