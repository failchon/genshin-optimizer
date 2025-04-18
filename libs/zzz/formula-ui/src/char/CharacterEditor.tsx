'use client'
import { CardThemed, ModalWrapper } from '@genshin-optimizer/common/ui'
import { type CharacterKey, allSkillKeys } from '@genshin-optimizer/zzz/consts'
import {
  CharacterContext,
  useCharacter,
  useCharacterContext,
  useDatabaseContext,
} from '@genshin-optimizer/zzz/db-ui'
import {
  CharacterCard,
  CharacterCompactMindscapeSelector,
  CoreDropdown,
  EquippedGrid,
  LevelSelect,
  SkillDropdown,
} from '@genshin-optimizer/zzz/ui'
import CloseIcon from '@mui/icons-material/Close'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import {
  Box,
  Button,
  CardContent,
  Grid,
  IconButton,
  Skeleton,
} from '@mui/material'
import type { Variant } from '@mui/material/styles/createTypography'
import { Suspense, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CharStatsDisplay } from './CharStatsDisplay'

export function CharacterEditor({
  characterKey,
  onClose,
}: {
  characterKey?: CharacterKey
  onClose: () => void
}) {
  return (
    <ModalWrapper open={!!characterKey} onClose={onClose}>
      <Suspense
        fallback={<Skeleton variant="rectangular" width="100%" height={1000} />}
      >
        {characterKey && (
          <CharacterEditorContent
            key={characterKey}
            characterKey={characterKey}
            onClose={onClose}
          />
        )}
      </Suspense>
    </ModalWrapper>
  )
}

type CharacterDisplayCardProps = {
  characterKey: CharacterKey
  onClose?: () => void
}
function CharacterEditorContent({
  characterKey,
  onClose,
}: CharacterDisplayCardProps) {
  const character = useCharacter(characterKey)

  return (
    <CardThemed>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Suspense
          fallback={
            <Skeleton variant="rectangular" width="100%" height={1000} />
          }
        >
          {character ? (
            <CharacterContext.Provider value={character}>
              <Content onClose={onClose} />
            </CharacterContext.Provider>
          ) : (
            <Skeleton variant="rectangular" width="100%" height={1000} />
          )}
        </Suspense>
      </CardContent>
    </CardThemed>
  )
}

const charCardConfig = {
  cardWidth: '500px',
  charImgWidth: '75%',
  iconsSize: 1.5,
  isEditing: true,
  charNameWidth: '166px',
  charNameVariant: 'h6' as Variant,
  scrollingBgSize: '220px',
}

export function Content({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation(['page_characters'])
  const navigate = useNavigate()
  const { database } = useDatabaseContext()
  const character = useCharacterContext()!
  const { key: characterKey, equippedDiscs, equippedWengine } = character
  const deleteCharacter = useCallback(async () => {
    const name = t(`${characterKey}`)
    if (!window.confirm(t('removeCharacter', { value: name }))) return
    database.chars.remove(characterKey)
    navigate('/characters')
  }, [database, navigate, characterKey, t])

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Box display="flex" gap={1}>
        <Button
          color="error"
          onClick={() => deleteCharacter()}
          startIcon={<DeleteForeverIcon />}
          sx={{ marginLeft: 'auto' }}
        >
          {t('characterEditor.delete')}
        </Button>
        {!!onClose && (
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <Box>
        <Grid container spacing={1} sx={{ justifyContent: 'center' }}>
          <Grid item xs={6} sm={4} md={4} lg={4} xl={4}>
            <CardThemed
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <CharacterCard
                characterKey={characterKey}
                charCardConfig={charCardConfig}
              ></CharacterCard>
              <Box sx={{ px: 1 }}>
                <LevelSelect
                  level={character.level}
                  milestone={character.promotion}
                  setBoth={({ level, milestone }) =>
                    database.chars.set(characterKey, {
                      level,
                      promotion: milestone,
                    })
                  }
                />
              </Box>
              <CharStatsDisplay />
              <CharacterCompactMindscapeSelector
                mindscape={character.mindscape}
                setMindscape={(mindscape) =>
                  database.chars.set(characterKey, {
                    mindscape,
                  })
                }
              />
            </CardThemed>
          </Grid>
          <Grid
            item
            xs={6}
            sm={8}
            md={8}
            lg={8}
            xl={8}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Box>
              <Grid container columns={3} spacing={1}>
                {allSkillKeys.map((sk) => (
                  <Grid item xs={1} key={sk}>
                    <SkillDropdown key={sk} skillKey={sk} />
                  </Grid>
                ))}
                <Grid item xs={1} key={'core'}>
                  <CoreDropdown />
                </Grid>
              </Grid>
            </Box>
            <Box>
              <EquippedGrid
                setWengine={(id) => {
                  if (!id) {
                    equippedWengine &&
                      database.wengines.set(equippedWengine, { location: '' })
                  } else {
                    database.wengines.set(id, {
                      location: characterKey,
                    })
                  }
                }}
                setDisc={(slotKey, id) => {
                  if (!id)
                    equippedDiscs[slotKey] &&
                      database.discs.set(equippedDiscs[slotKey], {
                        location: '',
                      })
                  else
                    database.discs.set(id, {
                      location: characterKey,
                    })
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}
