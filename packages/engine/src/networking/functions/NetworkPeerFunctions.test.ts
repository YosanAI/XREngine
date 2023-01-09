import assert from 'assert'

import { NetworkId } from '@xrengine/common/src/interfaces/NetworkId'
import { PeerID } from '@xrengine/common/src/interfaces/PeerID'
import { UserId } from '@xrengine/common/src/interfaces/UserId'
import { applyIncomingActions, clearOutgoingActions, getMutableState } from '@xrengine/hyperflux'

import { createMockNetwork } from '../../../tests/util/createMockNetwork'
import { Engine } from '../../ecs/classes/Engine'
import { addComponent } from '../../ecs/functions/ComponentFunctions'
import { createEntity } from '../../ecs/functions/EntityFunctions'
import { createEngine } from '../../initializeEngine'
import { NetworkObjectComponent } from '../components/NetworkObjectComponent'
import { WorldState } from '../interfaces/WorldState'
import { NetworkPeerFunctions } from './NetworkPeerFunctions'

describe('NetworkPeerFunctions', () => {
  beforeEach(() => {
    createEngine()
    createMockNetwork()
  })

  describe('addPeers', () => {
    it('should add peer', () => {
      const world = Engine.instance.currentWorld
      const userId = 'user id' as UserId
      const peerID = 'peer id' as PeerID
      Engine.instance.userId = 'another user id' as UserId & PeerID
      const userName = 'user name'
      const userIndex = 1
      const peerIndex = 2
      const network = world.worldNetwork

      NetworkPeerFunctions.createPeer(network, peerID, peerIndex, userId, userIndex, userName, world)

      const worldState = getMutableState(WorldState)

      assert(network.peers.get(peerID))
      assert.equal(network.peers.get(peerID)?.userId, userId)
      assert.equal(network.peers.get(peerID)?.userIndex, userIndex)
      assert.equal(network.peers.get(peerID)?.peerID, peerID)
      assert.equal(network.peers.get(peerID)?.peerIndex, peerIndex)
      assert.equal(worldState.userNames[userId]?.value, userName)
      assert.equal(network.userIndexToUserID.get(userIndex), userId)
      assert.equal(network.userIDToUserIndex.get(userId), userIndex)
      assert.equal(network.peerIndexToPeerID.get(peerIndex), peerID)
      assert.equal(network.peerIDToPeerIndex.get(peerID), peerIndex)
    })

    it('should udpate peer if it already exists', () => {
      const world = Engine.instance.currentWorld
      const userId = 'user id' as UserId
      const peerID = 'peer id' as PeerID
      Engine.instance.userId = 'another user id' as UserId
      const userName = 'user name'
      const userName2 = 'user name 2'
      const userIndex = 1
      const userIndex2 = 2
      const peerIndex = 3
      const peerIndex2 = 4
      const network = world.worldNetwork

      const worldState = getMutableState(WorldState)

      NetworkPeerFunctions.createPeer(network, peerID, peerIndex, userId, userIndex, userName, world)
      assert.equal(network.peers.get(peerID)!.userId, userId)
      assert.equal(network.peers.get(peerID)!.userIndex, userIndex)
      assert.equal(network.peers.get(peerID)!.peerID, peerID)
      assert.equal(network.peers.get(peerID)!.peerIndex, peerIndex)
      assert.equal(worldState.userNames[userId].value, userName)

      NetworkPeerFunctions.createPeer(network, peerID, peerIndex2, userId, userIndex2, userName2, world)
      assert.equal(network.peers.get(peerID)!.userId, userId)
      assert.equal(network.peers.get(peerID)!.userIndex, userIndex2)
      assert.equal(network.peers.get(peerID)!.peerID, peerID)
      assert.equal(network.peers.get(peerID)!.peerIndex, peerIndex2)
      assert.equal(worldState.userNames[userId].value, userName2)
    })
  })

  describe('removePeer', () => {
    it('should remove peer', () => {
      const world = Engine.instance.currentWorld
      const userId = 'user id' as UserId
      const peerID = 'peer id' as PeerID
      Engine.instance.userId = 'another user id' as UserId
      const userName = 'user name'
      const userIndex = 1
      const peerIndex = 2
      const network = world.worldNetwork

      NetworkPeerFunctions.createPeer(network, peerID, peerIndex, userId, userIndex, userName, world)
      NetworkPeerFunctions.destroyPeer(network, peerID, world)

      assert(!network.peers.get(peerID))

      assert.equal(network.userIndexToUserID.get(userIndex), undefined)
      assert.equal(network.userIDToUserIndex.get(userId), undefined)
      assert.equal(network.peerIndexToPeerID.get(peerIndex), undefined)
      assert.equal(network.peerIDToPeerIndex.get(peerID), undefined)
    })

    it('should remove peer and owned network objects', () => {
      const world = Engine.instance.currentWorld
      const userId = 'user id' as UserId
      const peerID = 'peer id' as PeerID
      Engine.instance.userId = 'another user id' as UserId
      const userName = 'user name'
      const userIndex = 1
      const peerIndex = 5
      const network = world.worldNetwork

      NetworkPeerFunctions.createPeer(network, peerID, peerIndex, userId, userIndex, userName, world)
      const networkId = 2 as NetworkId

      const entity = createEntity()
      addComponent(entity, NetworkObjectComponent, {
        ownerId: userId,
        authorityPeerID: peerID,
        networkId
      })

      // process remove actions and execute entity removal
      Engine.instance.store.defaultDispatchDelay = 0
      NetworkPeerFunctions.destroyPeer(network, peerID, world)

      clearOutgoingActions(network.topic)
      applyIncomingActions()
      world.execute(0)

      assert(!world.getNetworkObject(userId, networkId))
    })
  })
})
