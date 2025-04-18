import { ColorText } from '@genshin-optimizer/common/ui'
import { objKeyMap } from '@genshin-optimizer/common/util'
import type { CharacterKey } from '@genshin-optimizer/gi/consts'
import { absorbableEle } from '@genshin-optimizer/gi/consts'
import { allStats } from '@genshin-optimizer/gi/stats'
import {
  constant,
  equal,
  greaterEq,
  infoMut,
  input,
  percent,
  prod,
  sum,
  target,
  unequal,
} from '@genshin-optimizer/gi/wr'
import { cond, condReadNode, st, stg } from '../../SheetUtil'
import { CharacterSheet } from '../CharacterSheet'
import type { TalentSheet } from '../ICharacterSheet.d'
import { charTemplates } from '../charTemplates'
import {
  dataObjForCharacterSheet,
  dmgNode,
  plungingDmgNodes,
} from '../dataUtil'

const key: CharacterKey = 'Sucrose'
const skillParam_gen = allStats.char.skillParam[key]
const ct = charTemplates(key)

let a = 0,
  s = 0,
  b = 0,
  p1 = 0,
  p2 = 0
const dm = {
  normal: {
    hitArr: [
      skillParam_gen.auto[a++], // 1
      skillParam_gen.auto[a++], // 2
      skillParam_gen.auto[a++], // 3
      skillParam_gen.auto[a++], // 4
    ],
  },
  charged: {
    dmg: skillParam_gen.auto[a++],
    stamina: skillParam_gen.auto[a++][0],
  },
  plunging: {
    dmg: skillParam_gen.auto[a++],
    low: skillParam_gen.auto[a++],
    high: skillParam_gen.auto[a++],
  },
  skill: {
    press: skillParam_gen.skill[s++],
    cd: skillParam_gen.skill[s++][0],
  },
  burst: {
    dot: skillParam_gen.burst[b++],
    dmg_: skillParam_gen.burst[b++],
    duration: skillParam_gen.burst[b++][0],
    cd: skillParam_gen.burst[b++][0],
    enerCost: skillParam_gen.burst[b++][0],
  },
  passive1: {
    eleMas: skillParam_gen.passive1[p1++][0],
    duration: skillParam_gen.passive1[p1++][0],
  },
  passive2: {
    eleMas_: skillParam_gen.passive2[p2++][0],
    duration: skillParam_gen.passive2[p2++][0],
  },
  constellation2: {
    durationInc: skillParam_gen.constellation2[0],
  },
  constellation6: {
    ele_dmg_: skillParam_gen.constellation6[0],
  },
} as const

const [condAbsorptionPath, condAbsorption] = cond(key, 'absorption')
// A1 Swirl Reaction Element
const condSwirlPaths = objKeyMap(absorbableEle, (ele) => [key, `swirl${ele}`])
const condSwirls = objKeyMap(absorbableEle, (ele) =>
  condReadNode(condSwirlPaths[ele])
)
// Set to "hit" if skill hit opponents
const [condSkillHitOpponentPath, condSkillHitOpponent] = cond(key, 'skillHit')

// Conditional Output
const asc1Disp = greaterEq(input.asc, 1, dm.passive1.eleMas)
const asc1 = objKeyMap(absorbableEle, (ele) =>
  unequal(
    target.charKey,
    key, // Not applying to Sucrose
    equal(target.charEle, condSwirls[ele], asc1Disp),
    { path: 'eleMas', isTeamBuff: true }
  )
) // And element matches the swirl
const asc4OptNode = infoMut(
  greaterEq(
    input.asc,
    4,
    prod(percent(dm.passive2.eleMas_), input.premod.eleMas)
  ),
  { path: 'eleMas', isTeamBuff: true }
)
const asc4Disp = equal('hit', condSkillHitOpponent, asc4OptNode)
const asc4 = unequal(target.charKey, key, asc4Disp)
const c6Base = greaterEq(input.constellation, 6, percent(0.2))

const c6Bonus = objKeyMap(
  absorbableEle.map((ele) => `${ele}_dmg_` as const),
  (key) => equal(condAbsorption, key.slice(0, -5), c6Base)
)

export const dmgFormulas = {
  normal: Object.fromEntries(
    dm.normal.hitArr.map((arr, i) => [i, dmgNode('atk', arr, 'normal')])
  ),
  charged: {
    dmg: dmgNode('atk', dm.charged.dmg, 'charged'),
  },
  plunging: plungingDmgNodes('atk', dm.plunging),
  skill: {
    press: dmgNode('atk', dm.skill.press, 'skill'),
  },
  burst: {
    dot: dmgNode('atk', dm.burst.dot, 'burst'),
    ...Object.fromEntries(
      absorbableEle.map((key) => [
        key,
        equal(
          condAbsorption,
          key,
          dmgNode('atk', dm.burst.dmg_, 'burst', {
            hit: { ele: constant(key) },
          })
        ),
      ])
    ),
  },
  passive2: {
    asc4OptNode,
  },
}

const nodeC3 = greaterEq(input.constellation, 3, 3)
const nodeC5 = greaterEq(input.constellation, 5, 3)
export const data = dataObjForCharacterSheet(key, dmgFormulas, {
  premod: {
    skillBoost: nodeC3,
    burstBoost: nodeC5,
  },
  teamBuff: {
    total: { eleMas: asc4 },
    premod: { ...c6Bonus, eleMas: sum(...Object.values(asc1)) },
  },
})

