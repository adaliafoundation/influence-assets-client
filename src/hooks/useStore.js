import create from 'zustand';
import { persist } from 'zustand/middleware';
import produce from 'immer';
import { Asteroid, Address } from '@influenceth/sdk';
import { assetMappings } from '~/lib/assets';

const useStore = create(persist((set, get) => ({
    alerts: [],

    mode: 'bridge',  // "claim" or "bridge"

    fromLayer: null,
    fromAccount: null,

    assetTab: 'asteroids',
    prevFromLayer: null,

    asteroids: [],
    asteroidsSelected: false,

    crewmates: [],
    crewmatesSelected: false,

    crews: [],
    crewsSelected: false,

    ships: [],
    shipsSelected: false,

    l2l1DelayEstimate: null,
    l2l1TxStatus: null,

    lastConnectedL1Wallet: null,

    overallBridgingStatus: 0,
    overallClaimingStatus: 0,

    inTransit: {},

    crewmateMintingAsteroids: [],
    pendingTransactions: [],
    orphanedTransactions: [],
    inTransitAssets: [],

    tokenIsRegistered: false,

    //
    // DISPATCHERS

    dispatchAlertLogged: (alert) => set(produce(state => {
      state.alerts.unshift(alert);
    })),

    dispatchAlertNotified: (alert) => set(produce(state => {
      const index = state.alerts.findIndex(a => a.type === alert.type && a.timestamp === alert.timestamp);
      state.alerts.splice(index, 1);
    })),

    dispatchConnectedL1Wallet: (wallet) => set(produce(state => {
      state.lastConnectedL1Wallet = wallet;
    })),

    dispatchMode: (mode) => set(produce(state => {
      state.mode = mode;
    })),

    dispatchFromAccountSelected: (layer, wallet, { asteroids, crewmates, crews, ships, inTransitAssets, orphanedTransactions }) => set(produce(state => ({
      fromLayer: layer,
      prevFromLayer: layer,
      fromAccount: wallet,
      asteroids: asteroids.map((a) => {
        const lots = Asteroid.Entity.getSurfaceArea(a);
        const _unclaimedSway = a.AsteroidReward?.hasSwayClaim ? lots * 6922 : 0;
        return { ...a, _type: 'asteroids', _unclaimedSway };
      }),
      crewmates: crewmates.map((c) => {
        const _unclaimedSway = c.CrewmateReward?.hasSwayClaim ? 650000 : 0;
        return { ...c, _type: 'crewmates', _unclaimedSway };
      }),
      crews: crews.map((c) => {
        return { ...c, _type: 'crews' };
      }),
      ships: ships.map((s) => {
        return { ...s, _type: 'ships' };
      }),
      inTransitAssets: inTransitAssets || [],
      orphanedTransactions: orphanedTransactions || [],
      overallBridgingStatus: 0,
      overallClaimingStatus: 0,
      inTransit: {},
      pendingTransactions: []
    }))),

    dispatchFromAccountDeselected: () => set(produce(state => ({
      fromLayer: null,
      fromAccount: null,
      asteroids: [],
      crewmates: [],
      crews: [],
      ships: [],
      l2l1TxStatus: null,
      inTransitAssets: [],
      orphanedTransactions: [],
      overallBridgingStatus: 0,
      overallClaimingStatus: 0,
      inTransit: {},
      pendingTransactions: []
    }))),

    // remove orphaned transactions (if this was one) as assets are received on l1
    dispatchAssetsReceived: ({ asset, assetIds, fromAddress }) => set(produce(state => {
      const assetIdCompare = [...assetIds].sort().join(',');

      return {
        orphanedTransactions: state.orphanedTransactions.filter((tx) => !(
          assetMappings[asset].singular === tx.assetType
          && assetIdCompare === [...tx.assetIds].sort().join(',')
          && Address.areEqual(fromAddress, tx.fromAddress)
        ))
      };
    })),

    dispatchAssetTabSelected: (assetTab) => set(produce(state => ({ assetTab }))),

    dispatchAssetSelected: (asset, force) => set(produce(state => {
      const storeAsset = state[asset._type].find((a) => a.id === asset.id);
      storeAsset._selected = force !== undefined ? force : !asset._selected;
    })),

    dispatchAssetSelectedAll: (selected, maxSelectable) => set(produce(state => {
      if (state.mode === 'bridge') {
        const type = state.assetTab;
        if (selected) {
          const maxToSelect = maxSelectable - state[type].reduce((acc, cur) => cur._selected ? acc + 1 : acc, 0);

          let totalSelected = 0;
          state[type].forEach((a) => {
            // if not already selected
            if (!a._selected) {
              // if not already enough selected
              if (totalSelected < maxToSelect) {
                a._selected = true;
                totalSelected++;
              }
            }
          });
        } else {
          state[type].forEach((a) => { a._selected = false; });
        }
      } else if (state.mode === 'claim') {
        if (selected) {
          const totalSelected = {
            asteroids: state.asteroids.reduce((acc, cur) => cur._selected ? acc + 1 : acc, 0),
            crewmates: state.crewmates.reduce((acc, cur) => cur._selected ? acc + 1 : acc, 0),
          };
          ['asteroids', 'crewmates'].forEach((assetType) => {
            const maxToSelect = assetType === 'asteroids' && totalSelected.crewmates === 0
              ? maxSelectable - 1
              : maxSelectable;
            state[assetType].forEach((a) => {
              // if not already selected
              if (!a._selected) {
                // if not already claimed
                if (a._unclaimedSway > 0) {
                  // if not already enough selected
                  if (totalSelected.asteroids + totalSelected.crewmates < maxToSelect) {
                    a._selected = true;
                    totalSelected[assetType]++;
                  }
                }
              }
            });
          });
        } else {
          state.asteroids.forEach((a) => { a._selected = false; });
          state.crewmates.forEach((c) => { c._selected = false; });
        }
      }
    })),

    dispatchBridgingFailed: () => set(produce(state => ({
      overallBridgingStatus: 0
    }))),

    dispatchBridgingPending: () => set(produce(state => ({
      overallBridgingStatus: 1
    }))),

    dispatchBridgingInitiated: () => set(produce(state => ({
      overallBridgingStatus: 2
    }))),

    dispatchBridgingComplete: () => set(produce(state => ({
      overallBridgingStatus: 3
    }))),

    dispatchClaimingFailed: () => set(produce(state => ({
      overallClaimingStatus: 0
    }))),

    dispatchClaimingPending: () => set(produce(state => ({
      overallClaimingStatus: 1
    }))),

    dispatchClaimingInitiated: () => set(produce(state => ({
      overallClaimingStatus: 2
    }))),

    dispatchClaimingComplete: () => set(produce(state => ({
      overallClaimingStatus: 3
    }))),

    // i: {fromLayer: 'l1', from: wallet, to: wallet}
    dispatchAssetsInTransit: (type, ids, fromLayer, fromAccount, toAccount) => set(produce(state => {
      ids.forEach((id) => {
        state.inTransit[id] = { fromLayer, fromAccount, toAccount };
      });
      state[type].forEach((a) => {
        a._bridgingStatus = ids.includes(a.id) ? 1 : 0;
      })
    })),

    dispatchAssetInTransitUpdated: (type, id, bridgingStatus) => set(produce(state => {
      const asset = state[type].find((a) => a.id === id);
      if (asset) asset._bridgingStatus = bridgingStatus;
    })),

    dispatchCrewmateMintingAsteroid: (asteroidId, isMinting) => set(produce(state => ({
      crewmateMintingAsteroids: isMinting
        ? [...(state.crewmateMintingAsteroids || []), asteroidId]
        : (state.crewmateMintingAsteroids || []).filter((id) => id !== asteroidId)
    }))),

    dispatchL2L1DelayEstimate: (status) => set(produce(state => ({
      l2l1DelayEstimate: status
    }))),

    dispatchL2L1TxStatus: (status) => set(produce(state => ({
      l2l1TxStatus: status
    }))),

    dispatchPendingTransaction: ({ layer, key, vars, txHash }) => set(produce(state => {
      if (!state.pendingTransactions) state.pendingTransactions = [];
      state.pendingTransactions.push({
        layer,
        key,
        vars,
        txHash,
        timestamp: Date.now()
      });
    })),

    dispatchPendingTransactionUpdate: (txHash, params) => set(produce(state => {
      if (!state.pendingTransactions) state.pendingTransactions = [];
      const txIndex = state.pendingTransactions.findIndex((tx) => tx.txHash === txHash);
      state.pendingTransactions[txIndex] = {
        ...state.pendingTransactions[txIndex],
        ...params
      }
    })),

    dispatchPendingTransactionComplete: (txHash) => set(produce(state => {
      if (!state.pendingTransactions) state.pendingTransactions = [];
      state.pendingTransactions = state.pendingTransactions.filter((tx) => tx.txHash !== txHash);
    })),

    dispatchTokenIsRegistered: (which) => set(produce(state => {
      state.tokenIsRegistered = which;
    }))

}), {
  name: 'influence-bridge',
  version: 2,
  blacklist: []
}));

export default useStore;
