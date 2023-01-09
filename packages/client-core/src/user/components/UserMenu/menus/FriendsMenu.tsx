import { useHookstate } from '@hookstate/core'
import { cloneDeep } from 'lodash'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import Avatar from '@xrengine/client-core/src/common/components/Avatar'
import commonStyles from '@xrengine/client-core/src/common/components/common.module.scss'
import IconButton from '@xrengine/client-core/src/common/components/IconButton'
import Menu from '@xrengine/client-core/src/common/components/Menu'
import Tabs from '@xrengine/client-core/src/common/components/Tabs'
import Text from '@xrengine/client-core/src/common/components/Text'
import { UserInterface } from '@xrengine/common/src/interfaces/User'
import { WorldState } from '@xrengine/engine/src/networking/interfaces/WorldState'
import { getMutableState } from '@xrengine/hyperflux'

import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import MessageIcon from '@mui/icons-material/Message'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'

import { NotificationService } from '../../../../common/services/NotificationService'
import { FriendService, useFriendState } from '../../../../social/services/FriendService'
import { useAuthState } from '../../../services/AuthService'
import { NetworkUserService, useNetworkUserState } from '../../../services/NetworkUserService'
import styles from '../index.module.scss'
import { getAvatarURLForUser, Views } from '../util'

interface Props {
  changeActiveMenu: Function
  defaultSelectedTab?: string
}

const FriendsMenu = ({ changeActiveMenu, defaultSelectedTab }: Props): JSX.Element => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = React.useState(defaultSelectedTab ? defaultSelectedTab : 'friends')

  const friendState = useFriendState()
  const userState = useNetworkUserState()
  const selfUser = useAuthState().user
  const userId = selfUser.id.value
  const userAvatarDetails = useHookstate(getMutableState(WorldState).userAvatarDetails)

  useEffect(() => {
    FriendService.getUserRelationship(userId)
    NetworkUserService.getLayerUsers(true)
  }, [])

  const handleTabChange = (newValue: string) => {
    setSelectedTab(newValue)
  }

  const handleProfile = (user: UserInterface) => {
    changeActiveMenu(Views.AvatarContext, {
      user,
      onBack: () => changeActiveMenu(Views.Friends, { defaultSelectedTab: selectedTab })
    })
  }

  const displayList: Array<UserInterface> = []

  if (selectedTab === 'friends') {
    displayList.push(...friendState.relationships.pending.value)
    displayList.push(...friendState.relationships.friend.value)
  } else if (selectedTab === 'blocked') {
    displayList.push(...friendState.relationships.blocking.value)
  } else if (selectedTab === 'find') {
    const nearbyUsers = userState.layerUsers.value.filter(
      (layerUser) =>
        layerUser.id !== userId &&
        !friendState.relationships.friend.value.find((item) => item.id === layerUser.id) &&
        !friendState.relationships.pending.value.find((item) => item.id === layerUser.id) &&
        !friendState.relationships.blocked.value.find((item) => item.id === layerUser.id) &&
        !friendState.relationships.blocking.value.find((item) => item.id === layerUser.id)
    )
    displayList.push(...cloneDeep(nearbyUsers))

    displayList.forEach((layerUser) => {
      if (friendState.relationships.requested.value.find((item) => item.id === layerUser.id)) {
        layerUser.relationType = 'requested'
      }
    })
  }

  const settingTabs = [
    { value: 'find', label: t('user:friends.find') },
    { value: 'friends', label: t('user:friends.friends') },
    { value: 'blocked', label: t('user:friends.blocked') }
  ]

  return (
    <Menu
      open
      header={<Tabs value={selectedTab} items={settingTabs} onChange={handleTabChange} />}
      onBack={() => changeActiveMenu && changeActiveMenu(Views.Profile)}
      onClose={() => changeActiveMenu && changeActiveMenu(Views.Closed)}
    >
      <Box className={styles.menuContent}>
        {displayList.map((value) => (
          <Box key={value.id} display="flex" alignItems="center" m={2} gap={1.5}>
            <Avatar alt={value.name} imageSrc={getAvatarURLForUser(userAvatarDetails, value.id)} size={50} />

            <Text flex={1}>{value.name}</Text>

            {value.relationType === 'friend' && (
              <IconButton
                icon={<MessageIcon sx={{ height: 30, width: 30 }} />}
                title={t('user:friends.message')}
                onClick={() => NotificationService.dispatchNotify('Chat Pressed', { variant: 'info' })}
              />
            )}

            {value.relationType === 'pending' && (
              <>
                <Chip className={commonStyles.chip} label={t('user:friends.pending')} size="small" variant="outlined" />

                <IconButton
                  icon={<CheckIcon sx={{ height: 30, width: 30 }} />}
                  title={t('user:friends.accept')}
                  onClick={() => FriendService.acceptFriend(userId, value.id)}
                />

                <IconButton
                  icon={<CloseIcon sx={{ height: 30, width: 30 }} />}
                  title={t('user:friends.decline')}
                  onClick={() => FriendService.declineFriend(userId, value.id)}
                />
              </>
            )}

            {value.relationType === 'requested' && (
              <Chip className={commonStyles.chip} label={t('user:friends.requested')} size="small" variant="outlined" />
            )}

            {value.relationType === 'blocking' && (
              <IconButton
                icon={<HowToRegIcon sx={{ height: 30, width: 30 }} />}
                title={t('user:friends.unblock')}
                onClick={() => FriendService.unblockUser(userId, value.id)}
              />
            )}

            <IconButton
              icon={<AccountCircleIcon sx={{ height: 30, width: 30 }} />}
              title={t('user:friends.profile')}
              onClick={() => handleProfile(value)}
            />
          </Box>
        ))}
        {displayList.length === 0 && (
          <Text align="center" mt={4} variant="body2">
            {t('user:friends.noUsers')}
          </Text>
        )}
      </Box>
    </Menu>
  )
}

export default FriendsMenu