const sheet: TalentSheet = {
  auto: ct.talentTem('auto', [
    {
      text: ct.chg('auto.fields.normal'),
    },
    {
      fields: dm.normal.hitArr.map((_, i) => ({
        node: infoMut(dmgFormulas.normal[i], {
          name: ct.chg(`auto.skillParams.${i}`),
        }),
      })),
    },
    {
      text: ct.chg('auto.fields.charged'),
    },
    {
      fields: [
        {
          node: infoMut(dmgFormulas.charged.dmg, {
            name: ct.chg(`auto.skillParams.4`),
          }),
        },
        {
          text: ct.chg('auto.skillParams.5'),
          value: dm.charged.stamina,
        },
      ],
    },
    {
      text: ct.chg('auto.fields.plunging'),
    },
    {
      fields: [
        {
          node: infoMut(dmgFormulas.plunging.dmg, {
            name: stg('plunging.dmg'),
          }),
        },
        {
          node: infoMut(dmgFormulas.plunging.low, {
            name: stg('plunging.low'),
          }),
        },
        {
          node: infoMut(dmgFormulas.plunging.high, {
            name: stg('plunging.high'),
          }),
        },
      ],
    },
  ]),

  skill: ct.talentTem('skill', [
    {
      fields: [
        {
          node: infoMut(dmgFormulas.skill.press, {
            name: ct.chg(`skill.skillParams.0`),
          }),
        },
        {
          text: ct.chg('skill.skillParams.1'),
          value: dm.skill.cd,
          unit: 's',
        },
        {
          canShow: (data) => data.get(input.constellation).value >= 1,
          text: st('charges'),
          value: 2,
        },
      ],
    },
  ]),

  burst: ct.talentTem('burst', [
    {
      fields: [
        {
          node: infoMut(dmgFormulas.burst.dot, {
            name: ct.chg(`burst.skillParams.0`),
          }),
        },
        {
          text: ct.chg('burst.skillParams.2'),
          value: (data) =>
            data.get(input.constellation).value >= 2
              ? `${dm.burst.duration}s + 2`
              : dm.burst.duration,
          unit: 's',
        },
        {
          text: ct.chg('burst.skillParams.3'),
          value: dm.burst.cd,
          unit: 's',
        },
        {
          text: ct.chg('burst.skillParams.4'),
          value: dm.burst.enerCost,
        },
      ],
    },
    ct.condTem('burst', {
      // Absorption
      value: condAbsorption,
      path: condAbsorptionPath,
      name: st('eleAbsor'),
      states: Object.fromEntries(
        absorbableEle.map((eleKey) => [
          eleKey,
          {
            name: (
              <ColorText color={eleKey}>{stg(`element.${eleKey}`)}</ColorText>
            ),
            fields: [
              {
                node: infoMut(
                  dmgFormulas.burst[eleKey as keyof typeof dmgFormulas.burst],
                  {
                    name: ct.chg(`burst.skillParams.1`),
                  }
                ),
              },
            ],
          },
        ])
      ),
    }),
    ct.condTem('constellation6', {
      // Absorption teambuff for C6
      teamBuff: true,
      value: condAbsorption,
      path: condAbsorptionPath,
      name: st('eleAbsor'),
      states: Object.fromEntries(
        absorbableEle.map((eleKey) => [
          eleKey,
          {
            name: (
              <ColorText color={eleKey}>{stg(`element.${eleKey}`)}</ColorText>
            ),
            fields: Object.values(c6Bonus).map((n) => ({ node: n })),
          },
        ])
      ),
    }),
    ct.headerTem('constellation6', {
      canShow: unequal(condAbsorption, undefined, 1),
      fields: Object.values(c6Bonus).map((n) => ({ node: n })),
    }),
  ]),

  passive1: ct.talentTem('passive1', [
    ct.condTem('passive1', {
      // Swirl Element
      teamBuff: true,
      states: objKeyMap(absorbableEle, (ele) => ({
        path: condSwirlPaths[ele],
        value: condSwirls[ele],
        name: st(`swirlReaction.${ele}`),
        fields: [
          {
            node: infoMut(asc1Disp, {
              path: 'eleMas',
              isTeamBuff: true,
            }),
          },
          {
            text: st(`effectDuration.${ele}`),
            value: dm.passive1.duration,
            unit: 's',
          },
        ],
      })),
    }),
  ]),
  passive2: ct.talentTem('passive2', [
    ct.condTem('passive2', {
      // Swirl element
      teamBuff: true,
      value: condSkillHitOpponent,
      path: condSkillHitOpponentPath,
      name: st('hitOp.skillOrBurst'),
      states: {
        hit: {
          fields: [
            {
              node: infoMut(asc4Disp, { path: 'eleMas' }),
            },
            {
              text: stg('duration'),
              value: dm.passive2.duration,
              unit: 's',
            },
          ],
        },
      },
    }),
    ct.fieldsTem('passive2', {
      fields: [{ node: dmgFormulas.passive2.asc4OptNode }],
    }),
  ]),
  passive3: ct.talentTem('passive3'),
  constellation1: ct.talentTem('constellation1', [
    ct.fieldsTem('constellation1', {
      fields: [
        {
          text: st('addlCharges'),
          value: 1,
        },
      ],
    }),
  ]),
  constellation2: ct.talentTem('constellation2'),
  constellation3: ct.talentTem('constellation3', [
    { fields: [{ node: nodeC3 }] },
  ]),
  constellation4: ct.talentTem('constellation4'),
  constellation5: ct.talentTem('constellation5', [
    { fields: [{ node: nodeC5 }] },
  ]),
  constellation6: ct.talentTem('constellation6'),
}
export default new CharacterSheet(sheet, data)
