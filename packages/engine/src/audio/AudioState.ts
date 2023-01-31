import { matches } from '@xrengine/engine/src/common/functions/MatchesUtils'
import { defineAction, defineState, getState, syncStateWithLocalStorage, useState } from '@xrengine/hyperflux'

import { Engine } from '../ecs/classes/Engine'

/**
 * All values ranged from 0 to 1
 */
export const AudioState = defineState({
  name: 'AudioState',
  initial: () => ({
    masterVolume: 0.5,
    microphoneGain: 0.5,
    positionalMedia: false,
    usePositionalMedia: 'auto' as 'auto' | 'off' | 'on',
    mediaStreamVolume: 0.5,
    notificationVolume: 0.5,
    soundEffectsVolume: 0.2,
    backgroundMusicVolume: 0.2
  }),
  onCreate: () => {
    syncStateWithLocalStorage(AudioState, [
      'masterVolume',
      'microphoneGain',
      'positionalMedia',
      'mediaStreamVolume',
      'notificationVolume',
      'soundEffectsVolume',
      'backgroundMusicVolume'
    ])
  }
})

export const accessAudioState = () => getState(AudioState)
export const useAudioState = () => useState(accessAudioState())

export function AudioSettingReceptor(action) {
  const s = getState(AudioState)
  matches(action)
    .when(AudioSettingAction.setMasterVolume.matches, (action) => {
      s.masterVolume.set(action.value)
      Engine.instance.cameraGainNode.gain.setTargetAtTime(action.value, Engine.instance.audioContext.currentTime, 0.01)
    })
    .when(AudioSettingAction.setMicrophoneVolume.matches, (action) => {
      s.microphoneGain.set(action.value)
    })
    .when(AudioSettingAction.setUsePositionalMedia.matches, (action) => {
      s.positionalMedia.set(action.value)
    })
    .when(AudioSettingAction.setMediaStreamVolume.matches, (action) => {
      s.mediaStreamVolume.set(action.value)
      Engine.instance.gainNodeMixBuses.mediaStreams.gain.setTargetAtTime(
        action.value,
        Engine.instance.audioContext.currentTime,
        0.01
      )
    })
    .when(AudioSettingAction.setNotificationVolume.matches, (action) => {
      s.notificationVolume.set(action.value)
      Engine.instance.gainNodeMixBuses.notifications.gain.setTargetAtTime(
        action.value,
        Engine.instance.audioContext.currentTime,
        0.01
      )
    })
    .when(AudioSettingAction.setSoundEffectsVolume.matches, (action) => {
      s.soundEffectsVolume.set(action.value)
      Engine.instance.gainNodeMixBuses.soundEffects.gain.setTargetAtTime(
        action.value,
        Engine.instance.audioContext.currentTime,
        0.01
      )
    })
    .when(AudioSettingAction.setMusicVolume.matches, (action) => {
      s.backgroundMusicVolume.set(action.value)
      Engine.instance.gainNodeMixBuses.music.gain.setTargetAtTime(
        action.value,
        Engine.instance.audioContext.currentTime,
        0.01
      )
    })
}

export class AudioSettingAction {
  static setMasterVolume = defineAction({
    type: 'xre.audio.AudioSetting.MASTER_VOLUME' as const,
    value: matches.number
  })
  static setMicrophoneVolume = defineAction({
    type: 'xre.audio.AudioSetting.MICROPHONE_VOLUME' as const,
    value: matches.number
  })
  static setUsePositionalMedia = defineAction({
    type: 'xre.audio.AudioSetting.POSITIONAL_MEDIA' as const,
    value: matches.boolean
  })
  static setMediaStreamVolume = defineAction({
    type: 'xre.audio.AudioSetting.MEDIA_STREAM_VOLUME' as const,
    value: matches.number
  })
  static setNotificationVolume = defineAction({
    type: 'xre.audio.AudioSetting.NOTIFICATION_VOLUME' as const,
    value: matches.number
  })
  static setSoundEffectsVolume = defineAction({
    type: 'xre.audio.AudioSetting.SOUND_EFFECT_VOLUME' as const,
    value: matches.number
  })
  static setMusicVolume = defineAction({
    type: 'xre.audio.AudioSetting.BACKGROUND_MUSIC_VOLUME' as const,
    value: matches.number
  })
}

export const getPositionalMedia = () => {
  const audioState = getState(AudioState)
  return audioState.usePositionalMedia.value === 'auto'
    ? audioState.positionalMedia.value
    : audioState.usePositionalMedia.value === 'on'
}
